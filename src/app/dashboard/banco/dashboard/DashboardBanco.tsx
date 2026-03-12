"use client"

import { useState } from "react"
import { BarChart2, Building2, LayoutDashboard } from "lucide-react"
import { DashboardIndividualView } from "./components/DashboardIndividualView"
import { DashboardConsolidadoView } from "./components/DashboardConsolidadoView"
import { PeriodFilter } from "./components/PeriodFilter"
import type { DashboardFilters } from "../consolidado/types"
import { cn } from "@/lib/utils"

type Mode = "individual" | "consolidado"

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

const defaultFilters = (): DashboardFilters => {
  const hasta = new Date()
  const desde = new Date()
  desde.setDate(desde.getDate() - 90)
  return { desde: toDateStr(desde), hasta: toDateStr(hasta) }
}

export function DashboardBanco() {
  const [mode, setMode] = useState<Mode>("individual")
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters())

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
                <LayoutDashboard className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Banco</p>
                <h1 className="text-base font-semibold text-zinc-100 leading-tight">Dashboard</h1>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 gap-0.5">
              {([
                { key: "individual", label: "Individual", icon: BarChart2 },
                { key: "consolidado", label: "Consolidado", icon: Building2 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === key
                      ? "bg-zinc-700 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period filter */}
          <PeriodFilter filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {mode === "individual" ? (
          <DashboardIndividualView filters={filters} />
        ) : (
          <DashboardConsolidadoView filters={filters} />
        )}
      </div>
    </div>
  )
}