"use client"

import { useCallback, useEffect, useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MovimientosFiltros } from "./components/MovimientosFiltros"
import { MovimientosTabla } from "./components/MovimientosTabla"
import { MovimientoDetalle } from "./components/MovimientoDetalle"
import { getMovimientos } from "./api"
import type { Movimiento, MovimientosFilters, MovimientosResponse } from "./types"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

const DEFAULT_FILTERS: MovimientosFilters = {
  page: 1,
  limit: 25,
}

export function MovimientosView() {
  const [filters, setFilters] = useState<MovimientosFilters>(DEFAULT_FILTERS)
  const [data, setData] = useState<MovimientosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Movimiento | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMovimientos(filters)
      setData(res)
    } catch {
      // handle silently — table shows empty state
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived totals from current page (replace with server-side aggregates if available)
  const pageIngresos = data?.data.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0) ?? 0
  const pageEgresos = data?.data.filter((m) => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0) ?? 0

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-zinc-100 leading-tight mt-0.5">Movimientos</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick totals */}
            {data && (
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <div className="text-right">
                  <p className="text-zinc-600">Ingresos (pág.)</p>
                  <p className="font-semibold text-emerald-400 tabular-nums">{formatCurrency(pageIngresos)}</p>
                </div>
                <div className="w-px h-6 bg-zinc-800" />
                <div className="text-right">
                  <p className="text-zinc-600">Egresos (pág.)</p>
                  <p className="font-semibold text-red-400 tabular-nums">{formatCurrency(pageEgresos)}</p>
                </div>
              </div>
            )}
            <Button
              asChild
              size="sm"
              className="h-8 bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1.5"
            >
              <Link href="/dashboard/banco/importacion">
                <Upload className="h-3.5 w-3.5" />
                Importar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        <MovimientosFiltros filters={filters} onChange={setFilters} />
        <MovimientosTabla
          data={data}
          loading={loading}
          page={filters.page}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          onRowClick={setSelected}
        />
      </div>

      {/* Detail panel */}
      <MovimientoDetalle movimiento={selected} onClose={() => setSelected(null)} />
    </div>
  )
}