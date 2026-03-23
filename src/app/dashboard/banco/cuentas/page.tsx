"use client";

import { useEffect, useState } from "react";
import {
  Landmark, Plus, Pencil, Trash2, RefreshCcw,
  CreditCard, CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Catálogos ─────────────────────────────────────────────────────────────────
const BANCOS = [
  { key: "bancamiga",       label: "Bancamiga" },
  { key: "banesco",         label: "Banesco" },
  { key: "banco_venezuela", label: "Banco de Venezuela" },
  { key: "provincial",      label: "BBVA Provincial" },
  { key: "mercantil",       label: "Mercantil" },
  { key: "bnc",             label: "BNC" },
  { key: "bicentenario",    label: "Bicentenario" },
  { key: "bod",             label: "BOD" },
  { key: "banplus",         label: "Banplus" },
  { key: "otro",            label: "Otro" },
];

const MONEDAS = [
  { key: "VES", label: "Bolívares (VES)" },
  { key: "USD", label: "Dólares (USD)" },
  { key: "EUR", label: "Euros (EUR)" },
];

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface CuentaBancaria {
  id: number;
  nombre_cuenta: string;
  banco_key: string;
  numero_cuenta: string;
  moneda: string;
  saldo_inicial: number;
  activa: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  nombre: "",
  banco_key: "",
  numero_cuenta: "",
  moneda: "VES",
  saldo_inicial: "",
};

// ─── Helper ────────────────────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function CuentasBancariasPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    modo: "crear" | "editar";
    cuenta?: CuentaBancaria;
  }>({ open: false, modo: "crear" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const fetchCuentas = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/banco/cuentas");
      setCuentas(data);
    } catch {
      toast.error("Error cargando cuentas bancarias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCuentas(); }, []);

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, modo: "crear" });
  };

  const abrirEditar = (cuenta: CuentaBancaria) => {
    setForm({
      nombre: cuenta.nombre_cuenta,
      banco_key: cuenta.banco_key,
      numero_cuenta: cuenta.numero_cuenta,
      moneda: cuenta.moneda,
      saldo_inicial: String(cuenta.saldo_inicial ?? ""),
    });
    setModal({ open: true, modo: "editar", cuenta });
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim() || !form.banco_key || !form.numero_cuenta.trim()) {
      toast.error("Nombre, banco y número de cuenta son obligatorios");
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        saldo_inicial: parseFloat(form.saldo_inicial || "0"),
      };
      if (modal.modo === "crear") {
        await api.post("/banco/cuentas", payload);
        toast.success("Cuenta creada correctamente");
      } else {
        await api.patch(`/banco/cuentas/${modal.cuenta!.id}`, payload);
        toast.success("Cuenta actualizada correctamente");
      }
      setModal({ open: false, modo: "crear" });
      fetchCuentas();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (cuenta: CuentaBancaria) => {
    if (
      !confirm(
        `¿Eliminar la cuenta "${cuenta.nombre_cuenta}"?\nSi tiene movimientos, se desactivará en lugar de eliminarse.`
      )
    ) return;
    setEliminando(cuenta.id);
    try {
      await api.delete(`/banco/cuentas/${cuenta.id}`);
      toast.success("Cuenta eliminada / desactivada");
      fetchCuentas();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al eliminar");
    } finally {
      setEliminando(null);
    }
  };

  const getBancoLabel = (key: string) =>
    BANCOS.find((b) => b.key === key)?.label ?? key;

  const cuentasActivas = cuentas.filter((c) => c.activa);
  const cuentasInactivas = cuentas.filter((c) => !c.activa);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-sm">

      {/* NAVBAR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            Banco / Cuentas Bancarias
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={fetchCuentas}
          >
            <RefreshCcw className="h-3 w-3" /> Actualizar
          </Button>
          <Button
            size="sm"
            className="h-8 bg-slate-900 hover:bg-slate-800 text-xs gap-1.5 font-bold"
            onClick={abrirCrear}
          >
            <Plus className="h-3.5 w-3.5" /> Nueva Cuenta
          </Button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">

          {/* STATS */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Total cuentas</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{cuentas.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Activas</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{cuentasActivas.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Inactivas</p>
              <p className="text-2xl font-bold text-slate-400 mt-1">{cuentasInactivas.length}</p>
            </div>
          </div>

          {/* LOADING SKELETONS */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
                >
                  <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>

          /* EMPTY STATE */
          ) : cuentas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-slate-200 rounded-2xl">
              <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Landmark className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 text-base">
                No hay cuentas bancarias registradas
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Crea la primera cuenta para poder importar extractos bancarios
              </p>
              <Button
                onClick={abrirCrear}
                className="bg-slate-900 hover:bg-slate-800 gap-2 font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Crear primera cuenta
              </Button>
            </div>

          /* LISTA */
          ) : (
            <div className="space-y-3">
              {cuentas.map((cuenta) => (
                <div
                  key={cuenta.id}
                  className={cn(
                    "bg-white border rounded-xl p-5 flex items-center justify-between transition-all",
                    cuenta.activa
                      ? "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      : "border-slate-100 opacity-60"
                  )}
                >
                  {/* ICONO + INFO */}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                      cuenta.activa ? "bg-slate-100" : "bg-slate-50"
                    )}>
                      <CreditCard className={cn(
                        "h-5 w-5",
                        cuenta.activa ? "text-slate-600" : "text-slate-300"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{cuenta.nombre_cuenta}</p>
                        {cuenta.activa ? (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            Activa
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                            Inactiva
                          </span>
                        )}
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                          {cuenta.moneda}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {getBancoLabel(cuenta.banco_key)} · {cuenta.numero_cuenta}
                      </p>
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => abrirEditar(cuenta)}
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 text-red-400 hover:text-red-600 hover:border-red-200"
                      disabled={eliminando === cuenta.id}
                      onClick={() => handleEliminar(cuenta)}
                    >
                      <Trash2 className="h-3 w-3" />
                      {eliminando === cuenta.id ? "..." : "Eliminar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      <Dialog open={modal.open} onOpenChange={(v) => setModal((m) => ({ ...m, open: v }))}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Landmark className="h-5 w-5 text-slate-300" />
            </div>
            <DialogTitle className="text-base font-bold text-white">
              {modal.modo === "crear" ? "Nueva Cuenta Bancaria" : "Editar Cuenta Bancaria"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 bg-white space-y-4">

            <Campo label="Nombre de la cuenta">
              <Input
                placeholder="Ej: Cuenta Principal Bancamiga"
                className="h-9 bg-slate-50 border-slate-200 text-sm"
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value.toUpperCase() }))
                }
              />
            </Campo>

            <Campo label="Banco">
              <Select
                value={form.banco_key}
                onValueChange={(v) => setForm((f) => ({ ...f, banco_key: v }))}
              >
                <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-sm">
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS.map((b) => (
                    <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Número de cuenta">
              <Input
                placeholder="0172-0123-45-1234567890"
                className="h-9 bg-slate-50 border-slate-200 text-sm font-mono"
                value={form.numero_cuenta}
                onChange={(e) => setForm((f) => ({ ...f, numero_cuenta: e.target.value }))}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Moneda">
                <Select
                  value={form.moneda}
                  onValueChange={(v) => setForm((f) => ({ ...f, moneda: v }))}
                >
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Saldo inicial">
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-9 bg-slate-50 border-slate-200 text-sm"
                  value={form.saldo_inicial}
                  onChange={(e) => setForm((f) => ({ ...f, saldo_inicial: e.target.value }))}
                />
              </Campo>
            </div>

            <p className="text-xs text-slate-400">
              El saldo inicial se usa como punto de partida para el cálculo de saldos en movimientos.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                className="text-xs font-bold"
                onClick={() => setModal((m) => ({ ...m, open: false }))}
              >
                Cancelar
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800 text-xs font-bold px-6"
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : modal.modo === "crear"
                  ? "Crear Cuenta"
                  : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}