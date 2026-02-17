"use client";

import Link from "next/link";
import { 
  ShoppingCart, 
  PackagePlus, 
  Search, 
  UserPlus, 
  ArrowUpRight, 
  CreditCard, 
  DollarSign, 
  Activity, 
  Users 
} from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SystemInfo } from "@/components/system-info";

export default function Page() {
    return (
      <div className="flex flex-col h-screen bg-slate-50/30">
        
        {/* --- HEADER --- */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white px-4">
          {/* Lado Izquierdo: Trigger y Título */}
          <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="font-semibold text-slate-800">Panel Principal</span>
          </div>
  
          {/* Lado Derecho: Iconos de Sistema */}
          <div className="flex items-center gap-2">
              {/* Aquí colocamos el nuevo componente */}
              <SystemInfo /> 
          </div>
        </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* --- SECCIÓN 1: TARJETAS DE ACCESO RÁPIDO (NUEVO DISEÑO) --- */}
        <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Operaciones Frecuentes</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* TARJETA 1: POS */}
                <Link href="/dashboard/ventas" className="group">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex items-center gap-4">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="shrink-0 h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 group-hover:text-blue-700">Punto de Venta</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Facturación rápida.</p>
                        </div>
                    </div>
                </Link>

                {/* TARJETA 2: COMPRAS */}
                <Link href="/dashboard/compras/ingreso" className="group">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl hover:border-green-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex items-center gap-4">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="shrink-0 h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <PackagePlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 group-hover:text-green-700">Ingreso Mercancía</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Registrar facturas.</p>
                        </div>
                    </div>
                </Link>

                {/* TARJETA 3: CONSULTA */}
                <Link href="/dashboard/inventario/consulta" className="group">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl hover:border-orange-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex items-center gap-4">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="shrink-0 h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Search className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 group-hover:text-orange-700">Consultar Stock</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Verificar precios.</p>
                        </div>
                    </div>
                </Link>

                {/* TARJETA 4: CLIENTES */}
                <Link href="/dashboard/clientes" className="group">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl hover:border-purple-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex items-center gap-4">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="shrink-0 h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 group-hover:text-purple-700">Directorio Clientes</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Gestionar cartera.</p>
                        </div>
                    </div>
                </Link>

            </div>
        </section>

        {/* --- SECCIÓN 2: INDICADORES (Placeholder visual) --- */}
        <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Resumen del Mes</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Ingresos Totales</h3>
                        <DollarSign className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold">$45,231.89</div>
                    <p className="text-xs text-slate-500">+20.1% vs mes anterior</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Ventas</h3>
                        <CreditCard className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold">+2350</div>
                    <p className="text-xs text-slate-500">+180.1% vs mes anterior</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Clientes Activos</h3>
                        <Users className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold">+12,234</div>
                    <p className="text-xs text-slate-500">+19% vs mes anterior</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Actividad</h3>
                        <Activity className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold">+573</div>
                    <p className="text-xs text-slate-500">+201 desde la última hora</p>
                </div>
            </div>
        </section>

      </main>
    </div>
  );
}