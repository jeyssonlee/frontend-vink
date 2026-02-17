"use client";

import { useEffect, useState, useMemo } from "react";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Filter, Download, RefreshCcw, Calendar as CalendarIcon, 
  TrendingUp, DollarSign, FileText, Printer, Search, 
  ChevronDown, Layers, Tag, User, ShoppingCart, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface VentaLinea {
  id_detalle: string;
  fecha: Date;
  nro_factura: string;
  vendedor: string;
  codigo: string;
  producto: string;
  marca: string;
  categoria: string;
  cantidad: number;
  costo_total: number;        // 🟢 COSTO TOTAL DE LA LÍNEA
  precio_venta: number;       
  total_venta: number;        
  ganancia: number;           
  margen_porcentaje: number;  
  estado: string;
}

// 🛡️ FUNCIÓN DE SEGURIDAD EXTREMA
const safeNum = (val: any) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    // Si viene como string, limpiamos caracteres raros
    if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]+/g, ""); // Solo deja números, puntos y menos
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

export default function ReporteVentasPage() {
  const [data, setData] = useState<VentaLinea[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); 
  const [fechaFin, setFechaFin] = useState<Date | undefined>(new Date());
  const [filtroVendedor, setFiltroVendedor] = useState("TODOS");
  const [filtroMarca, setFiltroMarca] = useState("TODAS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [vistaAgrupada, setVistaAgrupada] = useState(false);

  const idEmpresa = getEmpresaId();

  const vendedores = useMemo(() => Array.from(new Set(data.map(i => i.vendedor).filter(Boolean))).sort(), [data]);
  const marcas = useMemo(() => Array.from(new Set(data.map(i => i.marca).filter(Boolean))).sort(), [data]);
  const categorias = useMemo(() => Array.from(new Set(data.map(i => i.categoria).filter(Boolean))).sort(), [data]);

  const fetchData = async () => {
    if (!idEmpresa) return;
    try {
      setLoading(true);
      const res = await api.get(`/facturas?id_empresa=${idEmpresa}&relaciones=detalles,detalles.producto,vendedor`);
      
      const lineas: VentaLinea[] = [];

      res.data.forEach((factura: any) => {
        if (factura.estado === 'ANULADA') return;

        const detalles = factura.detalles || [];
        let fechaFac = new Date(factura.fecha_emision);
        if (!isValid(fechaFac)) fechaFac = new Date(); 

        let numeroVisual = "BORRADOR";
        if (factura.numero_consecutivo) {
            const serie = factura.serie || 'A';
            const correlativo = String(factura.numero_consecutivo).padStart(6, '0');
            numeroVisual = `${serie}-${correlativo}`;
        }

        detalles.forEach((detalle: any) => {
            // 🛡️ SANEAMIENTO DE DATOS AL ENTRAR
            const cantidad = safeNum(detalle.cantidad);
            const costoUnitario = safeNum(detalle.costo_historico);
            
            // 🟢 CÁLCULO DE COSTO TOTAL 
            const costoTotal = costoUnitario * cantidad;
            
            const venta = safeNum(detalle.total_linea);
            
            // Recálculo de ganancia seguro
            let ganancia = safeNum(detalle.ganancia_neta);
            if (ganancia === 0 && (venta > 0 || costoTotal > 0)) {
                ganancia = venta - costoTotal;
            }

            const margen = venta > 0 ? (ganancia / venta) * 100 : 0;

            lineas.push({
                id_detalle: detalle.id,
                fecha: fechaFac,
                nro_factura: numeroVisual,
                vendedor: factura.vendedor?.nombre || 'Sin Asignar',
                codigo: detalle.codigo_producto || 'N/A',
                producto: detalle.nombre_producto || 'Producto desconocido',
                marca: detalle.producto?.marca || 'GENÉRICO',
                categoria: detalle.producto?.categoria || 'GENERAL',
                cantidad: cantidad,
                costo_total: costoTotal,
                precio_venta: safeNum(detalle.precio_unitario),
                total_venta: venta,
                ganancia: ganancia,
                margen_porcentaje: safeNum(margen),
                estado: factura.estado || 'BORRADOR'
            });
        });
      });

      lineas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setData(lineas);

    } catch (error) {
      toast.error("Error cargando ventas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [idEmpresa]);

  const filtered = useMemo(() => {
    return data.filter(item => {
        const itemFecha = new Date(item.fecha);
        itemFecha.setHours(0,0,0,0);
        
        const fInicio = fechaInicio ? new Date(fechaInicio) : null;
        if(fInicio) fInicio.setHours(0,0,0,0);
        
        const fFin = fechaFin ? new Date(fechaFin) : null;
        if(fFin) fFin.setHours(23,59,59,999);

        const coincideFecha = (!fInicio || itemFecha >= fInicio) && (!fFin || itemFecha <= fFin);
        const coincideVendedor = filtroVendedor === "TODOS" || item.vendedor === filtroVendedor;
        const coincideMarca = filtroMarca === "TODAS" || item.marca === filtroMarca;
        const coincideCategoria = filtroCategoria === "TODAS" || item.categoria === filtroCategoria;

        return coincideFecha && coincideVendedor && coincideMarca && coincideCategoria;
    });
  }, [data, fechaInicio, fechaFin, filtroVendedor, filtroMarca, filtroCategoria]);

  // KPIs
  const totalVenta = filtered.reduce((acc, i) => acc + (i.total_venta || 0), 0);
  const totalCosto = filtered.reduce((acc, i) => acc + (i.costo_total || 0), 0);
  const totalGanancia = filtered.reduce((acc, i) => acc + (i.ganancia || 0), 0);
  const margenGlobal = totalVenta > 0 ? (totalGanancia / totalVenta) * 100 : 0;

  // --- EXPORTAR EXCEL ---
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(i => ({
        "Fecha": format(i.fecha, "dd/MM/yyyy"),
        "Factura": i.nro_factura,
        "Marca": i.marca,
        "Producto": i.producto,
        "Cant": i.cantidad,
        "Costo Total": i.costo_total, 
        "Total Venta": i.total_venta,
        "Ganancia ($)": i.ganancia,
        "Margen (%)": i.margen_porcentaje
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Ventas");
    XLSX.writeFile(wb, `Ventas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // --- EXPORTAR PDF (Agrupado) ---
  const exportarPDFAgrupado = () => {
    const doc = new jsPDF();
    const fecha = format(new Date(), "dd/MM/yyyy HH:mm");
    
    doc.setFontSize(18);
    doc.text("Reporte de Ventas por Marca", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${fecha}`, 14, 28);
    
    const strInicio = fechaInicio ? format(fechaInicio, 'dd/MM/yyyy') : 'Inicio';
    const strFin = fechaFin ? format(fechaFin, 'dd/MM/yyyy') : 'Fin';
    doc.text(`Rango: ${strInicio} - ${strFin}`, 14, 34);

    const marcasUnicas = Array.from(new Set(filtered.map(i => i.marca))).sort();
    let yPos = 45;

    marcasUnicas.forEach(marca => {
        const items = filtered.filter(i => i.marca === marca);
        const subVenta = items.reduce((a, b) => a + (b.total_venta || 0), 0);
        const subGanancia = items.reduce((a, b) => a + (b.ganancia || 0), 0);
        const subMargen = subVenta > 0 ? (subGanancia / subVenta) * 100 : 0;

        autoTable(doc, {
            startY: yPos,
            head: [[
                `${marca} (${items.length})`, 
                `Venta: $${subVenta.toFixed(2)}`, 
                `Profit: $${subGanancia.toFixed(2)}`,
                `Margen: ${subMargen.toFixed(1)}%`
            ]],
            theme: 'plain',
            styles: { fontSize: 10, fontStyle: 'bold', fillColor: [240, 240, 240] },
            margin: { left: 14 }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY;

        autoTable(doc, {
            startY: yPos,
            head: [['Fecha', 'Producto', 'Cant', 'Costo T.', 'Total', 'Ganancia', '%']],
            body: items.map(i => [
                format(i.fecha, "dd/MM"),
                i.producto.substring(0, 25),
                i.cantidad,
                (i.costo_total || 0).toFixed(2),
                (i.total_venta || 0).toFixed(2),
                (i.ganancia || 0).toFixed(2),
                `${(i.margen_porcentaje || 0).toFixed(1)}%`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14 }
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 5;
        if (yPos > 270) { doc.addPage(); yPos = 20; }
    });

    autoTable(doc, {
        startY: yPos,
        head: [['TOTAL GENERAL', '', '', '', `$${totalVenta.toFixed(2)}`, `$${totalGanancia.toFixed(2)}`, `${margenGlobal.toFixed(1)}%`]],
        theme: 'plain',
        headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' }
    });

    doc.save("Ventas_Por_Marca.pdf");
  };

  // --- EXPORTAR PDF (Plano) ---
  const exportarPDFPlano = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reporte General de Ventas", 14, 20);
    doc.setFontSize(9);
    doc.text(`Total Ventas: $${totalVenta.toLocaleString()} | Profit: $${totalGanancia.toLocaleString()}`, 14, 28);

    autoTable(doc, {
        startY: 35,
        head: [['Fecha', 'Fac', 'Marca', 'Producto', 'Cant', 'Costo T.', 'Total', 'Profit', '%']],
        body: filtered.map(i => [
            format(i.fecha, "dd/MM/yy"),
            i.nro_factura,
            i.marca.substring(0, 10),
            i.producto.substring(0, 20),
            i.cantidad,
            (i.costo_total || 0).toFixed(2),
            (i.total_venta || 0).toFixed(2),
            (i.ganancia || 0).toFixed(2),
            `${(i.margen_porcentaje || 0).toFixed(1)}%`
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 40, 40] }
    });
    doc.save("Ventas_General.pdf");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm font-sans">
      
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Reportes / Financiero</span>
        </div>
        
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("h-8 w-[240px] justify-start text-left font-normal text-xs", !fechaInicio && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {fechaInicio ? (fechaFin ? `${format(fechaInicio, "dd/MM/yy")} - ${format(fechaFin, "dd/MM/yy")}` : format(fechaInicio, "dd/MM/yy")) : <span>Seleccionar fechas</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="range" selected={{ from: fechaInicio, to: fechaFin }} onSelect={(range) => { setFechaInicio(range?.from); setFechaFin(range?.to); }} initialFocus numberOfMonths={2} />
                </PopoverContent>
            </Popover>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold shadow-sm">
                        <Printer className="mr-2 h-3.5 w-3.5" /> Exportar <ChevronDown className="ml-2 h-3 w-3 opacity-50"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Formatos</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportarPDFAgrupado}><Tag className="mr-2 h-4 w-4" /> PDF Agrupado por Marcas</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportarPDFPlano}><FileText className="mr-2 h-4 w-4" /> PDF Listado General</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportarExcel}><Download className="mr-2 h-4 w-4 text-green-600" /> Excel (.xlsx)</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ventas Totales</p>
                <h2 className="text-2xl font-bold text-slate-800 mt-1">${totalVenta.toLocaleString('en-US', {minimumFractionDigits: 2})}</h2></div>
                <div className="mt-2"><Badge className="bg-blue-50 text-blue-700 border-0">FACTURADO</Badge></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Costo Mercancía</p>
                <h2 className="text-2xl font-bold text-slate-800 mt-1">${totalCosto.toLocaleString('en-US', {minimumFractionDigits: 2})}</h2></div>
                <div className="mt-2"><Badge className="bg-orange-50 text-orange-700 border-0">COSTO TOTAL</Badge></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ganancia Neta</p>
                <h2 className="text-2xl font-bold text-green-700 mt-1">${totalGanancia.toLocaleString('en-US', {minimumFractionDigits: 2})}</h2></div>
                <div className="mt-2"><Badge className="bg-green-50 text-green-700 border-0">PROFIT REAL</Badge></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Global</p>
                <h2 className="text-2xl font-bold text-purple-700 mt-1">{margenGlobal.toFixed(2)}%</h2></div>
                <div className="mt-2"><Badge className="bg-purple-50 text-purple-700 border-0">RENTABILIDAD</Badge></div>
            </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-500 mr-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Filtrar:</span>
                </div>
                
                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                    <SelectTrigger className="h-8 w-40 text-xs"><User className="mr-2 h-3 w-3"/> <SelectValue placeholder="Vendedor" /></SelectTrigger>
                    <SelectContent><SelectItem value="TODOS">Todos Vendedores</SelectItem>{vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroMarca} onValueChange={setFiltroMarca}>
                    <SelectTrigger className="h-8 w-40 text-xs"><Tag className="mr-2 h-3 w-3"/> <SelectValue placeholder="Marca" /></SelectTrigger>
                    <SelectContent><SelectItem value="TODAS">Todas las Marcas</SelectItem>{marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger className="h-8 w-40 text-xs"><Layers className="mr-2 h-3 w-3"/> <SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent><SelectItem value="TODAS">Todas las Categorías</SelectItem>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <Switch id="view-mode" checked={vistaAgrupada} onCheckedChange={setVistaAgrupada} />
                <Label htmlFor="view-mode" className="text-xs font-bold text-slate-600 cursor-pointer">Agrupar por Marcas</Label>
            </div>
        </div>

        {/* TABLA DE RESULTADOS */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                            <TableHead className="w-[12%] font-bold text-slate-700 pl-6 text-[10px] uppercase">Fecha / Fact</TableHead>
                            <TableHead className="w-[10%] font-bold text-slate-700 text-[10px] uppercase">Marca</TableHead>
                            <TableHead className="w-[28%] font-bold text-slate-700 text-[10px] uppercase">Producto</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[10px] uppercase">Cant</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[10px] uppercase text-orange-600 bg-orange-50/20">Costo T. ($)</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[10px] uppercase text-blue-600 bg-blue-50/20">Venta ($)</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[10px] uppercase text-green-700 bg-green-50/20">Ganancia ($)</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[10px] uppercase text-purple-700 bg-purple-50/20 pr-6">Margen (%)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">Procesando ventas...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="h-32 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <AlertCircle className="h-8 w-8 text-slate-300"/>
                                    <span>No hay datos con los filtros actuales.</span>
                                </div>
                            </TableCell></TableRow>
                        ) : (
                            vistaAgrupada ? (
                                marcas.filter(m => filtroMarca === "TODAS" || m === filtroMarca).map(marca => {
                                    const itemsMarca = filtered.filter(i => i.marca === marca);
                                    if (itemsMarca.length === 0) return null;
                                    
                                    const subVenta = itemsMarca.reduce((acc, i) => acc + (i.total_venta || 0), 0);
                                    const subGanancia = itemsMarca.reduce((acc, i) => acc + (i.ganancia || 0), 0);
                                    const subMargen = subVenta > 0 ? (subGanancia / subVenta) * 100 : 0;
                                    
                                    return (
                                        <>
                                            <TableRow key={`header-${marca}`} className="bg-slate-100 hover:bg-slate-100">
                                                <TableCell colSpan={5} className="font-bold text-slate-800 pl-6 py-2">{marca}</TableCell>
                                                <TableCell className="text-right font-bold text-blue-700">${subVenta.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold text-green-700">${subGanancia.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold text-purple-700 pr-6">{subMargen.toFixed(1)}%</TableCell>
                                            </TableRow>
                                            {itemsMarca.map((item) => (
                                                <TableRow key={item.id_detalle} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                    <TableCell className="pl-6 py-2 text-xs text-slate-500">
                                                        <div>{format(item.fecha, "dd/MM")}</div>
                                                        <div className="font-mono text-[9px] flex items-center gap-1">
                                                            {item.estado === 'BORRADOR' && <Badge variant="outline" className="text-[8px] h-3 px-1 border-yellow-400 text-yellow-600">BOR</Badge>}
                                                            {item.nro_factura}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">{item.marca}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-700">
                                                        {item.producto}
                                                        <div className="text-[9px] text-slate-400">{item.codigo}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-bold">{item.cantidad}</TableCell>
                                                    <TableCell className="text-right text-xs font-mono text-orange-600 bg-orange-50/20">
                                                        ${(item.costo_total || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono font-bold text-blue-700 bg-blue-50/20">${(item.total_venta || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-xs font-mono font-bold text-green-700 bg-green-50/20">
                                                        ${(item.ganancia || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono font-bold text-purple-700 bg-purple-50/20 pr-6">
                                                        {(item.margen_porcentaje || 0).toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    );
                                })
                            ) : (
                                filtered.map((item) => (
                                    <TableRow key={item.id_detalle} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <TableCell className="pl-6 py-2 text-xs text-slate-500">
                                            <div>{format(item.fecha, "dd/MM/yy")}</div>
                                            <div className="font-mono text-[9px] flex items-center gap-1">
                                                {item.estado === 'BORRADOR' && <Badge variant="outline" className="text-[8px] h-3 px-1 border-yellow-400 text-yellow-600">BOR</Badge>}
                                                {item.nro_factura}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">{item.marca}</TableCell>
                                        <TableCell className="text-xs font-medium text-slate-700">
                                            {item.producto}
                                            <div className="text-[9px] text-slate-400">{item.codigo}</div>
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-bold">{item.cantidad}</TableCell>
                                        <TableCell className="text-right text-xs font-mono text-orange-600 bg-orange-50/20">
                                            ${(item.costo_total || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-mono font-bold text-blue-700 bg-blue-50/20">${(item.total_venta || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs font-mono font-bold text-green-700 bg-green-50/20">
                                            ${(item.ganancia || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-mono font-bold text-purple-700 bg-purple-50/20 pr-6">
                                            {(item.margen_porcentaje || 0).toFixed(1)}%
                                        </TableCell>
                                    </TableRow>
                                ))
                            )
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <div className="bg-slate-50 border-t border-slate-100 p-3 px-6 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {filtered.length} transacciones encontradas
                </span>
            </div>
        </div>
      </main>
    </div>
  );
}