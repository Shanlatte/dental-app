"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { User, Lock, Building, Phone, MapPin, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/utils/supabase/client"

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    clinic_name: "",
    clinic_address: "",
    clinic_phone: "",
    gender: "none",
    email: ""
  })

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  })

  useEffect(() => {
    const fetchProfile = async () => {
      setFetching(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          setProfile({
            ...profileData,
            email: user.email || ""
          })
        } else {
          setProfile(prev => ({ ...prev, email: user.email || "" }))
        }
      }
      setFetching(false)
    }
    fetchProfile()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return toast.error("Sesión no válida")

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        clinic_name: profile.clinic_name,
        clinic_address: profile.clinic_address,
        clinic_phone: profile.clinic_phone,
        gender: profile.gender,
        updated_at: new Date().toISOString()
      })

    if (error) {
      toast.error("Error al actualizar perfil: " + error.message)
    } else {
      toast.success("Perfil actualizado correctamente")
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      return toast.error("Las contraseñas no coinciden")
    }
    if (passwords.new.length < 6) {
      return toast.error("La contraseña debe tener al menos 6 caracteres")
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: passwords.new
    })

    if (error) {
      toast.error("Error al actualizar contraseña: " + error.message)
    } else {
      toast.success("Contraseña actualizada correctamente")
      setPasswords({ current: "", new: "", confirm: "" })
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
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Configuración de Cuenta</h2>
        <p className="text-muted-foreground italic">Gestiona tu información personal y seguridad de acceso.</p>
      </div>

      <Separator />

      <div className="grid gap-8">
        {/* Profile Information */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </div>
            <CardDescription className="italic">Actualiza tu nombre y correo electrónico de cuenta.</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input 
                    id="firstName" 
                    value={profile.first_name} 
                    onChange={(e) => setProfile({...profile, first_name: e.target.value})} 
                    placeholder="Ej: Juan" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input 
                    id="lastName" 
                    value={profile.last_name} 
                    onChange={(e) => setProfile({...profile, last_name: e.target.value})} 
                    placeholder="Ej: Perez" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo / Género</Label>
                  <Select 
                    value={profile.gender} 
                    onValueChange={(val: string | null) => setProfile({...profile, gender: val ?? "none"})}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Seleccione sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      <SelectItem value="masculino">Masculino (Dr.)</SelectItem>
                      <SelectItem value="femenino">Femenino (Dra.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico (Solo Lectura)</Label>
                  <Input id="email" type="email" value={profile.email} disabled className="bg-muted/50" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-4">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Seguridad</CardTitle>
            </div>
            <CardDescription className="italic">Actualiza tu contraseña para mantener tu cuenta segura.</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={passwords.new} 
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={passwords.confirm} 
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-4">
              <Button variant="outline" type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Actualizar Contraseña
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
