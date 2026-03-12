"use client"

import { useState } from "react"
import {
  TrendingUp, PieChart, Tag, Building2, Upload, FileBarChart,
} from "lucide-react"
import { ReporteFlujoCaja } from "./components/ReporteFlujoCaja"
import { ReporteTopGastos } from "./components/ReporteTopGastos"
import { ReporteSinClasificar } from "./components/ReporteSinClasificar"
import { ReporteComparativaEmpresas } from "./components/ReporteComparativaEmpresas"
import { ReporteImportaciones } from "./components/ReporteImportaciones"
import type { ReporteKey, ReporteFilters } from "./types"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

const defaultFilters = (): ReporteFilters => {
  const hasta = new Date()
  const desde = new Date()
  desde.setDate(desde.getDate() - 90)
  return { desde: toDateStr(desde), hasta: toDateStr(hasta) }
}

const REPORTES = [
  { key: "flujo-caja" as ReporteKey, label: "Flujo de Caja", icon: TrendingUp, desc: "Resumen mensual y semanal" },
  { key: "top-gastos" as ReporteKey, label: "Top Gastos", icon: PieChart, desc: "Por categoría y destino" },
  { key: "sin-clasificar" as ReporteKey, label: "Sin Clasificar", icon: Tag, desc: "Movimientos sin categoría" },
  { key: "comparativa-empresas" as ReporteKey, label: "Comparativa", icon: Building2, desc: "KPIs por empresa" },
  { key: "importaciones" as ReporteKey, label: "Importaciones", icon: Upload, desc: "Historial de importaciones" },
]

const PRESETS = [
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 año", days: 365 },
]

export function ReportesBanco() {
  const [active, setActive] = useState<ReporteKey>("flujo-caja")
  const [filters, setFilters] = useState<ReporteFilters>(defaultFilters())

  const setPreset = (days: number) => {
    const hasta = new Date()
    const desde = new Date()
    desde.setDate(desde.getDate() - days)
    setFilters({ desde: toDateStr(desde), hasta: toDateStr(hasta) })
  }

  const activeReporte = REPORTES.find((r) => r.key === active)!

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
              <FileBarChart className="h-4 w-4 text-teal-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Banco</p>
              <h1 className="text-base font-semibold text-zinc-100 leading-tight">Reportes</h1>
            </div>
          </div>

          {/* Period filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset(p.days)}
                  className="h-7 px-2.5 text-xs border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="w-px h-5 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-500 shrink-0">Desde</Label>
              <Input
                type="date"
                value={filters.desde ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, desde: e.target.value || undefined }))}
                className="h-7 w-32 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs"
              />
              <Label className="text-xs text-zinc-500 shrink-0">Hasta</Label>
              <Input
                type="date"
                value={filters.hasta ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, hasta: e.target.value || undefined }))}
                className="h-7 w-32 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-zinc-900 py-6 px-3 space-y-1 sticky top-[65px] h-[calc(100vh-65px)]">
          {REPORTES.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                active === key
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active === key ? "text-teal-400" : "")} />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{label}</p>
                <p className="text-[10px] opacity-50 truncate">{desc}</p>
              </div>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-6 min-w-0">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-zinc-100">{activeReporte.label}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{activeReporte.desc}</p>
          </div>

          {active === "flujo-caja" && <ReporteFlujoCaja filters={filters} />}
          {active === "top-gastos" && <ReporteTopGastos filters={filters} />}
          {active === "sin-clasificar" && <ReporteSinClasificar filters={filters} />}
          {active === "comparativa-empresas" && <ReporteComparativaEmpresas filters={filters} />}
          {active === "importaciones" && <ReporteImportaciones filters={filters} />}
        </main>
      </div>
    </div>
  )
}