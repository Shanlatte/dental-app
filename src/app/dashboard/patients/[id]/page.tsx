"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Calendar, 
  ClipboardList, 
  Plus, 
  ChevronLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Loader2,
  FileText
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import moment from "moment"
import { Textarea } from "@/components/ui/textarea"

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [newNote, setNewNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [patRes, appRes, notesRes, budgetsRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase.from('appointments').select('*').eq('patient_id', id).order('start_time', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').eq('patient_id', id).order('created_at', { ascending: false })
    ])

    if (patRes.error) {
      toast.error("Error al cargar paciente")
    } else {
      setPatient(patRes.data)
      setAppointments(appRes.data || [])
      setNotes(notesRes.data || [])
      setBudgets(budgetsRes.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return toast.error("Sesión no válida")

    const { error } = await supabase.from('clinical_notes').insert([
      {
        patient_id: id,
        notes: newNote,
        owner_id: user.id
      }
    ])

    if (error) {
      toast.error("Error al guardar nota: " + error.message)
    } else {
      toast.success("Nota añadida correctamente")
      setNewNote("")
      fetchData()
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!patient) return <div className="text-center p-20">Paciente no encontrado</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground underline decoration-primary/30">
            Expediente: {patient.first_name} {patient.last_name}
          </h2>
          <p className="text-muted-foreground italic">Historia clínica digital y registro de actividades.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Patient Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20">
                <User className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-xl uppercase">{patient.first_name} {patient.last_name}</CardTitle>
              <CardDescription className="font-mono text-xs">ID: {patient.id.slice(0, 8)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm mt-4">
              <div className="flex items-center gap-3 text-muted-foreground p-3 bg-muted/20 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Nacido el: <strong>{moment(patient.dob).format('DD MMM, YYYY')}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground p-3 bg-muted/20 rounded-lg">
                <Phone className="h-4 w-4 text-primary" />
                <span>Teléfono: <strong>{patient.phone}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground p-3 bg-muted/20 rounded-lg">
                <Mail className="h-4 w-4 text-primary" />
                <span className="truncate">Email: <strong>{patient.email || "---"}</strong></span>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center px-2">
                <span className="text-muted-foreground italic">Sexo:</span>
                <span className="font-bold capitalize">{patient.gender}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/10">
            <CardHeader className="py-4">
              <CardTitle className="text-sm uppercase tracking-wider">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button className="w-full justify-start gap-2 h-11" variant="outline" render={<Link href="/dashboard/appointments" />}>
                <Calendar className="h-4 w-4" /> Nueva Cita
              </Button>
              <Button className="w-full justify-start gap-2 h-11" variant="outline" render={<Link href="/dashboard/budgets" />}>
                <FileText className="h-4 w-4" /> Nuevo Presupuesto
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Timeline/History */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="notes" className="gap-2">
                <ClipboardList className="h-4 w-4" /> Notas Clínicas
              </TabsTrigger>
              <TabsTrigger value="appointments" className="gap-2">
                <Clock className="h-4 w-4" /> Citas
              </TabsTrigger>
              <TabsTrigger value="budgets" className="gap-2">
                <FileText className="h-4 w-4" /> Presupuestos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-6">
              {/* Add Note Form */}
              <Card className="shadow-sm border-border/50">
                <form onSubmit={handleAddNote}>
                  <CardHeader className="py-4">
                    <CardTitle className="text-md">Nueva Nota de Evolución</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Escriba hallazgos, diagnóstico o plan de tratamiento..." 
                      className="min-h-[120px] italic leading-relaxed"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="justify-end border-t py-4">
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Guardar Nota en Historial
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Notes List */}
              <div className="space-y-4">
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <Card key={note.id} className="shadow-sm border-border/50 border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-bold text-primary italic">
                            {moment(note.created_at).format('DD [de] MMMM, YYYY [a las] hh:mm a')}
                          </span>
                        </div>
                        <p className="text-foreground leading-relaxed italic whitespace-pre-wrap">{note.notes}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="italic">No hay notas clínicas registradas aún.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="appointments">
              <div className="space-y-4">
                {appointments.length > 0 ? (
                  appointments.map((app) => (
                    <Card key={app.id} className="shadow-sm border-border/50 hover:bg-muted/5 transition-colors">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-11 w-11 rounded-full flex items-center justify-center ${
                            app.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 
                            app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground italic">{moment(app.start_time).format('LL')}</p>
                            <p className="text-sm text-muted-foreground">{moment(app.start_time).format('hh:mm A')} - {app.notes || "Consulta General"}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${
                          app.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          app.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {app.status === 'waiting' ? 'En Espera' : app.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="italic">No hay citas registradas para este paciente.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="budgets">
              <div className="space-y-4">
                {budgets.length > 0 ? (
                  budgets.map((b) => (
                    <Card key={b.id} className="shadow-sm border-border/50 hover:bg-muted/5 transition-colors">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground italic">{moment(b.created_at).format('LL')}</p>
                            <p className="text-sm font-mono font-bold text-primary">RD$ {Number(b.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <Link href={`/dashboard/budgets?id=${b.id}`}>
                          <Button variant="outline" size="sm">Ver / Editar</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="italic">No hay presupuestos para este paciente.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
