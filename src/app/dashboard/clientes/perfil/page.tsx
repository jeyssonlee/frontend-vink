"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronRight, Fingerprint } from "lucide-react";
import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { usePermisos } from "@/hooks/usePermisos";

export default function BuscadorPerfil() {
  const router = useRouter();
  const idEmpresa = getEmpresaId();
  const { tienePermiso, cargando: cargandoPermisos } = usePermisos();
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cargandoPermisos && !tienePermiso('ver_perfil_cliente')) {
      router.replace('/dashboard');
    }
  }, [cargandoPermisos, tienePermiso]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get(`/clientes`);
        // Asumiendo que tu endpoint ya filtra por empresa internamente o le pasas el idEmpresa
        setClientes(res.data);
      } catch (error) {
        console.error("Error al cargar clientes", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  const filtrados = clientes.filter(c => 
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rif.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 bg-slate-50/50">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Buscar Perfil de Cliente</h1>
          <p className="text-slate-500">Ingresa el nombre o identificación para ver su analítica 360.</p>
        </div>

        <div className="relative shadow-sm">
          <Search className="absolute left-4 top-3.5 h-6 w-6 text-slate-400" />
          <Input 
            placeholder="Escribe para buscar..." 
            className="w-full pl-14 pr-4 h-14 text-lg bg-white border-slate-200 rounded-xl focus:ring-blue-500"
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {busqueda.length > 0 && (
          <Card className="shadow-lg border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4">
            <CardContent className="p-0 max-h-80 overflow-y-auto">
              {filtrados.length > 0 ? (
                <div className="flex flex-col">
                  {filtrados.map((c) => (
                    <button
                      key={c.id_cliente}
                      onClick={() => router.push(`/dashboard/clientes/${c.id_cliente}`)}
                      className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 text-left transition-colors last:border-0 group"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{c.razon_social}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <Fingerprint className="h-3 w-3" /> {c.rif}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No se encontraron clientes con "{busqueda}".
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}