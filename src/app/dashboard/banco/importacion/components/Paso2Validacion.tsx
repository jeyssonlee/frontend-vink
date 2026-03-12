"use client"

import { useEffect, useState } from "react"
import {
  TrendingUp, TrendingDown, Copy, Tag, Loader2, AlertCircle, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getPaso2 } from "../importacion/api"
import type { Paso1Response, Paso2Response } from "../importacion/types"
import { cn, formatCurrency } from "@/lib/utils"

interface Props {
  importacionId: string
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
  accent?: string
}) {
  return (
    <div className={cn("rounded-xl border bg-zinc-900 p-4 space-y-2", accent ?? "border-zinc-800")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
        <Icon className={cn("h-4 w-4", accent ? "text-teal-400" : "text-zinc-600")} />
      </div>
      <p className="text-2xl font-bold text-zinc-100 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
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
      <div className="flex h-64 items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Validando movimientos…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="border-red-800 bg-red-950/40 text-red-300">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error ?? "Error al cargar validación"}</AlertDescription>
      </Alert>
    )
  }

  const netos = data.ingresos - data.egresos
  const listos = data.total_filas - data.duplicados - data.sin_categoria
  const pctListos = Math.round((listos / data.total_filas) * 100)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-zinc-100">Validación del extracto</h2>
          <Badge variant="outline" className="border-teal-700 text-teal-400 text-xs">
            {paso1Data.banco_detectado}
          </Badge>
        </div>
        <p className="text-sm text-zinc-400">
          {data.cuenta} · {data.total_filas} movimientos detectados
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Ingresos"
          value={formatCurrency(data.ingresos)}
          accent="border-emerald-900"
        />
        <StatCard
          icon={TrendingDown}
          label="Egresos"
          value={formatCurrency(data.egresos)}
          accent="border-red-900"
        />
        <StatCard
          icon={Copy}
          label="Duplicados"
          value={data.duplicados}
          sub="Serán ignorados"
          accent={data.duplicados > 0 ? "border-amber-900" : "border-zinc-800"}
        />
        <StatCard
          icon={Tag}
          label="Sin categoría"
          value={data.sin_categoria}
          sub="Requieren revisión"
          accent={data.sin_categoria > 0 ? "border-orange-900" : "border-zinc-800"}
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Filas listas para importar</span>
          <span className="font-bold text-teal-400">{pctListos}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-700"
            style={{ width: `${pctListos}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{listos} de {data.total_filas} movimientos</span>
          <span>Neto: {formatCurrency(netos)}</span>
        </div>
      </div>

      {/* Preview table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Vista previa — primeros 5 movimientos
          </p>
        </div>
        <ScrollArea className="max-h-48">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950">
              <tr>
                {["Fecha", "Descripción", "Referencia", "Tipo", "Monto"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.filas.slice(0, 5).map((row) => (
                <tr key={row.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
                  <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{row.fecha}</td>
                  <td className="px-4 py-2.5 text-zinc-300 max-w-[200px] truncate">{row.descripcion}</td>
                  <td className="px-4 py-2.5 text-zinc-500 font-mono">{row.referencia}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        row.tipo === "ingreso"
                          ? "border-emerald-800 text-emerald-400"
                          : "border-red-800 text-red-400"
                      )}
                    >
                      {row.tipo}
                    </Badge>
                  </td>
                  <td className={cn(
                    "px-4 py-2.5 font-semibold tabular-nums text-right",
                    row.tipo === "ingreso" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {row.tipo === "egreso" ? "−" : "+"}{formatCurrency(row.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {data.duplicados > 0 && (
        <Alert className="border-amber-800 bg-amber-950/30 text-amber-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Se encontraron <strong>{data.duplicados} duplicados</strong>. Serán ignorados automáticamente al consolidar.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={() => onContinue(data)}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium h-11"
      >
        <span className="flex items-center gap-2">
          Revisar y editar movimientos
          <ArrowRight className="h-4 w-4" />
        </span>
      </Button>
    </div>
  )
}