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

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  permisosRequeridos?: string[]
  items?: SubItem[]
}

interface MenuGroup {
  grupo: string
  items: MenuItem[]
}

// ─── Menú organizado por flujo de trabajo ─────────────────────────────────────

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
        title: "Ventas / POS",
        url: "/dashboard/ventas",
        icon: ShoppingCart,
        permisosRequeridos: ["ver_ventas"],
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
        permisosRequeridos: ["ver_inventario", "ver_kardex", "ver_productos"],
        items: [
          { title: "Maestro Productos", url: "/dashboard/productos", permisosRequeridos: ["ver_productos"] },
          { title: "Consulta Stock", url: "/dashboard/inventario/consulta", permisosRequeridos: ["ver_inventario"] },
          { title: "Reporte Kardex", url: "/dashboard/inventario/kardex", permisosRequeridos: ["ver_kardex"] },
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
        permisosRequeridos: ["ver_compras", "ver_proveedores"],
        items: [
          { title: "Proveedores", url: "/dashboard/compras/proveedores", permisosRequeridos: ["ver_proveedores"] },
          { title: "Ingreso Mercancía", url: "/dashboard/compras/ingreso", permisosRequeridos: ["ver_compras"] },
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

// ─── Componente ───────────────────────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user)
  const { permisos } = usePermisosStore()

  const esRoot = permisos.includes("ROOT")

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
