"use client"

import * as React from "react"
import { useAuthStore } from "@/store/auth-store"
import {
  GalleryVerticalEnd,
  SquareTerminal,
  Package,      
  ShoppingBag,  
  Users,        
  ShoppingCart, 
  PieChart,     
  ChevronRight, 
  IdCard,
  UserCog,
  Briefcase,
  BarChart3,
  Wallet,
  LogOut,
  Shield,

} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Definimos la estructura del menú
const data = {

  items: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
    },

    //  GESTIÓN DE IDENTIDAD
    {
      title: "Gestión Usuarios",
      url: "#",
      icon: IdCard,
      items: [
        {
          title: "Usuarios Sistema",
          url: "/dashboard/gestion-id/usuarios",
          icon: UserCog
        },
        {
          title: "Fuerza de Ventas",
          url: "/dashboard/gestion-id/vendedores",
          icon: Briefcase
        },
        {
          title: "Roles y Permisos",
          url: "/dashboard/gestion-id/roles",
          icon: Shield
        }
      ],
    },
    
    // --- MÓDULO DE COMPRAS ---
    {
      title: "Compras",
      url: "#",
      icon: ShoppingBag,
      items: [
        {
          title: "Proveedores",
          url: "/dashboard/compras/proveedores",
        },
        {
          title: "Ingreso Mercancía",
          url: "/dashboard/compras/ingreso",
        },
      ],
    },

    // --- MÓDULO DE INVENTARIO ---
    {
      title: "Inventario",
      url: "#",
      icon: Package,
      items: [
        {
          title: "Maestro Productos",
          url: "/dashboard/productos",
        },
        {
          title: "Consulta Stock",
          url: "/dashboard/inventario/consulta",
        },
        {
          title: "Reporte Kardex",
          url: "/dashboard/inventario/kardex",
        },
      ],
    },

    // --- VENTAS ---
    {
      title: "Ventas / POS",
      url: "/dashboard/ventas",
      icon: ShoppingCart,
    },
    

    // --- GESTIÓN DE CLIENTES ---
    {
      title: "Gestión de Clientes",
      url: "#", // Queda con '#' porque ahora es el botón que despliega el menú
      icon: Users,
      isActive: false, // Ponlo en true si quieres que aparezca desplegado por defecto
      items: [
        {
          title: "Cartera Clientes",
          url: "/dashboard/clientes",
        },
        //{
          //title: "Perfil Cliente",
          //url: "/dashboard/clientes/[id]", // Redirige al directorio por ahora
        //},
      ],
    },
    
    // 👇 2. NUEVO MÓDULO FINANZAS
    {
      title: "Finanzas",
      url: "#",
      icon: PieChart, // Icono de torta para finanzas
      items: [
        {
          title: "Cuentas por Cobrar",
          url: "/dashboard/cxc", // Ruta de la página que creamos
          icon: Wallet
        },
        {
          // 2. EL MÓDULO NUEVO (OPERATIVO)
          title: "Cobranza",
          url: "/dashboard/finanzas/cobranza",
        },
      ]
    },

    // LISTADO DE REPORTES
    {
      title: "Reportes",
      url: "/dashboard/reportes",
      icon: BarChart3,
      items: [
        {
          title: "Valoración Inventario",
          url: "/dashboard/reportes/inventario-valorizado",
        },
        {
          title: "Ventas & Rentabilidad",
          url: "/dashboard/reportes/ventas",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2 cursor-pointer text-sidebar-primary-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight text-slate-900">
                  <span className="truncate font-semibold">ERP System</span>
                  <span className="truncate text-xs">v1.0.0</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarMenu>
            {data.items.map((item) => (
              <div key={item.title}>
                {item.items && item.items.length > 0 ? (
                  /* Lógica para menús con hijos (Collapsible) */
                  <Collapsible asChild defaultOpen={false} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  /* Lógica para enlaces simples */
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <a href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </div>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
  <SidebarMenu>
    <SidebarMenuItem>
      <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500 border-t">
        <div className="size-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
        {(user?.nombre?.charAt(0) || "U")}
        </div>
        <div className="grid flex-1 text-left leading-tight">
          <span className="truncate font-semibold text-slate-700">{user?.nombre || "Usuario"}</span>
          <span className="truncate text-[10px] text-slate-400">{user?.email || ""}</span>
        </div>
      </div>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Cerrar Sesión"
        onClick={() => {
          document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          window.location.href = "/login";
        }}
        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="size-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Cerrar Sesión</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}