"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownLeft, AlertCircle, Loader2, RefreshCw,
  DollarSign, Building2, Tag, Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { formatBs } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { MovimientoManualForm, type CuentaBancaria } from "../MovimientoManualForm"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cuenta {
  id: number
  nombre: string
  banco_key: string
  numero_cuenta: string
  moneda: string
  saldo_inicial: string
  saldo_actual_usd: string
  total_ingresos: string
  total_egresos: string
  flujo_neto: string
  total_ingresos_usd: string
  total_egresos_usd: string
  total_movimientos: number
}

interface DashboardData {
  kpis: {
    total_ingresos: string
    total_egresos: string
    flujo_neto: string
    total_ingresos_usd: string
    total_egresos_usd: string
    flujo_neto_usd: string
    total_movimientos: number
    sin_categoria: number
  }
  por_categoria: Array<{
    categoria: string
    cantidad: number
    total_bs: string
    total_usd: string
  }>
  evolucion_mensual: Array<{
    mes: string
    ingresos: string
    egresos: string
    flujo_neto: string
    ingresos_usd: string
    egresos_usd: string
  }>
  cuentas: Cuenta[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBs  = (v: any) => formatBs(Math.abs(parseFloat(String(v ?? 0)))).replace("Bs. ", "")
const fmtUsd = (v: any) => `$${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(parseFloat(String(v ?? 0))))}`
const fmt    = (bs: any, usd: any, showUsd: boolean) => showUsd ? fmtUsd(usd) : `Bs. ${fmtBs(bs)}`
const num    = (bs: any, usd: any, showUsd: boolean) => Math.abs(parseFloat(String(showUsd ? usd : bs)))

const fmtUsdSigned = (v: any) => {
  const n = parseFloat(String(v ?? 0))
  return `${n < 0 ? "-" : ""}$${new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(Math.abs(n))}`
}
const fmtBsSigned = (v: any) => {
  const n = parseFloat(String(v ?? 0))
  return `${n < 0 ? "-" : ""}Bs. ${formatBs(Math.abs(n)).replace("Bs. ", "")}`
}
const formatFechaMes = (mes: string) => {
  if (!mes) return ""
  const [y, m] = mes.split("-")
  const labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  return `${labels[parseInt(m) - 1]} ${y.slice(2)}`
}

const PALETTE = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"]

const PERIODOS = [
  { label: "Este mes",  value: "mes" },
  { label: "3 meses",   value: "3meses" },
  { label: "6 meses",   value: "6meses" },
  { label: "Este año",  value: "anio" },
]

function getPeriodo(value: string): { fecha_desde?: string; fecha_hasta?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  if (value === "mes")    return { fecha_desde: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, fecha_hasta: iso(now) }
  if (value === "3meses") { const d = new Date(now); d.setMonth(d.getMonth()-3); return { fecha_desde: iso(d), fecha_hasta: iso(now) } }
  if (value === "6meses") { const d = new Date(now); d.setMonth(d.getMonth()-6); return { fecha_desde: iso(d), fecha_hasta: iso(now) } }
  if (value === "anio")   return { fecha_desde: `${now.getFullYear()}-01-01`, fecha_hasta: iso(now) }
  return {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function KpiCard({ label, primary, secondary, icon: Icon, color = "slate" }: {
  label: string; primary: string; secondary?: string
  icon: typeof Wallet; color?: "emerald" | "red" | "slate" | "blue"
}) {
  const colors = {
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50",  icon: "text-emerald-500" },
    red:     { text: "text-red-600",     bg: "bg-red-50",      icon: "text-red-400" },
    slate:   { text: "text-slate-700",   bg: "bg-slate-100",   icon: "text-slate-400" },
    blue:    { text: "text-blue-600",    bg: "bg-blue-50",     icon: "text-blue-500" },
  }
  const c = colors[color]
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-1.5">{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums tracking-tight leading-none", c.text)}>{primary}</p>
        {secondary && <p className="text-[11px] text-slate-400 mt-1.5">{secondary}</p>}
      </div>
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
        <Icon className={cn("h-4 w-4", c.icon)} />
      </div>
    </div>
  )
}

function SaldoTotalCard({ cuentas, showUsd }: { cuentas: Cuenta[]; showUsd: boolean }) {
  // Saldo total USD = suma de saldo_actual_usd de todas las cuentas
  const totalUsd = cuentas.reduce((acc, c) => acc + parseFloat(c.saldo_actual_usd ?? "0"), 0)
  // Saldo total Bs = suma de flujo_neto (movimientos en Bs, sin saldo_inicial que está en USD)
  const totalBs  = cuentas.reduce((acc, c) => acc + parseFloat(c.flujo_neto ?? "0"), 0)

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl px-5 py-4 text-white flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-emerald-200 mb-1.5">Saldo Total en Cuentas</p>
        <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">
          {showUsd ? fmtUsdSigned(totalUsd) : fmtBsSigned(totalBs)}
        </p>
        <p className="text-[11px] text-emerald-200 mt-1.5">
          {showUsd ? fmtBsSigned(totalBs) : fmtUsdSigned(totalUsd)} · {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Wallet className="h-4 w-4 text-white" />
      </div>
    </div>
  )
}

function CuentaCard({ cuenta, totalUsd, showUsd }: { cuenta: Cuenta; totalUsd: number; showUsd: boolean }) {
  const saldoUsd = parseFloat(cuenta.saldo_actual_usd ?? "0")   // ← sin cambio
  const saldoBs  = parseFloat(cuenta.flujo_neto ?? "0")          // ← sin cambio
  const porcentaje = totalUsd > 0 ? (Math.abs(saldoUsd) / totalUsd) * 100 : 0  // ← solo esto

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{cuenta.nombre}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cuenta.numero_cuenta}</p>
        </div>
        <Badge variant="outline" className="text-[9px] shrink-0 border-slate-200 text-slate-500">{cuenta.moneda}</Badge>
      </div>

