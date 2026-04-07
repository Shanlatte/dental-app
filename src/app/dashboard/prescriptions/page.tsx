"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, ClipboardList, User, CalendarDays, ClipboardCheck, Pill, Save, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { getDoctorTitle } from "@/utils/formatters"

export default function PrescriptionsPage() {
  const supabase = createClient()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [selectedPatient, setSelectedPatient] = useState("")
  const [meds, setMeds] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }))
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }

      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true })
      
      if (error) toast.error("Error al cargar pacientes")
      else setPatients(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const handlePrint = () => {
    if (!selectedPatient || !meds) {
      toast.error("Complete paciente y medicamentos para imprimir")
      return
    }
    window.print()
  }

  const handleSave = async () => {
    if (!selectedPatient || !meds) return toast.error("Complete todos los campos")

    setIsSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsSaving(false)
      return toast.error("Sesión no válida")
    }

    const { error } = await supabase
      .from('prescriptions')
      .insert([
        {
          patient_id: selectedPatient,
          medications: meds,
          owner_id: user.id
        }
      ])

    if (error) {
      toast.error("Error al guardar receta: " + error.message)
    } else {
      toast.success("Receta guardada correctamente")
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-8 flex flex-col items-center">
      <div className="w-full flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Recetas Médicas</h2>
          <p className="text-muted-foreground">Genera recetas oficiales con el timbrado de la clínica.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="shadow-sm">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar
          </Button>
        </div>
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-10">
        {/* Editor (Sidebar) */}
        <div className="lg:w-[350px] space-y-6 print:hidden">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Configurar Receta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select value={selectedPatient} onValueChange={(val: string | null) => setSelectedPatient(val ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {selectedPatient 
                        ? (patients.find(p => p.id === selectedPatient)?.first_name + ' ' + patients.find(p => p.id === selectedPatient)?.last_name)
                        : (loading ? "Cargando..." : "Seleccionar Paciente")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Medicamentos / Indicaciones</Label>
                <Textarea 
                  placeholder="Escriba medicamentos y posología..." 
                  className="min-h-[250px] resize-none leading-relaxed" 
                  value={meds}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMeds(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prescription Viewer (Right) */}
        <div className="flex-1 max-w-[8.5in] print:mx-auto print-full-width">
          <Card className="shadow-lg border-muted/50 bg-white min-h-[9in] print:min-h-0 flex flex-col overflow-hidden italic print:shadow-none print:border-none">
            <CardHeader className="border-b bg-muted/5 p-8 md:p-12 print:p-8 text-center space-y-3">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black tracking-tight uppercase text-foreground not-italic">
                  {profile ? `${getDoctorTitle(profile.gender)} ${profile.first_name} ${profile.last_name}` : 'DRA. PROFESIONAL'}
                </h3>
                <p className="text-sm font-bold text-primary tracking-widest uppercase not-italic italic">Especialista Dental</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-muted-foreground pt-4 border-t border-border/40 border-dashed italic">
                <div className="text-left space-y-1">
                  <p>{profile?.clinic_name || 'Clínica Dental Profesional'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p>{profile?.clinic_address || 'Santo Domingo, R.D.'}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-8 md:p-12 print:p-8 relative font-sans">
              <div className="flex justify-between items-end mb-8 md:mb-12 border-b border-border/30 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest not-italic">
                    <User className="h-3 w-3" /> Paciente
                  </div>
                  <p className="font-bold text-lg leading-none uppercase italic">
                    {selectedPatient ? patients.find(p => p.id === selectedPatient)?.first_name + ' ' + patients.find(p => p.id === selectedPatient)?.last_name : '---'}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest not-italic">
                    <CalendarDays className="h-3 w-3" /> Fecha
                  </div>
                  <p className="font-bold text-lg leading-none italic">{currentDate || '...'}</p>
                </div>
              </div>

              {/* Rx Symbol */}
              <div className="absolute left-10 top-32 opacity-10 pointer-events-none select-none">
                <Pill className="h-48 w-48 text-primary" />
              </div>

              <div className="min-h-[300px] py-6 md:py-10 relative z-10 font-sans italic">
                <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2 not-italic underline">
                  <ClipboardCheck className="h-4 w-4" /> Rp. (Recíbase)
                </div>
                <div className="whitespace-pre-wrap leading-[2.2] text-lg text-foreground font-medium pl-6 italic">
                  {meds || "Indique los medicamentos en el panel lateral..."}
                </div>
              </div>

              <div className="mt-12 md:mt-20 pt-6 md:pt-10 flex justify-end">
                <div className="w-[300px] border-t border-muted-foreground/30 flex flex-col items-center pt-2 italic text-muted-foreground">
                  <span className="text-xs uppercase font-bold text-muted-foreground/60 not-italic tracking-widest mb-1 italic">Firma y Sello</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/5 border-t p-6 md:p-8 text-center text-[10px] text-muted-foreground italic font-medium uppercase tracking-widest">
              <span>"Tu salud bucal es nuestra prioridad"</span>
            </CardFooter>
          </Card>
        </div>
      </div>

    </div>
  )
}
