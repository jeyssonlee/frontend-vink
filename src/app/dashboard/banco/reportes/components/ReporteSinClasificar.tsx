"use client"

import { useEffect, useState } from "react"
import { Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ReporteWrapper } from "./ReporteWrapper"
import { getSinClasificar } from "../api"
import { exportToExcel, exportToPDF } from "../lib/export"
import type { ReporteFilters, SinClasificar } from "../types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Props { filters: ReporteFilters }

export function ReporteSinClasificar({ filters }: Props) {
  const [data, setData] = useState<SinClasificar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSinClasificar(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  const handleExcel = () => {
    if (!data) return
    exportToExcel(
      data.movimientos.map((m) => ({
        Fecha: m.fecha,
        Descripción: m.descripcion,
        Referencia: m.referencia,
        Tipo: m.tipo,
        Monto: m.monto,
        Banco: m.banco,
        Cuenta: m.cuenta_nombre,
      })),
      "sin-clasificar"
    )
  }

  const handlePDF = () => {
    if (!data) return
    exportToPDF(
      "Movimientos Sin Clasificar",
      ["Fecha", "Descripción", "Tipo", "Monto", "Banco"],
      data.movimientos.map((m) => [m.fecha, m.descripcion, m.tipo, formatCurrency(m.monto), m.banco]),
      "sin-clasificar"
    )
  }

  return (
    <ReporteWrapper loading={loading} error={error} onExportExcel={handleExcel} onExportPDF={handlePDF}>
      {data && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-orange-950/30 border border-orange-900/50 p-4">
              <p className="text-[10px] text-orange-400/60 uppercase tracking-wider mb-1.5">Sin categoría</p>
              <p className="text-2xl font-bold text-orange-300 tabular-nums">{data.total}</p>
              <p className="text-[10px] text-orange-400/50 mt-0.5">movimientos</p>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Monto total</p>
              <p className="text-2xl font-bold text-zinc-200 tabular-nums">{formatCurrency(data.monto_total)}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">en movimientos sin clasificar</p>
            </div>
          </div>

          {data.total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-950/40 ring-1 ring-teal-800">
                <Tag className="h-5 w-5 text-teal-500" />
              </div>
              <p className="text-sm text-zinc-400">¡Todos los movimientos están clasificados!</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-950">
                  <tr>
                    {["Fecha", "Descripción", "Referencia", "Tipo", "Banco / Cuenta", "Monto"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-zinc-500 font-medium text-[10px] uppercase tracking-wider first:pl-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.map((m) => (
                    <tr key={m.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
                      <td className="pl-5 pr-4 py-3 text-zinc-400 tabular-nums whitespace-nowrap">{m.fecha}</td>
                      <td className="px-4 py-3 text-zinc-200 max-w-[200px] truncate">{m.descripcion}</td>
                      <td className="px-4 py-3 text-zinc-500 font-mono">{m.referencia}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          m.tipo === "ingreso" ? "border-emerald-800 text-emerald-400" : "border-red-800 text-red-400"
                        )}>
                          {m.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-400">{m.banco}</p>
                        <p className="text-zinc-600 text-[10px]">{m.cuenta_nombre}</p>
                      </td>
                      <td className={cn(
                        "px-4 py-3 font-bold tabular-nums text-right",
                        m.tipo === "ingreso" ? "text-emerald-400" : "text-red-400"
                      )}>
                        {m.tipo === "egreso" ? "−" : "+"}{formatCurrency(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ReporteWrapper>
  )
}