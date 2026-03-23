"use client"

import { useEffect, useState } from "react"
import { Loader2, DollarSign, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cuenta {
  id: number
  nombre: string
  banco_key: string
  numero_cuenta: string
}

interface Categoria {
  id: number
  nombre: string
}

export interface MovimientoManual {
  id: number
  fecha: string
  tipo: "INGRESO" | "EGRESO"
  tipo_egreso: string | null
  id_cuenta: number | null
  es_efectivo: boolean
  id_categoria: number | null
  descripcion: string | null
  monto_usd: string
  tasa_vigente: string | null
  monto_bs: string | null
  nombre_categoria: string | null
  nombre_cuenta: string | null
  banco_key: string | null
}

interface Props {
  open: boolean
  movimiento?: MovimientoManual | null  // si viene = editar, si no = crear
  onClose: () => void
  onSaved: (m: MovimientoManual) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_EGRESO = [
  { value: "GASTO_OPERATIVO",       label: "Gasto operativo",        desc: "Reduce tu capital (gastos normales del negocio)" },
  { value: "COMPRA_INVENTARIO",     label: "Compra de inventario",   desc: "Inversión en mercancía o materia prima" },
  { value: "INVERSION_ACTIVOS",     label: "Inversión en activos",   desc: "Equipos, muebles, vehículos, etc." },
  { value: "RETIRO_APORTE_SOCIOS",  label: "Retiro / Aporte socios", desc: "Distribución de utilidades o aporte de capital" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function MovimientoManualDialog({ open, movimiento, onClose, onSaved }: Props) {
  const isEditing = !!movimiento

  const [cuentas,   setCuentas]   = useState<Cuenta[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Form state
  const [tipo,        setTipo]        = useState<"INGRESO" | "EGRESO">("INGRESO")
  const [tipoEgreso,  setTipoEgreso]  = useState("GASTO_OPERATIVO")
  const [metodoPago,  setMetodoPago]  = useState("efectivo")  // "efectivo" | id de cuenta
  const [categoriaId, setCategoriaId] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [montoUsd,    setMontoUsd]    = useState("")
  const [tasa,        setTasa]        = useState("")
  const [fecha,       setFecha]       = useState("")

  // Monto Bs calculado
  const montoUsdNum = parseFloat(montoUsd) || 0
  const tasaNum     = parseFloat(tasa) || 0
  const montoBs     = montoUsdNum > 0 && tasaNum > 0 ? montoUsdNum * tasaNum : null

  // Cargar datos
  useEffect(() => {
    api.get("/banco/cuentas").then(({ data }) => setCuentas(data)).catch(() => {})
    api.get("/banco/categorias").then(({ data }) =>
      setCategorias((data as any[]).filter(c => c.activa !== false).map(c => ({ id: c.id, nombre: c.nombre })))
    ).catch(() => {})
  }, [])

  // Inicializar form
  useEffect(() => {
    if (!open) return
    if (movimiento) {
      setTipo(movimiento.tipo)
      setTipoEgreso(movimiento.tipo_egreso ?? "GASTO_OPERATIVO")
      setMetodoPago(movimiento.es_efectivo ? "efectivo" : String(movimiento.id_cuenta ?? "efectivo"))
      setCategoriaId(movimiento.id_categoria ? String(movimiento.id_categoria) : "")
      setDescripcion(movimiento.descripcion ?? "")
      setMontoUsd(parseFloat(movimiento.monto_usd).toFixed(2))
      setTasa(movimiento.tasa_vigente ? parseFloat(movimiento.tasa_vigente).toFixed(2) : "")
      setFecha(movimiento.fecha?.slice(0, 10) ?? today())
    } else {
      setTipo("INGRESO")
      setTipoEgreso("GASTO_OPERATIVO")
      setMetodoPago("efectivo")
      setCategoriaId("")
      setDescripcion("")
      setMontoUsd("")
      setTasa("")
      setFecha(today())
    }
    setError(null)
  }, [open, movimiento?.id])

  const today = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
  }

  const handleSave = async () => {
    if (!montoUsd || parseFloat(montoUsd) <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }
    if (tipo === "EGRESO" && !tipoEgreso) {
      setError("Selecciona el tipo de egreso")
      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, any> = {
      fecha,
      tipo,
      monto_usd: parseFloat(montoUsd),
      es_efectivo: metodoPago === "efectivo",
    }

    if (tipo === "EGRESO") body.tipo_egreso = tipoEgreso
    if (metodoPago !== "efectivo") body.id_cuenta = parseInt(metodoPago)
    if (categoriaId) body.id_categoria = parseInt(categoriaId)
    if (descripcion) body.descripcion = descripcion
    if (tasa) body.tasa_vigente = parseFloat(tasa)

    try {
      const { data } = isEditing
        ? await api.patch(`/banco/movimientos-manuales/${movimiento!.id}`, body)
        : await api.post("/banco/movimientos-manuales", body)
      onSaved(data)
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(" · ") : msg ?? e?.message ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const tipoEgresoInfo = TIPOS_EGRESO.find(t => t.value === tipoEgreso)

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{isEditing ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>

        {/* Header con tipo selector */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
            {isEditing ? "Editar movimiento" : "Nuevo movimiento"}
          </p>

          {/* Toggle Ingreso/Egreso */}
          <div className="flex gap-2">
            <button
              onClick={() => setTipo("INGRESO")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold border-2 transition-all",
                tipo === "INGRESO"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Ingreso
            </button>
            <button
              onClick={() => setTipo("EGRESO")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold border-2 transition-all",
                tipo === "EGRESO"
                  ? "bg-red-50 border-red-400 text-red-700"
                  : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              Egreso
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Tipo de egreso */}
          {tipo === "EGRESO" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Tipo de egreso</Label>
              <Select value={tipoEgreso} onValueChange={setTipoEgreso}>
                <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EGRESO.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoEgresoInfo && (
                <p className="text-[10px] text-slate-400">{tipoEgresoInfo.desc}</p>
              )}
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border-slate-300 text-slate-900 h-9 text-xs"
            />
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Método de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-slate-400" />
                    Efectivo
                  </div>
                </SelectItem>
                {cuentas.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {metodoPago === "efectivo" && (
              <p className="text-[10px] text-slate-400">No afecta el saldo de ninguna cuenta bancaria</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Categoría</Label>
            <Select
              value={categoriaId || "ninguna"}
              onValueChange={v => setCategoriaId(v === "ninguna" ? "" : v)}
            >
              <SelectTrigger className="border-slate-300 text-slate-900 h-9 text-xs">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna" className="text-slate-400 text-xs">Sin categoría</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto USD + Tasa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Monto USD</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoUsd}
                  onChange={e => setMontoUsd(e.target.value)}
                  className="border-slate-300 text-slate-900 h-9 text-xs pl-8 tabular-nums"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Tasa BCV</Label>
              <Input
                type="number"
                step="0.01"
                value={tasa}
                onChange={e => setTasa(e.target.value)}
                className="border-slate-300 text-slate-900 h-9 text-xs tabular-nums"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Monto Bs calculado */}
          {montoBs !== null && (
            <div className={cn(
              "rounded-lg px-3 py-2.5 flex items-center justify-between",
              tipo === "INGRESO" ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"
            )}>
              <span className="text-xs text-slate-500">Equivalente en Bs</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                tipo === "INGRESO" ? "text-emerald-600" : "text-red-600"
              )}>
                {tipo === "INGRESO" ? "+" : "−"}Bs. {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(montoBs)}
              </span>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Descripción <span className="text-slate-300">(opcional)</span></Label>
            <Textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="border-slate-300 text-slate-900 text-xs resize-none min-h-[64px]"
              placeholder="Nota breve del movimiento…"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-9 border-slate-300 text-slate-600 hover:bg-white text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex-1 h-9 text-white text-xs gap-1.5",
              tipo === "INGRESO"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-red-500 hover:bg-red-400"
            )}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Registrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}