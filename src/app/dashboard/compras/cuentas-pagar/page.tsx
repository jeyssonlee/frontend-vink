"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wallet, Search, Loader2, FileSpreadsheet, FileText,
  Eye, RefreshCcw, X, Calendar, CheckCircle2, Clock,
  AlertTriangle, CreditCard, Plus, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface Proveedor { id_proveedor: string; nombre_empresa: string; rif?: string; }
interface PagoCxP {
  id_pago: string; monto: number; fecha_pago: string;
  metodo_pago: string; referencia?: string; observacion?: string;
}
interface CuentaPorPagar {
  id_cuenta: string; num_factura: string;
  monto_original: number; monto_pagado: number; saldo_pendiente: number;
  estado: "PENDIENTE" | "PARCIAL" | "PAGADA" | "ANULADA";
  fecha_vencimiento?: string; created_at: string;
  proveedor: Proveedor; pagos?: PagoCxP[];
}
interface Resumen {
  total_pendiente: number; cantidad_activas: number;
  cantidad_vencidas: number; total_vencido: number;
}

const METODOS_PAGO = ["EFECTIVO","TRANSFERENCIA","PAGO MOVIL","ZELLE"];
const fmt = (n: number) => new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const isVencida = (c: CuentaPorPagar) => c.fecha_vencimiento && ["PENDIENTE","PARCIAL"].includes(c.estado) && new Date(c.fecha_vencimiento) < new Date();

