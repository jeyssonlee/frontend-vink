"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { ReporteWrapper } from "./ReporteWrapper"
import { getFlujoCaja } from "../api"
import { exportToExcel, exportToPDF } from "../lib/export"
import type { ReporteFilters, FlujoCaja } from "../types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

const monthLabel = (mes: string) => {
  const [, m] = mes.split("-")
  return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(m)-1]
}

interface Props { filters: ReporteFilters }

export function ReporteFlujoCaja({ filters }: Props) {
  const [data, setData] = useState<FlujoCaja | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getFlujoCaja(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  const handleExcelExport = () => {
    if (!data) return
    exportToExcel(
      data.mensual.map((m) => ({
        Mes: m.mes,
        Ingresos: m.ingresos,
        Egresos: m.egresos,
        Neto: m.neto,
        Acumulado: m.acumulado,
      })),
      "flujo-caja"
    )
  }

  const handlePDFExport = () => {
    if (!data) return
    exportToPDF(
      "Reporte de Flujo de Caja",
      ["Mes", "Ingresos", "Egresos", "Neto", "Acumulado"],
      data.mensual.map((m) => [
        m.mes,
        formatCurrency(m.ingresos),
        formatCurrency(m.egresos),
        formatCurrency(m.neto),
        formatCurrency(m.acumulado),
      ]),
      "flujo-caja"
    )
  }

  return (
    <ReporteWrapper
      loading={loading}
      error={error}
      onExportExcel={handleExcelExport}
      onExportPDF={handlePDFExport}
    >
      {data && (
        <div className="space-y-5">
          {/* KPI summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total ingresos", value: formatCurrency(data.resumen.total_ingresos), color: "text-emerald-400" },
              { label: "Total egresos", value: formatCurrency(data.resumen.total_egresos), color: "text-red-400" },
              { label: "Neto del período", value: formatCurrency(data.resumen.neto), color: data.resumen.neto >= 0 ? "text-teal-400" : "text-red-400" },
              { label: "Mejor mes", value: data.resumen.mejor_mes, color: "text-zinc-300" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">{k.label}</p>
                <p className={cn("text-lg font-bold tabular-nums", k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Area chart mensual */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Evolución mensual + acumulado
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={data.mensual.map((d) => ({
                  mes: monthLabel(d.mes),
                  Ingresos: d.ingresos,
                  Egresos: d.egresos,
                  Acumulado: d.acumulado,
                }))}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEgr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#a1a1aa", fontSize: 11 }}
                  itemStyle={{ fontSize: 11 }}
                  formatter={(value) => (value != null ? formatCurrency(Number(value)) : "")}
                />
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Ingresos" stroke="#34d399" strokeWidth={1.5} fill="url(#gIng)" dot={false} />
                <Area type="monotone" dataKey="Egresos" stroke="#f87171" strokeWidth={1.5} fill="url(#gEgr)" dot={false} />
                <Area type="monotone" dataKey="Acumulado" stroke="#2dd4bf" strokeWidth={1} strokeDasharray="4 4" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly table */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950">
                <tr>
                  {["Mes", "Ingresos", "Egresos", "Neto", "Acumulado"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-zinc-500 font-medium uppercase tracking-wider text-[10px] first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.mensual.map((row) => (
                  <tr key={row.mes} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
                    <td className="pl-5 pr-4 py-3 text-zinc-300 font-medium">{row.mes}</td>
                    <td className="px-4 py-3 text-emerald-400 tabular-nums font-semibold">{formatCurrency(row.ingresos)}</td>
                    <td className="px-4 py-3 text-red-400 tabular-nums font-semibold">{formatCurrency(row.egresos)}</td>
                    <td className={cn("px-4 py-3 tabular-nums font-bold", row.neto >= 0 ? "text-teal-400" : "text-red-400")}>
                      {row.neto >= 0 ? "+" : ""}{formatCurrency(row.neto)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums">{formatCurrency(row.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReporteWrapper>
  )
}