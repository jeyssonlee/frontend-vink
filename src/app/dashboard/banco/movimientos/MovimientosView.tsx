"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MovimientosFiltros } from "./components/MovimientosFiltros"
import { MovimientosTabla } from "./components/MovimientosTabla"
import { MovimientoDetalle } from "./components/MovimientoDetalle"
import { getMovimientos } from "./api"
import type { Movimiento, MovimientosFilters, MovimientosResponse } from "./types"
import Link from "next/link"
import { MovimientoEditDialog } from "./components/MovimientoEditDialog"
import { MovimientoManualDialog, MovimientoManual } from "./components/MovimientoManualDialog"


const DEFAULT_FILTERS: MovimientosFilters = {}

export function MovimientosView() {
  const [filters, setFilters] = useState<MovimientosFilters>(DEFAULT_FILTERS)
  const [data, setData] = useState<MovimientosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Movimiento | null>(null)
  const [editing, setEditing] = useState<Movimiento | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualEditing, setManualEditing] = useState<MovimientoManual | null>(null)

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

  const handleSaved = (updated: Movimiento) => {
    setData((prev) => prev ? {
      ...prev,
      movimientos: prev.movimientos.map((m) => m.id === updated.id ? updated : m)
    } : prev)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-slate-900 leading-tight mt-0.5">Movimientos</h1>
          </div>
          <div className="flex items-center gap-3">

          <Button onClick={() => { setManualEditing(null); setManualOpen(true) }}
             size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-slate-300">
              <Plus className="h-3.5 w-3.5" />
                Registrar
              </Button>

            <Button
              asChild
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
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
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <MovimientosFiltros filters={filters} onChange={setFilters} />
        <MovimientosTabla
          data={data}
          loading={loading}
          page={filters.page ?? 1}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          onRowClick={setSelected}
          onEdit={setEditing} />
          <MovimientoManualDialog
          open={manualOpen}
          movimiento={manualEditing}
          onClose={() => setManualOpen(false)}
          onSaved={() => { setManualOpen(false); fetchData() }}
          />

      </div>

      {/* Detail modal */}
      <MovimientoDetalle movimiento={selected} onClose={() => setSelected(null)} />
      <MovimientoEditDialog movimiento={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
    </div>
  )
}
