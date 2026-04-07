"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Building, Phone, MapPin, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export default function ClinicPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [profile, setProfile] = useState({
    clinic_name: "",
    clinic_address: "",
    clinic_phone: "",
  })

  useEffect(() => {
    const fetchClinicData = async () => {
      setFetching(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('clinic_name, clinic_address, clinic_phone')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
        }
      }
      setFetching(false)
    }
    fetchClinicData()
  }, [])

  const handleUpdateClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return toast.error("Sesión no válida")

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        clinic_name: profile.clinic_name,
        clinic_address: profile.clinic_address,
        clinic_phone: profile.clinic_phone,
        updated_at: new Date().toISOString()
      })

    if (error) {
      toast.error("Error al actualizar información: " + error.message)
    } else {
      toast.success("Información de la clínica actualizada")
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Mi Clínica</h2>
        <p className="text-muted-foreground italic">Gestiona la información pública de tu centro dental.</p>
      </div>

      <Separator />

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Información de la Clínica</CardTitle>
          </div>
          <CardDescription className="italic">Estos datos aparecerán en todas las recetas y presupuestos que generes.</CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateClinic}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nombre de la Clínica</Label>
              <Input 
                id="clinicName" 
                value={profile.clinic_name} 
                onChange={(e) => setProfile({...profile, clinic_name: e.target.value})} 
                placeholder="Ej: Centro Dental OdontoSalud" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <div className="flex items-center gap-2 italic text-xs uppercase tracking-wider font-semibold opacity-70">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    Teléfono de Contacto
                  </div>
                </Label>
                <Input 
                  id="phone" 
                  value={profile.clinic_phone} 
                  onChange={(e) => setProfile({...profile, clinic_phone: e.target.value})} 
                  placeholder="809-555-0123" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">
                  <div className="flex items-center gap-2 italic text-xs uppercase tracking-wider font-semibold opacity-70">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Dirección Física
                  </div>
                </Label>
                <Input 
                  id="address" 
                  value={profile.clinic_address} 
                  onChange={(e) => setProfile({...profile, clinic_address: e.target.value})} 
                  placeholder="Calle Sol #12, Gazcue" 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t pt-4">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar Información
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
        <h4 className="font-bold text-primary flex items-center gap-2">
          <Building className="h-4 w-4" /> Uso de esta información
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed italic">
          La información configurada aquí es vital para la profesionalidad de tu consultorio. Se utilizará automáticamente para el timbrado de:
        </p>
        <ul className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-2 list-disc pl-5 italic">
          <li>Presupuestos detallados para pacientes.</li>
          <li>Recetas médicas y farmacológicas.</li>
          <li>Historiales clínicos imprimibles.</li>
          <li>Documentos de consentimiento.</li>
        </ul>
      </div>
    </div>
  )
}