function EstadoBadge({ cuenta }: { cuenta: CuentaPorPagar }) {
  if (isVencida(cuenta)) return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3" /> Vencida</div>;
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDIENTE: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200",      icon: <Clock className="h-3 w-3" /> },
    PARCIAL:   { label: "Parcial",   cls: "bg-blue-50 text-blue-700 border-blue-200",          icon: <CreditCard className="h-3 w-3" /> },
    PAGADA:    { label: "Pagada",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    ANULADA:   { label: "Anulada",   cls: "bg-slate-100 text-slate-500 border-slate-200",      icon: <X className="h-3 w-3" /> },
  };
  const cfg = map[cuenta.estado] ?? map.PENDIENTE;
  return <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.cls}`}>{cfg.icon} {cfg.label}</div>;
}

function BarraPago({ cuenta }: { cuenta: CuentaPorPagar }) {
  const pct = cuenta.monto_original > 0 ? (Number(cuenta.monto_pagado) / Number(cuenta.monto_original)) * 100 : 0;
  return (
    <div className="w-24">
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-slate-300"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="text-[9px] text-slate-400 mt-0.5 text-right">{pct.toFixed(0)}%</div>
    </div>
  );
}

export default function CuentasPagarPage() {
  const [cuentas, setCuentas]           = useState<CuentaPorPagar[]>([]);
  const [resumen, setResumen]           = useState<Resumen | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [soloActivas, setSoloActivas]   = useState(false);
  const [busqueda, setBusqueda]         = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroDesde, setFiltroDesde]   = useState("");
  const [filtroHasta, setFiltroHasta]   = useState("");
  const [cuentaSelec, setCuentaSelec]   = useState<CuentaPorPagar | null>(null);
  const [isDetalleOpen, setIsDetalleOpen]     = useState(false);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [isPagoOpen, setIsPagoOpen]     = useState(false);
  const [pagoMonto, setPagoMonto]       = useState("");
  const [pagoMetodo, setPagoMetodo]     = useState("TRANSFERENCIA");
  const [pagoRef, setPagoRef]           = useState("");
  const [pagoObs, setPagoObs]           = useState("");
  const [pagoFecha, setPagoFecha]       = useState(new Date().toISOString().slice(0, 10));
  const [isAplicando, setIsAplicando]   = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [{ data: c }, { data: r }] = await Promise.all([
        api.get(`/cuentas-pagar${soloActivas ? "?soloActivas=true" : ""}`),
        api.get("/cuentas-pagar/resumen"),
      ]);
      setCuentas(c); setResumen(r);
    } catch { toast.error("Error al cargar cuentas por pagar"); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { fetchData(); }, [soloActivas]);

  const abrirDetalle = async (c: CuentaPorPagar) => {
    setIsDetalleOpen(true); setIsLoadingDetalle(true);
    try { const { data } = await api.get(`/cuentas-pagar/${c.id_cuenta}`); setCuentaSelec(data); }
    catch { toast.error("Error al cargar el detalle"); }
    finally { setIsLoadingDetalle(false); }
  };

  const cuentasFiltradas = useMemo(() => cuentas.filter(c => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || c.num_factura?.toLowerCase().includes(q) || c.proveedor?.nombre_empresa?.toLowerCase().includes(q);
    const matchEst = filtroEstado === "TODOS" || (filtroEstado === "VENCIDA" ? !!isVencida(c) : c.estado === filtroEstado);
    const fecha = new Date(c.created_at);
    const matchDesde = !filtroDesde || fecha >= new Date(filtroDesde);
    const matchHasta = !filtroHasta || fecha <= new Date(filtroHasta);
    return matchQ && matchEst && matchDesde && matchHasta;
  }), [cuentas, busqueda, filtroEstado, filtroDesde, filtroHasta]);

  const totalSaldo = useMemo(() => cuentasFiltradas.reduce((a, c) => a + Number(c.saldo_pendiente), 0), [cuentasFiltradas]);
  const hayFiltros = busqueda || filtroEstado !== "TODOS" || filtroDesde || filtroHasta;

  const abrirPago = (c: CuentaPorPagar) => {
    setCuentaSelec(c); setPagoMonto(""); setPagoRef(""); setPagoObs("");
    setPagoFecha(new Date().toISOString().slice(0, 10)); setIsPagoOpen(true);
  };

  const aplicarPago = async () => {
    if (!cuentaSelec || !pagoMonto) return;
    const monto = parseFloat(pagoMonto);
    if (isNaN(monto) || monto <= 0) { toast.error("Monto inválido"); return; }
    if (monto > Number(cuentaSelec.saldo_pendiente)) { toast.error(`Supera el saldo pendiente ($${fmt(Number(cuentaSelec.saldo_pendiente))})`); return; }
    setIsAplicando(true);
    try {
      const { data } = await api.post(`/cuentas-pagar/${cuentaSelec.id_cuenta}/pago`, {
        monto, metodo_pago: pagoMetodo, referencia: pagoRef || undefined,
        observacion: pagoObs || undefined, fecha_pago: pagoFecha,
      });
      toast.success(data.message);
      setIsPagoOpen(false); setIsDetalleOpen(false); fetchData();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Error al aplicar pago"); }
    finally { setIsAplicando(false); }
  };

  const exportarExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(cuentasFiltradas.map(c => ({
        "N° Factura": c.num_factura, "Proveedor": c.proveedor?.nombre_empresa ?? "",
        "Original ($)": Number(c.monto_original), "Pagado ($)": Number(c.monto_pagado),
        "Saldo ($)": Number(c.saldo_pendiente), "Vencimiento": fmtDate(c.fecha_vencimiento ?? ""),
        "Estado": c.estado, "Vencida": isVencida(c) ? "Sí" : "No",
      })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "CxP");
      ws["!cols"] = [{wch:16},{wch:28},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:8}];
      XLSX.writeFile(wb, `CxP_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success("Excel generado");
    } catch { toast.error("Error: npm install xlsx"); }
  };

  const exportarPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(15,23,42); doc.rect(0,0,297,20,"F");
      doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont("helvetica","bold");
      doc.text("ERP VINK — Cuentas por Pagar", 14, 13);
      doc.setFontSize(8); doc.setFont("helvetica","normal");
      doc.text(`Generado: ${new Date().toLocaleString("es-VE")}`, 200, 13);
      if (resumen) {
        doc.setTextColor(50,50,50); doc.setFontSize(9);
        doc.text(`Pendiente: $${fmt(resumen.total_pendiente)}   Vencido: $${fmt(resumen.total_vencido)}   Activas: ${resumen.cantidad_activas}   Vencidas: ${resumen.cantidad_vencidas}`, 14, 28);
      }
      autoTable(doc, {
        startY: 33,
        head: [["N° Factura","Proveedor","Original ($)","Pagado ($)","Saldo ($)","Vencimiento","Estado"]],
        body: cuentasFiltradas.map(c => [
          c.num_factura, c.proveedor?.nombre_empresa ?? "",
          fmt(Number(c.monto_original)), fmt(Number(c.monto_pagado)), fmt(Number(c.saldo_pendiente)),
          fmtDate(c.fecha_vencimiento ?? ""), isVencida(c) ? "VENCIDA" : c.estado,
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15,23,42], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248,250,252] },
        columnStyles: { 2:{halign:"right"}, 3:{halign:"right"}, 4:{halign:"right"}, 6:{halign:"center"} },
      });
      doc.save(`CxP_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("PDF generado");
    } catch { toast.error("Error: npm install jspdf jspdf-autotable"); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      <header className="h-14 flex items-center gap-3 px-4 border-b bg-white shrink-0">
        <SidebarTrigger /><Separator orientation="vertical" className="h-5" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compras</span>
        <span className="text-slate-200">/</span>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Cuentas por Pagar</span>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ENCABEZADO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg"><Wallet className="h-6 w-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Cuentas por Pagar</h1>
              <p className="text-sm text-slate-500">Gestión de obligaciones con proveedores y aplicación de pagos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={exportarExcel}><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel</Button>
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={exportarPDF}><FileText className="h-4 w-4 text-red-500" /> PDF</Button>
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={fetchData} disabled={isLoading}><RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>

        {/* KPIs */}
        {resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Pendiente",  value: `$${fmt(resumen.total_pendiente)}`,   color: "text-slate-800",  bg: "bg-white",   icon: <Wallet className="h-5 w-5 text-slate-400" /> },
              { label: "Cuentas Activas",  value: resumen.cantidad_activas.toString(),  color: "text-blue-700",   bg: "bg-white",   icon: <Clock className="h-5 w-5 text-blue-400" /> },
              { label: "Cuentas Vencidas", value: resumen.cantidad_vencidas.toString(), color: "text-red-700",    bg: "bg-red-50",  icon: <AlertTriangle className="h-5 w-5 text-red-400" /> },
              { label: "Monto Vencido",    value: `$${fmt(resumen.total_vencido)}`,     color: "text-red-700",    bg: "bg-red-50",  icon: <AlertTriangle className="h-5 w-5 text-red-400" /> },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3`}>
                <div className="shrink-0">{k.icon}</div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</div>
                  <div className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input placeholder="Buscar por factura o proveedor..." className="w-full pl-10 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <select className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGADA">Pagada</option>
              <option value="VENCIDA">Vencida</option>
            </select>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <input type="date" className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
              <span className="text-slate-400 text-xs">—</span>
              <input type="date" className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
            </div>
            <button onClick={() => setSoloActivas(v => !v)} className={`h-9 px-3 rounded-lg text-xs font-bold border transition-all ${soloActivas ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              Solo pendientes
            </button>
            {hayFiltros && <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 gap-1.5" onClick={() => { setBusqueda(""); setFiltroEstado("TODOS"); setFiltroDesde(""); setFiltroHasta(""); }}><X className="h-3.5 w-3.5" /> Limpiar</Button>}
          </div>
          {hayFiltros && (
            <div className="mt-3 text-[11px] text-slate-500 font-medium">
              <span className="font-bold text-slate-700">{cuentasFiltradas.length}</span> resultado(s) — Saldo total: <span className="font-bold text-amber-700">${fmt(totalSaldo)}</span>
            </div>
          )}
        </div>

        {/* TABLA */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">N° Factura</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Proveedor</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Original</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Pagado</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Saldo</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Avance</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Vencimiento</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Estado</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-40 text-center"><div className="flex items-center justify-center gap-2 text-slate-400 italic text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div></TableCell></TableRow>
              ) : cuentasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-40 text-center text-slate-400 italic text-sm">No se encontraron cuentas.</TableCell></TableRow>
              ) : cuentasFiltradas.map(c => (
                <TableRow key={c.id_cuenta}
                  className={`group border-b border-slate-50 last:border-0 transition-colors cursor-pointer ${isVencida(c) ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-slate-50/50"}`}
                  onClick={() => abrirDetalle(c)}>
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-slate-300" /><span className="font-bold text-slate-700 font-mono text-sm">{c.num_factura}</span></div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800 text-sm">{c.proveedor?.nombre_empresa ?? "—"}</div>
                    {c.proveedor?.rif && <div className="text-[10px] text-slate-400 font-mono mt-0.5">RIF: {c.proveedor.rif}</div>}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-600">${fmt(Number(c.monto_original))}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-600 font-medium">${fmt(Number(c.monto_pagado))}</TableCell>
                  <TableCell className="text-right">
                    <div className={`font-bold text-sm ${Number(c.saldo_pendiente) > 0 ? "text-amber-700" : "text-emerald-600"}`}>${fmt(Number(c.saldo_pendiente))}</div>
                  </TableCell>
                  <TableCell><BarraPago cuenta={c} /></TableCell>
                  <TableCell>
                    {c.fecha_vencimiento
                      ? <div className={`text-sm font-medium ${isVencida(c) ? "text-red-600 font-bold" : "text-slate-600"}`}>{fmtDate(c.fecha_vencimiento)}</div>
                      : <span className="text-slate-300 text-sm">—</span>}
                  </TableCell>
                  <TableCell><EstadoBadge cuenta={c} /></TableCell>
                  <TableCell className="text-right pr-6" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => abrirDetalle(c)} title="Ver detalle"><Eye className="h-4 w-4" /></Button>
                      {["PENDIENTE","PARCIAL"].includes(c.estado) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => abrirPago(c)} title="Aplicar pago"><Plus className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{cuentasFiltradas.length} cuenta(s)</span>
            {!isLoading && cuentasFiltradas.length > 0 && (
              <span className="text-[11px] font-bold text-slate-600">Saldo total: <span className="text-amber-700">${fmt(totalSaldo)}</span></span>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DETALLE */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0"><Wallet className="h-5 w-5 text-blue-400" /></div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold truncate">CxP — {cuentaSelec?.num_factura ?? "..."}</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">{cuentaSelec?.proveedor?.nombre_empresa ?? ""}</p>
            </div>
            {cuentaSelec && ["PENDIENTE","PARCIAL"].includes(cuentaSelec.estado) && (
              <Button size="sm" className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                onClick={() => { setIsDetalleOpen(false); abrirPago(cuentaSelec); }}>
                <Plus className="h-3.5 w-3.5" /> Aplicar Pago
              </Button>
            )}
          </DialogHeader>
          <div className="p-6 bg-white space-y-5 max-h-[75vh] overflow-y-auto">
            {isLoadingDetalle ? (
              <div className="flex items-center justify-center h-32 gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando...</div>
            ) : cuentaSelec ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "N° Factura",      value: cuentaSelec.num_factura },
                    { label: "Vencimiento",     value: fmtDate(cuentaSelec.fecha_vencimiento ?? "") },
                    { label: "Estado",          value: null, badge: <EstadoBadge cuenta={cuentaSelec} /> },
                    { label: "Monto Original",  value: `$${fmt(Number(cuentaSelec.monto_original))}`,  cls: "text-slate-800 font-bold" },
                    { label: "Total Pagado",    value: `$${fmt(Number(cuentaSelec.monto_pagado))}`,    cls: "text-emerald-700 font-bold" },
                    { label: "Saldo Pendiente", value: `$${fmt(Number(cuentaSelec.saldo_pendiente))}`, cls: "text-amber-700 font-bold text-base" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                      {item.value && <div className={`text-sm ${item.cls ?? "text-slate-700 font-semibold"}`}>{item.value}</div>}
                      {item.badge}
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                    <span>Progreso de pago</span>
                    <span>{((Number(cuentaSelec.monto_pagado) / Number(cuentaSelec.monto_original)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${cuentaSelec.estado === "PAGADA" ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min((Number(cuentaSelec.monto_pagado) / Number(cuentaSelec.monto_original)) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5" /> Historial de Pagos ({cuentaSelec.pagos?.length ?? 0})
                  </div>
                  {(cuentaSelec.pagos ?? []).length === 0 ? (
                    <div className="text-center text-slate-400 italic text-sm py-6 bg-slate-50 rounded-lg border border-slate-100">Sin pagos registrados</div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-100">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-bold text-slate-600 uppercase pl-4">Fecha</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-600 uppercase">Método</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-600 uppercase">Referencia</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-600 uppercase">Observación</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-600 uppercase text-right pr-4">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(cuentaSelec.pagos ?? []).map(p => (
                            <TableRow key={p.id_pago} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                              <TableCell className="pl-4 py-3 text-sm text-slate-600">{fmtDate(p.fecha_pago)}</TableCell>
                              <TableCell><div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{p.metodo_pago}</div></TableCell>
                              <TableCell className="text-sm text-slate-500 font-mono">{p.referencia ?? "—"}</TableCell>
                              <TableCell className="text-sm text-slate-400 italic">{p.observacion ?? "—"}</TableCell>
                              <TableCell className="text-right pr-4 font-bold text-emerald-700 text-sm">${fmt(Number(p.monto))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            ) : <div className="text-center text-slate-400 h-32 flex items-center justify-center">No se encontraron datos.</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL APLICAR PAGO */}
      <Dialog open={isPagoOpen} onOpenChange={setIsPagoOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0"><Plus className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <DialogTitle className="text-base font-bold">Aplicar Pago</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">{cuentaSelec?.proveedor?.nombre_empresa} — Factura {cuentaSelec?.num_factura}</p>
            </div>
          </DialogHeader>
          <div className="p-6 bg-white space-y-4">
            {cuentaSelec && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Saldo pendiente</span>
                <span className="text-lg font-bold text-amber-700">${fmt(Number(cuentaSelec.saldo_pendiente))}</span>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Monto a pagar ($) *</label>
              <input type="number" step="0.01" min="0.01"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                placeholder="0.00" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Método de pago *</label>
              <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={pagoMetodo} onChange={e => setPagoMetodo(e.target.value)}>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Fecha de pago</label>
              <input type="date" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">N° Referencia / Cheque</label>
              <input type="text" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" placeholder="Opcional" value={pagoRef} onChange={e => setPagoRef(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Observación</label>
              <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" rows={2} placeholder="Opcional" value={pagoObs} onChange={e => setPagoObs(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1 text-xs font-bold" onClick={() => setIsPagoOpen(false)}>Cancelar</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2" onClick={aplicarPago} disabled={isAplicando || !pagoMonto}>
                {isAplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
