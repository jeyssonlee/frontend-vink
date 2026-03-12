"use client"

import * as React from "react"
import { useAuthStore } from "@/store/auth-store"
import { usePermisosStore } from "@/store/permisos.store"
import {
  GalleryVerticalEnd,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
  Warehouse,
  ShoppingBag,
  Wallet,
  BarChart3,
  UserCog,
  Shield,
  Briefcase,
  Settings2,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  ClipboardList,
  Building2, // 👈 NUEVO
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

interface SubItem {
  title: string
  url: string
  permisosRequeridos?: string[]
}

interface MenuItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  soloRoot?: boolean
  soloSuperAdmin?: boolean // 👈 NUEVO flag
  permisosRequeridos?: string[]
  items?: SubItem[]
}

interface MenuGroup {
  grupo: string
  items: MenuItem[]
}

const menuData: MenuGroup[] = [
  {
    grupo: "Principal",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        permisosRequeridos: [],
      },
    ],
  },
  
  {
    grupo: "Operaciones",
    items: [
      {
        title: "Ventas",
        url: "#",
        icon: ShoppingCart,
        permisosRequeridos: ["ver_ventas", "ver_reportes_ventas"],
        items:[
          { title: "Facturación", url: "/dashboard/ventas", permisosRequeridos: ["ver_ventas"] },
          { title: "Reporte de Ventas", url: "/dashboard/reportes/ventas", permisosRequeridos: ["ver_reportes_ventas"] }
        ],
      },
      {
        title: "Pedidos",
        url: "#",
        icon: ClipboardList,
        permisosRequeridos: ["ver_pedidos", "crear_pedidos", "revisar_pedidos", "facturar_pedidos"],
        items: [
          { title: "Nuevo Pedido", url: "/dashboard/pedidos/nuevo", permisosRequeridos: ["crear_pedidos"] },
          { title: "Mis Pedidos", url: "/dashboard/pedidos", permisosRequeridos: ["ver_pedidos"] },
          { title: "Bandeja de Revisión", url: "/dashboard/pedidos/bandeja", permisosRequeridos: ["revisar_pedidos"] },
          { title: "Facturación", url: "/dashboard/pedidos/facturacion", permisosRequeridos: ["facturar_pedidos"] },
        ],
      },
      {
        title: "Clientes",
        url: "#",
        icon: Users,
        permisosRequeridos: ["ver_clientes", "ver_perfil_cliente"],
        items: [
          { title: "Cartera de Clientes", url: "/dashboard/clientes", permisosRequeridos: ["ver_clientes"] },
          { title: "Perfil Cliente", url: "/dashboard/clientes/perfil", permisosRequeridos: ["ver_perfil_cliente"] },
        ],
      },
      {
        title: "Cobranza",
        url: "#",
        icon: CreditCard,
        permisosRequeridos: ["ver_cobranzas"],
        items: [
          { title: "Cuentas por Cobrar", url: "/dashboard/cxc", permisosRequeridos: ["ver_cobranzas"] },
          { title: "Gestión Cobranza", url: "/dashboard/finanzas/cobranza", permisosRequeridos: ["ver_cobranzas"] },
        ],
      },
    ],
  },

  {
    grupo: "Inventario & Compras",
    items: [
      {
        title: "Inventario",
        url: "#",
        icon: Package,
        permisosRequeridos: ["ver_inventario", "ver_kardex", "ver_productos", "ver_inventario_valorizado"],
        items: [
          { title: "Maestro Productos", url: "/dashboard/productos", permisosRequeridos: ["ver_productos"] },
          { title: "Consulta Stock", url: "/dashboard/inventario/consulta", permisosRequeridos: ["ver_inventario"] },
          { title: "Reporte Kardex", url: "/dashboard/inventario/kardex", permisosRequeridos: ["ver_kardex"] },
          { title: "Inventario Valorizado", url: "/dashboard/reportes/inventario-valorizado", permisosRequeridos: ["ver_inventario_valorizado"] },
        ],
      },
      {
        title: "Almacenes",
        url: "/dashboard/almacenes",
        icon: Warehouse,
        permisosRequeridos: ["ver_almacenes"],
      },
      {
        title: "Compras",
        url: "#",
        icon: ShoppingBag,
        permisosRequeridos: ["ver_compras", "ver_proveedores", "ver_reportes_compras", "ver_cuentas_pagar", "pagar_cuentas"],
        items: [
          { title: "Proveedores", url: "/dashboard/compras/proveedores", permisosRequeridos: ["ver_proveedores"] },
          { title: "Ingreso Mercancía", url: "/dashboard/compras/ingreso", permisosRequeridos: ["ver_compras"] },
          { title: "Reporte Compras", url: "/dashboard/compras/historial", permisosRequeridos: ["ver_reportes_compras"] },
          { title: "Cuentas por Pagar", url: "/dashboard/compras/cuentas-pagar", permisosRequeridos: ["ver_cuentas_pagar"] },
        ],
      },
    ],
  },

  {
    grupo: "Administración",
    items: [
      {
        title: "Usuarios",
        url: "/dashboard/gestion-id/usuarios",
        icon: UserCog,
        permisosRequeridos: ["ver_usuarios"],
      },
      {
        title: "Fuerza de Ventas",
        url: "/dashboard/gestion-id/vendedores",
        icon: Briefcase,
        permisosRequeridos: ["ver_vendedores"],
      },
      {
        title: "Roles y Permisos",
        url: "/dashboard/gestion-id/roles",
        icon: Shield,
        permisosRequeridos: ["editar_roles"],
      },
    ],
  },

  {
    grupo: "Sistema",
    items: [
      // 👇 NUEVO — Panel SUPER_ADMIN, visible solo para SUPER_ADMIN y ROOT
      {
        title: "Panel SUPER_ADMIN",
        url: "/dashboard/super-admin",
        icon: Building2,
        soloSuperAdmin: true,
      },
      {
        title: "Nuevo Cliente",
        url: "/dashboard/onboarding",
        icon: Settings2,
        permisosRequeridos: [],
        soloRoot: true,
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user) as any
  const { permisos } = usePermisosStore()

  const esRoot = permisos.includes("ROOT")
  // 👇 NUEVO — detectar SUPER_ADMIN por el rol del usuario en el store
  const esSuperAdmin = user?.rol === "SUPER_ADMIN" || esRoot

  function tieneAcceso(permisosRequeridos: string[] = []): boolean {
    if (esRoot) return true
    if (permisosRequeridos.length === 0) return true
    return permisosRequeridos.some((p) => permisos.includes(p))
  }

  const gruposFiltrados = menuData
    .map((grupo) => ({
      ...grupo,
      items: grupo.items
        .filter((item) => {
          if (item.soloRoot) return esRoot
          if (item.soloSuperAdmin) return esSuperAdmin // 👈 NUEVO filtro
          return tieneAcceso(item.permisosRequeridos)
        })
        .map((item) => ({
          ...item,
          items: item.items?.filter((sub) => tieneAcceso(sub.permisosRequeridos)),
        }))
        .filter((item) => !item.items || item.items.length > 0),
    }))
    .filter((grupo) => grupo.items.length > 0)

  function handleLogout() {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    localStorage.removeItem("token")
    usePermisosStore.getState().limpiarPermisos()
    useAuthStore.getState().clearUser()
    window.location.href = "/login"
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ERP System</span>
                  <span className="truncate text-xs text-muted-foreground">v1.0.0</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {gruposFiltrados.map((grupo) => (
          <SidebarGroup key={grupo.grupo}>
            <SidebarGroupLabel>{grupo.grupo}</SidebarGroupLabel>
            <SidebarMenu>
              {grupo.items.map((item) => (
                <div key={item.title}>
                  {item.items && item.items.length > 0 ? (
                    <Collapsible asChild defaultOpen={false} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((sub) => (
                              <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton asChild>
                                  <a href={sub.url}>
                                    <span>{sub.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-2 text-xs border-t">
              <div className="size-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                {user?.nombre?.charAt(0) || "U"}
              </div>
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate font-semibold text-slate-700 text-xs">
                  {user?.nombre || "Usuario"}
                </span>
                <span className="truncate text-[10px] text-slate-400">
                  {user?.email || ""}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar Sesión"
              onClick={handleLogout}
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
