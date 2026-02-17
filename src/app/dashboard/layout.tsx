import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      {/* Tu sidebar personalizado que ya contiene el título del sistema */}
      <AppSidebar /> 
      
      <SidebarInset>
        {/* Hemos eliminado el <header> que contenía el SidebarTrigger y el h1 "Panel de Control".
           Ahora cada página es responsable de renderizar su propia barra de herramientas 
           integrando el <SidebarTrigger /> si lo desea.
        */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}