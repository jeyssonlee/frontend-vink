"use client"

import * as React from "react"
import {
  GalleryVerticalEnd,
  Package,
  Users,
  ShoppingCart,
  PieChart,
  LayoutDashboard,
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
} from "@/components/ui/sidebar"

// Menú del ERP con los iconos y rutas correspondientes
const data = {
  user: {
    name: "Jeysson Admin",
    email: "admin@erp.com",
  },
  items: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventario",
      url: "/dashboard/inventario",
      icon: Package,
    },
    {
      title: "Ventas / Facturación",
      url: "/dashboard/ventas",
      icon: ShoppingCart,
    },
    {
      title: "Clientes",
      url: "/dashboard/clientes",
      icon: Users,
    },
    {
      title: "Cobranza",
      url: "/dashboard/cobranzas",
      icon: PieChart,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-200">
      {/* 🟢 HEADER FUSIONADO: Aquí es donde vive ahora la identidad que antes estaba en el Panel de Control */}
      <SidebarHeader className="h-14 flex items-center justify-center border-b border-slate-100 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                {/* Logo del ERP con tus colores (Negro Slate) */}
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold text-slate-800 text-sm uppercase tracking-tight">
                    ERP System
                  </span>
                  <span className="truncate text-[10px] text-slate-400 font-medium">
                    v1.0.0 • Corporativo
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2 mt-2">
            Plataforma
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1 px-2">
            {data.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title}
                  className="hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all py-5"
                >
                  <a href={item.url} className="flex items-center gap-3">
                    <item.icon className="size-5" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-2 bg-white">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                {data.user.name.charAt(0)}
            </div>
            <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-semibold text-slate-700">{data.user.name}</span>
                <span className="truncate text-[10px] text-slate-400">{data.user.email}</span>
            </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}