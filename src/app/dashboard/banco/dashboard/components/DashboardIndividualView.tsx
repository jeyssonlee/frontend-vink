"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { KpiCard, EvolucionChart, DesgloseChart } from "./Charts"
import { getDashboardIndividual } from "../dashboard/api"
import type { DashboardFilters, DashboardIndividual } from "../consolidado/types"
import { formatCurrency } from "@/lib/utils"

interface Props {
  filters: DashboardFilters
}

export function DashboardIndividualView({ filters }: Props) {
  const [data, setData] = useState<DashboardIndividual | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDashboardIndividual(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando dashboard…</span>
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

  const { kpis } = data

  return (
    <div className="space-y-5">
      {/* Account badge */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        <p className="text-xs text-zinc-400">
          {data.banco} · <span className="text-zinc-300 font-medium">{data.cuenta_nombre}</span>
          <span className="text-zinc-600 ml-2">
            {data.periodo.desde} → {data.periodo.hasta}
          </span>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Ingresos"
          value={formatCurrency(kpis.total_ingresos)}
          trend="up"
          accent="emerald"
        />
        <KpiCard
          label="Egresos"
          value={formatCurrency(kpis.total_egresos)}
          trend="down"
          accent="red"
        />
        <KpiCard
          label="Neto"
          value={formatCurrency(kpis.neto)}
          trend={kpis.neto >= 0 ? "up" : "down"}
          accent={kpis.neto >= 0 ? "teal" : "red"}
        />
        <KpiCard
          label="Prom. ing. mensual"
          value={formatCurrency(kpis.promedio_mensual_ingresos)}
          accent="zinc"
        />
        <KpiCard
          label="Sin categoría"
          value={String(kpis.movimientos_sin_categoria)}
          sub="movimientos"
          accent="zinc"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvolucionChart data={data.evolucion_mensual} />
        <DesgloseChart data={data.desglose_categorias} />
      </div>
    </div>
  )
}