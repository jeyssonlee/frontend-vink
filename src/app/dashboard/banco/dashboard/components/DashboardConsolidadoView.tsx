"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle, Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { KpiCard, EvolucionChart } from "./Charts"
import { getDashboardConsolidado } from "../dashboard/api"
import type { DashboardFilters, DashboardConsolidado, EmpresaKPI } from "../consolidado/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ─── Empresa row ──────────────────────────────────────────────────────────────
function EmpresaRow({ empresa, max }: { empresa: EmpresaKPI; max: number }) {
  const pct = max > 0 ? (empresa.egresos_reales / max) * 100 : 0
  const isPositive = empresa.neto >= 0

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">{empresa.empresa_nombre}</p>
            <p className="text-[10px] text-zinc-600">{empresa.movimientos} movimientos</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold tabular-nums shrink-0",
            isPositive ? "border-emerald-800 text-emerald-400" : "border-red-800 text-red-400"
          )}
        >
          {isPositive ? "+" : ""}{formatCurrency(empresa.neto)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-zinc-600 text-[10px]">Ingresos</p>
          <p className="font-semibold text-emerald-400 tabular-nums">{formatCurrency(empresa.total_ingresos)}</p>
        </div>
        <div>
          <p className="text-zinc-600 text-[10px]">Egresos reales</p>
          <p className="font-semibold text-red-400 tabular-nums">{formatCurrency(empresa.egresos_reales)}</p>
        </div>
      </div>

      {/* Relative bar */}
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  filters: DashboardFilters
}

export function DashboardConsolidadoView({ filters }: Props) {
  const [data, setData] = useState<DashboardConsolidado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDashboardConsolidado(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando consolidado…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="border-red-800 bg-red-950/30 text-red-300">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error ?? "Error al cargar"}</AlertDescription>
      </Alert>
    )
  }

  const maxEgresos = Math.max(...data.por_empresa.map((e) => e.egresos_reales), 1)

  return (
    <div className="space-y-5">
      {/* Period badge */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        <p className="text-xs text-zinc-400">
          Grupo consolidado ·{" "}
          <span className="text-zinc-600">
            {data.periodo.desde} → {data.periodo.hasta}
          </span>
          <span className="ml-2 text-zinc-500">
            · {data.por_empresa.length} empresa{data.por_empresa.length !== 1 ? "s" : ""}
          </span>
        </p>
      </div>

      {/* KPIs totales */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Ingresos totales"
          value={formatCurrency(data.totales.ingresos)}
          trend="up"
          accent="emerald"
        />
        <KpiCard
          label="Egresos reales"
          value={formatCurrency(data.totales.egresos_reales)}
          sub="Excluye transferencias internas"
          trend="down"
          accent="red"
        />
        <KpiCard
          label="Neto consolidado"
          value={formatCurrency(data.totales.neto)}
          trend={data.totales.neto >= 0 ? "up" : "down"}
          accent={data.totales.neto >= 0 ? "teal" : "red"}
        />
      </div>

      {/* Evolución */}
      <EvolucionChart data={data.evolucion_mensual} />

      {/* Por empresa */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Desglose por empresa
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.por_empresa.map((empresa) => (
            <EmpresaRow key={empresa.empresa_id} empresa={empresa} max={maxEgresos} />
          ))}
        </div>
      </div>
    </div>
  )
}