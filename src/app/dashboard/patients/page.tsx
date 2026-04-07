"use client"

import { useState, useEffect } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, MoreHorizontal, UserCircle, Phone, Mail, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

export default function PatientsPage() {
  const supabase = createClient()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit states
  const [editingPatient, setEditingPatient] = useState<any>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "masculino",
    dob: "",
    phone: "",
    email: ""
  })

  const fetchPatients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error("Error al cargar pacientes")
    } else {
      setPatients(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const filteredPatients = patients.filter(patient => 
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm)
  )

  const handleOpenDialog = (patient: any = null) => {
    if (patient) {
      setEditingPatient(patient)
      setFormData({
        firstName: patient.first_name,
        lastName: patient.last_name,
        gender: patient.gender || "masculino",
        dob: patient.dob || "",
        phone: patient.phone || "",
        email: patient.email || ""
      })
    } else {
      setEditingPatient(null)
      setFormData({
        firstName: "",
        lastName: "",
        gender: "masculino",
        dob: "",
        phone: "",
        email: ""
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Sesión no válida")
      setIsSubmitting(false)
      return
    }

    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      gender: formData.gender,
      dob: formData.dob,
      phone: formData.phone,
      email: formData.email,
      owner_id: user.id
    }

    if (editingPatient) {
      // UPDATE
      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', editingPatient.id)

      if (error) {
        toast.error("Error al actualizar paciente: " + error.message)
      } else {
        toast.success("Paciente actualizado correctamente")
        setIsDialogOpen(false)
        fetchPatients()
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from('patients')
        .insert([payload])

      if (error) {
        toast.error("Error al registrar paciente: " + error.message)
      } else {
        toast.success("Paciente registrado correctamente")
        setIsDialogOpen(false)
        fetchPatients()
      }
    }
    setIsSubmitting(false)
  }

  const handleDeletePatient = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este paciente?")) return
    
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error("Error al eliminar paciente")
    } else {
      toast.success("Paciente eliminado")
      fetchPatients()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Pacientes</h2>
          <p className="text-muted-foreground italic">Gestiona la información personal y el historial clínico de tus pacientes.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="shadow-sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
            </Button>
          } />
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Editar Paciente" : "Registrar Nuevo Paciente"}</DialogTitle>
              <DialogDescription>
                {editingPatient ? "Actualiza los datos personales del paciente." : "Completa los datos personales del paciente para crear su perfil."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName} 
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                      placeholder="Ej: Juan" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName} 
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                      placeholder="Ej: Perez" 
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Sexo</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(val: string | null) => setFormData({...formData, gender: val ?? "masculino"})}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Fecha de Nacimiento</Label>
                    <Input 
                      id="dob" 
                      type="date" 
                      value={formData.dob} 
                      onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input 
                      id="phone" 
                      placeholder="809-000-0000" 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input 
                      id="email" 
                      placeholder="ejemplo@correo.com" 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingPatient ? "Actualizar Paciente" : "Guardar Paciente")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/5 border-b py-4">
          <div className="flex items-center relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, correo o teléfono..." 
              className="pl-10 max-w-md bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-semibold px-6 py-4">Nombre</TableHead>
                <TableHead className="font-semibold">Información de Contacto</TableHead>
                <TableHead className="font-semibold">Sexo</TableHead>
                <TableHead className="font-semibold">Fecha Registro</TableHead>
                <TableHead className="text-right px-6 font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto pb-2" />
                    Cargando pacientes...
                  </TableCell>
                </TableRow>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-muted/10">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserCircle className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-foreground">{patient.first_name} {patient.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground italic">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" /> {patient.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> {patient.email || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{patient.gender}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{new Date(patient.created_at).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuItem render={
                            <Link href={`/dashboard/patients/${patient.id}`} />
                          }>
                            Ver Expediente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(patient)}>
                            Editar Información
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeletePatient(patient.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No se encontraron pacientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