      <p className="text-lg font-bold tabular-nums text-slate-800 leading-none mb-0.5">
        {showUsd ? fmtUsdSigned(saldoUsd) : fmtBsSigned(saldoBs)}
      </p>
      <p className="text-[10px] text-slate-400 mb-2.5">
        {showUsd ? fmtBsSigned(saldoBs) : fmtUsdSigned(saldoUsd)}
      </p>

      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-slate-400">{cuenta.total_movimientos} mov.</span>
        <span className="text-[10px] text-slate-400">{porcentaje.toFixed(1)}% del total</span>
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function DashboardBancoView() {
  const [showUsd,      setShowUsd]      = useState(true)
  const [periodo,      setPeriodo]      = useState("mes")
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [data,         setData]         = useState<DashboardData | null>(null)
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [showNuevoMov, setShowNuevoMov] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { fecha_desde, fecha_hasta } = getPeriodo(periodo)
    const p = new URLSearchParams()
    if (fecha_desde) p.set("fecha_desde", fecha_desde)
    if (fecha_hasta) p.set("fecha_hasta", fecha_hasta)
    const qs = p.toString() ? `?${p.toString()}` : ""
    try {
      const { data: res } = await api.get(`/banco/dashboard/individual${qs}`)
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error cargando dashboard")
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    api.get("/banco/cuentas").then(r => setCuentasBancarias(r.data)).catch(() => {})
  }, [])

  const kpis    = data?.kpis
  const cuentas = data?.cuentas ?? []
  const evol    = data?.evolucion_mensual ?? []
  const categ   = data?.por_categoria ?? []

  // Saldo total USD para calcular % por cuenta
  const totalUsd = cuentas.reduce((acc, c) => acc + parseFloat(c.saldo_actual_usd ?? "0"), 0)

  const netoPos = parseFloat(kpis?.flujo_neto_usd ?? "0") >= 0

  const chartEvol = evol.map((m) => ({
    name:     formatFechaMes(m.mes),
    ingresos: num(m.ingresos, m.ingresos_usd, showUsd),
    egresos:  num(m.egresos,  m.egresos_usd,  showUsd),
  }))

  const pieData = categ
    .filter((c) => parseFloat(c.total_bs) < 0)
    .slice(0, 6)
    .map((c) => ({
      name:  c.categoria,
      value: num(c.total_bs, c.total_usd, showUsd),
    }))

