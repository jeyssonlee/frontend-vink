"use client"

import { useState } from "react"
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
import type { MovimientosFilters } from "../movimientos/types"
import { cn } from "@/lib/utils"

// Mock — replace with API calls
const CATEGORIAS = [
  { id: "1", nombre: "Nómina" },
  { id: "2", nombre: "Proveedores" },
  { id: "3", nombre: "Servicios" },
  { id: "4", nombre: "Ventas" },
  { id: "5", nombre: "Transferencia interna" },
]

const TIPOS_DESTINO = ["Proveedor", "Cliente", "Empleado", "Banco", "Otro"]

interface Props {
  filters: MovimientosFilters
  onChange: (filters: MovimientosFilters) => void
}

export function MovimientosFiltros({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const update = (patch: Partial<MovimientosFilters>) =>
    onChange({ ...filters, ...patch, page: 1 })

  const activeCount = [
    filters.fecha_desde,
    filters.fecha_hasta,
    filters.categoria_id,
    filters.tipo_destino,
    filters.tipo,
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        <Input
          placeholder="Buscar descripción o referencia…"
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-9 text-sm focus-visible:ring-teal-500/30"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                  : t === "egreso"
                  ? "bg-red-950/60 border-red-800 text-red-300"
                  : "bg-zinc-800 border-zinc-600 text-zinc-200"
                : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
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
              "h-9 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 gap-2",
              activeCount > 0 && "border-teal-700 text-teal-400"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeCount > 0 && (
              <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-teal-600 text-white text-[9px] rounded-full">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 bg-zinc-950 border-zinc-800 text-zinc-100 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Filtros avanzados</p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Rango de fechas</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.fecha_desde ?? ""}
                onChange={(e) => update({ fecha_desde: e.target.value || undefined })}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs h-8"
              />
              <Input
                type="date"
                value={filters.fecha_hasta ?? ""}
                onChange={(e) => update({ fecha_hasta: e.target.value || undefined })}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs h-8"
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Categoría</Label>
            <Select
              value={filters.categoria_id ?? ""}
              onValueChange={(v) => update({ categoria_id: v || undefined })}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-8 text-xs">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="" className="text-zinc-400 text-xs">Todas</SelectItem>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-zinc-100 text-xs">
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo destino */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Tipo destino</Label>
            <Select
              value={filters.tipo_destino ?? ""}
              onValueChange={(v) => update({ tipo_destino: v || undefined })}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-8 text-xs">
                <SelectValue placeholder="Todos los destinos" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="" className="text-zinc-400 text-xs">Todos</SelectItem>
                {TIPOS_DESTINO.map((t) => (
                  <SelectItem key={t} value={t} className="text-zinc-100 text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="w-full h-8 bg-teal-600 hover:bg-teal-500 text-white text-xs"
          >
            Aplicar filtros
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}