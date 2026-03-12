"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ReporteWrapper } from "./ReporteWrapper"
import { getImportaciones } from "../api"
import { exportToExcel } from "../lib/export"
import type { ReporteFilters, ImportacionesHistorial } from "../types"
import { cn } from "@/lib/utils"

interface Props { filters: ReporteFilters }

const estadoConfig = {
  completado: { label: "Completado", cls: "border-emerald-800 text-emerald-400" },
  parcial: { label: "Parcial", cls: "border-amber-800 text-amber-400" },
  error: { label: "Error", cls: "border-red-800 text-red-400" },
}

export function ReporteImportaciones({ filters }: Props) {
  const [data, setData] = useState<ImportacionesHistorial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getImportaciones(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  const handleExcel = () => {
    if (!data) return
    exportToExcel(
      data.importaciones.map((i) => ({
        Fecha: i.fecha_importacion,
        Banco: i.banco,
        Cuenta: i.cuenta_nombre,
        "Total Filas": i.total_filas,
        Importados: i.importados,
        Duplicados: i.duplicados,
        Estado: i.estado,
        Usuario: i.usuario,
      })),
      "historial-importaciones"
    )
  }

  return (
    <ReporteWrapper loading={loading} error={error} onExportExcel={handleExcel}>
      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500">{data.total} importaciones registradas</p>
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950">
                <tr>
                  {["Fecha", "Banco / Cuenta", "Filas", "Importados", "Duplicados", "Estado", "Usuario"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-zinc-500 font-medium text-[10px] uppercase tracking-wider first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.importaciones.map((imp) => {
                  const estado = estadoConfig[imp.estado]
                  const pctExito = imp.total_filas > 0
                    ? Math.round((imp.importados / imp.total_filas) * 100)
                    : 0

                  return (
                    <tr key={imp.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
                      <td className="pl-5 pr-4 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                        {new Date(imp.fecha_importacion).toLocaleString("es-VE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-200 font-medium">{imp.banco}</p>
                        <p className="text-zinc-600 text-[10px]">{imp.cuenta_nombre}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 tabular-nums">{imp.total_filas}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold tabular-nums">{imp.importados}</span>
                          <div className="h-1.5 w-12 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${pctExito}%` }}
                            />
                          </div>
                          <span className="text-zinc-600 text-[10px]">{pctExito}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {imp.duplicados > 0
                          ? <span className="text-amber-400 tabular-nums">{imp.duplicados}</span>
                          : <span className="text-zinc-700">0</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px]", estado.cls)}>
                          {estado.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-[11px]">{imp.usuario}</td>
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