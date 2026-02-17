"use client";

import { 
  BarChart3, PieChart, TrendingUp, Package, 
  ArrowUpRight, FileText, CalendarRange, DollarSign,
  ArrowRight, ShieldAlert, Layers
} from "lucide-react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReportesHubPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden font-sans">
      
      {/* 1. NAVBAR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Gerencia / Reportes</span>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-slate-200 text-[10px]">
              Business Intelligence
           </Badge>
        </div>
      </nav>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centro de Reportes</h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Seleccione un módulo para visualizar las métricas clave y exportar datos.
                </p>
            </div>
        </div>

        {/* SECCIÓN 1: INVENTARIO Y COSTOS */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-50 rounded text-blue-600">
                    <Package className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inventario & Logística</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* REPORTE: VALORACIÓN DE INVENTARIO */}
                <Link href="/dashboard/reportes/inventario-valorizado" className="group">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition-all h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="h-5 w-5 text-blue-500" />
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 text-[10px] font-bold">COSTOS</Badge>
                        </div>
                        
                        <h4 className="text-base font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">Valoración de Inventario</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Análisis detallado del costo total de inventario actual, precio de venta proyectado y margen potencial.
                        </p>
                    </div>
                </Link>

                {/* REPORTE: STOCK CRÍTICO */}
                <div className="group opacity-70 hover:opacity-100 transition-opacity">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 h-full relative border-dashed cursor-not-allowed">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                        </div>
                        <h4 className="text-base font-bold text-slate-400 mb-1">Stock Crítico & Reposición</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Productos con existencia por debajo del mínimo y sugerencia de compra.
                        </p>
                    </div>
                </div>

                {/* REPORTE: KARDEX MOVIMIENTOS */}
                <div className="group opacity-70 hover:opacity-100 transition-opacity">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 h-full relative border-dashed cursor-not-allowed">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                <Layers className="h-5 w-5" />
                            </div>
                        </div>
                        <h4 className="text-base font-bold text-slate-400 mb-1">Histórico de Movimientos</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Traza de auditoría de todas las entradas y salidas por almacén.
                        </p>
                    </div>
                </div>

            </div>
        </section>

        <Separator />

        {/* SECCIÓN 2: VENTAS Y FINANZAS */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-50 rounded text-green-600">
                    <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ventas & Finanzas</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* REPORTE: VENTAS GENERALES */}
                <Link href="/dashboard/reportes/ventas-generales" className="group">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-green-400 hover:shadow-md transition-all h-full relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="h-5 w-5 text-green-500" />
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 border border-green-100">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-0 text-[10px] font-bold">INGRESOS</Badge>
                        </div>
                        
                        <h4 className="text-base font-bold text-slate-800 mb-1 group-hover:text-green-700 transition-colors">Ventas por Período</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Resumen de facturación, desglose por métodos de pago y volumen de transacciones diarias.
                        </p>
                    </div>
                </Link>

                {/* REPORTE: UTILIDAD */}
                <div className="group opacity-70 hover:opacity-100 transition-opacity">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 h-full relative border-dashed cursor-not-allowed">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                <PieChart className="h-5 w-5" />
                            </div>
                        </div>
                        <h4 className="text-base font-bold text-slate-400 mb-1">Rentabilidad & Utilidad</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Cálculo de márgenes de ganancia (Precio Venta vs. Costo Promedio).
                        </p>
                    </div>
                </div>

            </div>
        </section>

      </main>
    </div>
  );
}