"use client"

import { useState } from "react"
import {
  Pencil, SplitSquareHorizontal, Trash2, ArrowRight, Loader2,
  AlertCircle, Plus, X, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateStagingRow, setDistribuciones, deleteDistribuciones } from "../importacion/api"
import type { Paso2Response, StagingRow, Distribucion } from "../importacion/types"
import { cn, formatCurrency } from "@/lib/utils"

// Mock catalogues — replace with API calls in production
const CATEGORIAS = [
  { id: "1", nombre: "Nómina" },
  { id: "2", nombre: "Proveedores" },
  { id: "3", nombre: "Servicios" },
  { id: "4", nombre: "Ventas" },
  { id: "5", nombre: "Transferencia interna" },
]

const EMPRESAS = [
  { id: "e1", nombre: "Empresa A" },
  { id: "e2", nombre: "Empresa B" },
  { id: "e3", nombre: "Empresa C" },
]

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
function EditDialog({
  row,
  importacionId,
  onSave,
  onClose,
}: {
  row: StagingRow
  importacionId: string
  onSave: (row: StagingRow) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    fecha: row.fecha,
    referencia: row.referencia,
    descripcion: row.descripcion,
    monto: String(row.monto),
    categoria_id: row.categoria_id ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateStagingRow(importacionId, row.id, {
        ...form,
        monto: parseFloat(form.monto),
        categoria_id: form.categoria_id || undefined,
      })
      onSave({
        ...row,
        ...form,
        monto: parseFloat(form.monto),
        categoria_id: form.categoria_id || null,
        categoria_nombre:
          CATEGORIAS.find((c) => c.id === form.categoria_id)?.nombre ?? null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-zinc-100">Editar movimiento</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Fecha</Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Monto</Label>
            <Input
              type="number"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Referencia</Label>
          <Input
            value={form.referencia}
            onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Descripción</Label>
          <Input
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Categoría</Label>
          <Select
            value={form.categoria_id}
            onValueChange={(v) => setForm((f) => ({ ...f, categoria_id: v }))}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-zinc-100">
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950/40 text-red-300 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white h-9"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1.5" />Guardar</>}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ─── Distribution Dialog ──────────────────────────────────────────────────────
function DistribucionDialog({
  row,
  importacionId,
  onSave,
  onClose,
}: {
  row: StagingRow
  importacionId: string
  onSave: (row: StagingRow) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<{ empresa_id: string; monto: string }[]>(
    row.distribuciones.length > 0
      ? row.distribuciones.map((d) => ({ empresa_id: d.empresa_id, monto: String(d.monto) }))
      : [{ empresa_id: "", monto: "" }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = items.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0)
  const diff = Math.abs(total - row.monto)
  const isValid = diff < 0.01 && items.every((i) => i.empresa_id)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await setDistribuciones(importacionId, row.id, {
        distribuciones: items.map((i) => ({
          empresa_id: i.empresa_id,
          monto: parseFloat(i.monto),
        })),
      })
      onSave({
        ...row,
        distribuciones: items.map((i) => ({
          empresa_id: i.empresa_id,
          empresa_nombre: EMPRESAS.find((e) => e.id === i.empresa_id)?.nombre ?? i.empresa_id,
          monto: parseFloat(i.monto),
          porcentaje: (parseFloat(i.monto) / row.monto) * 100,
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
    <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-zinc-100">Prorratear egreso</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Monto total a distribuir</span>
          <span className="font-bold text-red-400 tabular-nums">{formatCurrency(row.monto)}</span>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Select
                value={item.empresa_id}
                onValueChange={(v) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, empresa_id: v } : x))}
              >
                <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm">
                  <SelectValue placeholder="Empresa…" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {EMPRESAS.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-zinc-100">{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Monto"
                value={item.monto}
                onChange={(e) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, monto: e.target.value } : x))}
                className="w-28 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-9"
              />
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-transparent"
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { empresa_id: "", monto: "" }])}
            className="text-xs text-zinc-400 hover:text-teal-400 hover:bg-transparent pl-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar empresa
          </Button>
        </div>

        {/* Balance indicator */}
        <div className={cn(
          "rounded-lg border px-4 py-2.5 flex items-center justify-between text-sm",
          isValid
            ? "border-emerald-800 bg-emerald-950/30 text-emerald-300"
            : "border-amber-800 bg-amber-950/30 text-amber-300"
        )}>
          <span className="text-xs">Suma distribuida</span>
          <span className="font-bold tabular-nums">
            {formatCurrency(total)}
            {!isValid && diff > 0 && (
              <span className="text-xs font-normal ml-2 opacity-70">
                (faltan {formatCurrency(row.monto - total)})
              </span>
            )}
          </span>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950/40 text-red-300 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {row.distribuciones.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={saving}
              className="border-red-900 text-red-400 hover:bg-red-950/40 h-9 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpiar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white h-9"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1.5" />Guardar</>}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  importacionId: string
  paso2Data: Paso2Response
  onContinue: () => void
}

export function Paso3Revision({ importacionId, paso2Data, onContinue }: Props) {
  const [rows, setRows] = useState<StagingRow[]>(paso2Data.filas)
  const [editRow, setEditRow] = useState<StagingRow | null>(null)
  const [distribRow, setDistribRow] = useState<StagingRow | null>(null)
  const [search, setSearch] = useState("")

  const updateRow = (updated: StagingRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setEditRow(null)
    setDistribRow(null)
  }

  const filtered = rows.filter(
    (r) =>
      r.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      r.referencia.toLowerCase().includes(search.toLowerCase())
  )

  const sinCategoria = rows.filter((r) => !r.categoria_id && !r.es_duplicado).length

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100">Revisión de movimientos</h2>
        <p className="text-sm text-zinc-400">
          {rows.length} movimientos · Edita filas, asigna categorías o distribuye egresos entre empresas.
        </p>
      </div>

      {sinCategoria > 0 && (
        <Alert className="border-amber-800 bg-amber-950/30 text-amber-300 py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>{sinCategoria} movimientos</strong> sin categoría. Puedes continuar sin asignar.
          </AlertDescription>
        </Alert>
      )}

      <Input
        placeholder="Buscar por descripción o referencia…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 h-9 text-sm"
      />

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <ScrollArea className="max-h-[400px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-950 z-10">
              <tr>
                {["Fecha", "Descripción", "Referencia", "Categoría", "Tipo", "Monto", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-zinc-500 font-medium first:pl-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-zinc-800/60",
                    row.es_duplicado ? "opacity-40" : "hover:bg-zinc-900/60"
                  )}
                >
                  <td className="pl-4 pr-3 py-2.5 text-zinc-400 tabular-nums whitespace-nowrap">{row.fecha}</td>
                  <td className="px-3 py-2.5 text-zinc-300 max-w-[180px]">
                    <div className="truncate">{row.descripcion}</div>
                    {row.distribuciones.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {row.distribuciones.map((d) => (
                          <span key={d.empresa_id} className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">
                            {d.empresa_nombre} {d.porcentaje.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 font-mono">{row.referencia}</td>
                  <td className="px-3 py-2.5">
                    {row.categoria_nombre ? (
                      <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300">
                        {row.categoria_nombre}
                      </Badge>
                    ) : row.es_duplicado ? (
                      <Badge variant="outline" className="text-[10px] border-amber-800 text-amber-400">duplicado</Badge>
                    ) : (
                      <span className="text-zinc-600 italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
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
                    "px-3 py-2.5 font-semibold tabular-nums text-right whitespace-nowrap",
                    row.tipo === "ingreso" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {row.tipo === "egreso" ? "−" : "+"}{formatCurrency(row.monto)}
                  </td>
                  <td className="px-3 py-2.5 pr-4">
                    {!row.es_duplicado && (
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-teal-400 hover:bg-zinc-800"
                          onClick={() => setEditRow(row)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {row.tipo === "egreso" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800"
                            onClick={() => setDistribRow(row)}
                            title="Distribuir entre empresas"
                          >
                            <SplitSquareHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      <Button
        onClick={onContinue}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium h-11"
      >
        <span className="flex items-center gap-2">
          Consolidar importación
          <ArrowRight className="h-4 w-4" />
        </span>
      </Button>

      {/* Dialogs */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        {editRow && (
          <EditDialog
            row={editRow}
            importacionId={importacionId}
            onSave={updateRow}
            onClose={() => setEditRow(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!distribRow} onOpenChange={() => setDistribRow(null)}>
        {distribRow && (
          <DistribucionDialog
            row={distribRow}
            importacionId={importacionId}
            onSave={updateRow}
            onClose={() => setDistribRow(null)}
          />
        )}
      </Dialog>
    </div>
  )
}