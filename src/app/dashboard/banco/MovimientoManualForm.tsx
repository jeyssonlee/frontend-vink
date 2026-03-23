"use client"

import { useState } from "react"
import {
  X, Check, Loader2, AlertCircle,
  ArrowDownLeft, ArrowUpRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CuentaBancaria {
  id: number
  nombre: string
  banco_key: string
  moneda: string
  numero_cuenta?: string
  saldo_inicial?: string
  saldo_actual_usd?: string
  total_ingresos?: string
  total_egresos?: string
  total_ingresos_usd?: string
  total_egresos_usd?: string
  total_movimientos?: number
  flujo_neto?: string
  manuales_ingresos_usd?: string
  manuales_egresos_usd?: string
}

export interface MovimientoManual {
  id: number
  fecha: string
  tipo: "INGRESO" | "EGRESO"
  tipo_egreso?: string
  descripcion?: string
  monto_usd: string
  tasa_vigente?: string
  monto_bs?: string
  es_efectivo: boolean
  id_cuenta?: number
  nombre_cuenta?: string
  banco_key?: string
  id_categoria?: number
  nombre_categoria?: string
}

interface FormData {
  fecha: string
  tipo: "INGRESO" | "EGRESO"
  tipo_egreso: string
  id_cuenta: string
  descripcion: string
  monto_usd: string
  tasa_vigente: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const TIPO_EGRESO_LABELS: Record<string, string> = {
  GASTO_OPERATIVO:       "Gasto operativo",
  COMPRA_INVENTARIO:     "Compra inventario",
  INVERSION_ACTIVOS:     "Inversión activos",
  RETIRO_APORTE_SOCIOS:  "Retiro / Aporte socios",
}

const today = () => new Date().toISOString().split("T")[0]

const emptyForm = (): FormData => ({
  fecha:        today(),
  tipo:         "INGRESO",
  tipo_egreso:  "",
  id_cuenta:    "",
  descripcion:  "",
  monto_usd:    "",
  tasa_vigente: "",
})

// ─── Component ───────────────────────────────────────────────────────────────

export function MovimientoManualForm({
  initial,
  cuentas,
  onClose,
  onSaved,
}: {
  initial?: MovimientoManual | null
  cuentas: CuentaBancaria[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormData>(() =>
    initial
      ? {
          fecha:        initial.fecha.split("T")[0],
          tipo:         initial.tipo,
          tipo_egreso:  initial.tipo_egreso ?? "",
          id_cuenta:    String(initial.id_cuenta ?? ""),
          descripcion:  initial.descripcion ?? "",
          monto_usd:    initial.monto_usd,
          tasa_vigente: initial.tasa_vigente ?? "",
        }
      : emptyForm()
  )
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.fecha || !form.tipo || !form.monto_usd || !form.id_cuenta) {
      setErr("Fecha, tipo, cuenta y monto son obligatorios")
      return
    }
    if (form.tipo === "EGRESO" && !form.tipo_egreso) {
      setErr("Los egresos requieren un tipo de egreso")
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const payload: any = {
        fecha:        form.fecha,
        tipo:         form.tipo,
        id_cuenta:    parseInt(form.id_cuenta),
        monto_usd:    parseFloat(form.monto_usd),
        descripcion:  form.descripcion || undefined,
        tasa_vigente: form.tasa_vigente ? parseFloat(form.tasa_vigente) : undefined,
        tipo_egreso:  form.tipo === "EGRESO" ? form.tipo_egreso : undefined,
      }
      if (initial) {
        await api.patch(`/banco/movimientos-manuales/${initial.id}`, payload)
      } else {
        await api.post("/banco/movimientos-manuales", payload)
      }
      onSaved()
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-400 font-medium">Movimientos manuales</p>
            <h2 className="text-sm font-semibold text-slate-800">
              {initial ? "Editar movimiento" : "Nuevo movimiento"}
            </h2>
          </div>
          <button onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Tipo toggle */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(["INGRESO", "EGRESO"] as const).map(t => (
                <button key={t} onClick={() => set("tipo", t)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all",
                    form.tipo === t
                      ? t === "INGRESO"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                        : "bg-red-50 border-red-400 text-red-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  )}>
                  {t === "INGRESO"
                    ? <ArrowDownLeft className="h-3.5 w-3.5" />
                    : <ArrowUpRight  className="h-3.5 w-3.5" />}
                  {t === "INGRESO" ? "Ingreso" : "Egreso"}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo egreso */}
          {form.tipo === "EGRESO" && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Tipo de egreso</label>
              <select value={form.tipo_egreso} onChange={e => set("tipo_egreso", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
                <option value="">Seleccionar…</option>
                {Object.entries(TIPO_EGRESO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cuenta */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Cuenta</label>
            <select value={form.id_cuenta} onChange={e => set("id_cuenta", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="">Seleccionar cuenta…</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.moneda})</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>

          {/* Monto USD */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Monto USD</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <input type="number" min="0.01" step="0.01" value={form.monto_usd}
                onChange={e => set("monto_usd", e.target.value)} placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 pl-7 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
            </div>
          </div>

          {/* Tasa */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Tasa Bs/$ <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input type="number" min="0" step="0.01" value={form.tasa_vigente}
              onChange={e => set("tasa_vigente", e.target.value)} placeholder="Ej: 46.50"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
            {form.monto_usd && form.tasa_vigente && (
              <p className="text-[11px] text-slate-400 mt-1">
                = Bs. {(parseFloat(form.monto_usd) * parseFloat(form.tasa_vigente)).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Descripción <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              rows={2} placeholder="Concepto del movimiento…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 text-xs border-slate-200">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}
            className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Check   className="h-3.5 w-3.5" />}
            {initial ? "Guardar cambios" : "Registrar"}
          </Button>
        </div>
      </div>
    </div>
  )
}