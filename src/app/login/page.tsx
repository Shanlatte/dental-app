"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Hospital } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    console.log("Iniciando autenticación...", isSignUp ? "Registro" : "Login")
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) {
          console.error("Error en Registro:", error)
          toast.error("Error al registrarse: " + error.message)
        } else {
          console.log("Registro exitoso:", data)
          toast.success("¡Registro exitoso! Ya puedes iniciar sesión.")
          setIsSignUp(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          console.error("Error en Login:", error)
          toast.error("Error al iniciar sesión: Credenciales no válidas")
        } else {
          console.log("Login exitoso:", data)
          toast.success("¡Bienvenido de nuevo, Doctor(a)!")
          router.push("/dashboard")
          setTimeout(() => router.refresh(), 100)
        }
      }
    } catch (err) {
      console.error("Error inesperado:", err)
      toast.error("Ocurrió un error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-primary/10 -z-10" />
      
      <Card className="w-full max-w-sm shadow-2xl border-border/50 animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center pb-8 border-b bg-muted/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110">
            <Hospital className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight">Dental App</CardTitle>
          </div>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-5 pt-8 pb-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Correo Profesional</Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                placeholder="doctor@clinica.com" 
                required 
                className="h-12 bg-background/50 focus:bg-background transition-colors"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contraseña</Label>
                {!isSignUp && (
                  <Button variant="link" className="px-0 h-auto text-xs font-semibold text-primary/80" type="button">¿Olvidó su contraseña?</Button>
                )}
              </div>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required 
                className="h-12 bg-background/50 focus:bg-background transition-colors"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? "Registrarse" : "Iniciar Sesión")}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="fixed bottom-6 text-center text-[10px] text-muted-foreground uppercase font-bold tracking-[0.3em] opacity-40 italic">
        Gestión Dental Profesional &bull; Santo Domingo, R.D. &bull; {new Date().getFullYear()}
      </div>
    </div>
  )
}
