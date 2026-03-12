"use client"

import { ChevronLeft, ChevronRight, Loader2, Inbox, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Movimiento, MovimientosResponse } from "../movimientos/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Props {
  data: MovimientosResponse | null
  loading: boolean
  page: number
  onPageChange: (page: number) => void
  onRowClick: (m: Movimiento) => void
}

function RowSkeleton() {
  return (
    <tr className="border-t border-zinc-800/60">
      {[40, 160, 90, 80, 60, 70].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-3 bg-zinc-800 rounded`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export function MovimientosTabla({ data, loading, page, onPageChange, onRowClick }: Props) {
  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-zinc-950">
            <tr>
              {["Fecha", "Descripción", "Referencia", "Categoría", "Tipo", "Monto", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-zinc-500 font-medium uppercase tracking-wider text-[10px] first:pl-5"
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
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-600">
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
                    "border-t border-zinc-800/60 cursor-pointer transition-colors group",
                    row.es_transferencia_interna
                      ? "opacity-60 hover:opacity-80"
                      : "hover:bg-zinc-900/70"
                  )}
                >
                  <td className="pl-5 pr-4 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                    {row.fecha}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-200 truncate font-medium">{row.descripcion}</span>
                      {row.es_transferencia_interna && (
                        <span className="text-[10px] text-zinc-600">transferencia interna</span>
                      )}
                      {row.distribuciones.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {row.distribuciones.slice(0, 2).map((d) => (
                            <span
                              key={d.empresa_id}
                              className="text-[9px] bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5"
                            >
                              {d.empresa_nombre} {d.porcentaje.toFixed(0)}%
                            </span>
                          ))}
                          {row.distribuciones.length > 2 && (
                            <span className="text-[9px] text-zinc-600">
                              +{row.distribuciones.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono tracking-tight">
                    {row.referencia}
                  </td>
                  <td className="px-4 py-3">
                    {row.categoria_nombre ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-zinc-700 text-zinc-400 font-normal"
                      >
                        {row.categoria_nombre}
                      </Badge>
                    ) : (
                      <span className="text-zinc-700 italic text-[10px]">sin categoría</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                    "px-4 py-3 font-bold tabular-nums text-right whitespace-nowrap",
                    row.tipo === "ingreso" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {row.tipo === "egreso" ? "−" : "+"}{formatCurrency(row.monto)}
                  </td>
                  <td className="px-4 py-3 pr-5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {total.toLocaleString()} movimientos · página {page} de {pages}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-7 w-7 border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="h-7 w-7 border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}