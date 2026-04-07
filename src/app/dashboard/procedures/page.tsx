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
import { Plus, Search, Edit2, Trash2, Stethoscope, Clock, Loader2 } from "lucide-react"
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
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"

export default function ProceduresPage() {
  const supabase = createClient()
  const [procedures, setProcedures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit states
  const [editingProcedure, setEditingProcedure] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: ""
  })

  const fetchProcedures = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      toast.error("Error al cargar procedimientos")
    } else {
      setProcedures(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProcedures()
  }, [])

  const filteredProcedures = procedures.filter(procedure => 
    procedure.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenDialog = (proc: any = null) => {
    if (proc) {
      setEditingProcedure(proc)
      setFormData({
        name: proc.name,
        description: proc.description || "",
        cost: proc.cost.toString()
      })
    } else {
      setEditingProcedure(null)
      setFormData({
        name: "",
        description: "",
        cost: ""
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
      name: formData.name,
      description: formData.description,
      cost: parseFloat(formData.cost),
      owner_id: user.id
    }

    if (editingProcedure) {
      // UPDATE
      const { error } = await supabase
        .from('procedures')
        .update(payload)
        .eq('id', editingProcedure.id)

      if (error) {
        toast.error("Error al actualizar: " + error.message)
      } else {
        toast.success("Procedimiento actualizado")
        setIsDialogOpen(false)
        fetchProcedures()
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from('procedures')
        .insert([payload])

      if (error) {
        toast.error("Error al guardar: " + error.message)
      } else {
        toast.success("Procedimiento guardado")
        setIsDialogOpen(false)
        fetchProcedures()
      }
    }
    setIsSubmitting(false)
  }

  const handleDeleteProcedure = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este procedimiento?")) return
    
    const { error } = await supabase
      .from('procedures')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error("Error al eliminar procedimiento")
    } else {
      toast.success("Procedimiento eliminado")
      fetchProcedures()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Procedimientos</h2>
          <p className="text-muted-foreground italic">Catalogo de servicios ofrecidos en tu clínica dental.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="shadow-sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Procedimiento
            </Button>
          } />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProcedure ? "Editar Procedimiento" : "Nuevo Procedimiento"}</DialogTitle>
              <DialogDescription>
                {editingProcedure ? "Modifica los detalles del servicio seleccionado." : "Añade un nuevo servicio a tu catálogo."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Servicio</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej: Tratamiento de Canal" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción Breve</Label>
                  <Input 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Detalle del procedimiento..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo Base (RD$)</Label>
                  <Input 
                    id="cost" 
                    type="number" 
                    step="0.01" 
                    value={formData.cost} 
                    onChange={(e) => setFormData({...formData, cost: e.target.value})} 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingProcedure ? "Actualizar" : "Guardar Servicio")}
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
              placeholder="Buscar procedimiento..." 
              className="pl-10 max-w-sm bg-background shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-semibold px-6 py-4">Nombre</TableHead>
                <TableHead className="font-semibold">Descripción</TableHead>
                <TableHead className="font-semibold">Costo Base</TableHead>
                <TableHead className="text-right px-6 font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto pb-2" />
                    Cargando procedimientos...
                  </TableCell>
                </TableRow>
              ) : filteredProcedures.length > 0 ? (
                filteredProcedures.map((proc) => (
                  <TableRow key={proc.id} className="hover:bg-muted/5">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Stethoscope className="h-4 w-4 text-primary opacity-70" />
                        <span className="font-medium text-foreground">{proc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground italic truncate-1 max-w-[250px] inline-block">{proc.description || "Sin descripción"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        RD$ {proc.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpenDialog(proc)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteProcedure(proc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No se encontraron procedimientos.
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
