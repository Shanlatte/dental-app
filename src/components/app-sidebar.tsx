"use client"

import * as React from "react"
import {
  Calendar,
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  Receipt,
  Settings,
  LogOut,
  User,
  Plus,
  Building
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Citas",
    url: "/dashboard/appointments",
    icon: Calendar,
  },
  {
    title: "Pacientes",
    url: "/dashboard/patients",
    icon: Users,
  },
  {
    title: "Procedimientos",
    url: "/dashboard/procedures",
    icon: Stethoscope,
  },
  {
    title: "Presupuestos",
    url: "/dashboard/budgets",
    icon: Receipt,
  },
  {
    title: "Recetas",
    url: "/dashboard/prescriptions",
    icon: ClipboardList,
  },
  {
    title: "Mi Clínica",
    url: "/dashboard/clinic",
    icon: Building,
  },
]

const ToothIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M7 3C4.23858 3 2 5.23858 2 8C2 10.7614 3.5 13 5.5 14.5C6.5 15.5 7 16.5 7 18C7 19.6569 8.34315 21 10 21C11.6569 21 13 19.6569 13 18C13 16.5 13.5 15.5 14.5 14.5C16.5 13 18 10.7614 18 8C18 5.23858 15.7614 3 13 3C11.5 3 10.5 4 10 5.5C9.5 4 8.5 3 7 3Z" />
    <path d="M17 3C19.7614 3 22 5.23858 22 8C22 10.7614 20.5 13 18.5 14.5C17.5 15.5 17 16.5 17 18C17 19.6569 15.6569 21 14 21C12.3431 21 11 19.6569 11 18C11 16.5 10.5 15.5 9.5 14.5" />
  </svg>
)

export function AppSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const { setOpenMobile, isMobile } = useSidebar()
  const [clinicName, setClinicName] = React.useState<string>("Clínica Dental")
  const [userEmail, setUserEmail] = React.useState<string | null>(null)

  React.useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? "Doctor(a)")
        const { data: profile } = await supabase
          .from('profiles')
          .select('clinic_name')
          .eq('id', user.id)
          .single()
        
        if (profile?.clinic_name) {
          setClinicName(profile.clinic_name)
        }
      }
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-4 border-b">
        <div className="flex items-center gap-2 font-semibold overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ToothIcon />
          </div>
          <span className="truncate group-data-[collapsible=icon]:hidden">{clinicName}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false)
                      }
                    }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{userEmail?.[0].toUpperCase() || "D"}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{userEmail?.split('@')[0] || "Doctor(a)"}</span>
                  <span className="truncate text-xs">Clínica Dental</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{userEmail?.[0].toUpperCase() || "D"}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-foreground">{userEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  render={<Link href="/dashboard/settings" />}
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false)
                    }
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
