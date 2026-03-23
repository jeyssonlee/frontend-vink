"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { Movimiento } from "../types"
import { api } from "@/lib/api"

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

interface Props {
  movimiento: Movimiento | null
  onClose: () => void
  onSaved: (updated: Movimiento) => void
}

function ReadonlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-400">{label}</Label>
      <div className="h-9 px-3 flex items-center rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono">
        {value}
      </div>
    </div>
  )
}

export function MovimientoEditDialog({ movimiento, onClose, onSaved }: Props) {
  const [categorias, setCategorias]     = useState<Categoria[]>([])
  const [subtipos, setSubtipos]         = useState<Subtipo[]>([])
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const [fecha, setFecha]               = useState("")
  const [concepto, setConcepto]         = useState("")
  const [categoriaId, setCategoriaId]   = useState("")
  const [subtipoId, setSubtipoId]       = useState("")
  const [tasaVigente, setTasaVigente]   = useState("")
  const [montoUsdCalc, setMontoUsdCalc] = useState<number | null>(null)
  const [esNoVentas, setEsNoVentas]     = useState(false)
  const [notas, setNotas]               = useState("")

  // Cargar catálogos
  useEffect(() => {
    api.get("/banco/categorias")
      .then(({ data }) =>
        setCategorias(
          (data as any[])
            .filter((c) => c.activa !== false)
            .map((c) => ({ id: c.id, nombre: c.nombre, id_subtipo: c.id_subtipo ?? null }))
        )
      )
      .catch(() => {})

    api.get("/banco/tipos")
      .then(({ data }) => {
        const subs: Subtipo[] = []
        for (const tipo of data as any[]) {
          for (const sub of tipo.subtipos ?? []) {
            subs.push({ id: sub.id, nombre: sub.nombre, id_tipo: tipo.id, nombre_tipo: tipo.nombre })
          }
        }
        setSubtipos(subs)
      })
      .catch(() => {})
  }, [])

  // Inicializar form
  useEffect(() => {
    if (!movimiento) return
    setFecha(movimiento.fecha?.slice(0, 10) ?? "")
    setConcepto(movimiento.descripcion ?? "")
    setCategoriaId(movimiento.categoria_id ?? "")
    setSubtipoId((movimiento as any).id_subtipo ? String((movimiento as any).id_subtipo) : "")
    setTasaVigente(movimiento.tasa_vigente != null ? String(movimiento.tasa_vigente) : "")
    setMontoUsdCalc(movimiento.monto_usd ?? null)
    setEsNoVentas((movimiento as any).es_no_ventas ?? false)
    setNotas((movimiento as any).notas ?? "")
    setError(null)
  }, [movimiento?.id])

  // Filtros según tipo del movimiento
  const tipoSistema = movimiento?.tipo === "ingreso" ? "INGRESO" : "EGRESO"

  const subtiposFiltrados = subtipos.filter(
    (s) => s.nombre_tipo === tipoSistema
  )

  const idSubtiposFiltrados = new Set(subtiposFiltrados.map((s) => s.id))

  const categoriasFiltradas = categorias.filter(
    (c) => c.id_subtipo === null || idSubtiposFiltrados.has(c.id_subtipo)
  )

  // Al cambiar categoría, auto-resolver subtipo
  const handleCategoriaChange = (val: string) => {
    setCategoriaId(val === "ninguna" ? "" : val)
    if (val && val !== "ninguna") {
      const cat = categorias.find((c) => String(c.id) === val)
      setSubtipoId(cat?.id_subtipo ? String(cat.id_subtipo) : "")
    }
  }

  // Recalcular USD en tiempo real
  useEffect(() => {
    if (!movimiento) return
    const tasa = parseFloat(tasaVigente)
    if (!isNaN(tasa) && tasa > 0) {
      setMontoUsdCalc(Math.abs(movimiento.monto) / tasa)
    } else {
      setMontoUsdCalc(movimiento.monto_usd ?? null)
    }
  }, [tasaVigente, movimiento?.monto])

  const handleSave = async () => {
    if (!movimiento) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = {}
      if (fecha)       body.fecha        = fecha
      if (concepto)    body.concepto     = concepto
      if (categoriaId) body.id_categoria = parseInt(categoriaId)
      body.id_subtipo  = subtipoId ? parseInt(subtipoId) : null
      const tasa = parseFloat(tasaVigente)
      if (!isNaN(tasa) && tasa > 0) body.tasa_vigente = tasa
      body.es_no_ventas = esNoVentas
      body.notas        = notas || null

      const { data } = await api.patch(`/banco/movimientos/${movimiento.id}`, body)

      const updated: Movimiento = {
        ...data,
        tipo:             parseFloat(data.monto) >= 0 ? "ingreso" : "egreso",
        descripcion:      data.descripcion ?? data.concepto ?? "",
        monto:            parseFloat(data.monto),
        monto_usd:        data.monto_usd    != null ? parseFloat(data.monto_usd)    : null,
        tasa_vigente:     data.tasa_vigente != null ? parseFloat(data.tasa_vigente) : null,
        categoria_nombre: data.categoria_nombre ?? data.nombre_categoria ?? null,
        nombre_subtipo:   data.nombre_subtipo ?? null,
        nombre_tipo:      data.nombre_tipo   ?? null,
        banco:            data.banco ?? data.banco_key ?? null,
        cuenta_nombre:    data.cuenta_nombre ?? data.nombre_cuenta ?? null,
        creado_en:        data.creado_en ?? data.created_at ?? null,
      }
      onSaved(updated)
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (!movimiento) return null

  return (
    <Dialog open={!!movimiento} onOpenChange={() => onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Editar movimiento</DialogTitle>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-0.5">Editar movimiento</p>
          <p className="text-sm font-semibold text-slate-800 truncate">
            {movimiento.descripcion || "Sin descripción"}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{movimiento.referencia}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">

          <div className="grid grid-cols-2 gap-3">
            <ReadonlyField
              label="Monto Bs"
              value={`${movimiento.tipo === "egreso" ? "−" : "+"}${Math.abs(movimiento.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
            />
            <ReadonlyField label="Referencia" value={movimiento.referencia} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="border-slate-300 text-slate-900 h-9 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Descripción</Label>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)}
              className="border-slate-300 text-slate-900 h-9 text-xs"
              placeholder="Descripción del movimiento" />
          </div>

          {/* Categoría — filtrada por tipo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Categoría</Label>
            <Select value={categoriaId || "ninguna"} onValueChange={handleCategoriaChange}>
              <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-xs">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna" className="text-slate-400 text-xs">Sin categoría</SelectItem>
                {categoriasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub Tipo — filtrado por tipo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Sub Tipo</Label>
            <Select value={subtipoId || "ninguno"} onValueChange={(v) => setSubtipoId(v === "ninguno" ? "" : v)}>
              <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-xs">
                <SelectValue placeholder="Sin sub tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno" className="text-slate-400 text-xs">Sin sub tipo</SelectItem>
                {subtiposFiltrados.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tasa + USD */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Tasa BCV</Label>
              <Input type="number" step="0.01" value={tasaVigente}
                onChange={(e) => setTasaVigente(e.target.value)}
                className="border-slate-300 text-slate-900 h-9 text-xs tabular-nums"
                placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Monto USD (calc.)</Label>
              <div className="h-9 px-3 flex items-center rounded-lg bg-slate-50 border border-slate-200 text-xs text-emerald-600 font-mono tabular-nums">
                {montoUsdCalc != null
                  ? `$${Math.abs(montoUsdCalc).toFixed(2)}`
                  : <span className="text-slate-300 italic">—</span>}
              </div>
            </div>
          </div>

          {/* Es no ventas */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-slate-700">Es no ventas</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Excluir de reportes de ventas</p>
            </div>
            <Switch checked={esNoVentas} onCheckedChange={setEsNoVentas}
              className="data-[state=checked]:bg-emerald-600" />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              className="border-slate-300 text-slate-900 text-xs resize-none min-h-[72px]"
              placeholder="Notas internas…" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-600">
              {Array.isArray(error) ? (error as string[]).join(" · ") : error}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}
            className="flex-1 h-9 border-slate-300 text-slate-600 hover:bg-white text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}
            className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}