"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils"; // Utilidad de Shadcn para estilos condicionales

const menuItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/inventario", label: "Inventario", icon: Package }, // 👈 Aquí trabajaremos hoy
  { href: "/dashboard/ventas", label: "Punto de Venta", icon: ShoppingCart },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-slate-950 text-white">
      {/* Logo / Título */}
      <div className="flex h-16 items-center justify-center border-b border-slate-800 gap-2">
        <Store className="h-6 w-6 text-blue-400" />
        <h1 className="text-xl font-bold tracking-wider">VINK</h1>
      </div>
      
      {/* Menú de Navegación */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href; // ¿Estamos en esta página?
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg" // Estilo Activo
                  : "text-slate-400 hover:bg-slate-900 hover:text-white" // Estilo Inactivo
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Botón Salir (Visual por ahora) */}
      <div className="border-t border-slate-800 p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-slate-900 transition-colors">
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}