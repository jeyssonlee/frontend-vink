"use client";

import { useEffect, useState } from "react";
import { 
  Info, 
  Building2, 
  MapPin, 
  Globe, 
  CheckCircle2
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { getSessionUser } from "@/lib/auth-utils";

export function SystemInfo() {
  const [data, setData] = useState({
    usuario: "Cargando...",
    rol: "...",
    empresa: "...",
    holding: null as string | null,
    sucursal: null as string | null,
    iniciales: "U"
  });

  useEffect(() => {
    const user = getSessionUser();
    
    if (user) {
      // 1. EMPRESA: Tu backend la envía directo en la propiedad 'empresa' (string)
      const nombreEmpresa = user.empresa || "Empresa Desconocida";

      // 2. HOLDING: Ahora lo leeremos de la nueva propiedad que agregamos
      const holding = user.holding || null;

      // 3. SUCURSAL: Tu backend la envía directo en 'sucursal' (string)
      const sucursal = user.sucursal || null;

      // 4. USUARIO Y ROL
      const nombreUsuario = user.nombre || "Usuario";
      const rolUsuario = user.rol || "Usuario";
      
      const iniciales = nombreUsuario.substring(0, 2).toUpperCase();

      setData({
        usuario: nombreUsuario,
        rol: rolUsuario,
        empresa: nombreEmpresa,
        holding: holding,
        sucursal: sucursal,
        iniciales: iniciales
      });
    }
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-600 hover:bg-blue-50">
          <Info className="h-5 w-5" />
          <span className="sr-only">Información del Sistema</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden border-slate-200 shadow-xl">
        
        {/* ENCABEZADO */}
        <div className="bg-slate-950 p-4 text-white">
            <h4 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Entorno Actual</h4>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium">Conectado</span>
            </div>
        </div>

        {/* CUERPO */}
        <div className="p-4 space-y-4 bg-white">
            
            {/* 1. HOLDING (Solo si existe) */}
            {data.holding && (
                <div className="flex items-start gap-3">
                    <div className="mt-1 h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Holding / Grupo</p>
                        <p className="text-sm font-semibold text-slate-800">{data.holding}</p>
                    </div>
                </div>
            )}

            {/* 2. EMPRESA */}
            <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Empresa Fiscal</p>
                    <p className="text-sm font-semibold text-slate-800">{data.empresa}</p>
                </div>
            </div>

            {/* 3. SUCURSAL (Solo si existe) */}
            {data.sucursal && (
                <div className="flex items-start gap-3">
                    <div className="mt-1 h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Sucursal Actual</p>
                        <p className="text-sm font-semibold text-slate-800">{data.sucursal}</p>
                    </div>
                </div>
            )}

            <Separator />

            {/* 4. USUARIO LOGUEADO */}
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarImage src="" /> 
                    <AvatarFallback className="bg-slate-900 text-white font-bold text-xs">
                        {data.iniciales}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-bold text-slate-800">{data.usuario}</p>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-800">
                        {data.rol}
                    </span>
                </div>
            </div>

        </div>
        
        {/* PIE */}
        <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400">Versión 1.0.0 &bull; Conexión Segura</p>
        </div>

      </PopoverContent>
    </Popover>
  );
}