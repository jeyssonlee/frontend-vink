"use client"

import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { ReporteWrapper } from "./ReporteWrapper"
import { getComparativaEmpresas } from "../api"
import { exportToExcel, exportToPDF } from "../lib/export"
import type { ReporteFilters, ComparativaEmpresas } from "../types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Props { filters: ReporteFilters }

export function ReporteComparativaEmpresas({ filters }: Props) {
  const [data, setData] = useState<ComparativaEmpresas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getComparativaEmpresas(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  const handleExcel = () => {
    if (!data) return
    exportToExcel(
      data.empresas.map((e) => ({
        Empresa: e.empresa_nombre,
        Ingresos: e.total_ingresos,
        Egresos: e.total_egresos,
        "Egresos Reales": e.egresos_reales,
        Neto: e.neto,
        Movimientos: e.movimientos,
        "Promedio/Movimiento": e.promedio_por_movimiento,
      })),
      "comparativa-empresas"
    )
  }

  const handlePDF = () => {
    if (!data) return
    exportToPDF(
      "Comparativa de Empresas",
      ["Empresa", "Ingresos", "Egresos Reales", "Neto", "Movimientos"],
      data.empresas.map((e) => [
        e.empresa_nombre,
        formatCurrency(e.total_ingresos),
        formatCurrency(e.egresos_reales),
        formatCurrency(e.neto),
        String(e.movimientos),
      ]),
      "comparativa-empresas"
    )
  }

  const maxIngresos = data ? Math.max(...data.empresas.map((e) => e.total_ingresos), 1) : 1

  return (
    <ReporteWrapper loading={loading} error={error} onExportExcel={handleExcel} onExportPDF={handlePDF}>
      {data && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            {data.periodo.desde} → {data.periodo.hasta} · {data.empresas.length} empresa{data.empresas.length !== 1 ? "s" : ""}
            <span className="ml-2 text-zinc-700">· Egresos reales excluyen transferencias internas</span>
          </p>

          {/* Table */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950">
                <tr>
                  {["Empresa", "Ingresos", "Egresos reales", "Neto", "Movimientos", "Prom./mov."].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-zinc-500 font-medium text-[10px] uppercase tracking-wider first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.empresas
                  .sort((a, b) => b.total_ingresos - a.total_ingresos)
                  .map((emp) => {
                    const pct = (emp.total_ingresos / maxIngresos) * 100
                    return (
                      <tr key={emp.empresa_id} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
                        <td className="pl-5 pr-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 shrink-0">
                              <Building2 className="h-3 w-3 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-zinc-200 font-medium">{emp.empresa_nombre}</p>
                              <div className="h-1 w-16 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                                <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold tabular-nums">{formatCurrency(emp.total_ingresos)}</td>
                        <td className="px-4 py-3 text-red-400 font-semibold tabular-nums">{formatCurrency(emp.egresos_reales)}</td>
                        <td className={cn("px-4 py-3 font-bold tabular-nums", emp.neto >= 0 ? "text-teal-400" : "text-red-400")}>
                          {emp.neto >= 0 ? "+" : ""}{formatCurrency(emp.neto)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 tabular-nums">{emp.movimientos}</td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">{formatCurrency(emp.promedio_por_movimiento)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReporteWrapper>
  )
}