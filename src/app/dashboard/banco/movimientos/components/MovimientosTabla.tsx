"use client"

import { ChevronLeft, ChevronRight, Inbox, ArrowUpRight, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Movimiento, MovimientosResponse } from "../types"
import { formatBs } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Props {
  data: MovimientosResponse | null
  loading: boolean
  page: number
  onPageChange: (page: number) => void
  onRowClick: (m: Movimiento) => void
  onEdit: (m: Movimiento) => void
}

function RowSkeleton() {
  return (
    <tr className="border-t border-slate-100">
      {[60, 180, 100, 80, 100, 60, 90, 60, 80, 40].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3 bg-slate-200 rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-VE", {
    day: "2-digit", month: "2-digit", year: "numeric"
  })
}

export function MovimientosTabla({ data, loading, page, onPageChange, onRowClick, onEdit }: Props) {
  const rows  = data?.movimientos ?? []
  const total = data?.total ?? 0
  const pages = data ? Math.ceil(data.total / data.limite) : 1

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Fecha", "Descripción", "Referencia", "Sub Tipo", "Categoría", "Monto Bs", "Tasa", "USD", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-slate-400 font-medium first:pl-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <RowSkeleton key={i} />)
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                      <Inbox className="h-8 w-8" />
                      <p className="text-sm">No hay movimientos con esos filtros</p>
                    </div>
                  </td>
                </tr>
              )
              : rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className={cn(
                    "border-t cursor-pointer transition-colors group",
                    // Movimiento original distribuido — resaltado en amarillo para auditoría.
                    // Se excluye de KPIs; los espejos reflejan la porción real de cada empresa.
                    row.tiene_distribucion
                      ? "border-amber-200 bg-amber-50/60 hover:bg-amber-100/70"
                      : row.es_transferencia_interna
                      ? "border-slate-100 opacity-60 hover:opacity-80 hover:bg-slate-50"
                      : "border-slate-100 hover:bg-slate-50"
                  )}
                >
                  {/* Fecha */}
                  <td className="pl-5 pr-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                    {formatFecha(row.fecha)}
                  </td>

                  {/* Descripción */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-700 truncate font-medium">
                        {row.descripcion || <span className="italic text-slate-300">Sin descripción</span>}
                      </span>
                      {row.es_transferencia_interna && (
                        <span className="text-[10px] text-slate-400">transferencia interna</span>
                      )}
                      {/* Indicador de distribución en el movimiento original */}
                      {row.tiene_distribucion && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          dividido entre empresas
                        </span>
                      )}
                      {(row.distribuciones ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(row.distribuciones ?? []).slice(0, 2).map((d) => (
                            <span
                              key={d.empresa_id}
                              className="text-[9px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5"
                            >
                              {d.empresa_nombre} {d.porcentaje.toFixed(0)}%
                            </span>
                          ))}
                          {row.distribuciones.length > 2 && (
                            <span className="text-[9px] text-amber-500">
                              +{row.distribuciones.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Referencia */}
                  <td className="px-4 py-3 text-slate-400 font-mono tracking-tight whitespace-nowrap">
                    {row.referencia}
                  </td>

                  {/* Sub Tipo */}
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {row.nombre_subtipo
                      ? <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{row.nombre_subtipo}</span>
                      : <span className="text-slate-300 italic text-[10px]">—</span>
                    }
                  </td>

                  {/* Categoría */}
                  <td className="px-4 py-3">
                    {row.categoria_nombre ? (
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 font-normal">
                        {row.categoria_nombre}
                      </Badge>
                    ) : (
                      <span className="text-slate-300 italic text-[10px]">sin categoría</span>
                    )}
                  </td>

                  {/* Monto Bs */}
                  <td className={cn(
                    "px-4 py-3 font-semibold tabular-nums text-right whitespace-nowrap",
                    // Original distribuido: monto atenuado para reforzar que no cuenta en KPIs
                    row.tiene_distribucion
                      ? "text-amber-500/70"
                      : row.tipo === "ingreso" ? "text-emerald-600" : "text-red-600"
                  )}>
                    {row.tipo === "egreso" ? "−" : "+"}{formatBs(Math.abs(row.monto))}
                  </td>

                  {/* Tasa */}
                  <td className="px-4 py-3 text-right text-slate-400 tabular-nums whitespace-nowrap">
                    {row.tasa_vigente != null
                      ? Number(row.tasa_vigente).toFixed(2)
                      : <span className="italic text-[10px] text-slate-300">—</span>
                    }
                  </td>

                  {/* USD */}
                  <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
                    {row.monto_usd != null
                      ? `$${Math.abs(row.monto_usd).toFixed(2)}`
                      : <span className="italic text-[10px] text-slate-300">—</span>
                    }
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 pr-5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(row)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {total.toLocaleString()} movimientos · página {page} de {pages}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-7 w-7 border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="h-7 w-7 border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}