"use client"

import { useEffect, useState } from "react"
import {
  TrendingUp, TrendingDown, Copy, Tag, Loader2, AlertCircle, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getPaso2 } from "../api"
import type { Paso1Response, Paso2Response } from "../types"
import { cn, formatCurrency, formatBs } from "@/lib/utils"

interface Props {
  importacionId: number
  paso1Data: Paso1Response
  onContinue: (data: Paso2Response) => void
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: "emerald" | "red" | "amber" | "orange" | "default"
}) {
  const borderMap = {
    emerald: "border-emerald-200 bg-emerald-50",
    red:     "border-red-200 bg-red-50",
    amber:   "border-amber-200 bg-amber-50",
    orange:  "border-orange-200 bg-orange-50",
    default: "border-slate-200 bg-white",
  }
  const iconMap = {
    emerald: "text-emerald-500",
    red:     "text-red-500",
    amber:   "text-amber-500",
    orange:  "text-orange-500",
    default: "text-slate-400",
  }
  const a = accent ?? "default"
  return (
    <div className={cn("rounded-xl border p-4 space-y-2", borderMap[a])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <Icon className={cn("h-4 w-4", iconMap[a])} />
      </div>
      <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight break-all">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export function Paso2Validacion({ importacionId, paso1Data, onContinue }: Props) {
  const [data, setData] = useState<Paso2Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPaso2(importacionId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [importacionId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Validando movimientos…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error ?? "Error al cargar validación"}</AlertDescription>
      </Alert>
    )
  }

  const { totales, filas_nuevas, filas_duplicadas } = data
  const montoIngresos = totales.ingresos.monto_bs
  const montoEgresos  = totales.egresos.monto_bs
  const netos = montoIngresos - montoEgresos
  const totalFilas = totales.nuevos
  const listos = totalFilas - totales.sin_categoria
  const pctListos = totalFilas > 0 ? Math.round((listos / totalFilas) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Validación del extracto</h2>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs">
            {paso1Data.banco_detectado}
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          {data.importacion.banco_key} · {totalFilas} movimientos nuevos
          {filas_duplicadas.length > 0 && ` · ${filas_duplicadas.length} duplicados omitidos`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Ingresos"
          value={formatBs(montoIngresos)}
          sub={`${totales.ingresos.cantidad} movimientos`}
          accent="emerald"
        />
        <StatCard
          icon={TrendingDown}
          label="Egresos"
          value={formatBs(montoEgresos)}
          sub={`${totales.egresos.cantidad} movimientos`}
          accent="red"
        />
        <StatCard
          icon={Copy}
          label="Duplicados"
          value={totales.duplicados}
          sub="Serán ignorados"
          accent={totales.duplicados > 0 ? "amber" : "default"}
        />
        <StatCard
          icon={Tag}
          label="Sin categoría"
          value={totales.sin_categoria}
          sub="Requieren revisión"
          accent={totales.sin_categoria > 0 ? "orange" : "default"}
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Filas listas para importar</span>
          <span className="font-bold text-emerald-600">{pctListos}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${pctListos}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{listos} de {totalFilas} movimientos</span>
          <span>Neto: {formatBs(netos)}</span>
        </div>
      </div>

      {/* Preview table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Vista previa — primeros 5 movimientos
          </p>
        </div>
        <ScrollArea className="max-h-48">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {["Fecha", "Descripción", "Referencia", "Tipo", "Monto"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas_nuevas.slice(0, 5).map((row) => {
                const tipo = row.monto >= 0 ? "ingreso" : "egreso"
                return (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 tabular-nums">{row.fecha}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate">{row.concepto}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{row.referencia}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          tipo === "ingreso"
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                            : "border-red-300 text-red-700 bg-red-50"
                        )}
                      >
                        {tipo}
                      </Badge>
                    </td>
                    <td className={cn(
                      "px-4 py-2.5 font-semibold tabular-nums text-right",
                      tipo === "ingreso" ? "text-emerald-600" : "text-red-600"
                    )}>
                      {tipo === "egreso" ? "-" : "+"}{formatBs(Math.abs(row.monto))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {totales.duplicados > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Se encontraron <strong>{totales.duplicados} duplicados</strong>. Serán ignorados automáticamente al consolidar.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={() => onContinue(data)}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-11"
      >
        <span className="flex items-center gap-2">
          Revisar y editar movimientos
          <ArrowRight className="h-4 w-4" />
        </span>
      </Button>
    </div>
  )
}