"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Network, ChevronRight, ChevronLeft, Plus, Trash2, Check, Loader2, User, Lock, MapPin, Phone, Hash, Warehouse, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ================================================================
// TIPOS
// ================================================================
interface Almacen {
  nombre: string;
  es_venta: boolean;
}

interface Sucursal {
  nombre: string;
  direccion: string;
  telefono: string;
  almacenes: Almacen[];
}

interface Empresa {
  razon_social: string;
  rif: string;
  direccion: string;
  telefono: string;
  sucursales: Sucursal[];
}

interface Admin {
  nombre_completo: string;
  correo: string;
  clave: string;
}

const almacenVacio = (): Almacen => ({ nombre: "ALMACÉN GENERAL", es_venta: true });
const sucursalVacia = (): Sucursal => ({ 
  nombre: "", direccion: "", telefono: "",
  almacenes: [{ nombre: "ALMACÉN GENERAL", es_venta: true }]
});
const empresaVacia = (): Empresa => ({
  razon_social: "", rif: "", direccion: "", telefono: "",
  sucursales: [{ nombre: "SEDE PRINCIPAL", direccion: "", telefono: "", almacenes: [{ nombre: "ALMACÉN GENERAL", es_venta: true }] }]
});

// ================================================================
// COMPONENTE CAMPO
// ================================================================
function Campo({ label, icon: Icon, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />}
        <Input className={cn("h-10 bg-slate-50 border-slate-200 text-sm", Icon && "pl-9")} {...props} />
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE ALMACENES DE UNA SUCURSAL
// ================================================================
function AlmacenesEditor({ almacenes, onChange }: { almacenes: Almacen[]; onChange: (a: Almacen[]) => void }) {
  const addAlmacen = () => onChange([...almacenes, almacenVacio()]);
  const remove = (i: number) => {
    if (almacenes.length === 1) return;
    onChange(almacenes.filter((_, idx) => idx !== i));
  };
  const update = (i: number, field: keyof Almacen, val: any) => {
    const arr = [...almacenes];
    arr[i] = { ...arr[i], [field]: val };
    onChange(arr);
  };

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Warehouse className="h-3 w-3" /> Almacenes
        </span>
        <button onClick={addAlmacen} className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
          <Plus className="h-3 w-3" /> Agregar
        </button>
      </div>
      <div className="space-y-2">
        {almacenes.map((a, i) => (
          <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              className="flex-1 text-xs bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-300"
              placeholder="Nombre del almacén"
              value={a.nombre}
              onChange={(e) => update(i, "nombre", e.target.value)}
            />
            <button
              onClick={() => update(i, "es_venta", !a.es_venta)}
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
                a.es_venta ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}
              title="¿Este almacén es de venta?"
            >
              {a.es_venta ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
              {a.es_venta ? "Venta" : "Interno"}
            </button>
            {almacenes.length > 1 && (
              <button onClick={() => remove(i)} className="text-red-300 hover:text-red-500 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// FORMULARIO EMPRESA
// ================================================================
function FormEmpresa({ empresa, onChange, index }: { empresa: Empresa; onChange: (e: Empresa) => void; index?: number }) {
  const updateSucursal = (i: number, field: keyof Sucursal, val: any) => {
    const s = [...empresa.sucursales];
    s[i] = { ...s[i], [field]: val };
    onChange({ ...empresa, sucursales: s });
  };

  const addSucursal = () => onChange({
    ...empresa,
    sucursales: [...empresa.sucursales, sucursalVacia()]
  });

  const removeSucursal = (i: number) => {
    if (empresa.sucursales.length === 1) return;
    onChange({ ...empresa, sucursales: empresa.sucursales.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-5">
      {index !== undefined && (
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">{index + 1}</div>
          <span className="font-bold text-slate-700 text-sm">Empresa #{index + 1}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Razón Social" icon={Building2} placeholder="EMPRESA XYZ C.A."
          value={empresa.razon_social} onChange={(e: any) => onChange({ ...empresa, razon_social: e.target.value })} />
        <Campo label="RIF" icon={Hash} placeholder="J-123456789"
          value={empresa.rif} onChange={(e: any) => onChange({ ...empresa, rif: e.target.value })} />
        <Campo label="Dirección" icon={MapPin} placeholder="Av. Principal..."
          value={empresa.direccion} onChange={(e: any) => onChange({ ...empresa, direccion: e.target.value })} />
        <Campo label="Teléfono" icon={Phone} placeholder="0281-1234567"
          value={empresa.telefono} onChange={(e: any) => onChange({ ...empresa, telefono: e.target.value })} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sucursales y Almacenes</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={addSucursal}>
            <Plus className="h-3 w-3" /> Sucursal
          </Button>
        </div>
        <div className="space-y-3">
          {empresa.sucursales.map((s, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-600">
                  {i === 0 ? "🏢 Sede Principal (Matriz)" : `📍 Sucursal ${i + 1}`}
                </span>
                {i > 0 && (
                  <button onClick={() => removeSucursal(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Campo label="Nombre" placeholder="SEDE PRINCIPAL"
                  value={s.nombre} onChange={(e: any) => updateSucursal(i, "nombre", e.target.value)} />
                <Campo label="Dirección" placeholder="Av. Bolívar..."
                  value={s.direccion} onChange={(e: any) => updateSucursal(i, "direccion", e.target.value)} />
                <Campo label="Teléfono" placeholder="0281-..."
                  value={s.telefono} onChange={(e: any) => updateSucursal(i, "telefono", e.target.value)} />
              </div>
              <AlmacenesEditor
                almacenes={s.almacenes}
                onChange={(a) => updateSucursal(i, "almacenes", a)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PASO EMPRESA SIMPLE
// ================================================================
function PasoEmpresaSimple({ empresa, onChange }: { empresa: Empresa; onChange: (e: Empresa) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Datos de la Empresa</h2>
        <p className="text-slate-500 text-sm mt-1">Información principal, sucursales y almacenes</p>
      </div>
      <FormEmpresa empresa={empresa} onChange={onChange} />
    </div>
  );
}

// ================================================================
// PASO HOLDING
// ================================================================
function PasoHolding({ nombreHolding, descripcion, empresas, onNombre, onDescripcion, onEmpresas }: any) {
  const addEmpresa = () => onEmpresas([...empresas, empresaVacia()]);
  const updateEmpresa = (i: number, e: Empresa) => {
    const arr = [...empresas];
    arr[i] = e;
    onEmpresas(arr);
  };
  const removeEmpresa = (i: number) => {
    if (empresas.length === 1) return;
    onEmpresas(empresas.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Datos del Holding</h2>
        <p className="text-slate-500 text-sm mt-1">Grupo corporativo, empresas, sucursales y almacenes</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-900 rounded-xl">
        <Campo label="Nombre del Holding" icon={Network} placeholder="GRUPO EMPRESARIAL XYZ"
          className="bg-white"
          value={nombreHolding} onChange={(e: any) => onNombre(e.target.value)} />
        <Campo label="Descripción" placeholder="Descripción del grupo..."
          className="bg-white"
          value={descripcion} onChange={(e: any) => onDescripcion(e.target.value)} />
      </div>
      <div className="space-y-6">
        {empresas.map((emp: Empresa, i: number) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 relative">
            {i > 0 && (
              <button onClick={() => removeEmpresa(i)}
                className="absolute right-4 top-4 text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <FormEmpresa empresa={emp} onChange={(e) => updateEmpresa(i, e)} index={i} />
          </div>
        ))}
        <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addEmpresa}>
          <Plus className="h-4 w-4" /> Agregar Empresa
        </Button>
      </div>
    </div>
  );
}

// ================================================================
// PASO ADMIN
// ================================================================
function PasoAdmin({ admin, onChange }: { admin: Admin; onChange: (a: Admin) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Usuario Administrador</h2>
        <p className="text-slate-500 text-sm mt-1">Credenciales del SUPER_ADMIN del cliente</p>
      </div>
      <div className="max-w-lg space-y-4">
        <Campo label="Nombre Completo" icon={User} placeholder="Juan Pérez"
          value={admin.nombre_completo} onChange={(e: any) => onChange({ ...admin, nombre_completo: e.target.value })} />
        <Campo label="Correo Electrónico" icon={User} placeholder="admin@empresa.com" type="email"
          value={admin.correo} onChange={(e: any) => onChange({ ...admin, correo: e.target.value })} />
        <Campo label="Clave de Acceso" icon={Lock} placeholder="Mínimo 6 caracteres" type="password"
          value={admin.clave} onChange={(e: any) => onChange({ ...admin, clave: e.target.value })} />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ Comparte estas credenciales con el cliente. Se recomienda que cambien la clave en el primer acceso.
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PASO RESUMEN
// ================================================================
function PasoResumen({ tipo, empresa, empresas, nombreHolding, admin }: any) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Resumen del Onboarding</h2>
        <p className="text-slate-500 text-sm mt-1">Verifica antes de confirmar</p>
      </div>
      <div className="space-y-4 max-w-xl">
        {tipo === "HOLDING" && (
          <div className="bg-slate-900 text-white rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Holding</div>
            <div className="font-bold text-lg">{nombreHolding}</div>
            <div className="text-sm text-slate-400 mt-1">{empresas.length} empresa(s)</div>
          </div>
        )}

        {(tipo === "EMPRESA" ? [empresa] : empresas).map((emp: Empresa, i: number) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Empresa {tipo === "HOLDING" ? i + 1 : ""}</div>
            <div className="font-bold text-slate-800">{emp.razon_social}</div>
            <div className="text-sm text-slate-500">{emp.rif}</div>
            <div className="mt-3 space-y-2">
              {emp.sucursales.map((s, j) => (
                <div key={j} className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-1.5">
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full" />
                    {s.nombre || `Sucursal ${j + 1}`}
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-3">
                    {s.almacenes.map((a, k) => (
                      <span key={k} className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                        a.es_venta ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      )}>
                        <Warehouse className="h-2.5 w-2.5" />
                        {a.nombre} {a.es_venta ? "(Venta)" : "(Interno)"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Usuario SUPER_ADMIN</div>
          <div className="font-bold text-slate-800">{admin.nombre_completo}</div>
          <div className="text-sm text-slate-500">{admin.correo}</div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PANTALLA DE ÉXITO
// ================================================================
function PantallaExito({ resultado, onNuevo }: { resultado: any; onNuevo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16">
      <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <Check className="h-10 w-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Cliente Creado!</h2>
      <p className="text-slate-500 text-sm mb-8">{resultado.mensaje}</p>
      <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm text-center mb-6">
        <div className="text-xs font-bold text-slate-400 uppercase mb-3">Credenciales de Acceso</div>
        <div className="font-mono text-slate-800 font-bold">{resultado.credenciales?.correo}</div>
        <div className="text-xs text-slate-400 mt-1">Comparte estas credenciales con el cliente</div>
      </div>
      <Button onClick={onNuevo} className="bg-slate-900 hover:bg-slate-800 gap-2">
        <Plus className="h-4 w-4" /> Crear Otro Cliente
      </Button>
    </div>
  );
}

// ================================================================
// PÁGINA PRINCIPAL
// ================================================================
export default function OnboardingPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"EMPRESA" | "HOLDING" | null>(null);
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const [empresa, setEmpresa] = useState<Empresa>(empresaVacia());
  const [empresas, setEmpresas] = useState<Empresa[]>([empresaVacia()]);
  const [nombreHolding, setNombreHolding] = useState("");
  const [descripcionHolding, setDescripcionHolding] = useState("");
  const [admin, setAdmin] = useState<Admin>({ nombre_completo: "", correo: "", clave: "" });

  const pasos = tipo === "EMPRESA"
    ? ["Tipo", "Empresa", "Administrador", "Confirmar"]
    : ["Tipo", "Holding", "Administrador", "Confirmar"];

  const handleTipo = (t: "EMPRESA" | "HOLDING") => {
    setTipo(t);
    setPaso(1);
  };

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      let res;
      if (tipo === "EMPRESA") {
        res = await api.post("/onboarding/empresa", { tipo: "EMPRESA", empresa, admin });
      } else {
        res = await api.post("/onboarding/holding", {
          tipo: "HOLDING",
          nombre_holding: nombreHolding,
          descripcion_holding: descripcionHolding,
          empresas,
          admin,
        });
      }
      setResultado(res.data);
      toast.success("Cliente creado correctamente");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al crear el cliente");
    } finally {
      setEnviando(false);
    }
  };

  const resetear = () => {
    setTipo(null);
    setPaso(0);
    setResultado(null);
    setEmpresa(empresaVacia());
    setEmpresas([empresaVacia()]);
    setNombreHolding("");
    setDescripcionHolding("");
    setAdmin({ nombre_completo: "", correo: "", clave: "" });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            Onboarding / Nuevo Cliente
          </span>
        </div>
        {tipo && !resultado && (
          <div className="flex items-center gap-1">
            {pasos.map((p, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={cn(
                  "h-7 px-3 rounded-full text-xs font-bold flex items-center transition-all",
                  i === paso ? "bg-slate-900 text-white" :
                  i < paso ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                )}>
                  {i < paso ? <Check className="h-3 w-3" /> : p}
                </div>
                {i < pasos.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {resultado ? (
            <PantallaExito resultado={resultado} onNuevo={resetear} />
          ) : paso === 0 ? (
            <PasoTipo onSelect={handleTipo} />
          ) : paso === 1 ? (
            tipo === "EMPRESA" ? (
              <PasoEmpresaSimple empresa={empresa} onChange={setEmpresa} />
            ) : (
              <PasoHolding
                nombreHolding={nombreHolding} descripcion={descripcionHolding}
                empresas={empresas}
                onNombre={setNombreHolding} onDescripcion={setDescripcionHolding}
                onEmpresas={setEmpresas}
              />
            )
          ) : paso === 2 ? (
            <PasoAdmin admin={admin} onChange={setAdmin} />
          ) : (
            <PasoResumen tipo={tipo} empresa={empresa} empresas={empresas}
              nombreHolding={nombreHolding} admin={admin} />
          )}
        </div>
      </div>

      {!resultado && tipo && (
        <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
          <Button variant="ghost"
            onClick={() => paso === 1 ? (setTipo(null), setPaso(0)) : setPaso(paso - 1)}
            className="gap-2 text-slate-600">
            <ChevronLeft className="h-4 w-4" /> Atrás
          </Button>
          {paso < 3 ? (
            <Button onClick={() => setPaso(paso + 1)}
              className="bg-slate-900 hover:bg-slate-800 gap-2 font-bold">
              Continuar <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleEnviar} disabled={enviando}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold px-8">
              {enviando
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
                : <><Check className="h-4 w-4" /> Confirmar y Crear</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// PASO TIPO (definido aquí para evitar hoisting issues)
// ================================================================
function PasoTipo({ onSelect }: { onSelect: (tipo: "EMPRESA" | "HOLDING") => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-slate-800">Nuevo Cliente</h2>
        <p className="text-slate-500 mt-2 text-sm">¿Cómo está estructurado este cliente?</p>
      </div>
      <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
        <button onClick={() => onSelect("EMPRESA")}
          className="group relative bg-white border-2 border-slate-200 hover:border-slate-900 rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-lg">
          <div className="h-14 w-14 bg-slate-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center mb-5 transition-colors">
            <Building2 className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Empresa Simple</h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Una empresa con una o más sucursales. Sin estructura corporativa.
          </p>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
        </button>

        <button onClick={() => onSelect("HOLDING")}
          className="group relative bg-white border-2 border-slate-200 hover:border-slate-900 rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-lg">
          <div className="h-14 w-14 bg-slate-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center mb-5 transition-colors">
            <Network className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Holding</h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Grupo corporativo con múltiples empresas y sucursales bajo un mismo techo.
          </p>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
        </button>
      </div>
    </div>
  );
}
