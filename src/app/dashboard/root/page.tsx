"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Network, Users, UserCheck, Plus, RefreshCcw, CheckCircle2, XCircle, ChevronRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermisos } from "@/hooks/usePermisos";

interface KPIs {
  holdings: number;
  empresas: number;
  usuarios: number;
  vendedores: number;
}

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  activa: boolean;
  created_at: string;
  holding_nombre: string | null;
}

export default function RootDashboardPage() {
  const router = useRouter();
  const { rol, cargando: cargandoPermisos } = usePermisos();
  const [kpis, setKpis] = useState<KPIs>({ holdings: 0, empresas: 0, usuarios: 0, vendedores: 0 });
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    if (!cargandoPermisos && rol !== 'ROOT') {
      router.replace('/dashboard');
    }
  }, [cargandoPermisos, rol]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/dashboard/root");
      setKpis(data.kpis);
      setEmpresas(data.empresas);
    } catch (error) {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const empresasFiltradas = empresas.filter(e =>
    e.razon_social.toLowerCase().includes(filtro.toLowerCase()) ||
    e.rif.toLowerCase().includes(filtro.toLowerCase()) ||
    (e.holding_nombre || "").toLowerCase().includes(filtro.toLowerCase())
  );

  const kpiCards = [
    { label: "Holdings", value: kpis.holdings, icon: Network, color: "bg-violet-100 text-violet-700", border: "border-violet-200" },
    { label: "Empresas", value: kpis.empresas, icon: Building2, color: "bg-blue-100 text-blue-700", border: "border-blue-200" },
    { label: "Usuarios Web", value: kpis.usuarios, icon: Users, color: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" },
    { label: "Vendedores App", value: kpis.vendedores, icon: UserCheck, color: "bg-amber-100 text-amber-700", border: "border-amber-200" },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* NAVBAR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              Panel ROOT — Administración Global
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchData}>
            <RefreshCcw className="h-3 w-3" /> Actualizar
          </Button>
          <Button
            size="sm"
            className="h-8 bg-slate-900 hover:bg-slate-800 text-xs gap-1.5 font-bold"
            onClick={() => router.push("/dashboard/onboarding")}
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo Cliente
          </Button>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Visión Global del Sistema</h1>
              <p className="text-sm text-slate-500 mt-0.5">Todos los clientes y métricas en tiempo real</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold">{kpis.empresas} clientes activos</span>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-4 gap-4">
            {kpiCards.map((k) => (
              <div key={k.label} className={cn("bg-white border rounded-xl p-5 flex items-center gap-4", k.border)}>
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", k.color)}>
                  <k.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {loading ? "—" : k.value}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TABLA DE EMPRESAS */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800">Directorio de Clientes</h2>
                <p className="text-xs text-slate-400 mt-0.5">{empresasFiltradas.length} empresas registradas</p>
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, RIF o holding..."
                className="h-8 text-xs border border-slate-200 rounded-lg px-3 w-64 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">Cargando empresas...</div>
            ) : empresasFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No hay empresas registradas</p>
                <Button
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-xs gap-1.5"
                  onClick={() => router.push("/dashboard/onboarding")}
                >
                  <Plus className="h-3.5 w-3.5" /> Crear primer cliente
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Empresa</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">RIF</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Holding</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Registro</th>
                    <th className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {empresasFiltradas.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-slate-500" />
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{emp.razon_social}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{emp.rif}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {emp.holding_nombre ? (
                          <div className="flex items-center gap-1.5">
                            <Network className="h-3.5 w-3.5 text-violet-500" />
                            <span className="text-xs font-medium text-violet-700">{emp.holding_nombre}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">— Sin holding</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-500">
                          {new Date(emp.created_at).toLocaleDateString('es-VE', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {emp.activa ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Activa
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] gap-1">
                            <XCircle className="h-3 w-3" /> Inactiva
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={() => router.push(`/dashboard/onboarding?empresa=${emp.id}`)}
                        >
                          Ver <ChevronRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