  return (
    <>
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-slate-900 leading-tight mt-0.5">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <CurrencyToggle showUsd={showUsd} onChange={setShowUsd} />
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {PERIODOS.map((p) => (
                <button key={p.value} onClick={() => setPeriodo(p.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    periodo === p.value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}
              className="h-8 border-slate-300 text-slate-600 gap-1.5 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" onClick={() => setShowNuevoMov(true)}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Movimiento manual
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando dashboard…</span>
          </div>
        ) : data ? (
          <>
            {/* Fila 1 — KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SaldoTotalCard cuentas={cuentas} showUsd={showUsd} />
              <KpiCard
                label="Ingresos del período"
                primary={fmt(kpis?.total_ingresos, kpis?.total_ingresos_usd, showUsd)}
                secondary={showUsd ? `Bs. ${fmtBs(kpis?.total_ingresos)}` : fmtUsd(kpis?.total_ingresos_usd)}
                icon={ArrowDownLeft} color="emerald"
              />
              <KpiCard
                label="Egresos del período"
                primary={fmt(kpis?.total_egresos, kpis?.total_egresos_usd, showUsd)}
                secondary={showUsd ? `Bs. ${fmtBs(kpis?.total_egresos)}` : fmtUsd(kpis?.total_egresos_usd)}
                icon={ArrowUpRight} color="red"
              />
              <KpiCard
                label="Flujo Neto"
                primary={`${netoPos?"+":"−"}${fmt(kpis?.flujo_neto, kpis?.flujo_neto_usd, showUsd)}`}
                secondary={showUsd ? `Bs. ${fmtBs(kpis?.flujo_neto)}` : fmtUsd(kpis?.flujo_neto_usd)}
                icon={netoPos ? TrendingUp : TrendingDown}
                color={netoPos ? "emerald" : "red"}
              />
            </div>

            {/* Fila 2 — Cuentas */}
            {cuentas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Cuentas bancarias</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cuentas.map((c) => (
                    <CuentaCard key={c.id} cuenta={c} totalUsd={totalUsd} showUsd={showUsd} />
                  ))}
                </div>
              </div>
            )}

            {/* Fila 3 — Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Evolución mensual — {showUsd ? "USD" : "Bs"}
                </p>
                {chartEvol.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartEvol} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                        tickFormatter={(v: any) => showUsd ? `$${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: any) => [showUsd ? fmtUsd(v) : `Bs. ${fmtBs(v)}`, ""]}
                        contentStyle={{ fontSize: 11, borderColor: "#e2e8f0", borderRadius: 8 }}
                      />
                      <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="egresos"  name="Egresos"  fill="#fca5a5" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-slate-300 text-xs">Sin datos para el período</div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Gastos por categoría</p>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => [showUsd ? fmtUsd(v) : `Bs. ${fmtBs(v)}`, ""]}
                          contentStyle={{ fontSize: 11, borderColor: "#e2e8f0", borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {pieData.map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="text-[11px] text-slate-600 truncate">{c.name}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700 tabular-nums shrink-0">
                            {showUsd ? fmtUsd(c.value) : `Bs. ${fmtBs(c.value)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-slate-300 text-xs">Sin categorías</div>
                )}
              </div>
            </div>

            {/* Fila 4 — Alertas + stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={cn(
                "rounded-xl border p-5",
                (kpis?.sin_categoria ?? 0) > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className={cn("h-4 w-4", (kpis?.sin_categoria ?? 0) > 0 ? "text-amber-500" : "text-emerald-500")} />
                  <p className={cn("text-xs font-semibold", (kpis?.sin_categoria ?? 0) > 0 ? "text-amber-700" : "text-emerald-700")}>
                    Sin clasificar
                  </p>
                </div>
                {(kpis?.sin_categoria ?? 0) > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-amber-600 tabular-nums">{kpis?.sin_categoria}</p>
                    <p className="text-xs text-amber-600 mt-1">movimientos pendientes de categorizar</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-emerald-600">0</p>
                    <p className="text-xs text-emerald-600 mt-1">Todo clasificado 🎉</p>
                  </>
                )}
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Resumen del período</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Total movimientos</p>
                    <p className="text-xl font-bold text-slate-700 tabular-nums">{kpis?.total_movimientos?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Cuentas activas</p>
                    <p className="text-xl font-bold text-slate-700 tabular-nums">{cuentas.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Promedio mensual</p>
                    <p className="text-xl font-bold text-slate-700 tabular-nums">
                      {evol.length > 0
                        ? showUsd
                          ? fmtUsd(evol.reduce((a,m) => a + parseFloat(m.ingresos_usd ?? "0"), 0) / evol.length)
                          : `Bs. ${fmtBs(evol.reduce((a,m) => a + parseFloat(m.ingresos ?? "0"), 0) / evol.length)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Mayor ingreso mes</p>
                    <p className="text-xl font-bold text-emerald-600 tabular-nums">
                      {evol.length > 0
                        ? showUsd
                          ? fmtUsd(Math.max(...evol.map(m => parseFloat(m.ingresos_usd ?? "0"))))
                          : `Bs. ${fmtBs(Math.max(...evol.map(m => parseFloat(m.ingresos ?? "0"))))}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Mayor egreso mes</p>
                    <p className="text-xl font-bold text-red-500 tabular-nums">
                      {evol.length > 0
                        ? showUsd
                          ? fmtUsd(Math.max(...evol.map(m => Math.abs(parseFloat(m.egresos_usd ?? "0")))))
                          : `Bs. ${fmtBs(Math.max(...evol.map(m => Math.abs(parseFloat(m.egresos ?? "0")))))}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Meses con datos</p>
                    <p className="text-xl font-bold text-slate-700 tabular-nums">{evol.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>

      {/* Drawer nuevo movimiento manual */}
      {showNuevoMov && (
        <MovimientoManualForm
          cuentas={cuentasBancarias}
          onClose={() => setShowNuevoMov(false)}
          onSaved={() => { setShowNuevoMov(false); fetchData() }}
        />
      )}
    </>
  )
}