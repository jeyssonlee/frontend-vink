"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Pencil, SplitSquareHorizontal, Trash2, ArrowRight, Loader2,
  AlertCircle, Plus, X, Check, DollarSign, CheckSquare, Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateStagingRow, setDistribuciones, deleteDistribuciones } from "../api"
import { api } from "@/lib/api"
import type { Paso2Response, StagingRowConDistribuciones } from "../types"
import { cn, formatCurrency, formatBs } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Categoria {
  id: number
  nombre: string
  id_subtipo: number | null
}

interface Subtipo {
  id: number
  nombre: string
  id_tipo: number
  nombre_tipo: string
}

interface Empresa {
  id: string
  nombre: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tipoFromMonto(monto: number): "ingreso" | "egreso" {
  return monto >= 0 ? "ingreso" : "egreso"
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
function EditDialog({
  row,
  importacionId,
  categorias,
  subtipos,
  onSave,
  onClose,
}: {
  row: StagingRowConDistribuciones
  importacionId: number
  categorias: Categoria[]
  subtipos: Subtipo[]
  onSave: (row: StagingRowConDistribuciones) => void
  onClose: () => void
}) {
  const tipo = tipoFromMonto(row.monto)
  const tipoSistema = tipo === "ingreso" ? "INGRESO" : "EGRESO"

  const [form, setForm] = useState({
    concepto:     row.concepto,
    id_categoria: row.id_categoria ? String(row.id_categoria) : "",
    id_subtipo:   row.id_subtipo   ? String(row.id_subtipo)   : "",
    tasa:         String(row.tasa_vigente ?? ""),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Filtrar subtipos y categorías por tipo del movimiento
  const subtiposFiltrados = subtipos.filter((s) => s.nombre_tipo === tipoSistema)
  const idSubtiposFiltrados = new Set(subtiposFiltrados.map((s) => s.id))
  const categoriasFiltradas = categorias.filter(
    (c) => c.id_subtipo === null || idSubtiposFiltrados.has(c.id_subtipo)
  )

  const handleCategoriaChange = (val: string) => {
    const id = val === "ninguna" ? "" : val
    setForm((f) => {
      const cat = categorias.find((c) => String(c.id) === id)
      return { ...f, id_categoria: id, id_subtipo: cat?.id_subtipo ? String(cat.id_subtipo) : f.id_subtipo }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateStagingRow(importacionId, row.id, {
        id_categoria: form.id_categoria ? parseInt(form.id_categoria) : undefined,
        id_subtipo:   form.id_subtipo   ? parseInt(form.id_subtipo)   : null,
        notas:        row.notas ?? undefined,
        tasa_vigente: Number(form.tasa) || undefined,
      })

      const tasaNum  = Number(form.tasa)
      const montoNum = Math.abs(Number(row.monto))

      onSave({
        ...row,
        concepto:          form.concepto,
        id_categoria:      form.id_categoria ? parseInt(form.id_categoria) : null,
        nombre_categoria:  categorias.find((c) => c.id === parseInt(form.id_categoria))?.nombre ?? null,
        id_subtipo:        form.id_subtipo ? parseInt(form.id_subtipo) : null,
        nombre_subtipo:    subtipos.find((s) => s.id === parseInt(form.id_subtipo))?.nombre ?? null,
        tasa_vigente:      tasaNum || row.tasa_vigente,
        monto_usd:         tasaNum > 0 ? montoNum / tasaNum : row.monto_usd,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-slate-900">Editar movimiento</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Fecha</Label>
            <div className="border border-slate-200 bg-slate-50 rounded-md px-3 h-9 flex items-center text-sm text-slate-400">
              {(() => {
                const d = new Date(row.fecha)
                return isNaN(d.getTime())
                  ? row.fecha
                  : d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
              })()}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Monto</Label>
            <div className="border border-slate-200 bg-slate-50 rounded-md px-3 h-9 flex items-center text-sm text-slate-400">
              {Number(row.monto).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Referencia</Label>
          <div className="border border-slate-200 bg-slate-50 rounded-md px-3 h-9 flex items-center text-sm text-slate-400">
            {row.referencia || <span className="italic">Sin referencia</span>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Concepto</Label>
          <Input
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
            className="border-slate-300 text-slate-900 text-sm h-9"
          />
        </div>

        {/* Categoría filtrada por tipo */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Categoría</Label>
          <Select value={form.id_categoria || "ninguna"} onValueChange={handleCategoriaChange}>
            <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-sm">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguna" className="text-slate-400 text-xs italic">Sin categoría</SelectItem>
              {categoriasFiltradas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub Tipo filtrado por tipo */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Sub Tipo</Label>
          <Select
            value={form.id_subtipo || "ninguno"}
            onValueChange={(v) => setForm((f) => ({ ...f, id_subtipo: v === "ninguno" ? "" : v }))}
          >
            <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-sm">
              <SelectValue placeholder="Sin sub tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno" className="text-slate-400 text-xs italic">Sin sub tipo</SelectItem>
              {subtiposFiltrados.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {row.tasa_vigente && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Tasa aplicada</span>
              </div>
              <span className="text-xs text-emerald-600 font-semibold">
                {form.tasa && Number(form.tasa) > 0
                  ? `= $${(Math.abs(Number(row.monto)) / Number(form.tasa)).toFixed(2)}`
                  : "—"}
              </span>
            </div>
            <Input
              type="number"
              value={form.tasa}
              onChange={(e) => setForm((f) => ({ ...f, tasa: e.target.value }))}
              className="border-slate-300 text-slate-900 text-sm h-9"
              placeholder="Tasa BCV"
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-9">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1.5" />Guardar</>}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ─── Bulk Edit Dialog ─────────────────────────────────────────────────────────
function BulkEditDialog({
  selectedIds,
  importacionId,
  categorias,
  subtipos,
  rows,
  onSave,
  onClose,
}: {
  selectedIds: Set<number>
  importacionId: number
  categorias: Categoria[]
  subtipos: Subtipo[]
  rows: StagingRowConDistribuciones[]
  onSave: (updated: StagingRowConDistribuciones[]) => void
  onClose: () => void
}) {
  const [id_categoria, setIdCategoria] = useState("")
  const [id_subtipo, setIdSubtipo]     = useState("")
  const [saving, setSaving]            = useState(false)
  const [error, setError]              = useState<string | null>(null)

  // Determinar si la selección es mixta (ingresos y egresos)
  const selectedRows = rows.filter((r) => selectedIds.has(r.id))
  const tiposMezclados = selectedRows.some((r) => r.monto >= 0) && selectedRows.some((r) => r.monto < 0)

  // Si todos son del mismo tipo, filtrar — si hay mezcla, mostrar todo
  const primerTipo = selectedRows[0] ? tipoFromMonto(selectedRows[0].monto) : "egreso"
  const tipoSistema = primerTipo === "ingreso" ? "INGRESO" : "EGRESO"

  const subtiposFiltrados = tiposMezclados
    ? subtipos
    : subtipos.filter((s) => s.nombre_tipo === tipoSistema)

  const idSubtiposFiltrados = new Set(subtiposFiltrados.map((s) => s.id))
  const categoriasFiltradas = tiposMezclados
    ? categorias
    : categorias.filter((c) => c.id_subtipo === null || idSubtiposFiltrados.has(c.id_subtipo))

  const handleCategoriaChange = (val: string) => {
    const id = val === "ninguna" ? "" : val
    setIdCategoria(id)
    if (id) {
      const cat = categorias.find((c) => String(c.id) === id)
      if (cat?.id_subtipo) setIdSubtipo(String(cat.id_subtipo))
    }
  }

  const handleSave = async () => {
    if (!id_categoria && !id_subtipo) return
    setSaving(true)
    setError(null)
    try {
      const dto: any = {}
      if (id_categoria) dto.id_categoria = parseInt(id_categoria)
      if (id_subtipo)   dto.id_subtipo   = parseInt(id_subtipo)

      await Promise.all(
        Array.from(selectedIds).map((id) => updateStagingRow(importacionId, id, dto))
      )

      const updated = rows.map((r) => {
        if (!selectedIds.has(r.id)) return r
        return {
          ...r,
          id_categoria:     id_categoria ? parseInt(id_categoria) : r.id_categoria,
          nombre_categoria: id_categoria ? categorias.find((c) => c.id === parseInt(id_categoria))?.nombre ?? r.nombre_categoria : r.nombre_categoria,
          id_subtipo:       id_subtipo   ? parseInt(id_subtipo)   : r.id_subtipo,
          nombre_subtipo:   id_subtipo   ? subtipos.find((s) => s.id === parseInt(id_subtipo))?.nombre ?? r.nombre_subtipo : r.nombre_subtipo,
        }
      })
      onSave(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-slate-900">
          Editar {selectedIds.size} movimientos
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {tiposMezclados && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">
              La selección incluye ingresos y egresos — se muestran todas las opciones.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Categoría</Label>
          <Select value={id_categoria || "ninguna"} onValueChange={handleCategoriaChange}>
            <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-sm">
              <SelectValue placeholder="Sin cambio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguna" className="text-slate-400 text-xs italic">Sin cambio</SelectItem>
              {categoriasFiltradas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Sub Tipo</Label>
          <Select value={id_subtipo || "ninguno"} onValueChange={(v) => setIdSubtipo(v === "ninguno" ? "" : v)}>
            <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-sm">
              <SelectValue placeholder="Sin cambio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno" className="text-slate-400 text-xs italic">Sin cambio</SelectItem>
              {subtiposFiltrados.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!id_categoria && !id_subtipo)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-9"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1.5" />Aplicar a {selectedIds.size}</>}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ─── Distribution Dialog ──────────────────────────────────────────────────────
function DistribucionDialog({
  row, importacionId, empresas, onSave, onClose,
}: {
  row: StagingRowConDistribuciones
  importacionId: number
  empresas: Empresa[]
  onSave: (row: StagingRowConDistribuciones) => void
  onClose: () => void
}) {
  const esIngreso = row.monto >= 0
  const [items, setItems] = useState<{ empresa_id: string; monto: string; id_cuenta: string }[]>(
    row.distribuciones.length > 0
      ? row.distribuciones.map((d) => ({ empresa_id: d.id_empresa, monto: String(d.monto), id_cuenta: String((d as any).id_cuenta ?? "") }))
      : [{ empresa_id: "", monto: "", id_cuenta: "" }]
  )
  const [cuentasPorEmpresa, setCuentasPorEmpresa] = useState<Record<string, { id: number; nombre: string; numero_cuenta: string }[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const montoAbs = Math.abs(row.monto)
  const total    = items.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0)
  const diff     = Math.abs(total - montoAbs)
  const isValid  = diff < 0.01 &&
    items.every((i) => i.empresa_id && (!esIngreso || i.id_cuenta))

  // Cargar cuentas cuando se selecciona empresa
  const cargarCuentas = async (id_empresa: string) => {
    if (cuentasPorEmpresa[id_empresa]) return
    try {
      const { data } = await api.get(`/banco/cuentas/empresa/${id_empresa}`)
      setCuentasPorEmpresa((prev) => ({ ...prev, [id_empresa]: data }))
    } catch {}
  }

  const handleEmpresaChange = (i: number, empresa_id: string) => {
    setItems((prev) => prev.map((x, j) => j === i ? { ...x, empresa_id, id_cuenta: "" } : x))
    if (empresa_id) cargarCuentas(empresa_id)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await setDistribuciones(importacionId, row.id, {
        distribuciones: items.map((i) => ({
          id_empresa: i.empresa_id,
          monto: parseFloat(i.monto),
          id_cuenta: i.id_cuenta ? parseInt(i.id_cuenta) : undefined,
        })),
      })
      onSave({
        ...row,
        distribuciones: items.map((i) => ({
          id_staging: row.id,
          id_empresa: i.empresa_id,
          monto: parseFloat(i.monto),
          porcentaje: (parseFloat(i.monto) / montoAbs) * 100,
        })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar distribución")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await deleteDistribuciones(importacionId, row.id)
      onSave({ ...row, distribuciones: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al limpiar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-2xl w-full">
      <DialogHeader>
        <DialogTitle className="text-slate-900">
          Distribuir {esIngreso ? "ingreso" : "egreso"} entre empresas
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className={cn(
          "rounded-lg border px-4 py-2.5 flex items-center justify-between",
          esIngreso ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        )}>
          <span className={cn("text-xs", esIngreso ? "text-emerald-600" : "text-red-600")}>
            Monto total a distribuir
          </span>
          <div className="text-right">
            <span className={cn("font-bold tabular-nums", esIngreso ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(montoAbs)}
            </span>
            {row.monto_usd && (
              <span className={cn("ml-2 text-xs", esIngreso ? "text-emerald-400" : "text-red-400")}>
                (${Math.abs(row.monto_usd).toFixed(2)} USD)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2 items-center">
                <Select value={item.empresa_id} onValueChange={(v) => handleEmpresaChange(i, v)}>
                  <SelectTrigger className="flex-1 border-slate-300 h-9 text-sm">
                    <SelectValue placeholder="Empresa…" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.length === 0
                      ? <div className="px-3 py-2 text-xs text-slate-400">Cargando empresas…</div>
                      : empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Monto"
                  value={item.monto}
                  onChange={(e) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, monto: e.target.value } : x))}
                  className="w-28 border-slate-300 text-sm h-9"
                />
                {items.length > 1 && (
                  <Button variant="ghost" size="icon"
                    className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Selector de cuenta — solo para ingresos */}
              {esIngreso && item.empresa_id && (
                <div className="pl-1">
                  <Select
                    value={item.id_cuenta}
                    onValueChange={(v) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, id_cuenta: v } : x))}
                  >
                    <SelectTrigger className="border-slate-300 h-8 text-xs text-slate-600">
                      <SelectValue placeholder="Seleccionar cuenta destino…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(cuentasPorEmpresa[item.empresa_id] ?? []).length === 0
                        ? <div className="px-3 py-2 text-xs text-slate-400">Sin cuentas registradas</div>
                        : (cuentasPorEmpresa[item.empresa_id] ?? []).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                              {c.nombre} — {c.numero_cuenta}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}

          <Button variant="ghost" size="sm"
            onClick={() => setItems((prev) => [...prev, { empresa_id: "", monto: "", id_cuenta: "" }])}
            className="text-xs text-slate-500 hover:text-emerald-600 hover:bg-transparent pl-0">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar empresa
          </Button>
        </div>

        <div className={cn(
          "rounded-lg border px-4 py-2.5 flex items-center justify-between text-sm",
          isValid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
        )}>
          <span className="text-xs">Suma distribuida</span>
          <span className="font-bold tabular-nums">
            {formatCurrency(total)}
            {!isValid && diff > 0 && (
              <span className="text-xs font-normal ml-2 opacity-70">(faltan {formatCurrency(montoAbs - total)})</span>
            )}
          </span>
        </div>

        {esIngreso && (
          <p className="text-[11px] text-slate-400">
            Para ingresos es requerido seleccionar la cuenta destino de cada empresa.
          </p>
        )}

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {row.distribuciones.length > 0 && (
            <Button variant="outline" onClick={handleClear} disabled={saving}
              className="border-red-200 text-red-600 hover:bg-red-50 h-9 text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpiar
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-9">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1.5" />Guardar</>}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  importacionId: number
  paso2Data: Paso2Response
  onContinue: () => void
}

export function Paso3Revision({ importacionId, paso2Data, onContinue }: Props) {
  const [rows, setRows]             = useState<StagingRowConDistribuciones[]>(
    paso2Data.filas_nuevas.map((r) => ({ ...r, distribuciones: [] }))
  )
  const [editRow, setEditRow]       = useState<StagingRowConDistribuciones | null>(null)
  const [distribRow, setDistribRow] = useState<StagingRowConDistribuciones | null>(null)
  const [bulkOpen, setBulkOpen]     = useState(false)
  const [search, setSearch]         = useState("")
  const [selected, setSelected]     = useState<Set<number>>(new Set())

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [subtipos, setSubtipos]     = useState<Subtipo[]>([])
  const [empresas, setEmpresas]     = useState<Empresa[]>([])

  useEffect(() => {
    api.get("/banco/categorias")
      .then(({ data }) =>
        setCategorias(
          (data as any[])
            .filter((c) => c.activa !== false)
            .map((c) => ({ id: c.id, nombre: c.nombre, id_subtipo: c.id_subtipo ?? null }))
        )
      ).catch(() => {})

    api.get("/banco/tipos")
      .then(({ data }) => {
        const subs: Subtipo[] = []
        for (const tipo of data as any[]) {
          for (const sub of tipo.subtipos ?? []) {
            subs.push({ id: sub.id, nombre: sub.nombre, id_tipo: tipo.id, nombre_tipo: tipo.nombre })
          }
        }
        setSubtipos(subs)
      }).catch(() => {})

    api.get("/empresas")
      .then(({ data }) => setEmpresas(data.map((e: any) => ({ id: e.id, nombre: e.razon_social }))))
      .catch(() => {})
  }, [])

  const updateRow = (updated: StagingRowConDistribuciones) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setEditRow(null)
    setDistribRow(null)
  }

  const updateRows = (updated: StagingRowConDistribuciones[]) => {
    setRows(updated)
    setSelected(new Set())
    setBulkOpen(false)
  }

  const filtered = rows.filter(
    (r) =>
      r.concepto.toLowerCase().includes(search.toLowerCase()) ||
      r.referencia.toLowerCase().includes(search.toLowerCase())
  )

  const sinCategoria = rows.filter((r) => !r.id_categoria).length

  // Selección
  const allFilteredIds = filtered.map((r) => r.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const s = new Set(prev); allFilteredIds.forEach((id) => s.delete(id)); return s })
    } else {
      setSelected((prev) => { const s = new Set(prev); allFilteredIds.forEach((id) => s.add(id)); return s })
    }
  }

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Revisión de movimientos</h2>
            <p className="text-sm text-slate-500">
              {rows.length} movimientos · Edita filas, asigna categorías o distribuye egresos entre empresas.
            </p>
          </div>
          {selected.size > 0 && (
            <Button
              onClick={() => setBulkOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 text-xs gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar {selected.size} seleccionados
            </Button>
          )}
        </div>

        {sinCategoria > 0 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>{sinCategoria} movimientos</strong> sin categoría. Puedes continuar sin asignar.
            </AlertDescription>
          </Alert>
        )}

        <Input
          placeholder="Buscar por concepto o referencia…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-300 placeholder:text-slate-400 h-9 text-sm"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-auto max-h-[600px] border-y border-slate-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2.5 pl-6 w-8">
                <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                  {allSelected
                    ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                    : <Square className="h-3.5 w-3.5" />
                  }
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Fecha</th>
              <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Descripción</th>
              <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Referencia</th>
              <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Sub Tipo</th>
              <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Categoría</th>
              <th className="px-3 py-2.5 text-right text-slate-400 font-medium">Monto Bs</th>
              <th className="px-3 py-2.5 text-right text-slate-400 font-medium">Tasa</th>
              <th className="px-3 py-2.5 text-right text-slate-400 font-medium">USD</th>
              <th className="px-3 py-2.5 text-right text-slate-400 font-medium pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const tipo = tipoFromMonto(row.monto)
              const isSelected = selected.has(row.id)
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-slate-100 hover:bg-slate-50 cursor-pointer",
                    isSelected && "bg-emerald-50 hover:bg-emerald-50"
                  )}
                  onClick={() => toggleRow(row.id)}
                >
                  <td className="pl-6 pr-3 py-2.5 w-8">
                    <button onClick={(e) => { e.stopPropagation(); toggleRow(row.id) }} className="text-slate-400">
                      {isSelected
                        ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                        : <Square className="h-3.5 w-3.5" />
                      }
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">
                    {new Date(row.fecha).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 max-w-[200px]">
                    <div className="truncate">{row.concepto}</div>
                    {row.distribuciones.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {row.distribuciones.map((d) => (
                          <span key={d.id_empresa} className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
                            {empresas.find(e => e.id === d.id_empresa)?.nombre ?? d.id_empresa} {d.porcentaje.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap">{row.referencia}</td>
                  <td className="px-3 py-2.5">
                    {row.nombre_subtipo
                      ? <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[10px]">{row.nombre_subtipo}</span>
                      : <span className="text-slate-300 italic">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    {row.nombre_categoria ? (
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 whitespace-nowrap">
                        {row.nombre_categoria}
                      </Badge>
                    ) : (
                      <span className="text-slate-300 italic">—</span>
                    )}
                  </td>
                  <td className={cn(
                    "px-3 py-2.5 font-semibold tabular-nums text-right whitespace-nowrap",
                    tipo === "ingreso" ? "text-emerald-600" : "text-red-600"
                  )}>
                    {tipo === "egreso" ? "−" : "+"}{formatBs(Math.abs(row.monto))}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-400 tabular-nums">
                    {row.tasa_vigente != null
                      ? Number(row.tasa_vigente).toFixed(2)
                      : <span className="italic text-[10px]">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {row.monto_usd != null
                      ? <span className="text-slate-500 tabular-nums">${Math.abs(row.monto_usd).toFixed(2)}</span>
                      : <span className="text-slate-300 italic text-[10px]">sin tasa</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 pr-6">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={() => setEditRow(row)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                         variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                          onClick={() => setDistribRow(row)}
                          title="Distribuir entre empresas"
                          >
                        <SplitSquareHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 sm:px-8 pb-6 sm:pb-8">
        <Button onClick={onContinue} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-11">
          <span className="flex items-center gap-2">
            Consolidar importación
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </div>

      {/* Dialogs */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        {editRow && (
          <EditDialog
            row={editRow}
            importacionId={importacionId}
            categorias={categorias}
            subtipos={subtipos}
            onSave={updateRow}
            onClose={() => setEditRow(null)}
          />
        )}
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={() => setBulkOpen(false)}>
        <BulkEditDialog
          selectedIds={selected}
          importacionId={importacionId}
          categorias={categorias}
          subtipos={subtipos}
          rows={rows}
          onSave={updateRows}
          onClose={() => setBulkOpen(false)}
        />
      </Dialog>

      <Dialog open={!!distribRow} onOpenChange={() => setDistribRow(null)}>
        {distribRow && (
          <DistribucionDialog
            row={distribRow}
            importacionId={importacionId}
            empresas={empresas}
            onSave={updateRow}
            onClose={() => setDistribRow(null)}
          />
        )}
      </Dialog>
    </div>
  )
}