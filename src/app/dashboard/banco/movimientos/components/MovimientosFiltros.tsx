"use client"

import { useEffect, useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { MovimientosFilters } from "../types"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface Categoria {
  id: number
  nombre: string
}

const TIPOS_DESTINO = [
  "GASTO_OPERATIVO",
  "COMPRA_INVENTARIO",
  "PAGO_PROVEEDOR",
  "NOMINA",
  "TRANSFERENCIA_INTERNA",
  "INGRESO_VENTAS",
  "OTRO",
]

interface Props {
  filters: MovimientosFilters
  onChange: (filters: MovimientosFilters) => void
}

export function MovimientosFiltros({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    api.get("/banco/categorias")
      .then(({ data }) => setCategorias(
        (data as any[])
          .filter((c) => c.activa !== false)
          .map((c) => ({ id: c.id, nombre: c.nombre }))
      ))
      .catch(() => {})
  }, [])

  const update = (patch: Partial<MovimientosFilters>) =>
    onChange({ ...filters, ...patch, page: 1 })

  const activeCount = [
    filters.fecha_desde,
    filters.fecha_hasta,
    filters.categoria_id,
    filters.tipo_destino,
  ].filter(Boolean).length

  const clearAll = () =>
    onChange({
      page: 1,
      limit: filters.limit,
      search: filters.search,
    })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Buscar descripción o referencia…"
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9 border-slate-300 text-slate-900 placeholder:text-slate-400 h-9 text-sm"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tipo quick filter */}
      <div className="flex gap-1.5">
        {(["", "ingreso", "egreso"] as const).map((t) => (
          <button
            key={t}
            onClick={() => update({ tipo: t })}
            className={cn(
              "px-3 h-9 rounded-lg text-xs font-medium border transition-all",
              filters.tipo === t
                ? t === "ingreso"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : t === "egreso"
                  ? "bg-red-50 border-red-400 text-red-700"
                  : "bg-slate-100 border-slate-400 text-slate-700"
                : "bg-white border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700"
            )}
          >
            {t === "" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-700 gap-2",
              activeCount > 0 && "border-emerald-400 text-emerald-600"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeCount > 0 && (
              <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-emerald-600 text-white text-[9px] rounded-full">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 bg-white border-slate-200 text-slate-900 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Filtros avanzados</p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Rango de fechas</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.fecha_desde ?? ""}
                onChange={(e) => update({ fecha_desde: e.target.value || undefined })}
                className="border-slate-300 text-slate-900 text-xs h-8"
              />
              <Input
                type="date"
                value={filters.fecha_hasta ?? ""}
                onChange={(e) => update({ fecha_hasta: e.target.value || undefined })}
                className="border-slate-300 text-slate-900 text-xs h-8"
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Categoría</Label>
            <Select
              value={filters.categoria_id ?? ""}
              onValueChange={(v) => update({ categoria_id: v === "todas" ? undefined : v })}
            >
              <SelectTrigger className="border-slate-300 text-slate-900 h-8 text-xs">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="text-slate-400 text-xs">Todas</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-slate-900 text-xs">
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo destino */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Tipo destino</Label>
            <Select
              value={filters.tipo_destino ?? ""}
              onValueChange={(v) => update({ tipo_destino: v === "todos" ? undefined : v })}
            >
              <SelectTrigger className="border-slate-300 text-slate-900 h-8 text-xs">
                <SelectValue placeholder="Todos los destinos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-slate-400 text-xs">Todos</SelectItem>
                {TIPOS_DESTINO.map((t) => (
                  <SelectItem key={t} value={t} className="text-slate-900 text-xs">
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            Aplicar filtros
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
