"use client";

import { useState, useEffect } from "react";
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
  Users,
  Loader2
} from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SystemInfo } from "@/components/system-info";
import { api } from "@/lib/api"; // 🚀 Importamos nuestra API configurada

export default function Page() {
  // 🚀 1. Estado para almacenar nuestros KPIs reales
  const [kpis, setKpis] = useState({
    ingresosTotales: 0,
    ventasMes: 0,
    clientesActivos: 0,
    actividadReciente: 0
  });
  const [cargando, setCargando] = useState(true);

  // 🚀 2. Efecto para buscar la data al cargar el Dashboard
  useEffect(() => {
    const cargarKpis = async () => {
      try {
        // Asumimos que tendrás (o tienes) un endpoint /dashboard/resumen
        const response = await api.get('/dashboard/resumen'); 
        if (response.data) {
          setKpis({
            ingresosTotales: response.data.ingresosTotales || 0,
            ventasMes: response.data.ventasMes || 0,
            clientesActivos: response.data.clientesActivos || 0,
            actividadReciente: response.data.actividadReciente || 0
          });
        }
      } catch (error) {
        console.error("Error al cargar los KPIs del dashboard:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarKpis();
  }, []);

  // Función para formatear moneda
  const formatDinero = (monto: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(monto);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30">
      
      {/* --- HEADER --- */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white px-4">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="font-semibold text-slate-800">Panel Principal</span>
        </div>
        <div className="flex items-center gap-2">
            <SystemInfo /> 
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* --- SECCIÓN 1: TARJETAS DE ACCESO RÁPIDO --- */}
        <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Operaciones Frecuentes</h3>
            {/* (El grid de tarjetas de acceso rápido se mantiene exactamente igual a tu código original) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {/* ... (Aquí van los otros 3 Links: Ingreso Mercancía, Consultar Stock, Directorio Clientes) ... */}
            </div>
        </section>

        {/* --- SECCIÓN 2: INDICADORES DINÁMICOS --- */}
        <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Resumen del Mes</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                
                {/* TARJETA: INGRESOS */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Ingresos Totales</h3>
                        <DollarSign className="h-4 w-4 text-slate-500" />
                    </div>
                    {cargando ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300 mt-2" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{formatDinero(kpis.ingresosTotales)}</div>
                        <p className="text-xs text-slate-500 text-transparent select-none">.</p>
                      </>
                    )}
                </div>

                {/* TARJETA: VENTAS */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Ventas (Facturas)</h3>
                        <CreditCard className="h-4 w-4 text-slate-500" />
                    </div>
                    {cargando ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300 mt-2" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{kpis.ventasMes}</div>
                        <p className="text-xs text-slate-500 text-transparent select-none">.</p>
                      </>
                    )}
                </div>

                {/* TARJETA: CLIENTES */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Clientes Registrados</h3>
                        <Users className="h-4 w-4 text-slate-500" />
                    </div>
                    {cargando ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300 mt-2" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{kpis.clientesActivos}</div>
                        <p className="text-xs text-slate-500 text-transparent select-none">.</p>
                      </>
                    )}
                </div>

                {/* TARJETA: ACTIVIDAD (Ej. Productos en Stock) */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Productos en Stock</h3>
                        <Activity className="h-4 w-4 text-slate-500" />
                    </div>
                    {cargando ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300 mt-2" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{kpis.actividadReciente}</div>
                        <p className="text-xs text-slate-500 text-transparent select-none">.</p>
                      </>
                    )}
                </div>

            </div>
        </section>

      </main>
    </div>
  );
}