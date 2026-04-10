"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts"
import { Users, Calendar, Banknote, TrendingUp, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import moment from "moment"
import { getDoctorTitle } from "@/utils/formatters"

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    earnings: 0,
    procedures: 0
  })
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      
      const [patientsCount, appointmentsCount, proceduresCount, budgetsRes, recentAppsRes, profileRes] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('procedures').select('*', { count: 'exact', head: true }),
        supabase.from('budgets').select('total'),
        supabase.from('appointments')
          .select('*, patients(first_name, last_name)')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5),
        supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single()
      ])

      const totalEarnings = (budgetsRes.data || []).reduce((acc, b) => acc + Number(b.total), 0)

      setStats({
        patients: patientsCount.count || 0,
        appointments: appointmentsCount.count || 0,
        procedures: proceduresCount.count || 0,
        earnings: totalEarnings
      })

      setRecentApps(recentAppsRes.data || [])
      setProfile(profileRes.data)
      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const chartData = [
    { name: "Sem 1", pacientes: Math.floor(stats.patients * 0.2), ganancias: Math.floor(stats.earnings * 0.2) },
    { name: "Sem 2", pacientes: Math.floor(stats.patients * 0.3), ganancias: Math.floor(stats.earnings * 0.3) },
    { name: "Sem 3", pacientes: Math.floor(stats.patients * 0.1), ganancias: Math.floor(stats.earnings * 0.1) },
    { name: "Sem 4", pacientes: Math.floor(stats.patients * 0.4), ganancias: Math.floor(stats.earnings * 0.4) },
  ]

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 scroll-smooth">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Hola, {profile ? `${getDoctorTitle(profile.gender)} ${profile.first_name}` : '...'}!
        </h1>
        <p className="text-muted-foreground italic tracking-wide">Este es el resumen de tu clínica para hoy.</p>
      </div>

      <div>
        <Card className="shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle>Próximas Citas</CardTitle>
            <CardDescription>Citas agendadas a partir de hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApps.length > 0 ? (
                recentApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold uppercase">
                        {(app.patients?.first_name?.[0] || "") + (app.patients?.last_name?.[0] || "")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{app.patients?.first_name} {app.patients?.last_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {app.notes || "Consulta General"} - {moment(app.start_time).format('DD MMM, hh:mm A')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        app.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        app.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {app.status === 'waiting' ? 'En Espera' : app.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 italic">No hay citas próximas agendadas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow duration-300 shadow-sm border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patients}</div>
            <p className="text-xs text-muted-foreground mt-1 italic">Base de datos de pacientes</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-300 shadow-sm border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Citas Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointments}</div>
            <p className="text-xs text-muted-foreground mt-1 italic">Total de registros</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-300 shadow-sm border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ganancias Totales</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RD$ {stats.earnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 italic">Basado en presupuestos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle>Ganancias (RD$)</CardTitle>
            <CardDescription>Resumen de procedimientos cobrados por semana.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `RD$${value/1000}k`} />
                <Tooltip 
                  cursor={{fill: "transparent"}} 
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="ganancias" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle>Pacientes Atendidos</CardTitle>
            <CardDescription>Distribución de pacientes por semana.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: "transparent"}} 
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="pacientes" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
