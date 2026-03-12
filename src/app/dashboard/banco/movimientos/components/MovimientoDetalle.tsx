"use client"

import { useEffect, useState } from "react"
import { X, Loader2, AlertCircle, ArrowUpRight, ArrowDownLeft, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { getMovimientoById } from "../movimientos/api"
import type { Movimiento, MovimientoDetalle } from "../movimientos/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Props {
  movimiento: Movimiento | null
  onClose: () => void
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-xs text-zinc-500 shrink-0 mt-0.5">{label}</span>
      <span className="text-xs text-zinc-200 text-right">{value ?? <span className="text-zinc-600 italic">—</span>}</span>
    </div>
  )
}

export function MovimientoDetalle({ movimiento, onClose }: Props) {
  const [detail, setDetail] = useState<MovimientoDetalle | null>(null)
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                isIngreso ? "bg-emerald-950 ring-1 ring-emerald-800" : "bg-red-950 ring-1 ring-red-900"
              )}>
                {isIngreso
                  ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                  : <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />
                }
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  isIngreso ? "border-emerald-800 text-emerald-400" : "border-red-800 text-red-400"
                )}
              >
                {movimiento.tipo}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-zinc-100 truncate">{movimiento.descripcion}</p>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">{movimiento.referencia}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 -mr-1 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Amount hero */}
        <div className={cn(
          "px-5 py-5 border-b border-zinc-800",
          isIngreso ? "bg-emerald-950/20" : "bg-red-950/20"
        )}>
          <p className="text-xs text-zinc-500 mb-1">{movimiento.fecha}</p>
          <p className={cn(
            "text-3xl font-bold tabular-nums tracking-tight",
            isIngreso ? "text-emerald-300" : "text-red-300"
          )}>
            {isIngreso ? "+" : "−"}{formatCurrency(movimiento.monto)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{movimiento.banco} · {movimiento.cuenta_nombre}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Cargando detalle…</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="border-red-800 bg-red-950/30 text-red-300 mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : detail ? (
            <div className="py-1 divide-y divide-zinc-800/60">
              <Field label="Categoría" value={
                detail.categoria_nombre
                  ? <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300">{detail.categoria_nombre}</Badge>
                  : null
              } />
              <Field label="Tipo destino" value={detail.tipo_destino} />
              <Field label="Banco" value={detail.banco} />
              <Field label="Cuenta" value={detail.cuenta_nombre} />
              <Field label="Fecha" value={detail.fecha} />
              <Field label="Referencia" value={<span className="font-mono">{detail.referencia}</span>} />
              <Field label="Transferencia interna" value={
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  detail.es_transferencia_interna
                    ? "border-amber-800 text-amber-400"
                    : "border-zinc-700 text-zinc-500"
                )}>
                  {detail.es_transferencia_interna ? "Sí" : "No"}
                </Badge>
              } />
              <Field label="Creado" value={new Date(detail.creado_en).toLocaleString("es-VE")} />
              <Field
                label="Hash"
                value={<span className="font-mono text-[10px] text-zinc-600 break-all">{detail.hash.slice(0, 16)}…</span>}
              />
            </div>
          ) : null}

          {/* Distribuciones */}
          {movimiento.distribuciones.length > 0 && (
            <div className="mt-4 pb-6">
              <Separator className="bg-zinc-800 mb-4" />
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Distribución entre empresas
                </p>
              </div>
              <div className="space-y-2">
                {movimiento.distribuciones.map((d) => (
                  <div
                    key={d.empresa_id}
                    className="flex items-center justify-between rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{d.empresa_nombre}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{d.porcentaje.toFixed(1)}% del total</p>
                    </div>
                    <span className="text-xs font-bold text-red-400 tabular-nums">
                      −{formatCurrency(d.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}