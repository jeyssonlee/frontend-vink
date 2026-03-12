"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingCart, Search, Loader2, FileSpreadsheet, FileText,
  Eye, Ban, RefreshCcw, X, Calendar, Building2,
  Package, Hash, CreditCard, CheckCircle2, XCircle, AlertCircle,
  BarChart3, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface Proveedor  { id_proveedor: string; nombre_empresa: string; rif?: string; }
interface Almacen    { id_almacen: string; nombre: string; }
interface Producto   { id_producto: string; nombre: string; codigo?: string; }
interface CompraDetalle { id_detalle: string; cantidad: number; costo_unitario: number; producto: Producto; }
interface Compra {
  id_compra: string; num_factura: string; fecha_compra: string;
  forma_pago: "CONTADO" | "CREDITO"; total: number; estado: string;
  id_proveedor?: string; proveedor: Proveedor; almacen: Almacen; detalles?: CompraDetalle[];
}
interface ProductoResumen {
  id_producto: string; nombre: string; codigo?: string;
  total_cantidad: number; total_invertido: number; num_compras: number; costo_promedio: number;
}

const fmt = (n: number) => new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    ACTIVA:  { label: "Registrada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    ANULADO: { label: "Anulada",    cls: "bg-red-50 text-red-600 border-red-200",             icon: <XCircle className="h-3 w-3" /> },
  };
  const cfg = map[estado] ?? { label: estado, cls: "bg-slate-100 text-slate-500 border-slate-200", icon: <AlertCircle className="h-3 w-3" /> };
  return <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.cls}`}>{cfg.icon} {cfg.label}</div>;
}

function FormaPagoBadge({ forma }: { forma: string }) {
  return forma === "CONTADO"
    ? <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold"><CreditCard className="h-3 w-3" /> Contado</div>
    : <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold"><CreditCard className="h-3 w-3" /> Crédito</div>;
}

export default function ComprasPage() {
  const [compras, setCompras]           = useState<Compra[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [tab, setTab]                   = useState<"historial" | "productos">("historial");
  const [busqueda, setBusqueda]         = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroFormaPago, setFiltroFormaPago] = useState("TODOS");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [prodDesde, setProdDesde]       = useState("");
  const [prodHasta, setProdHasta]       = useState("");
  const [prodBusqueda, setProdBusqueda] = useState("");
  const [prodProveedor, setProdProveedor] = useState("TODOS");
  const [sortCol, setSortCol]           = useState<keyof ProductoResumen>("total_invertido");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc");
  const [detalle, setDetalle]           = useState<Compra | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [anularTarget, setAnularTarget] = useState<Compra | null>(null);
  const [isAnulando, setIsAnulando]     = useState(false);

  const fetchCompras = async () => {
    try { setIsLoading(true); const { data } = await api.get("/compras"); setCompras(data); }
    catch { toast.error("Error al cargar las compras"); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { fetchCompras(); }, []);

  const abrirDetalle = async (c: Compra) => {
    setIsDetalleOpen(true); setIsLoadingDetalle(true);
    try { const { data } = await api.get(`/compras/${c.id_compra}`); setDetalle(data); }
    catch { toast.error("Error al cargar el detalle"); }
    finally { setIsLoadingDetalle(false); }
  };

  const comprasFiltradas = useMemo(() => compras.filter(c => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || c.num_factura.toLowerCase().includes(q) || c.proveedor?.nombre_empresa?.toLowerCase().includes(q) || c.almacen?.nombre?.toLowerCase().includes(q);
    const matchEstado = filtroEstado === "TODOS" || c.estado === filtroEstado;
    const matchPago   = filtroFormaPago === "TODOS" || c.forma_pago === filtroFormaPago;
    const fecha = new Date(c.fecha_compra);
    const matchDesde = !filtroFechaDesde || fecha >= new Date(filtroFechaDesde);
    const matchHasta = !filtroFechaHasta || fecha <= new Date(filtroFechaHasta);
    return matchQ && matchEstado && matchPago && matchDesde && matchHasta;
  }), [compras, busqueda, filtroEstado, filtroFormaPago, filtroFechaDesde, filtroFechaHasta]);

  const totalFiltrado = useMemo(() => comprasFiltradas.reduce((a, c) => a + Number(c.total), 0), [comprasFiltradas]);
  const hayFiltros = busqueda || filtroEstado !== "TODOS" || filtroFormaPago !== "TODOS" || filtroFechaDesde || filtroFechaHasta;
  const limpiarFiltros = () => { setBusqueda(""); setFiltroEstado("TODOS"); setFiltroFormaPago("TODOS"); setFiltroFechaDesde(""); setFiltroFechaHasta(""); };

  const proveedoresUnicos = useMemo(() => {
    const map = new Map<string, string>();
    compras.forEach(c => { if (c.proveedor) map.set(c.proveedor.id_proveedor, c.proveedor.nombre_empresa); });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [compras]);

  const reporteProductos = useMemo((): ProductoResumen[] => {
    const filtradas = compras.filter(c => {
      if (c.estado === "ANULADO") return false;
      const fecha = new Date(c.fecha_compra);
      const matchDesde = !prodDesde || fecha >= new Date(prodDesde);
      const matchHasta = !prodHasta || fecha <= new Date(prodHasta);
      const matchProv  = prodProveedor === "TODOS" || c.proveedor?.id_proveedor === prodProveedor || c.id_proveedor === prodProveedor;
      return matchDesde && matchHasta && matchProv;
    });
    const mapa = new Map<string, ProductoResumen>();
    filtradas.forEach(c => {
      (c.detalles ?? []).forEach(d => {
        if (!d.producto) return;
        const id = d.producto.id_producto;
        if (!mapa.has(id)) mapa.set(id, { id_producto: id, nombre: d.producto.nombre, codigo: d.producto.codigo, total_cantidad: 0, total_invertido: 0, num_compras: 0, costo_promedio: 0 });
        const r = mapa.get(id)!;
        r.total_cantidad  += Number(d.cantidad);
        r.total_invertido += Number(d.cantidad) * Number(d.costo_unitario);
        r.num_compras     += 1;
      });
    });
    const lista = Array.from(mapa.values()).map(r => ({ ...r, costo_promedio: r.total_cantidad > 0 ? r.total_invertido / r.total_cantidad : 0 }));
    const filtrada = prodBusqueda ? lista.filter(r => r.nombre.toLowerCase().includes(prodBusqueda.toLowerCase()) || (r.codigo ?? "").toLowerCase().includes(prodBusqueda.toLowerCase())) : lista;
    return filtrada.sort((a, b) => { const va = a[sortCol] as number, vb = b[sortCol] as number; return sortDir === "desc" ? vb - va : va - vb; });
  }, [compras, prodDesde, prodHasta, prodProveedor, prodBusqueda, sortCol, sortDir]);

  const toggleSort = (col: keyof ProductoResumen) => { if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortCol(col); setSortDir("desc"); } };
  const SortIcon = ({ col }: { col: keyof ProductoResumen }) => sortCol !== col ? null : sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-1" /> : <ChevronUp className="h-3 w-3 inline ml-1" />;

  const confirmarAnulacion = async () => {
    if (!anularTarget) return;
    setIsAnulando(true);
    try { await api.patch(`/compras/${anularTarget.id_compra}/anular`); toast.success(`Compra ${anularTarget.num_factura} anulada`); setAnularTarget(null); setIsDetalleOpen(false); fetchCompras(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Error al anular"); }
    finally { setIsAnulando(false); }
  };

  const exportarExcelHistorial = async () => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(comprasFiltradas.map(c => ({ "N° Factura": c.num_factura, "Proveedor": c.proveedor?.nombre_empresa ?? "", "Almacén": c.almacen?.nombre ?? "", "Fecha": fmtDate(c.fecha_compra), "Forma Pago": c.forma_pago, "Total ($)": Number(c.total), "Estado": c.estado })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Compras");
      ws["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
      XLSX.writeFile(wb, `Compras_${new Date().toISOString().slice(0, 10)}.xlsx`); toast.success("Excel generado");
    } catch { toast.error("Error: npm install xlsx"); }
  };

  const exportarExcelProductos = async () => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(reporteProductos.map(r => ({ "Código": r.codigo ?? "", "Producto": r.nombre, "Cant. Total": r.total_cantidad, "N° Compras": r.num_compras, "Costo Prom. ($)": Number(r.costo_promedio.toFixed(2)), "Total Invertido ($)": Number(r.total_invertido.toFixed(2)) })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Productos Comprados");
      ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];
      XLSX.writeFile(wb, `Reporte_Productos_${new Date().toISOString().slice(0, 10)}.xlsx`); toast.success("Excel de productos generado");
    } catch { toast.error("Error: npm install xlsx"); }
  };

  const exportarPDFHistorial = async () => {
    try {
      const { default: jsPDF } = await import("jspdf"); const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 297, 20, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.text("ERP VINK — Historial de Compras", 14, 13);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text(`Generado: ${new Date().toLocaleString("es-VE")}`, 200, 13);
      doc.setTextColor(50, 50, 50); doc.setFontSize(9); doc.text(`Registros: ${comprasFiltradas.length}   Total: $${fmt(totalFiltrado)}`, 14, 28);
      autoTable(doc, { startY: 33, head: [["N° Factura", "Proveedor", "Almacén", "Fecha", "Forma Pago", "Total ($)", "Estado"]], body: comprasFiltradas.map(c => [c.num_factura, c.proveedor?.nombre_empresa ?? "", c.almacen?.nombre ?? "", fmtDate(c.fecha_compra), c.forma_pago, fmt(Number(c.total)), c.estado]), styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 5: { halign: "right" }, 6: { halign: "center" } } });
      doc.save(`Compras_${new Date().toISOString().slice(0, 10)}.pdf`); toast.success("PDF generado");
    } catch { toast.error("Error: npm install jspdf jspdf-autotable"); }
  };

  const exportarPDFProductos = async () => {
    try {
      const { default: jsPDF } = await import("jspdf"); const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 297, 20, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.text("ERP VINK — Reporte de Productos Comprados", 14, 13);
      if (prodDesde || prodHasta) { doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text(`Período: ${prodDesde || "inicio"} → ${prodHasta || "hoy"}`, 180, 13); }
      const totalInv = reporteProductos.reduce((a, r) => a + r.total_invertido, 0);
      doc.setTextColor(50, 50, 50); doc.setFontSize(9); doc.text(`${reporteProductos.length} productos — Total: $${fmt(totalInv)}`, 14, 28);
      autoTable(doc, { startY: 33, head: [["Código", "Producto", "Cant. Total", "N° Compras", "Costo Prom. ($)", "Total Invertido ($)"]], body: reporteProductos.map(r => [r.codigo ?? "—", r.nombre, r.total_cantidad, r.num_compras, fmt(r.costo_promedio), fmt(r.total_invertido)]), styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "right" }, 5: { halign: "right" } } });
      doc.save(`Productos_Comprados_${new Date().toISOString().slice(0, 10)}.pdf`); toast.success("PDF generado");
    } catch { toast.error("Error: npm install jspdf jspdf-autotable"); }
  };

  const exportarDetallePDF = async (c: Compra) => {
    if (!c.detalles) return;
    try {
      const { default: jsPDF } = await import("jspdf"); const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 22, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.text("ERP VINK — Orden de Compra", 14, 14);
      doc.setTextColor(50, 50, 50); doc.setFontSize(9);
      doc.text(`Factura: ${c.num_factura}`, 14, 32); doc.text(`Proveedor: ${c.proveedor?.nombre_empresa ?? ""}`, 14, 38); doc.text(`Almacén: ${c.almacen?.nombre ?? ""}`, 14, 44);
      doc.text(`Fecha: ${fmtDate(c.fecha_compra)}`, 120, 32); doc.text(`Forma Pago: ${c.forma_pago}`, 120, 38); doc.text(`Estado: ${c.estado}`, 120, 44);
      autoTable(doc, { startY: 52, head: [["Producto", "Código", "Cantidad", "Costo Unit. ($)", "Subtotal ($)"]], body: c.detalles.map(d => [d.producto?.nombre ?? "", d.producto?.codigo ?? "—", d.cantidad, fmt(Number(d.costo_unitario)), fmt(d.cantidad * Number(d.costo_unitario))]), styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" }, columnStyles: { 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right" } } });
      const finalY = (doc as any).lastAutoTable.finalY + 8; doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(`TOTAL: $${fmt(Number(c.total))}`, 150, finalY, { align: "right" });
      doc.save(`Compra_${c.num_factura}.pdf`); toast.success("PDF generado");
    } catch { toast.error("Error al generar PDF"); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      <header className="h-14 flex items-center gap-3 px-4 border-b bg-white shrink-0">
        <SidebarTrigger /><Separator orientation="vertical" className="h-5" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compras</span>
        <span className="text-slate-200">/</span>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Historial</span>
      </header>
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* ENCABEZADO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg"><ShoppingCart className="h-6 w-6 text-white" /></div>
            <div><h1 className="text-xl font-bold text-slate-800 tracking-tight">Compras</h1><p className="text-sm text-slate-500">Historial de órdenes y análisis de productos comprados.</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {tab === "historial" ? (<>
              <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={exportarExcelHistorial}><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel</Button>
              <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={exportarPDFHistorial}><FileText className="h-4 w-4 text-red-500" /> PDF</Button>
            </>) : (<>
              <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={exportarExcelProductos}><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel</Button>
              <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={exportarPDFProductos}><FileText className="h-4 w-4 text-red-500" /> PDF</Button>
            </>)}
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-slate-200" onClick={fetchCompras} disabled={isLoading}><RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1.5 w-fit shadow-sm">
          {[{ key: "historial", label: "Historial de Compras", icon: <ShoppingCart className="h-4 w-4" /> }, { key: "productos", label: "Reporte por Producto", icon: <BarChart3 className="h-4 w-4" /> }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.key ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* TAB HISTORIAL */}
        {tab === "historial" && (<>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input placeholder="Buscar por factura, proveedor o almacén..." className="w-full pl-10 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <select className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="TODOS">Todos los estados</option><option value="ACTIVA">Registrada</option><option value="ANULADO">Anulada</option>
              </select>
              <select className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroFormaPago} onChange={e => setFiltroFormaPago(e.target.value)}>
                <option value="TODOS">Todas las formas de pago</option><option value="CONTADO">Contado</option><option value="CREDITO">Crédito</option>
              </select>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="date" className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
                <span className="text-slate-400 text-xs">—</span>
                <input type="date" className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
              </div>
              {hayFiltros && <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 gap-1.5" onClick={limpiarFiltros}><X className="h-3.5 w-3.5" /> Limpiar</Button>}
            </div>
            {hayFiltros && <div className="mt-3 text-[11px] text-slate-500 font-medium"><span className="font-bold text-slate-700">{comprasFiltradas.length}</span> resultado(s) — Total: <span className="font-bold text-blue-700">${fmt(totalFiltrado)}</span></div>}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">N° Factura</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Proveedor</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Almacén</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Fecha</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Forma Pago</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Total</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (<TableRow><TableCell colSpan={8} className="h-40 text-center"><div className="flex items-center justify-center gap-2 text-slate-400 italic text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Cargando compras...</div></TableCell></TableRow>)
                  : comprasFiltradas.length === 0 ? (<TableRow><TableCell colSpan={8} className="h-40 text-center text-slate-400 italic text-sm">No se encontraron compras.</TableCell></TableRow>)
                  : comprasFiltradas.map(c => (
                  <TableRow key={c.id_compra} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors cursor-pointer" onClick={() => abrirDetalle(c)}>
                    <TableCell className="pl-6 py-4"><div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-slate-300" /><span className="font-bold text-slate-700 font-mono text-sm">{c.num_factura}</span></div></TableCell>
                    <TableCell><div className="font-semibold text-slate-800 text-sm">{c.proveedor?.nombre_empresa ?? "—"}</div>{c.proveedor?.rif && <div className="text-[10px] text-slate-400 font-mono mt-0.5">RIF: {c.proveedor.rif}</div>}</TableCell>
                    <TableCell><div className="inline-flex items-center gap-1.5 text-slate-600 text-[11px] font-medium"><Building2 className="h-3 w-3 text-slate-300" /> {c.almacen?.nombre ?? "—"}</div></TableCell>
                    <TableCell><div className="text-sm text-slate-600">{fmtDate(c.fecha_compra)}</div></TableCell>
                    <TableCell><FormaPagoBadge forma={c.forma_pago} /></TableCell>
                    <TableCell className="text-right"><div className="font-bold text-slate-800 text-sm">${fmt(Number(c.total))}</div></TableCell>
                    <TableCell><EstadoBadge estado={c.estado} /></TableCell>
                    <TableCell className="text-right pr-6" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => abrirDetalle(c)}><Eye className="h-4 w-4" /></Button>
                        {c.estado === "ACTIVA" && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setAnularTarget(c)}><Ban className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{comprasFiltradas.length} compra(s)</span>
              {!isLoading && comprasFiltradas.length > 0 && <span className="text-[11px] font-bold text-slate-600">Total: <span className="text-blue-700">${fmt(totalFiltrado)}</span></span>}
            </div>
          </div>
        </>)}

        {/* TAB PRODUCTOS */}
        {tab === "productos" && (<>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input placeholder="Buscar producto o código..." className="w-full pl-10 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10" value={prodBusqueda} onChange={e => setProdBusqueda(e.target.value)} />
              </div>
              <select className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={prodProveedor} onChange={e => setProdProveedor(e.target.value)}>
                <option value="TODOS">Todos los proveedores</option>
                {proveedoresUnicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="date" className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={prodDesde} onChange={e => setProdDesde(e.target.value)} />
                <span className="text-slate-400 text-xs">—</span>
                <input type="date" className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" value={prodHasta} onChange={e => setProdHasta(e.target.value)} />
              </div>
              {(prodBusqueda || prodProveedor !== "TODOS" || prodDesde || prodHasta) && <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 gap-1.5" onClick={() => { setProdBusqueda(""); setProdProveedor("TODOS"); setProdDesde(""); setProdHasta(""); }}><X className="h-3.5 w-3.5" /> Limpiar</Button>}
            </div>
            {reporteProductos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Productos distintos", value: reporteProductos.length.toString(), color: "text-slate-800" },
                  { label: "Unidades totales",    value: fmt(reporteProductos.reduce((a, r) => a + r.total_cantidad, 0)), color: "text-blue-700" },
                  { label: "Total invertido",     value: `$${fmt(reporteProductos.reduce((a, r) => a + r.total_invertido, 0))}`, color: "text-emerald-700" },
                  { label: "Mayor inversión",     value: (reporteProductos[0]?.nombre ?? "").slice(0, 22) + ((reporteProductos[0]?.nombre.length ?? 0) > 22 ? "…" : ""), color: "text-amber-700" },
                ].map((k, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k.label}</div>
                    <div className={`text-sm font-bold ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">Producto</TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("total_cantidad")}>Cant. Total <SortIcon col="total_cantidad" /></TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("num_compras")}>N° Compras <SortIcon col="num_compras" /></TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("costo_promedio")}>Costo Prom. <SortIcon col="costo_promedio" /></TableHead>
                  <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right pr-6 cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("total_invertido")}>Total Invertido <SortIcon col="total_invertido" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (<TableRow><TableCell colSpan={5} className="h-40 text-center"><div className="flex items-center justify-center gap-2 text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</div></TableCell></TableRow>)
                  : reporteProductos.length === 0 ? (<TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic text-sm">No hay datos con los filtros aplicados.</TableCell></TableRow>)
                  : reporteProductos.map((r, i) => (
                  <TableRow key={r.id_producto} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{i + 1}</div>
                        <div><div className="font-bold text-slate-800 text-sm">{r.nombre}</div>{r.codigo && <div className="text-[10px] font-mono text-slate-400 mt-0.5">{r.codigo}</div>}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">{fmt(r.total_cantidad)}</span></TableCell>
                    <TableCell className="text-center"><span className="text-sm font-semibold text-slate-600">{r.num_compras}</span></TableCell>
                    <TableCell className="text-right text-sm text-slate-600">${fmt(r.costo_promedio)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="font-bold text-slate-800 text-sm">${fmt(r.total_invertido)}</div>
                      <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-24 ml-auto">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(r.total_invertido / (reporteProductos[0]?.total_invertido || 1)) * 100}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{reporteProductos.length} producto(s)</span>
              <span className="text-[11px] font-bold text-slate-600">Total invertido: <span className="text-emerald-700">${fmt(reporteProductos.reduce((a, r) => a + r.total_invertido, 0))}</span></span>
            </div>
          </div>
        </>)}
      </main>

      {/* MODAL DETALLE */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0"><ShoppingCart className="h-5 w-5 text-blue-400" /></div>
            <div className="flex-1 min-w-0"><DialogTitle className="text-base font-bold truncate">Detalle de Compra — {detalle?.num_factura ?? "..."}</DialogTitle><p className="text-xs text-slate-400 mt-0.5">{detalle?.proveedor?.nombre_empresa ?? ""}</p></div>
            {detalle && <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent shrink-0" onClick={() => detalle && exportarDetallePDF(detalle)}><FileText className="h-3.5 w-3.5" /> PDF</Button>}
          </DialogHeader>
          <div className="p-6 bg-white space-y-5 max-h-[80vh] overflow-y-auto">
            {isLoadingDetalle ? (<div className="flex items-center justify-center h-32 gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando detalle...</div>)
              : detalle ? (<>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: <Hash className="h-4 w-4 text-slate-400" />,      label: "N° Factura",    value: detalle.num_factura },
                  { icon: <Calendar className="h-4 w-4 text-slate-400" />,  label: "Fecha",         value: fmtDate(detalle.fecha_compra) },
                  { icon: <Building2 className="h-4 w-4 text-slate-400" />, label: "Almacén",       value: detalle.almacen?.nombre ?? "—" },
                  { icon: <CreditCard className="h-4 w-4 text-slate-400" />,label: "Forma de Pago", value: detalle.forma_pago },
                  { icon: null, label: "Estado", value: null, badge: <EstadoBadge estado={detalle.estado} /> },
                  { icon: null, label: "Total",  value: null, highlight: `$${fmt(Number(detalle.total))}` },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.icon} {item.label}</div>
                    {item.value     && <div className="text-sm font-semibold text-slate-700">{item.value}</div>}
                    {item.badge}
                    {item.highlight && <div className="text-base font-bold text-blue-700">{item.highlight}</div>}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Líneas ({detalle.detalles?.length ?? 0} ítems)</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-100">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold text-slate-600 uppercase pl-4">Producto</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-600 uppercase text-center">Cantidad</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-600 uppercase text-right">Costo Unit.</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-600 uppercase text-right pr-4">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detalle.detalles ?? []).map(d => (
                        <TableRow key={d.id_detalle} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                          <TableCell className="pl-4 py-3"><div className="font-semibold text-slate-800 text-sm">{d.producto?.nombre ?? "—"}</div>{d.producto?.codigo && <div className="text-[10px] font-mono text-slate-400 mt-0.5">{d.producto.codigo}</div>}</TableCell>
                          <TableCell className="text-center font-bold text-slate-700">{d.cantidad}</TableCell>
                          <TableCell className="text-right text-slate-600 text-sm">${fmt(Number(d.costo_unitario))}</TableCell>
                          <TableCell className="text-right pr-4 font-bold text-slate-800 text-sm">${fmt(d.cantidad * Number(d.costo_unitario))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-end"><span className="text-sm font-bold text-slate-800">Total: <span className="text-blue-700 text-base">${fmt(Number(detalle.total))}</span></span></div>
                </div>
              </div>
              {detalle.estado === "ACTIVA" && (
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setAnularTarget(detalle)}><Ban className="h-4 w-4" /> Anular Compra</Button>
                </div>
              )}
            </>) : <div className="text-center text-slate-400 h-32 flex items-center justify-center">No se encontraron datos.</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRM ANULACIÓN */}
      <AlertDialog open={!!anularTarget} onOpenChange={o => !o && setAnularTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-500" /> Anular Compra</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-slate-600 space-y-2">
                <p>¿Estás seguro de anular la factura <span className="font-bold text-slate-800">{anularTarget?.num_factura}</span>?</p>
                <p className="text-red-600 font-medium text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">Esta acción revertirá el stock en inventario y registrará el movimiento en Kardex. No se puede deshacer.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAnulacion} disabled={isAnulando} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-2">
              {isAnulando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Confirmar Anulación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
