"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, AlertCircle,
  FileText, Tag, Upload, Loader2, RefreshCw, DollarSign,
  ChevronDown, ChevronRight, MessageSquare, LayoutList
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { formatBs } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"

type TipoMovimiento = 'INGRESO' | 'EGRESO'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlujoCajaData {
  resumen: {
    total_ingresos: string; total_egresos: string; flujo_neto: string
    total_ingresos_usd: string; total_egresos_usd: string; flujo_neto_usd: string
    total_movimientos: number
  }
  por_mes: Array<{
    mes: string; mes_label: string; movimientos: number
    ingresos: string; egresos: string; flujo_neto: string
    ingresos_usd: string; egresos_usd: string
  }>
}

interface TopGastosData {
  por_categoria: Array<{ categoria: string; cantidad: number; total_bs: string; total_usd: string; porcentaje: string }>
  por_tipo_destino: Array<{ tipo_destino: string; cantidad: number; total_bs: string; total_usd: string }>
  top_10_movimientos: Array<{
    id: number; fecha: string; concepto: string; referencia: string
    monto_bs: string; monto_usd: string; tipo_destino: string; categoria: string; cuenta: string
  }>
}

interface SinClasificarData {
  resumen: { total: number; ingresos: number; egresos: number; monto_total_bs: string; monto_total_usd: string }
  movimientos: Array<{
    id: number; fecha: string; concepto: string; referencia: string
    monto: string; monto_usd: string; tipo_destino: string; cuenta: string
  }>
}

interface ImportacionesData {
  resumen: {
    total: number; consolidadas: number; en_revision: number; canceladas: number
    total_movimientos_importados: number; total_duplicados_detectados: number
  }
  importaciones: Array<{
    id: number; nombre_archivo: string; banco_key: string; estado: string
    total_filas: number; filas_nuevas: number; filas_duplicadas: number
    created_at: string; nombre_cuenta: string
  }>
}

// ─── Types: Reporte Agrupado ──────────────────────────────────────────────────

type TipoAgrupado = 'POR_CATEGORIA' | 'POR_MES' | 'POR_SEMANA' | 'POR_TIPO_DESTINO' | 'POR_CUENTA'

interface MovimientoAgrupado {
  id: number
  fecha: string
  concepto: string
  referencia: string
  monto: string
  monto_usd: string
  notas: string | null
  categoria: string
  cuenta: string
  tipo_destino: string | null
}

interface GrupoReporte {
  grupo_key: string
  grupo_label: string
  cantidad: number
  total_bs: string
  total_usd: string
  movimientos: MovimientoAgrupado[]
}

