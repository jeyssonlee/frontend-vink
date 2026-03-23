"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus, Pencil, Trash2, Loader2, RefreshCw,
  AlertCircle, ChevronLeft, ChevronRight,
  X, Check, Banknote, TrendingUp, TrendingDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  MovimientoManualForm,
  type CuentaBancaria,
  type MovimientoManual,
  TIPO_EGRESO_LABELS,
} from "../MovimientoManualForm"


// ─── Types ───────────────────────────────────────────────────────────────────

interface ListaResponse {
  total: number
  limite: number
  offset: number
  movimientos: MovimientoManual[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIMITE = 20

const fmtUsd = (v: any) =>
  `$${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(parseFloat(String(v ?? 0)))
  )}`

const fmtFecha = (s: string) => {
  if (!s) return ""
  const [y, m, d] = s.split("T")[0].split("-")
  return `${d}/${m}/${y}`
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function MovimientosManualesView() {
  const [data,       setData]       = useState<ListaResponse | null>(null)
  const [cuentas,    setCuentas]    = useState<CuentaBancaria[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [offset,     setOffset]     = useState(0)
  const [drawerItem, setDrawerItem] = useState<MovimientoManual | null | undefined>(undefined) // undefined = cerrado
  const [deleting,   setDeleting]   = useState<number | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)

  // Filtros
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [tipo,       setTipo]       = useState("")

  // Cargar cuentas una vez
  useEffect(() => {
    api.get("/banco/cuentas").then(r => setCuentas(r.data)).catch(() => {})
  }, [])

  const fetchData = useCallback(async (off = 0) => {
    setLoading(true)
    setError(null)
    const p = new URLSearchParams({ limite: String(LIMITE), offset: String(off) })
    if (fechaDesde) p.set("fecha_desde", fechaDesde)
    if (fechaHasta) p.set("fecha_hasta", fechaHasta)
    if (tipo)       p.set("tipo", tipo)
    try {
      const { data: res } = await api.get(`/banco/movimientos-manuales?${p}`)
      setData(res)
      setOffset(off)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error cargando movimientos")
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta, tipo])

  useEffect(() => { fetchData(0) }, [fetchData])

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await api.delete(`/banco/movimientos-manuales/${id}`)
      setConfirmDel(null)
      fetchData(offset)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al eliminar")
    } finally {
      setDeleting(null)
    }
  }

  const movimientos = data?.movimientos ?? []
  const total       = data?.total ?? 0
  const totalPages  = Math.ceil(total / LIMITE)
  const currentPage = Math.floor(offset / LIMITE) + 1

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-slate-900 leading-tight mt-0.5">Movimientos manuales</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fetchData(offset)} disabled={loading}
              className="h-8 border-slate-300 text-slate-600 gap-1.5 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" onClick={() => setDrawerItem(null)}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nuevo movimiento
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="">Todos</option>
              <option value="INGRESO">Ingresos</option>
              <option value="EGRESO">Egresos</option>
            </select>
          </div>
          {(fechaDesde || fechaHasta || tipo) && (
            <button onClick={() => { setFechaDesde(""); setFechaHasta(""); setTipo("") }}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors pb-0.5">
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
          <div className="ml-auto text-[11px] text-slate-400 self-end pb-0.5">
            {total} movimiento{total !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando…</span>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Banknote className="h-8 w-8 text-slate-200" />
              <p className="text-sm">Sin movimientos para este período</p>
              <button onClick={() => setDrawerItem(null)}
                className="text-xs text-emerald-600 hover:underline mt-1">+ Registrar el primero</button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Fecha</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cuenta</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Descripción</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Monto USD</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movimientos.map((m: MovimientoManual) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors group">

                    {/* Fecha */}
                    <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">
                      {fmtFecha(m.fecha)}
                    </td>

                    {/* Cuenta */}
                    <td className="px-4 py-3">
                      <span className="text-slate-700 font-medium">{m.nombre_cuenta ?? "—"}</span>
                    </td>

                    {/* Descripción */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-slate-600 truncate block">
                        {m.descripcion || <span className="text-slate-300 italic">Sin descripción</span>}
                      </span>
                      {m.tipo_egreso && (
                        <span className="text-[10px] text-slate-400">{TIPO_EGRESO_LABELS[m.tipo_egreso] ?? m.tipo_egreso}</span>
                      )}
                    </td>

                    {/* Tipo badge */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        m.tipo === "INGRESO"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      )}>
                        {m.tipo === "INGRESO"
                          ? <TrendingUp   className="h-2.5 w-2.5" />
                          : <TrendingDown className="h-2.5 w-2.5" />}
                        {m.tipo === "INGRESO" ? "Ingreso" : "Egreso"}
                      </span>
                    </td>

                    {/* Monto */}
                    <td className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap",
                      m.tipo === "INGRESO" ? "text-emerald-600" : "text-red-500"
                    )}>
                      {m.tipo === "INGRESO" ? "+" : "−"}{fmtUsd(m.monto_usd)}
                      {m.tasa_vigente && (
                        <p className="text-[10px] text-slate-400 font-normal">
                          @ {parseFloat(m.tasa_vigente).toFixed(2)} Bs/$
                        </p>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      {confirmDel === m.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                            className="h-6 px-2 rounded-md bg-red-500 text-white text-[10px] font-medium hover:bg-red-600 transition-colors flex items-center gap-1">
                            {deleting === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Confirmar
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            className="h-6 px-2 rounded-md border border-slate-200 text-slate-500 text-[10px] hover:bg-slate-50 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDrawerItem(m)}
                            className="h-6 w-6 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => setConfirmDel(m.id)}
                            className="h-6 w-6 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Página {currentPage} de {totalPages} · {total} registros
            </p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={offset === 0 || loading}
                onClick={() => fetchData(Math.max(0, offset - LIMITE))}
                className="h-7 w-7 p-0 border-slate-200">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" disabled={offset + LIMITE >= total || loading}
                onClick={() => fetchData(offset + LIMITE)}
                className="h-7 w-7 p-0 border-slate-200">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer crear/editar */}
      {drawerItem !== undefined && (
        <MovimientoManualForm
          initial={drawerItem}
          cuentas={cuentas}
          onClose={() => setDrawerItem(undefined)}
          onSaved={() => { setDrawerItem(undefined); fetchData(offset) }}
        />
      )}
    </div>
  )
}