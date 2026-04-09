import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const client = twilio(accountSid, authToken)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    // Verificar el secreto para seguridad (puedes usar el de NEXT_PUBLIC si lo llamas desde el cliente)
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.WEBHOOK_SECRET && secret !== process.env.NEXT_PUBLIC_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { phone, patientName, date, time } = await req.json()

    if (!phone || !patientName) {
      return NextResponse.json({ error: 'Payload inválido: faltan datos del paciente' }, { status: 400 })
    }

    console.log(`Enviando notificación a ${patientName} (${phone})`)

    // 2. Enviar WhatsApp vía Twilio
    const formattedPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
    
    const message = await client.messages.create({
      from: fromNumber,
      to: formattedPhone,
      body: `Hola ${patientName}! 👋\n\nTienes una cita agendada para el día ${date} a las ${time}.\n\nPor favor, responde con el número de tu opción:\n1️⃣ Confirmar asistencia\n2️⃣ Cancelar cita`
    })

    return NextResponse.json({ success: true, messageSid: message.sid })
  } catch (error: any) {
    console.error('Error en API de notificación:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