interface AgrupadoData {
  tipo: TipoAgrupado
  grupos: GrupoReporte[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBs  = (v: any) => `Bs. ${formatBs(Math.abs(parseFloat(String(v ?? 0))))}`
const fmtUsd = (v: any) => `$${Math.abs(parseFloat(String(v ?? 0))).toFixed(2)}`
const fmt    = (bs: any, usd: any, showUsd: boolean) => showUsd ? fmtUsd(usd) : fmtBs(bs)
const num    = (bs: any, usd: any, showUsd: boolean) => Math.abs(parseFloat(String(showUsd ? usd : bs)))

const formatFecha = (iso: string) => !iso ? "—" : new Date(iso).toLocaleDateString("es-VE", {
  day: "2-digit", month: "2-digit", year: "numeric"
})

const PALETTE = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function KpiCard({ label, primary, secondary, trend, color = "slate" }: {
  label: string; primary: string; secondary?: string
  trend?: "up" | "down"; color?: "emerald" | "red" | "slate" | "blue"
}) {
  const colors = { emerald: "text-emerald-600", red: "text-red-600", slate: "text-slate-700", blue: "text-blue-600" }
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums tracking-tight", colors[color])}>{primary}</p>
      {secondary && <p className="text-[11px] text-slate-400 mt-1">{secondary}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</h2>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-300">
      <FileText className="h-8 w-8" /><p className="text-xs">{message}</p>
    </div>
  )
}

function CurrencyToggle({ showUsd, onChange }: { showUsd: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
      <span className={cn("text-xs font-medium transition-colors", !showUsd ? "text-slate-700" : "text-slate-400")}>Bs</span>
      <Switch checked={showUsd} onCheckedChange={onChange} className="data-[state=checked]:bg-emerald-600 h-4 w-7" />
      <div className={cn("flex items-center gap-0.5 transition-colors", showUsd ? "text-emerald-600" : "text-slate-400")}>
        <DollarSign className="h-3 w-3" />
        <span className="text-xs font-medium">USD</span>
      </div>
    </div>
  )
}

// ─── Tab: Flujo de Caja ───────────────────────────────────────────────────────

function TabFlujoCaja({ data, showUsd }: { data: FlujoCajaData; showUsd: boolean }) {
  const r = data.resumen
  const neto = parseFloat(showUsd ? r.flujo_neto_usd : r.flujo_neto)
  const pos  = neto >= 0

  const chartData = data.por_mes.map((m) => ({
    name:     m.mes_label,
    ingresos: num(m.ingresos, m.ingresos_usd, showUsd),
    egresos:  num(m.egresos,  m.egresos_usd,  showUsd),
    flujo:    parseFloat(showUsd ? m.ingresos_usd : m.flujo_neto) - (showUsd ? Math.abs(parseFloat(m.egresos_usd)) : 0),
  }))

  const tickFmt = (v: any) => showUsd ? `$${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Ingresos" primary={fmt(r.total_ingresos, r.total_ingresos_usd, showUsd)} secondary={showUsd ? fmtBs(r.total_ingresos) : fmtUsd(r.total_ingresos_usd)} color="emerald" trend="up" />
        <KpiCard label="Total Egresos"  primary={fmt(r.total_egresos,  r.total_egresos_usd,  showUsd)} secondary={showUsd ? fmtBs(r.total_egresos)  : fmtUsd(r.total_egresos_usd)}  color="red"     trend="down" />
        <KpiCard label="Flujo Neto"     primary={`${pos?"+":"−"}${fmt(r.flujo_neto, r.flujo_neto_usd, showUsd)}`} secondary={showUsd ? fmtBs(r.flujo_neto) : fmtUsd(r.flujo_neto_usd)} color={pos?"emerald":"red"} trend={pos?"up":"down"} />
        <KpiCard label="Movimientos"    primary={r.total_movimientos.toLocaleString()} color="slate" />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionTitle>Evolución mensual — {showUsd ? "USD" : "Bs"}</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
              <Tooltip formatter={(v: any) => [showUsd ? fmtUsd(v) : fmtBs(v), ""]} contentStyle={{ fontSize: 11, borderColor: "#e2e8f0", borderRadius: 8 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="egresos"  name="Egresos"  fill="#fca5a5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionTitle>Flujo neto mensual — {showUsd ? "USD" : "Bs"}</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
              <Tooltip formatter={(v: any) => [showUsd ? fmtUsd(v) : fmtBs(v), "Flujo neto"]} contentStyle={{ fontSize: 11, borderColor: "#e2e8f0", borderRadius: 8 }} />
              <Line type="monotone" dataKey="flujo" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.por_mes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><SectionTitle>Detalle por mes</SectionTitle></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Mes","Mov.","Ingresos","Egresos","Flujo Neto", showUsd?"Ref. Bs":"Ref. USD"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.por_mes.map((m) => {
                  const n = parseFloat(showUsd ? m.ingresos_usd : m.flujo_neto) - (showUsd ? Math.abs(parseFloat(m.egresos_usd)) : 0)
                  return (
                    <tr key={m.mes} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{m.mes_label}</td>
                      <td className="px-4 py-2.5 text-slate-500">{m.movimientos}</td>
                      <td className="px-4 py-2.5 text-emerald-600 tabular-nums font-medium">+{fmt(m.ingresos, m.ingresos_usd, showUsd)}</td>
                      <td className="px-4 py-2.5 text-red-500 tabular-nums">−{fmt(m.egresos, m.egresos_usd, showUsd)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-semibold", n>=0?"text-emerald-600":"text-red-600")}>
                        {n>=0?"+":"−"}{showUsd ? fmtUsd(Math.abs(n)) : fmtBs(Math.abs(n))}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 tabular-nums">{showUsd ? fmtBs(m.ingresos) : fmtUsd(m.ingresos_usd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Top Gastos ──────────────────────────────────────────────────────────

function TabTopGastos({ data, showUsd }: { data: TopGastosData; showUsd: boolean }) {
  const pieData = data.por_categoria.slice(0, 6).map(c => ({
    name: c.categoria, value: num(c.total_bs, c.total_usd, showUsd)
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionTitle>Gastos por categoría — {showUsd ? "USD" : "Bs"}</SectionTitle>
          {data.por_categoria.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [showUsd ? fmtUsd(v) : fmtBs(v), ""]} contentStyle={{ fontSize: 11, borderColor: "#e2e8f0", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {data.por_categoria.map((c, i) => (
                  <div key={c.categoria} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="text-xs text-slate-600 truncate">{c.categoria}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{parseFloat(c.porcentaje).toFixed(1)}%</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">{fmt(c.total_bs, c.total_usd, showUsd)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState message="Sin datos de categorías" />}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionTitle>Gastos por tipo destino — {showUsd ? "USD" : "Bs"}</SectionTitle>
          {data.por_tipo_destino.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.por_tipo_destino.map(t => ({ name: t.tipo_destino.replace(/_/g," "), valor: num(t.total_bs, t.total_usd, showUsd) }))} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: any) => showUsd ? `$${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v: any) => [showUsd ? fmtUsd(v) : fmtBs(v), "Total"]} contentStyle={{ fontSize: 11, borderColor: "#e2e8f0", borderRadius: 8 }} />
                <Bar dataKey="valor" fill="#fbbf24" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="Sin datos de tipo destino" />}
        </div>
      </div>

