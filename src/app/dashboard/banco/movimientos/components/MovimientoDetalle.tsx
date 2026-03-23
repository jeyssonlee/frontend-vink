"use client"

import { useEffect, useState } from "react"
import { X, Loader2, AlertCircle, ArrowUpRight, ArrowDownLeft, Building2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getMovimientoById } from "../api"
import type { Movimiento, MovimientoDetalle as MovimientoDetalleType } from "../types"
import { formatBs } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Props {
  movimiento: Movimiento | null
  onClose: () => void
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-VE", {
    day: "2-digit", month: "2-digit", year: "numeric"
  })
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-VE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{label}</span>
      <span className="text-xs text-slate-700 text-right">
        {value ?? <span className="text-slate-300 italic">—</span>}
      </span>
    </div>
  )
}

export function MovimientoDetalle({ movimiento, onClose }: Props) {
  const [detail, setDetail] = useState<MovimientoDetalleType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!movimiento) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError(null)
    getMovimientoById(movimiento.id)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [movimiento?.id])

  if (!movimiento) return null

  const isIngreso = movimiento.tipo === "ingreso"

  return (
    <Dialog open={!!movimiento} onOpenChange={() => onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-lg p-0 overflow-hidden">

      <DialogTitle className="sr-only">Detalle del Movimiento</DialogTitle>


        {/* Hero — monto y tipo */}
        <div className={cn(
          "px-6 py-5 border-b border-slate-200",
          isIngreso ? "bg-emerald-50" : "bg-red-50"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  isIngreso ? "bg-emerald-100 ring-1 ring-emerald-300" : "bg-red-100 ring-1 ring-red-300"
                )}>
                  {isIngreso
                    ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                    : <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                  }
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    isIngreso
                      ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                      : "border-red-300 text-red-700 bg-red-50"
                  )}
                >
                  {movimiento.tipo}
                </Badge>
              </div>

              <p className={cn(
                "text-2xl font-bold tabular-nums tracking-tight",
                isIngreso ? "text-emerald-700" : "text-red-700"
              )}>
                {isIngreso ? "+" : "−"}{formatBs(Math.abs(movimiento.monto))}
              </p>

              {movimiento.monto_usd != null && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${Math.abs(movimiento.monto_usd).toFixed(2)} USD
                  {movimiento.tasa_vigente != null && (
                    <span className="text-slate-400">· Tasa {Number(movimiento.tasa_vigente).toFixed(2)}</span>
                  )}
                </p>
              )}

              <p className="text-xs text-slate-400 mt-1">{formatDate(movimiento.fecha)}</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {movimiento.descripcion || <span className="italic text-slate-400">Sin descripción</span>}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{movimiento.referencia}</p>
          </div>
        </div>

        {/* Detalle */}
        <div className="px-6 py-2 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Cargando detalle…</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700 mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : detail ? (
            <div className="py-1">
              <Field label="Categoría" value={
                detail.categoria_nombre
                  ? <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">{detail.categoria_nombre}</Badge>
                  : <span className="italic text-slate-300">Sin categoría</span>
              } />
              <Field label="Tipo destino" value={detail.tipo_destino?.replace(/_/g, " ") ?? null} />
              <Field label="Banco" value={detail.banco} />
              <Field label="Cuenta" value={detail.cuenta_nombre} />
              <Field label="Monto Bs" value={
                <span className={cn("font-semibold tabular-nums", isIngreso ? "text-emerald-600" : "text-red-600")}>
                  {isIngreso ? "+" : "−"}{formatBs(Math.abs(detail.monto))}
                </span>
              } />
              <Field label="Tasa BCV" value={
                detail.tasa_vigente != null
                  ? <span className="tabular-nums">{Number(detail.tasa_vigente).toFixed(2)}</span>
                  : null
              } />
              <Field label="Monto USD" value={
                detail.monto_usd != null
                  ? <span className="tabular-nums text-emerald-600">${Math.abs(detail.monto_usd).toFixed(2)}</span>
                  : null
              } />
              <Field label="Referencia" value={<span className="font-mono">{detail.referencia}</span>} />
              <Field label="Transferencia interna" value={
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  detail.es_transferencia_interna
                    ? "border-amber-300 text-amber-600 bg-amber-50"
                    : "border-slate-200 text-slate-400"
                )}>
                  {detail.es_transferencia_interna ? "Sí" : "No"}
                </Badge>
              } />
              <Field label="Creado" value={formatDateTime(detail.creado_en)} />
              <Field
                label="Hash"
                value={<span className="font-mono text-[10px] text-slate-300">{detail.hash?.slice(0, 16) ?? "—"}…</span>}
              />
            </div>
          ) : null}

          {/* Distribuciones */}
          {(movimiento.distribuciones ?? []).length > 0 && (
            <div className="py-4 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Distribución entre empresas
                </p>
              </div>
              <div className="space-y-2">
                {(movimiento.distribuciones ?? []).map((d) => (
                  <div
                    key={d.empresa_id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-700">{d.empresa_nombre}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{d.porcentaje.toFixed(1)}% del total</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 tabular-nums">
                      −{formatBs(d.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-9 border-slate-300 text-slate-600 hover:bg-white"
          >
            Cerrar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
