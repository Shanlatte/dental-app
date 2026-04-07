"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Printer, Save, Calculator, Loader2, Edit2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import moment from "moment"
import { getDoctorTitle } from "@/utils/formatters"

export default function BudgetsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <BudgetsContent />
    </Suspense>
  )
}

function BudgetsContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const editingId = searchParams.get('id')

  const [patients, setPatients] = useState<any[]>([])
  const [procedures, setProcedures] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [selectedPatient, setSelectedPatient] = useState<string>("")
  const [selectedProcedure, setSelectedProcedure] = useState<string>("none")
  const [items, setItems] = useState<any[]>([])
  const [discount, setDiscount] = useState<number>(0)
  const [mounted, setMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState("")
  const [documentId, setDocumentId] = useState("")
  const [activeTab, setActiveTab] = useState("create")

  useEffect(() => {
    setMounted(true)
    setCurrentDate(new Date().toLocaleDateString())
    setDocumentId(`PRE-${Date.now().toString().slice(-6)}`)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [patRes, procRes, budgetsRes, profileRes] = await Promise.all([
      supabase.from('patients').select('id, first_name, last_name').order('first_name', { ascending: true }),
      supabase.from('procedures').select('id, name, cost').order('name', { ascending: true }),
      supabase.from('budgets').select('*, patients(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single()
    ])
    setPatients(patRes.data || [])
    setProcedures(procRes.data || [])
    setBudgets(budgetsRes.data || [])
    setProfile(profileRes.data)

    if (editingId) {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, budget_items(*, procedures(*))')
        .eq('id', editingId)
        .single()

      if (budgetData) {
        setSelectedPatient(budgetData.patient_id)
        setDiscount(Number(budgetData.discount))
        setDocumentId(`PRE-ED-${budgetData.id.slice(0, 6)}`)
        setItems(budgetData.budget_items.map((bi: any) => ({
          ...bi.procedures,
          cost: Number(bi.custom_cost),
          tempId: crypto.randomUUID(),
          procedure_id: bi.procedure_id
        })))
        setActiveTab("create")
      }
    } else {
      // If we cleared the ID, it was because we want to reset
      // but only if we are already in the "create" tab
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [editingId])

  const addItem = (procedureId: string) => {
    const procedure = procedures.find(p => p.id === procedureId)
    if (procedure) {
      setItems([...items, { ...procedure, tempId: crypto.randomUUID(), procedure_id: procedure.id, cost: Number(procedure.cost) }])
      toast.success("Procedimiento añadido")
    }
  }

  const updateItemCost = (tempId: string, newCost: number) => {
    setItems(items.map(item => 
      item.tempId === tempId ? { ...item, cost: newCost } : item
    ))
  }

  const removeItem = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId))
  }

  const subtotal = items.reduce((acc, item) => acc + Number(item.cost), 0)
  const total = subtotal - discount

  const handleSave = async () => {
    if (!selectedPatient) return toast.error("Seleccione un paciente")
    if (items.length === 0) return toast.error("Añada al menos un procedimiento")

    setIsSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsSaving(false)
      return toast.error("Sesión no válida")
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          patient_id: selectedPatient,
          subtotal,
          discount,
          total
        })
        .eq('id', editingId)

      if (updateError) {
        setIsSaving(false)
        return toast.error("Error al actualizar presupuesto: " + updateError.message)
      }

      await supabase.from('budget_items').delete().eq('budget_id', editingId)
      
      const budgetItems = items.map(item => ({
        budget_id: editingId,
        procedure_id: item.procedure_id,
        custom_cost: item.cost
      }))
      await supabase.from('budget_items').insert(budgetItems)
      
      toast.success("Presupuesto actualizado")
      router.push('/dashboard/budgets')
    } else {
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert([
          {
            patient_id: selectedPatient,
            owner_id: user.id,
            subtotal,
            discount,
            total
          }
        ])
        .select()
        .single()

      if (budgetError) {
        setIsSaving(false)
        return toast.error("Error al guardar presupuesto: " + budgetError.message)
      }

      const budgetItems = items.map(item => ({
        budget_id: budget.id,
        procedure_id: item.procedure_id,
        custom_cost: item.cost
      }))

      const { error: itemsError } = await supabase.from('budget_items').insert(budgetItems)

      if (itemsError) {
        toast.error("Error al guardar detalles")
      } else {
        toast.success("Presupuesto guardado")
        setItems([])
        setDiscount(0)
        setSelectedPatient("")
        fetchData()
      }
    }
    setIsSaving(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este presupuesto?")) return
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) toast.error("Error al eliminar")
    else {
      toast.success("Presupuesto eliminado")
      fetchData()
    }
  }

  const resetForm = () => {
    router.push('/dashboard/budgets')
    setItems([])
    setDiscount(0)
    setSelectedPatient("")
    setDocumentId(`PRE-${Date.now().toString().slice(-6)}`)
    setActiveTab("create")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:m-0 print:max-w-none">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8 print:hidden flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground underline decoration-primary/30">Presupuestos</h2>
            <p className="text-muted-foreground italic">Crea y gestiona presupuestos para tus pacientes.</p>
          </div>
          <TabsList className="bg-muted shadow-inner px-1">
            <TabsTrigger value="create" onClick={resetForm} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {editingId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Historial de Presupuestos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6 print:hidden">
              <Card className="shadow-lg border-border/50">
                <CardHeader className="py-4 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" /> Detalles del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Paciente</Label>
                    <Select value={selectedPatient} onValueChange={(val: string | null) => setSelectedPatient(val ?? "")}>
                      <SelectTrigger className="h-11">
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
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Añadir Servicio</Label>
                    <Select 
                      value={selectedProcedure}
                      onValueChange={(val: string | null) => {
                        if (val && val !== "none") {
                          addItem(val)
                          setTimeout(() => setSelectedProcedure("none"), 100)
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 border-dashed">
                        <SelectValue>
                          {loading ? "Cargando..." : "Seleccionar Procedimiento"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {procedures.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - RD$ {Number(p.cost).toLocaleString()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Descuento Especial (RD$)</Label>
                    <Input 
                      type="number" 
                      className="h-11"
                      value={discount} 
                      onChange={(e) => setDiscount(Number(e.target.value))} 
                      placeholder="0.00"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button variant="outline" onClick={handlePrint} disabled={items.length === 0} className="h-11">
                      <Printer className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button onClick={handleSave} disabled={items.length === 0 || isSaving} className="h-11 shadow-md bg-emerald-600 hover:bg-emerald-700">
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {editingId ? 'Actualizar' : 'Guardar'}
                    </Button>
                  </div>
                  {editingId && (
                    <Button variant="ghost" onClick={resetForm} className="w-full text-xs italic text-muted-foreground">Cancelar edición</Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 print-full-width">
              <Card className="shadow-2xl border-border/50 min-h-[8.5in] print:min-h-[10in] flex flex-col bg-white print:shadow-none print:border-none ring-1 ring-primary/5">
                <CardContent className="p-8 md:p-14 print:p-12 space-y-10 flex-1 flex flex-col font-sans">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-primary/10 pb-8">
                    <div className="space-y-1">
                      <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">{profile?.clinic_name || 'CLÍNICA DENTAL'}</h1>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] italic">
                        {profile ? `${getDoctorTitle(profile.gender)} ${profile.first_name} ${profile.last_name}` : 'Servicios Odontológicos Profesionales'}
                      </p>
                    </div>
                    <div className="text-right space-y-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic opacity-60">
                      <p>Fecha de emisión</p>
                      <p className="text-sm not-italic text-foreground">{currentDate || '...'}</p>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="bg-muted/10 p-6 rounded-2xl border border-muted/20 text-sm ring-1 ring-inset ring-primary/5 print:bg-transparent">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] font-black block mb-2 tracking-[0.2em] opacity-60">Paciente</span>
                        <span className="font-bold text-lg text-primary uppercase leading-none">
                          {selectedPatient ? patients.find(p => p.id === selectedPatient)?.first_name + ' ' + patients.find(p => p.id === selectedPatient)?.last_name : '---'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground uppercase text-[10px] font-black block mb-2 tracking-[0.2em] opacity-60">No. Documento</span>
                        <span className="font-mono text-muted-foreground font-bold">{documentId || '...'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Treatments Table */}
                  <div className="space-y-6 flex-1">
                    <div className="grid grid-cols-12 border-b-2 border-primary/5 pb-3 text-[10px] font-black uppercase text-primary/40 tracking-[0.4em]">
                      <div className="col-span-8">Descripción del Tratamiento</div>
                      <div className="col-span-4 text-right">Monto Unitario (RD$)</div>
                    </div>
                    
                    <div className="space-y-6 min-h-[250px] pt-4">
                      {items.length > 0 ? (
                        items.map((item) => (
                          <div key={item.tempId} className="grid grid-cols-12 items-center text-[15px] group border-b border-muted/10 pb-6 last:border-0 print:pb-4">
                            <div className="col-span-8 font-bold text-foreground/80 italic tracking-tight">
                              {item.name}
                            </div>
                            <div className="col-span-4 text-right font-mono flex items-center justify-end gap-3">
                              <span className="print:inline hidden group-hover:hidden font-bold">
                                RD$ {Number(item.cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="flex items-center bg-primary/5 border border-primary/10 rounded-md px-2 py-1 group-hover:flex print:hidden ring-1 ring-primary/5">
                                <span className="text-[10px] font-black text-primary/40 mr-2 tracking-tighter">RD$</span>
                                <input 
                                  type="number" 
                                  className="bg-transparent border-none focus:ring-0 w-24 text-right text-sm font-bold font-mono p-0 h-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-primary"
                                  value={item.cost}
                                  onChange={(e) => updateItemCost(item.tempId, Number(e.target.value))}
                                />
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 print:hidden hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeItem(item.tempId)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-primary/10 rounded-2xl bg-muted/5">
                          <Calculator className="h-10 w-10 mb-4 animate-pulse" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-center px-10 leading-loose">Añada procedimientos para generar el presupuesto imprimible.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="border-t-4 border-double border-primary/10 pt-10 space-y-4 bg-primary/[0.02] -mx-14 px-14 pb-10 rounded-b-3xl print:mx-0 print:px-6 print:bg-transparent mt-auto">
                    <div className="flex justify-end gap-12 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      <span>Subtotal servicios:</span>
                      <span className="font-mono w-48 text-right not-italic text-foreground">RD$ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-end gap-12 text-xs text-emerald-600 font-bold uppercase tracking-[0.2em]">
                        <span>Descuento aplicado:</span>
                        <span className="font-mono w-48 text-right not-italic">- RD$ {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-end pt-6">
                      <div className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl flex items-center gap-12 shadow-2xl shadow-primary/20 print:shadow-none print:py-3 print:bg-muted/10 print:text-primary print:border print:border-primary/20">
                        <span className="text-[9px] uppercase font-black tracking-[0.4em] opacity-70 leading-tight">Total<br />presupuesto</span>
                        <span className="text-2xl font-black font-mono tracking-tighter">RD$ {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div className="pt-20 text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] italic">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-64 border-b border-muted-foreground/20 mb-2"></div>
                      <h3 className="text-2xl font-black tracking-tight uppercase text-foreground not-italic">
                        {profile ? `${getDoctorTitle(profile.gender)} ${profile.first_name} ${profile.last_name}` : 'DRA. PROFESIONAL'}
                      </h3>
                      <p className="text-sm font-bold text-primary tracking-widest uppercase not-italic italic">Especialista Dental</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-muted-foreground/50 pt-10 border-t border-border/40 border-dashed italic mt-12">
                      <div className="text-left space-y-1">
                        <p>{profile?.clinic_name || 'Clínica Dental Profesional'}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p>{profile?.clinic_address || 'Santo Domingo, R.D.'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle>Historial de Presupuestos</CardTitle>
              <p className="text-sm text-muted-foreground">Listado de todos los presupuestos emitidos a la fecha.</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.length > 0 ? (
                      budgets.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{moment(b.created_at).format('DD/MM/YYYY')}</TableCell>
                          <TableCell className="uppercase font-bold text-xs">{b.patients?.first_name} {b.patients?.last_name}</TableCell>
                          <TableCell className="text-right font-mono font-bold">RD$ {Number(b.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  router.push(`/dashboard/budgets?id=${b.id}`)
                                  // The useEffect will handle the rest
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-1" /> Editar
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(b.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                          No hay presupuestos registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
