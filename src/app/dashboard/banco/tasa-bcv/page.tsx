"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight, TrendingUp, TrendingDown, Minus,
  RefreshCw, PlusCircle, Bot, User, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TasaBcv {
  id: number;
  tasa: number;
  fecha_vigencia: string;
  fecha_publicacion: string;
  origen: "CRON" | "MANUAL";
  notas: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function formatTasa(tasa: number) {
  return tasa.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function deltaPct(actual: number, anterior: number) {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TasaBcvPage() {
  const user = useAuthStore((state) => state.user) as any;
  const esRoot = user?.rol === "ROOT" || user?.rol === "SUPER_ADMIN";

  const [historial, setHistorial] = useState<TasaBcv[]>([]);
  const [vigente, setVigente] = useState<TasaBcv | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form manual
  const [formTasa, setFormTasa] = useState("");
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0]);
  const [formNotas, setFormNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [vigRes, histRes] = await Promise.all([
        api.get("/banco/tasa-bcv/vigente"),
        api.get("/banco/tasa-bcv/historial?limite=60"),
      ]);
      setVigente(vigRes.data);
      setHistorial(histRes.data);
    } catch {
      toast.error("Error cargando tasas BCV");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const refrescar = () => { setRefreshing(true); cargar(); };

  const guardarManual = async () => {
    const tasa = parseFloat(formTasa.replace(",", "."));
    if (!tasa || tasa <= 0) { toast.error("Ingresá un valor de tasa válido"); return; }
    if (!formFecha) { toast.error("Seleccioná una fecha"); return; }

    setGuardando(true);
    try {
      await api.post("/banco/tasa-bcv/manual", {
        tasa,
        fecha_vigencia: formFecha,
        notas: formNotas || undefined,
      });
      toast.success("Tasa registrada correctamente");
      setModalOpen(false);
      setFormTasa(""); setFormFecha(new Date().toISOString().split("T")[0]); setFormNotas("");
      cargar();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error guardando la tasa");
    } finally {
      setGuardando(false);
    }
  };

  // Calcular delta respecto a la tasa anterior
  const delta = historial.length >= 2
    ? deltaPct(historial[0]?.tasa, historial[1]?.tasa)
    : null;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">

      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
          <span>Bancos</span>
          <ChevronRight className="size-3" />
          <span>Tasa BCV</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasa BCV — USD/VES</h1>
        <p className="text-sm text-slate-500 mt-1">
          Actualización automática diaria a las 8:00 AM. En caso de falla, registrá la tasa manualmente.
        </p>
      </div>

      {/* Hero — tasa vigente */}
      {loading ? (
        <div className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
      ) : vigente ? (
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 text-white p-6">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-2">
                Tasa vigente · {formatFecha(vigente.fecha_vigencia)}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold tracking-tight tabular-nums">
                  {formatTasa(vigente.tasa)}
                </span>
                <span className="text-slate-400 text-lg">Bs/USD</span>
              </div>

              {delta !== null && (
                <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium
                  ${delta > 0 ? "text-red-400" : delta < 0 ? "text-emerald-400" : "text-slate-400"}`}>
                  {delta > 0
                    ? <TrendingUp className="size-4" />
                    : delta < 0
                    ? <TrendingDown className="size-4" />
                    : <Minus className="size-4" />}
                  <span>
                    {delta > 0 ? "+" : ""}{delta.toFixed(2)}% vs día anterior
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              <Badge
                className={`text-xs font-mono ${vigente.origen === "CRON"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}
              >
                {vigente.origen === "CRON" ? <Bot className="size-3 mr-1" /> : <User className="size-3 mr-1" />}
                {vigente.origen}
              </Badge>

              <div className="flex gap-2">
                <button
                  onClick={refrescar}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Actualizar
                </button>

                {esRoot && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <PlusCircle className="size-3.5" />
                    Ingresar tasa
                  </button>
                )}
              </div>
            </div>
          </div>

          {vigente.notas && (
            <div className="relative mt-4 flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <span>{vigente.notas}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Sin tasa registrada para hoy</p>
            <p className="text-sm text-amber-700 mt-1">
              El cron aún no corrió o la API externa falló. Registrá la tasa manualmente.
            </p>
            {esRoot && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900"
              >
                <PlusCircle className="size-4" />
                Ingresar tasa manualmente
              </button>
            )}
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-700">Historial de tasas</span>
          <span className="text-xs text-slate-400">{historial.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha vigencia</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa Bs/USD</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Variación</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Origen</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : historial.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Sin registros
                  </td>
                </tr>
              ) : (
                historial.map((t, i) => {
                  const tasaAnterior = historial[i + 1]?.tasa;
                  const delta = tasaAnterior ? deltaPct(t.tasa, tasaAnterior) : null;
                  const esHoy = vigente?.id === t.id;

                  return (
                    <tr key={t.id} className={`transition-colors ${esHoy ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {formatFecha(t.fecha_vigencia)}
                          {esHoy && (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                              hoy
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatTasa(t.tasa)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {delta !== null ? (
                          <span className={`flex items-center justify-end gap-1 text-xs font-medium
                            ${delta > 0 ? "text-red-500" : delta < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {delta > 0
                              ? <TrendingUp className="size-3" />
                              : delta < 0
                              ? <TrendingDown className="size-3" />
                              : <Minus className="size-3" />}
                            {delta > 0 ? "+" : ""}{delta.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border
                          ${t.origen === "CRON"
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                            : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                          {t.origen === "CRON" ? <Bot className="size-2.5" /> : <User className="size-2.5" />}
                          {t.origen}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                        {t.notas || <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — ingreso manual (solo ROOT) */}
      {esRoot && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Registrar tasa manualmente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                Usá esta opción solo cuando la API del BCV esté caída. Si ya existe una tasa para la fecha seleccionada, será sobreescrita.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tasa">Tasa Bs/USD</Label>
                  <Input
                    id="tasa"
                    placeholder="Ej: 91.2500"
                    value={formTasa}
                    onChange={(e) => setFormTasa(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha">Fecha vigencia</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notas">Notas <span className="text-slate-400">(opcional)</span></Label>
                <Textarea
                  id="notas"
                  placeholder="Ej: API caída — ingresado desde comunicado BCV"
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={guardarManual} disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700">
                {guardando ? "Guardando..." : "Guardar tasa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}