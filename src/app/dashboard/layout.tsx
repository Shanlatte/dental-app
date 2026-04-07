import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="print:hidden">
        <AppSidebar />
      </div>
      <SidebarInset className="print:m-0 print:border-none print:shadow-none print:rounded-none">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 print:hidden">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 print:hidden" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold tracking-tight">Clínica Dental</h1>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-10 print:p-0 print:overflow-visible">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
