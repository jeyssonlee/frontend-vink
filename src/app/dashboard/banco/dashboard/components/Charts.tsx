"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import type { EvolucionMes, DesgloseCat } from "../consolidado/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  sub,
  trend,
  accent,
}: {
  label: string
  value: string
  sub?: string
  trend?: "up" | "down" | "neutral"
  accent?: "emerald" | "red" | "teal" | "zinc"
}) {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-950/40 ring-emerald-800",
    red: "text-red-400 bg-red-950/40 ring-red-900",
    teal: "text-teal-400 bg-teal-950/40 ring-teal-800",
    zinc: "text-zinc-300 bg-zinc-900 ring-zinc-800",
  }
  const color = colors[accent ?? "zinc"]

  return (
    <div className={cn("rounded-xl p-4 ring-1 space-y-2", color)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">{label}</p>
        {trend === "up" && <TrendingUp className="h-3.5 w-3.5 opacity-50" />}
        {trend === "down" && <TrendingDown className="h-3.5 w-3.5 opacity-50" />}
        {trend === "neutral" && <Minus className="h-3.5 w-3.5 opacity-50" />}
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">{value}</p>
      {sub && <p className="text-[10px] opacity-50">{sub}</p>}
    </div>
  )
}

// ─── Evolución Mensual Chart ───────────────────────────────────────────────────
const monthLabel = (mes: string) => {
  const [, m] = mes.split("-")
  return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(m) - 1]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs shadow-xl">
      <p className="text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 justify-between">
          <span className="text-zinc-500">{p.name}</span>
          <span className="font-bold tabular-nums" style={{ color: p.color }}>
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EvolucionChart({ data }: { data: EvolucionMes[] }) {
  const chartData = data.map((d) => ({
    mes: monthLabel(d.mes),
    Ingresos: d.ingresos,
    Egresos: d.egresos,
    Neto: d.neto,
  }))

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Evolución mensual
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gEgresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Ingresos" stroke="#34d399" strokeWidth={1.5}
            fill="url(#gIngresos)" dot={false} />
          <Area type="monotone" dataKey="Egresos" stroke="#f87171" strokeWidth={1.5}
            fill="url(#gEgresos)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Desglose Categorías Chart ─────────────────────────────────────────────────
const PALETTE = ["#2dd4bf","#34d399","#60a5fa","#a78bfa","#fb923c","#f472b6","#facc15"]

export function DesgloseChart({ data }: { data: DesgloseCat[] }) {
  const sorted = [...data].sort((a, b) => b.total - a.total).slice(0, 7)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Egresos por categoría
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={sorted.map((d, i) => ({
            name: d.categoria_nombre ?? "Sin cat.",
            total: d.total,
            fill: PALETTE[i % PALETTE.length],
          }))} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false} tickLine={false} width={80} />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs">
                    <p className="font-bold text-zinc-200">{formatCurrency(payload[0].value as number)}</p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend list */}
        <div className="space-y-2">
          {sorted.map((d, i) => (
            <div key={d.categoria_id ?? i} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-400 truncate">
                    {d.categoria_nombre ?? "Sin categoría"}
                  </span>
                  <span className="text-[10px] text-zinc-500 shrink-0">{d.porcentaje.toFixed(1)}%</span>
                </div>
                <div className="h-1 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${d.porcentaje}%`,
                      backgroundColor: PALETTE[i % PALETTE.length],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}