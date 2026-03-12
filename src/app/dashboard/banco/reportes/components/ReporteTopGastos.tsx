"use client"

import { useEffect, useState } from "react"
import { ReporteWrapper } from "./ReporteWrapper"
import { getTopGastos } from "../api"
import { exportToExcel, exportToPDF } from "../lib/export"
import type { ReporteFilters, TopGastos } from "../types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const PALETTE = ["#2dd4bf","#34d399","#60a5fa","#a78bfa","#fb923c","#f472b6","#facc15"]

interface Props { filters: ReporteFilters }

export function ReporteTopGastos({ filters }: Props) {
  const [data, setData] = useState<TopGastos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTopGastos(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  const handleExcel = () => {
    if (!data) return
    exportToExcel(
      data.top_movimientos.map((m) => ({
        Fecha: m.fecha,
        Descripción: m.descripcion,
        Referencia: m.referencia,
        Categoría: m.categoria_nombre ?? "—",
        "Tipo Destino": m.tipo_destino ?? "—",
        Monto: m.monto,
      })),
      "top-gastos"
    )
  }

  const handlePDF = () => {
    if (!data) return
    exportToPDF(
      "Top Gastos",
      ["Fecha", "Descripción", "Categoría", "Monto"],
      data.top_movimientos.map((m) => [
        m.fecha, m.descripcion, m.categoria_nombre ?? "—", formatCurrency(m.monto),
      ]),
      "top-gastos"
    )
  }

  return (
    <ReporteWrapper loading={loading} error={error} onExportExcel={handleExcel} onExportPDF={handlePDF}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Por categoría */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Por categoría</p>
              <div className="space-y-2.5">
                {data.por_categoria.map((c, i) => (
                  <div key={c.categoria_id ?? i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-300">{c.categoria_nombre ?? "Sin categoría"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{c.porcentaje.toFixed(1)}%</span>
                        <span className="text-xs font-bold text-red-400 tabular-nums">{formatCurrency(c.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.porcentaje}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por tipo destino */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Por tipo destino</p>
              <div className="space-y-2.5">
                {data.por_tipo_destino.map((d, i) => (
                  <div key={d.tipo_destino ?? i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-300">{d.tipo_destino ?? "Sin destino"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{d.porcentaje.toFixed(1)}%</span>
                        <span className="text-xs font-bold text-red-400 tabular-nums">{formatCurrency(d.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${d.porcentaje}%`, backgroundColor: PALETTE[(i + 3) % PALETTE.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top 10 movimientos */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top 10 movimientos</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-zinc-950/50">
                <tr>
                  {["#", "Fecha", "Descripción", "Categoría", "Destino", "Monto"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-zinc-500 font-medium text-[10px] uppercase tracking-wider first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.top_movimientos.map((m, i) => (
                  <tr key={m.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
                    <td className="pl-5 pr-4 py-3 text-zinc-600 tabular-nums font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums whitespace-nowrap">{m.fecha}</td>
                    <td className="px-4 py-3 text-zinc-200 max-w-[200px] truncate">{m.descripcion}</td>
                    <td className="px-4 py-3">
                      {m.categoria_nombre
                        ? <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">{m.categoria_nombre}</Badge>
                        : <span className="text-zinc-700 italic text-[10px]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-[11px]">{m.tipo_destino ?? "—"}</td>
                    <td className="px-4 py-3 text-red-400 font-bold tabular-nums text-right">
                      −{formatCurrency(m.monto)}
                    </td>
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