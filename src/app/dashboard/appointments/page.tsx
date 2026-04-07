"use client"

import { useState, useEffect } from "react"
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ChevronLeft, ChevronRight, Filter, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { useIsMobile } from "@/hooks/use-mobile"

// Set moment to Spanish
moment.locale('es')
const localizer = momentLocalizer(moment)

const eventStyleGetter = (event: any) => {
  let backgroundColor = '#3b82f6' // Default blue
  if (event.status === 'confirmed') backgroundColor = '#10b981' // Green
  if (event.status === 'cancelled') backgroundColor = '#ef4444' // Red
  if (event.status === 'waiting') backgroundColor = '#f59e0b' // Amber/Yellow

  return {
    style: {
      backgroundColor,
      borderRadius: '6px',
      color: 'white',
      border: 'none',
      display: 'block',
      padding: '4px 6px',
      fontSize: '0.85rem',
      fontWeight: '500'
    }
  }
}

export default function AppointmentsPage() {
  const supabase = createClient()
  const isMobile = useIsMobile()
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [procedures, setProcedures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [appRes, patRes, procRes] = await Promise.all([
      supabase.from('appointments').select('*, patients(first_name, last_name)').order('start_time', { ascending: true }),
      supabase.from('patients').select('id, first_name, last_name').order('first_name', { ascending: true }),
      supabase.from('procedures').select('id, name').order('name', { ascending: true })
    ])

    if (appRes.error) toast.error("Error al cargar citas")
    if (patRes.error) toast.error("Error al cargar pacientes")
    if (procRes.error) toast.error("Error al cargar procedimientos")

    const formattedApps = (appRes.data || []).map(app => ({
      ...app,
      id: app.id,
      title: `${app.patients?.first_name} ${app.patients?.last_name} ${app.notes ? '- ' + app.notes : ''}`,
      start: new Date(app.start_time),
      end: new Date(app.end_time),
    }))

    setAppointments(formattedApps)
    setPatients(patRes.data || [])
    setProcedures(procRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const patientId = formData.get('patientId') as string
    const procedureId = formData.get('procedureId') as string
    const appDate = formData.get('date') as string
    const appTime = formData.get('time') as string
    const status = formData.get('status') as string || 'waiting'

    const start = new Date(`${appDate}T${appTime}`)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // Default 1 hour

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Sesión no válida")
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id: patientId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status,
          owner_id: user.id,
          notes: procedures.find(p => p.id === procedureId)?.name
        }
      ])

    if (error) {
      toast.error("Error al agendar cita: " + error.message)
    } else {
      toast.success("Cita agendada correctamente")
      setIsDialogOpen(false)
      fetchData()
    }
    setIsSubmitting(false)
  }
  
  const handleUpdateStatus = async (status: string) => {
    if (!selectedEvent) return
    setIsSubmitting(true)

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', selectedEvent.id)

    if (error) {
      toast.error("Error al actualizar estado: " + error.message)
    } else {
      toast.success("Estado actualizado")
      setIsEditOpen(false)
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event)
    setIsEditOpen(true)
  }

  const todayApps = appointments.filter(app => 
    moment(app.start).isSame(moment(), 'day')
  )

  return (
    <div className="space-y-6 flex flex-col md:h-[calc(100vh-140px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agenda de Citas</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Gestiona tus pacientes y horarios desde el calendario central.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Agendar Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Cita Medica</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAppointment}>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientId">Paciente</Label>
                    <Select name="patientId" required>
                      <SelectTrigger id="patientId">
                        <SelectValue placeholder="Seleccionar Paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="procedureId">Procedimiento</Label>
                    <Select name="procedureId" required>
                      <SelectTrigger id="procedureId">
                        <SelectValue placeholder="Seleccionar Procedimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        {procedures.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <Input id="date" name="date" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Hora</Label>
                      <Input id="time" name="time" type="time" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado Inicial</Label>
                    <Select name="status" defaultValue="waiting">
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Estado de la cita" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waiting">En Espera</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Agendar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit/Status Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Detalle de la Cita</DialogTitle>
                <DialogDescription>
                  Paciente: {selectedEvent?.patients?.first_name} {selectedEvent?.patients?.last_name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Procedimiento</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent?.notes || "Consulta General"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Horario</p>
                  <p className="text-sm text-muted-foreground">
                    {moment(selectedEvent?.start).format('LLLL')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Actualizar Estado</Label>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant={selectedEvent?.status === 'waiting' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus('waiting')}
                      disabled={isSubmitting}
                      className="justify-start"
                    >
                      <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                      En Espera
                    </Button>
                    <Button 
                      variant={selectedEvent?.status === 'confirmed' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus('confirmed')}
                      disabled={isSubmitting}
                      className="justify-start"
                    >
                      <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                      Confirmada
                    </Button>
                    <Button 
                      variant={selectedEvent?.status === 'cancelled' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus('cancelled')}
                      disabled={isSubmitting}
                      className="justify-start text-red-500 hover:text-red-600"
                    >
                      <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                      Cancelar Cita
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Main Calendar Card */}
        <div className="order-1 lg:order-2 lg:col-span-3 flex flex-col min-h-[600px] md:min-h-0">
          <Card className="shadow-sm border-border/50 flex flex-col min-h-0 md:overflow-hidden md:h-full">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b">
              <div>
                <CardTitle className="capitalize text-lg text-center sm:text-left">
                  {moment(date).format('MMMM YYYY')}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex border rounded-lg overflow-hidden shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-none border-r h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={() => setView('month')}>Mes</Button>
                  <Button variant="ghost" size="sm" className="rounded-none border-r h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={() => setView('week')}>Semana</Button>
                  <Button variant="ghost" size="sm" className="rounded-none h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={() => setView('day')}>Día</Button>
                </div>
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(moment(date).subtract(1, 'month').toDate())}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setDate(new Date())}>Hoy</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(moment(date).add(1, 'month').toDate())}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col relative">
              <style jsx global>{`
                .rbc-calendar { font-family: inherit; height: 100% !important; border: none; min-height: inherit; }
                .rbc-month-view { border: none; min-width: 600px; min-height: 600px !important; display: flex !important; flex-direction: column !important; }
                .rbc-month-row { border-color: hsl(var(--border) / 0.3) !important; min-height: 100px !important; display: flex !important; flex: 1 !important; }
                .rbc-header { padding: 8px 4px; font-weight: 600; font-size: 0.7rem; text-transform: uppercase; color: hsl(var(--muted-foreground)); border-bottom-color: hsl(var(--border) / 0.5) !important; }
                @media (max-width: 640px) {
                  .rbc-header { padding: 4px 2px; font-size: 0.6rem; }
                }
                .rbc-month-row { border-color: hsl(var(--border) / 0.3) !important; }
                .rbc-day-bg { border-left-color: hsl(var(--border) / 0.3) !important; }
                .rbc-off-range-bg { background-color: hsl(var(--muted) / 0.2); }
                .rbc-current-time-indicator { background-color: hsl(var(--primary)); }
                .rbc-today { background-color: hsl(var(--primary) / 0.03); }
                .rbc-event { transition: all 0.2s; border-radius: 4px; border: none !important; margin: 1px 2px; }
                .rbc-event:hover { filter: brightness(1.1); transform: scale(1.02); }
                .rbc-show-more { color: hsl(var(--primary)); font-weight: 600; font-size: 0.75rem; }
              `}</style>
              
              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : null}

              <div className="min-h-[600px] md:h-full md:flex-1 overflow-auto">
                <Calendar
                  localizer={localizer}
                  events={appointments}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%', minHeight: '600px' }}
                  messages={{
                    next: ">",
                    previous: "<",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día"
                  }}
                  view={view as any}
                  onView={(v: any) => setView(v)}
                  date={date}
                  onNavigate={(d: any) => setDate(d)}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventStyleGetter}
                  toolbar={false}
                  culture='es'
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Items */}
        <div className="order-2 lg:order-1 lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Citas de Hoy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {todayApps.length > 0 ? (
                todayApps.map(app => (
                  <div key={app.id} className={`p-3 bg-muted/20 border-l-4 rounded-md ${
                    app.status === 'confirmed' ? 'border-emerald-500' : 
                    app.status === 'cancelled' ? 'border-red-500' : 'border-amber-500'
                  }`}>
                    <p className="text-xs text-muted-foreground">{moment(app.start).format('hh:mm A')}</p>
                    <p className="font-medium text-sm">{app.patients?.first_name} {app.patients?.last_name}</p>
                    <p className="text-xs italic text-muted-foreground mt-1">{app.notes || "Cita General"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 italic">No hay citas para hoy</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground">En Espera</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Cancelada</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
