"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { usePermisosStore } from "@/store/permisos.store";
import { createSecureSession } from "@/app/actions/auth";

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
}

interface SelectorData {
  empresas: Empresa[];
  usuario: { id: string; nombre: string; email: string; rol: string };
  token_provisional: string;
}

export default function SeleccionarEmpresaPage() {
  const router = useRouter();
  const [data, setData] = useState<SelectorData | null>(null);
  const [seleccionando, setSeleccionando] = useState<string | null>(null);

  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const { fetchPermisos } = usePermisosStore();

  useEffect(() => {
    const raw = sessionStorage.getItem("selector_data");
    if (!raw) { router.replace("/login"); return; }
    try {
      setData(JSON.parse(raw));
    } catch {
      router.replace("/login");
    }
  }, []);

  const seleccionar = async (empresa: Empresa) => {
    if (!data) return;
    setSeleccionando(empresa.id);

    try {
      const { data: res } = await api.post(
        "/auth/seleccionar-empresa",
        { id_empresa: empresa.id },
        { headers: { Authorization: `Bearer ${data.token_provisional}` } },
      );

      const token = res.access_token;

      let id_empresa = null;
      let id_almacen = null;
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64).split('').map((c) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join('')
        );
        const decoded = JSON.parse(jsonPayload);
        id_empresa = decoded.id_empresa;
        id_almacen = decoded.sucursalId;
      } catch (e) {
        console.error("Error decodificando token", e);
      }

      await createSecureSession(token);
      setToken(token);
      setUser({ ...res.usuario, id_empresa, id_almacen });
      await fetchPermisos();

      sessionStorage.removeItem("selector_data");
      toast.success(`Entrando a ${empresa.razon_social}...`);
      router.replace("/dashboard");

    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al seleccionar empresa");
      setSeleccionando(null);
    }
  };

  const salir = () => {
    sessionStorage.removeItem("selector_data");
    router.replace("/login");
  };

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-800 rounded-2xl mb-4 border border-slate-700">
            <Building2 className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Selecciona una empresa
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Hola, <span className="text-slate-200 font-medium">{data.usuario.nombre}</span>
          </p>
        </div>

        <div className="space-y-2">
          {data.empresas.map((empresa) => (
            <button
              key={empresa.id}
              onClick={() => seleccionar(empresa)}
              disabled={seleccionando !== null}
              className="w-full group flex items-center gap-4 p-4 bg-slate-900 hover:bg-slate-800
                         border border-slate-800 hover:border-slate-600 rounded-xl
                         transition-all duration-150 text-left
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-slate-800 group-hover:bg-slate-700
                              rounded-xl border border-slate-700 flex items-center justify-center transition-colors">
                {seleccionando === empresa.id ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Building2 className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm leading-tight truncate">
                  {empresa.razon_social}
                </p>
                <p className="text-slate-500 text-xs mt-0.5 font-mono">{empresa.rif}</p>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400
                                       group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-mono uppercase tracking-wider">{data.usuario.rol}</span>
          </div>
          <button
            onClick={salir}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  );
}