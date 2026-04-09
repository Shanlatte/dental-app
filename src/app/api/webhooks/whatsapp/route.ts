import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

// Para los webhooks necesitamos usar la SERVICE_ROLE_KEY para saltar el RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    // 1. Verificar firma de Twilio para seguridad
    const signature = req.headers.get('x-twilio-signature') || ''
    const url = req.url
    const formData = await req.formData()
    const params = Object.fromEntries(formData.entries())

    // Validar que la solicitud viene realmente de Twilio
    const isValid = twilio.validateRequest(twilioAuthToken, signature, url, params)
    
    if (!isValid) {
      console.warn('⚠️ Intento de acceso no autorizado al webhook de Twilio')
      return NextResponse.json({ error: 'Firma de Twilio inválida' }, { status: 401 })
    }

    const from = formData.get('From') as string // Ej: 'whatsapp:+123456789'
    const body = (formData.get('Body') as string || '').trim().toLowerCase()
    
    // Limpiar el prefijo 'whatsapp:' para buscar el número
    const phone = from.replace('whatsapp:', '')

    console.log(`Mensaje recibido de ${phone}: ${body}`)

    // 1. Buscar al paciente por su teléfono
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('phone', phone)
      .single()

    if (patientError || !patient) {
      console.error('Paciente no encontrado para el teléfono:', phone)
      return NextResponse.json({ message: 'Paciente no encontrado' })
    }

    // 2. Buscar la cita más reciente en espera ('waiting') para ese paciente
    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('status', 'waiting')
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (appError || !appointment) {
      console.error('No se encontró una cita pendiente para el paciente')
      return NextResponse.json({ message: 'Sin citas pendientes' })
    }

    // 3. Determinar el nuevo estado basado en la respuesta
    let newStatus = ''
    if (body.includes('1') || body.includes('confirmar') || body.includes('si')) {
      newStatus = 'confirmed'
    } else if (body.includes('2') || body.includes('cancelar') || body.includes('no')) {
      newStatus = 'cancelled'
    }

    if (newStatus) {
      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id)

      if (updateError) {
        console.error('Error al actualizar el estado de la cita:', updateError)
      } else {
        console.log(`Cita ${appointment.id} actualizada a: ${newStatus}`)
      }
    }

    // Retornar una respuesta vacía o un mensaje de confirmación a Twilio
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  } catch (error) {
    console.error('Error en el Webhook de WhatsApp:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