      {data.top_10_movimientos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><SectionTitle>Top 10 egresos por monto</SectionTitle></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {["#","Fecha","Concepto","Cuenta","Categoría", showUsd?"Monto USD":"Monto Bs", showUsd?"Ref. Bs":"Ref. USD"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.top_10_movimientos.map((m, i) => (
                  <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-300 font-mono">{String(i+1).padStart(2,"0")}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[200px] truncate">{m.concepto}</td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{m.cuenta}</td>
                    <td className="px-4 py-2.5">
                      {m.categoria ? <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 font-normal">{m.categoria}</Badge> : <span className="text-slate-300 italic text-[10px]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-red-600 tabular-nums whitespace-nowrap">−{fmt(m.monto_bs, m.monto_usd, showUsd)}</td>
                    <td className="px-4 py-2.5 text-slate-400 tabular-nums">{showUsd ? fmtBs(m.monto_bs) : fmtUsd(m.monto_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Sin Clasificar ──────────────────────────────────────────────────────

function TabSinClasificar({ data, showUsd }: { data: SinClasificarData; showUsd: boolean }) {
  const r = data.resumen
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Sin clasificar" primary={String(r.total)}   color="slate" />
        <KpiCard label="Ingresos"       primary={String(r.ingresos)} color="emerald" />
        <KpiCard label="Egresos"        primary={String(r.egresos)}  color="red" />
        <KpiCard label="Monto total" primary={fmt(r.monto_total_bs, r.monto_total_usd, showUsd)} secondary={showUsd ? fmtBs(r.monto_total_bs) : fmtUsd(r.monto_total_usd)} color="slate" />
      </div>

      {r.total > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Hay <strong>{r.total} movimientos</strong> sin categoría. Clasifícalos desde Movimientos para mejorar tus reportes.
          </p>
        </div>
      )}

      {data.movimientos.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><SectionTitle>Movimientos sin categoría</SectionTitle></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Fecha","Concepto","Referencia","Cuenta","Tipo Destino", showUsd?"Monto USD":"Monto Bs", showUsd?"Ref. Bs":"Ref. USD"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.movimientos.map((m) => {
                  const esIngreso = parseFloat(m.monto) >= 0
                  return (
                    <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatFecha(m.fecha)}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[200px] truncate">{m.concepto}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{m.referencia}</td>
                      <td className="px-4 py-2.5 text-slate-400">{m.cuenta}</td>
                      <td className="px-4 py-2.5">
                        {m.tipo_destino ? <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">{m.tipo_destino.replace(/_/g," ")}</Badge> : <span className="text-slate-300 italic text-[10px]">—</span>}
                      </td>
                      <td className={cn("px-4 py-2.5 font-semibold tabular-nums whitespace-nowrap", esIngreso?"text-emerald-600":"text-red-600")}>
                        {esIngreso?"+":"−"}{fmt(m.monto, m.monto_usd, showUsd)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 tabular-nums">{showUsd ? fmtBs(m.monto) : fmtUsd(m.monto_usd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 gap-2 text-slate-300">
          <Tag className="h-8 w-8" /><p className="text-xs">Todos los movimientos están clasificados 🎉</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Importaciones ───────────────────────────────────────────────────────

const ESTADO_MAP: Record<string, { label: string; class: string }> = {
  CONSOLIDADO: { label: "Consolidado", class: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  EN_REVISION: { label: "En revisión", class: "border-amber-300 text-amber-700 bg-amber-50" },
  CANCELADO:   { label: "Cancelado",   class: "border-red-300 text-red-600 bg-red-50" },
}

function TabImportaciones({ data }: { data: ImportacionesData }) {
  const r = data.resumen
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard label="Total importaciones"    primary={String(r.total)}                                 color="slate" />
        <KpiCard label="Consolidadas"           primary={String(r.consolidadas)}                          color="emerald" />
        <KpiCard label="En revisión"            primary={String(r.en_revision)}                           color="blue" />
        <KpiCard label="Canceladas"             primary={String(r.canceladas)}                            color="red" />
        <KpiCard label="Movimientos importados" primary={r.total_movimientos_importados.toLocaleString()} color="slate" />
        <KpiCard label="Duplicados detectados"  primary={r.total_duplicados_detectados.toLocaleString()}  color="slate" />
      </div>

      {data.importaciones.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><SectionTitle>Historial de extractos</SectionTitle></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Fecha","Archivo","Cuenta","Estado","Filas","Nuevos","Duplicados"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.importaciones.map((imp) => {
                  const estado = ESTADO_MAP[imp.estado] ?? { label: imp.estado, class: "border-slate-300 text-slate-500" }
                  return (
                    <tr key={imp.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatFecha(imp.created_at)}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[200px] truncate">{imp.nombre_archivo}</td>
                      <td className="px-4 py-2.5 text-slate-400">{imp.nombre_cuenta}</td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className={cn("text-[10px]", estado.class)}>{estado.label}</Badge></td>
                      <td className="px-4 py-2.5 text-slate-500 tabular-nums">{imp.total_filas}</td>
                      <td className="px-4 py-2.5 text-emerald-600 tabular-nums font-medium">{imp.filas_nuevas}</td>
                      <td className="px-4 py-2.5 text-amber-500 tabular-nums">{imp.filas_duplicadas}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState message="No hay importaciones en el período" />}
    </div>
  )
}

// ─── Tab: Reporte Agrupado (Drill-down) ──────────────────────────────────────

const TIPO_OPTIONS: { value: TipoAgrupado; label: string }[] = [
  { value: 'POR_CATEGORIA',    label: 'Categoría' },
  { value: 'POR_MES',          label: 'Mes' },
  { value: 'POR_SEMANA',       label: 'Semana' },
  { value: 'POR_TIPO_DESTINO', label: 'Tipo destino' },
  { value: 'POR_CUENTA',       label: 'Cuenta' },
]

function FilaMovimiento({ mov, showUsd }: { mov: MovimientoAgrupado; showUsd: boolean }) {
  const [open, setOpen] = useState(false)
  const esIngreso = parseFloat(mov.monto) >= 0

  return (
    <>
      <tr className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
        <td className="pl-10 pr-3 py-2 text-slate-400 whitespace-nowrap text-[11px]">{formatFecha(mov.fecha)}</td>
        <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate text-[11px]">{mov.concepto || mov.referencia || "—"}</td>
        <td className="px-3 py-2">
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{mov.categoria}</span>
        </td>
        <td className={cn("px-3 py-2 tabular-nums font-semibold text-[11px] whitespace-nowrap", esIngreso ? "text-emerald-600" : "text-red-500")}>
          {esIngreso ? "+" : "−"}{fmt(mov.monto, mov.monto_usd, showUsd)}
        </td>
        <td className="px-3 py-2 text-right">
          {mov.notas ? (
            <button
              onClick={() => setOpen(v => !v)}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                open
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500"
              )}
            >
              <MessageSquare className="h-2.5 w-2.5" />nota
            </button>
          ) : (
            <span className="text-[10px] text-slate-200">—</span>
          )}
        </td>
      </tr>
      {open && mov.notas && (
        <tr className="bg-blue-50/60">
          <td colSpan={5} className="pl-10 pr-4 py-2">
            <p className="text-[11px] text-blue-700 italic">"{mov.notas}"</p>
          </td>
        </tr>
      )}
    </>
  )
}

function FilaGrupo({ grupo, showUsd }: { grupo: GrupoReporte; showUsd: boolean }) {
  const [open, setOpen] = useState(false)
  const total = parseFloat(showUsd ? grupo.total_usd : grupo.total_bs)
  const esPositivo = total >= 0

  return (
    <>
      <tr
        className="border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors group"
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-4 py-3 w-8">
          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            {open
              ? <ChevronDown className="h-3 w-3 text-slate-500" />
              : <ChevronRight className="h-3 w-3 text-slate-400" />
            }
          </div>
        </td>
        <td className="px-3 py-3 font-semibold text-slate-700 text-sm">{grupo.grupo_label}</td>
        <td className="px-3 py-3 text-slate-400 text-xs">{grupo.cantidad} mov.</td>
        <td className={cn("px-3 py-3 font-bold tabular-nums text-sm text-right", esPositivo ? "text-emerald-600" : "text-red-500")}>
          {esPositivo ? "+" : "−"}{showUsd ? fmtUsd(Math.abs(total)) : fmtBs(Math.abs(total))}
        </td>
        <td className="px-3 py-3 text-right text-[11px] text-slate-400 tabular-nums">
          {showUsd ? fmtBs(grupo.total_bs) : fmtUsd(grupo.total_usd)}
        </td>
      </tr>
      {open && grupo.movimientos.map((mov) => (
        <FilaMovimiento key={mov.id} mov={mov} showUsd={showUsd} />
      ))}
    </>
  )
}

async function exportarPDF(
  data: AgrupadoData,
  tipoMov: TipoMovimiento,
  nombreEmpresa: string,
  showUsd: boolean,
  fechaDesde: string,
  fechaHasta: string,
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const tipoLabel = TIPO_OPTIONS.find(t => t.value === data.tipo)?.label ?? data.tipo
  const movLabel  = tipoMov === 'INGRESO' ? 'Ingresos' : 'Egresos'
  const moneda    = showUsd ? 'USD' : 'Bs'
  const hoy       = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const periodo   = fechaDesde && fechaHasta
    ? `${fechaDesde} al ${fechaHasta}`
    : fechaDesde ? `Desde ${fechaDesde}` : fechaHasta ? `Hasta ${fechaHasta}` : 'Todo el período'

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 118, 110)   // emerald-700
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(nombreEmpresa, 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Reporte de ${movLabel} — agrupado por ${tipoLabel}`, 14, 18)
  doc.text(`Período: ${periodo}`, 14, 23)

  doc.setTextColor(200, 255, 240)
  doc.setFontSize(8)
  doc.text(`Generado: ${hoy}  ·  Moneda: ${moneda}`, 14, 27.5)

  // ── Totales generales ───────────────────────────────────────────────────────
  const totalGeneral = data.grupos.reduce(
    (acc, g) => acc + Math.abs(parseFloat(showUsd ? g.total_usd : g.total_bs)), 0
  )
  const totalMovs = data.grupos.reduce((acc, g) => acc + g.cantidad, 0)

  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total ${movLabel}: ${showUsd ? fmtUsd(totalGeneral) : fmtBs(totalGeneral)}   ·   ${totalMovs} movimientos   ·   ${data.grupos.length} grupos`, 14, 36)

  // ── Tabla ───────────────────────────────────────────────────────────────────
  let y = 40

  data.grupos.forEach((grupo) => {
    const totalGrupo = Math.abs(parseFloat(showUsd ? grupo.total_usd : grupo.total_bs))

    // Fila de grupo (header de subtipo)
    autoTable(doc, {
      startY: y,
      head: [[
        { content: grupo.grupo_label, styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: `${grupo.cantidad} mov.`, styles: { halign: 'center', fontSize: 8 } },
        { content: showUsd ? fmtUsd(totalGrupo) : fmtBs(totalGrupo), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
        { content: showUsd ? fmtBs(grupo.total_bs) : fmtUsd(grupo.total_usd), styles: { halign: 'right', fontSize: 8, textColor: [150, 150, 150] } },
      ]],
      body: grupo.movimientos.map(m => {
        const esIng = parseFloat(m.monto) >= 0
        const monto = Math.abs(parseFloat(showUsd ? m.monto_usd : m.monto))
        return [
          formatFecha(m.fecha),
          m.concepto || m.referencia || '—',
          m.notas ? `📝 ${m.notas}` : '',
          `${esIng ? '+' : '−'}${showUsd ? fmtUsd(monto) : fmtBs(monto)}`,
        ]
      }),
      headStyles:  { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
      bodyStyles:  { fontSize: 7.5, textColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, fontStyle: 'italic', textColor: [100, 116, 139] },
        3: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      theme: 'striped',
      didParseCell: (hookData) => {
        if (hookData.section === 'body') {
          const monto = grupo.movimientos[hookData.row.index]?.monto
          if (monto !== undefined) {
            const esIng = parseFloat(monto) >= 0
            if (hookData.column.index === 3) {
              hookData.cell.styles.textColor = esIng ? [5, 150, 105] : [220, 38, 38]
            }
          }
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 5
    if (y > 270) { doc.addPage(); y = 14 }
  })

  // ── Footer en cada página ───────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(180, 180, 180)
    doc.text(`${nombreEmpresa} · ${hoy} · Pág. ${i} de ${pageCount}`, 14, 292)
  }

  doc.save(`reporte-${movLabel.toLowerCase()}-${data.tipo.toLowerCase()}-${hoy.replace(/\//g,'-')}.pdf`)
}

function TabAgrupado({
  data, showUsd, tipo, tipoMov, onTipoChange, onTipoMovChange,
  loading, nombreEmpresa, fechaDesde, fechaHasta,
}: {
  data: AgrupadoData | null
  showUsd: boolean
  tipo: TipoAgrupado
  tipoMov: TipoMovimiento
  onTipoChange: (t: TipoAgrupado) => void
  onTipoMovChange: (t: TipoMovimiento) => void
  loading: boolean
  nombreEmpresa: string
  fechaDesde: string
  fechaHasta: string
}) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportarPDF(data, tipoMov, nombreEmpresa, showUsd, fechaDesde, fechaHasta)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle INGRESO / EGRESO */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {(['INGRESO', 'EGRESO'] as TipoMovimiento[]).map((t) => (
              <button
                key={t}
                onClick={() => onTipoMovChange(t)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  tipoMov === t && t === 'INGRESO' && "bg-emerald-600 text-white shadow-sm",
                  tipoMov === t && t === 'EGRESO'  && "bg-red-500 text-white shadow-sm",
                  tipoMov !== t && "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                )}
              >
                {t === 'INGRESO' ? '↑ Ingresos' : '↓ Egresos'}
              </button>
            ))}
          </div>

          {/* Selector de agrupación */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {TIPO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onTipoChange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  tipo === opt.value
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botón exportar PDF */}
        <button
          onClick={handleExport}
          disabled={!data || loading || exporting}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-all",
            data && !loading
              ? "border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
              : "border-slate-200 text-slate-300 cursor-not-allowed"
          )}
        >
          {exporting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FileText className="h-3.5 w-3.5" />
          }
          Exportar PDF
        </button>
      </div>

      {/* Tabla drill-down */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando…</span>
        </div>
      ) : !data || data.grupos.length === 0 ? (
        <EmptyState message="Sin datos para el período y filtro seleccionado" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Resumen rápido */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {data.grupos.length} grupos · {data.grupos.reduce((a, g) => a + g.cantidad, 0)} movimientos
            </span>
            <span className={cn("text-sm font-bold tabular-nums", tipoMov === 'INGRESO' ? "text-emerald-600" : "text-red-500")}>
              {tipoMov === 'INGRESO' ? "+" : "−"}
              {showUsd
                ? fmtUsd(data.grupos.reduce((a, g) => a + Math.abs(parseFloat(g.total_usd)), 0))
                : fmtBs(data.grupos.reduce((a, g) => a + Math.abs(parseFloat(g.total_bs)), 0))
              }
            </span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-8" />
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Grupo</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cant.</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{showUsd ? "USD" : "Bs"}</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{showUsd ? "Ref. Bs" : "Ref. USD"}</th>
              </tr>
            </thead>
            <tbody>
              {data.grupos.map((grupo) => (
                <FilaGrupo key={grupo.grupo_key} grupo={grupo} showUsd={showUsd} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

type TabId = "flujo" | "gastos" | "sin-clasificar" | "importaciones" | "agrupado"

const TABS: { id: TabId; label: string; icon: typeof TrendingUp }[] = [
  { id: "flujo",          label: "Flujo de Caja",  icon: TrendingUp },
  { id: "gastos",         label: "Top Gastos",      icon: TrendingDown },
  { id: "sin-clasificar", label: "Sin Clasificar",  icon: Tag },
  { id: "importaciones",  label: "Importaciones",   icon: Upload },
  { id: "agrupado",       label: "Reporte",         icon: LayoutList },
]

export function ReportesView() {
  const user = useAuthStore((s) => s.user)
  const nombreEmpresa = user?.empresa ?? 'Mi Empresa'
  const [tab,        setTab]        = useState<TabId>("flujo")
  const [showUsd,    setShowUsd]    = useState(true)
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [flujoCaja,     setFlujoCaja]     = useState<FlujoCajaData | null>(null)
  const [topGastos,     setTopGastos]     = useState<TopGastosData | null>(null)
  const [sinClasificar, setSinClasificar] = useState<SinClasificarData | null>(null)
  const [importaciones, setImportaciones] = useState<ImportacionesData | null>(null)
  const [agrupado,      setAgrupado]      = useState<AgrupadoData | null>(null)
  const [tipoAgrupado,  setTipoAgrupado]  = useState<TipoAgrupado>('POR_CATEGORIA')
  const [tipoMov,       setTipoMov]       = useState<TipoMovimiento>('EGRESO')
  const [loadingAgrupado, setLoadingAgrupado] = useState(false)

  const fetchAgrupado = useCallback(async (tipo: TipoAgrupado, mov: TipoMovimiento) => {
    setLoadingAgrupado(true)
    const p = new URLSearchParams({ tipo, tipo_movimiento: mov })
    if (fechaDesde) p.set("fecha_desde", fechaDesde)
    if (fechaHasta) p.set("fecha_hasta", fechaHasta)
    try {
      const { data: res } = await api.get(`/banco/reportes/agrupado?${p.toString()}`)
      setAgrupado(res)
    } catch {
      // silencioso
    } finally {
      setLoadingAgrupado(false)
    }
  }, [fechaDesde, fechaHasta])

  const handleTipoAgrupado = (tipo: TipoAgrupado) => {
    setTipoAgrupado(tipo)
    fetchAgrupado(tipo, tipoMov)
  }

  const handleTipoMov = (mov: TipoMovimiento) => {
    setTipoMov(mov)
    fetchAgrupado(tipoAgrupado, mov)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const p = new URLSearchParams()
    if (fechaDesde) p.set("fecha_desde", fechaDesde)
    if (fechaHasta) p.set("fecha_hasta", fechaHasta)
    const qs = p.toString() ? `?${p.toString()}` : ""
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        api.get(`/banco/reportes/flujo-caja${qs}`),
        api.get(`/banco/reportes/top-gastos${qs}`),
        api.get(`/banco/reportes/sin-clasificar${qs}`),
        api.get(`/banco/reportes/importaciones${qs}`),
      ])
      setFlujoCaja(r1.data)
      setTopGastos(r2.data)
      setSinClasificar(r3.data)
      setImportaciones(r4.data)
      await fetchAgrupado(tipoAgrupado, tipoMov)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error cargando reportes")
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-slate-900 leading-tight mt-0.5">Reportes</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <CurrencyToggle showUsd={showUsd} onChange={setShowUsd} />
            <div className="flex items-center gap-2">
              <div>
                <Label className="text-[10px] text-slate-400">Desde</Label>
                <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="h-8 text-xs border-slate-300 w-36" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Hasta</Label>
                <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="h-8 text-xs border-slate-300 w-36" />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading} className="h-8 border-slate-300 text-slate-600 gap-1.5 text-xs mt-3.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Actualizar
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
              )}>
                <Icon className="h-3.5 w-3.5" />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando reportes…</span>
          </div>
        ) : (
          <>
            {tab === "flujo"          && flujoCaja     && <TabFlujoCaja     data={flujoCaja}     showUsd={showUsd} />}
            {tab === "gastos"         && topGastos     && <TabTopGastos     data={topGastos}     showUsd={showUsd} />}
            {tab === "sin-clasificar" && sinClasificar && <TabSinClasificar data={sinClasificar} showUsd={showUsd} />}
            {tab === "importaciones"  && importaciones && <TabImportaciones data={importaciones} />}
            {tab === "agrupado"       && (
              <TabAgrupado
                data={agrupado}
                showUsd={showUsd}
                tipo={tipoAgrupado}
                tipoMov={tipoMov}
                onTipoChange={handleTipoAgrupado}
                onTipoMovChange={handleTipoMov}
                loading={loadingAgrupado}
                nombreEmpresa={nombreEmpresa}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}