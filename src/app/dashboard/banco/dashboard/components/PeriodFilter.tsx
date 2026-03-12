"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { DashboardFilters } from "../consolidado/types"

const PRESETS = [
  { label: "Este mes", days: 30 },
  { label: "3 meses", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "Este año", days: 365 },
]

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

interface Props {
  filters: DashboardFilters
  onChange: (f: DashboardFilters) => void
}

export function PeriodFilter({ filters, onChange }: Props) {
  const setPreset = (days: number) => {
    const hasta = new Date()
    const desde = new Date()
    desde.setDate(desde.getDate() - days)
    onChange({ ...filters, desde: toDateStr(desde), hasta: toDateStr(hasta) })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => setPreset(p.days)}
            className="h-7 px-3 text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="w-px h-5 bg-zinc-800" />

      {/* Custom range */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-zinc-500 shrink-0">Desde</Label>
        <Input
          type="date"
          value={filters.desde ?? ""}
          onChange={(e) => onChange({ ...filters, desde: e.target.value || undefined })}
          className="h-7 w-36 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs"
        />
        <Label className="text-xs text-zinc-500 shrink-0">Hasta</Label>
        <Input
          type="date"
          value={filters.hasta ?? ""}
          onChange={(e) => onChange({ ...filters, hasta: e.target.value || undefined })}
          className="h-7 w-36 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs"
        />
      </div>
    </div>
  )
}