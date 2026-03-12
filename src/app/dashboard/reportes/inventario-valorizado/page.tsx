"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Filter, Download, RefreshCcw, Package, 
  FileDown, Printer, AlertTriangle, X, Layers, Tag,
  FileText, ChevronDown, AlignLeft, ClipboardList, Box
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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

interface ReporteItem {
    id_producto: string;
    codigo: string;
    nombre: string;
    categoria: string;
    marca: string;
    stock: number;           // ← stock_total del backend
    stock_disponible: number;
    stock_apartado: number;
    costo_promedio: number;  // ← costo_unitario del backend
  }

export default function InventarioValorizadoPage() {
  const [data, setData] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroMarca, setFiltroMarca] = useState<string>("TODAS");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [verStockCero, setVerStockCero] = useState(false);

  const idEmpresa = getEmpresaId();

  const marcas = useMemo(() => Array.from(new Set(data.map(i => i.marca).filter(Boolean))).sort(), [data]);
  const categorias = useMemo(() => Array.from(new Set(data.map(i => i.categoria).filter(Boolean))).sort(), [data]);

  const fetchData = async () => {
    if (!idEmpresa) return;
    try {
      setLoading(true);
      const res = await api.get(`/productos/inventario-valorizado`, {
        params: { id_empresa: idEmpresa },
      });
  
      const itemsMapeados = res.data.map((p: any) => ({
        id_producto:      p.id_producto,
        codigo:           p.codigo,
        nombre:           p.nombre,
        categoria:        p.categoria ?? "Sin Categoría",
        marca:            p.marca     ?? "Genérico",
        stock:            Number(p.stock_total),
        stock_disponible: Number(p.stock_disponible),
        stock_apartado:   Number(p.stock_apartado),
        costo_promedio:   Number(p.costo_unitario),
      }));
  
      setData(itemsMapeados);
    } catch (error) {
      toast.error("Error obteniendo datos del inventario");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [idEmpresa]);

  const filtered = data.filter(item => {
    const coincideTexto = item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          item.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideMarca = filtroMarca === "TODAS" || item.marca === filtroMarca;
    const coincideCategoria = filtroCategoria === "TODAS" || item.categoria === filtroCategoria;
    const coincideStock = verStockCero ? true : item.stock > 0;

    return coincideTexto && coincideMarca && coincideCategoria && coincideStock;
  });

  const totalCostoInventario = filtered.reduce((acc, item) => acc + (item.stock * item.costo_promedio), 0);
  const totalItems = filtered.reduce((acc, item) => acc + item.stock, 0);

  // --- EXCEL ---
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(i => ({
        "Código": i.codigo,
        "Marca": i.marca,
        "Producto": i.nombre,
        "Categoría": i.categoria,
        "Stock": i.stock,
        "Costo Unit.": i.costo_promedio,
        "Total Costo": i.stock * i.costo_promedio
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario_Costos");
    XLSX.writeFile(wb, `Inventario_Costos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- PDF GENERATORS ---

  // 1. REPORTE DETALLADO (Agrupado por Marcas)
  const generarPDFDetallado = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text("Inventario Detallado (Costos)", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha} | Items: ${totalItems} | Valor Total: $${totalCostoInventario.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 14, 28);

    const marcasUnicas = Array.from(new Set(filtered.map(i => i.marca))).sort();
    let yPos = 35;

    marcasUnicas.forEach((marca) => {
        const itemsMarca = filtered.filter(i => i.marca === marca);
        const subtotalCosto = itemsMarca.reduce((acc, i) => acc + (i.stock * i.costo_promedio), 0);

        autoTable(doc, {
            startY: yPos,
            head: [[`${marca.toUpperCase()}  (${itemsMarca.length} items) - Subtotal: $${subtotalCosto.toLocaleString('en-US', {minimumFractionDigits: 2})}`]],
            theme: 'plain',
            styles: { fontSize: 10, fontStyle: 'bold', fillColor: [245, 245, 245], cellPadding: 2 },
            margin: { left: 14 }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY;

        autoTable(doc, {
            startY: yPos,
            head: [['Código', 'Producto', 'Cat', 'Stock', 'Costo', 'Total']],
            body: itemsMarca.map(i => [
                i.codigo,
                i.nombre,
                i.categoria,
                i.stock,
                `$${i.costo_promedio.toFixed(2)}`,
                `$${(i.stock * i.costo_promedio).toFixed(2)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [50, 60, 70], textColor: 255, fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14 }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 5;
    });

    doc.save(`Inventario_Detallado_${fecha.replace(/\//g, '-')}.pdf`);
  };

  // 2. RESUMEN EJECUTIVO (Por Marca o Categoría)
  const generarResumenEjecutivo = (tipo: 'MARCA' | 'CATEGORIA') => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();
    const titulo = tipo === 'MARCA' ? "Resumen de Costos por Marca" : "Resumen de Costos por Categoría";
    
    doc.setFontSize(18);
    doc.text(titulo, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha} | Valor Total Inventario: $${totalCostoInventario.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 14, 28);

    // Agrupar datos
    const grupos: Record<string, { items: number, costo: number }> = {};
    
    filtered.forEach(item => {
        const key = tipo === 'MARCA' ? item.marca : item.categoria;
        if (!grupos[key]) grupos[key] = { items: 0, costo: 0 };
        grupos[key].items += item.stock;
        grupos[key].costo += (item.stock * item.costo_promedio);
    });

    const filas = Object.entries(grupos)
        .sort((a, b) => b[1].costo - a[1].costo) // Ordenar por costo descendente
        .map(([key, val]) => [
            key,
            val.items,
            `$${val.costo.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
            `${((val.costo / totalCostoInventario) * 100).toFixed(1)}%` // Participación
        ]);

    autoTable(doc, {
        startY: 35,
        head: [[tipo === 'MARCA' ? 'Marca' : 'Categoría', 'Total Items', 'Valor Costo', '% Participación']],
        body: filas,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { fontSize: 10 },
        foot: [['TOTAL GENERAL', totalItems, `$${totalCostoInventario.toLocaleString('en-US', {minimumFractionDigits: 2})}`, '100%']],
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
    });

    doc.save(`Resumen_${tipo}_${fecha.replace(/\//g, '-')}.pdf`);
  };

  // 3. 🟢 NUEVO: HOJA DE TOMA FÍSICA (CONTEO)
  const generarHojaConteo = (esCiego: boolean) => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();
    
    // Encabezado Profesional
    doc.setFontSize(16);
    doc.text(esCiego ? "HOJA DE TOMA FÍSICA (AUDITORÍA CIEGA)" : "HOJA DE VERIFICACIÓN DE EXISTENCIAS", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Fecha de Corte: ${fecha} ${hora}`, 14, 30);
    doc.text(`Filtro: ${filtroMarca !== 'TODAS' ? filtroMarca : 'Inventario General'}`, 14, 35);
    
    if (esCiego) {
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(9);
        doc.text("*** CANTIDADES DEL SISTEMA OCULTAS PARA CONTEO ***", 105, 30, { align: "center" });
        doc.setTextColor(0, 0, 0);
    }

    const columnas = esCiego 
        ? ['Código', 'Marca', 'Producto / Descripción', 'CONTEO FÍSICO (Unidades)']
        : ['Código', 'Marca', 'Producto / Descripción', 'Stock Sistema', 'Diferencia (+/-)'];

    const cuerpo = filtered.map(i => [
        i.codigo,
        i.marca,
        i.nombre,
        esCiego ? '' : i.stock, // Si es ciego, vacio. Si no, muestra stock.
        '' // Espacio vacio para escribir
    ]);

    autoTable(doc, {
        startY: 40,
        head: [columnas],
        body: cuerpo,
        theme: 'grid',
        headStyles: { 
            fillColor: [20, 20, 20], 
            textColor: 255, 
            halign: 'center',
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 30 }, 
            1: { cellWidth: 35 }, 
            2: { cellWidth: 'auto' }, 
            3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }, 
            4: { cellWidth: 35 } 
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 4, // Más padding para facilitar escritura
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            minCellHeight: 12 // Filas más altas para escribir cómodo
        },
    });

    // Pie de página para firmas
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 30;
    
    if (finalY < 250) {
        doc.setLineWidth(0.5);
        doc.line(30, finalY, 90, finalY); 
        doc.text("Firma del Almacenista", 60, finalY + 5, { align: "center" });
        
        doc.line(120, finalY, 180, finalY);
        doc.text("Firma del Auditor", 150, finalY + 5, { align: "center" });
    }

    doc.save(`Toma_Fisica_${esCiego ? 'CIEGA_' : ''}${fecha.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm font-sans">
      
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Reportes / Valoración</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchData}>
                <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Recargar
            </Button>
            
            {/* MENÚ DESPLEGABLE DE EXPORTACIÓN */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase shadow-sm">
                        <Printer className="mr-2 h-3.5 w-3.5" /> Generar Reporte <ChevronDown className="ml-2 h-3 w-3 opacity-50"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase">Formatos Financieros</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => generarResumenEjecutivo('MARCA')} className="cursor-pointer">
                        <Tag className="mr-2 h-4 w-4 text-blue-500" /> Resumen por Marcas
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => generarResumenEjecutivo('CATEGORIA')} className="cursor-pointer">
                        <Layers className="mr-2 h-4 w-4 text-purple-500" /> Resumen por Categoría
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={generarPDFDetallado} className="cursor-pointer">
                        <FileText className="mr-2 h-4 w-4 text-slate-600" /> Valoración Detallada
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase">Logística & Almacén</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* 🟢 NUEVAS OPCIONES DE CONTEO */}
                    <DropdownMenuItem onClick={() => generarHojaConteo(true)} className="cursor-pointer">
                        <ClipboardList className="mr-2 h-4 w-4 text-orange-600" /> Hoja de Toma Física (Ciega)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => generarHojaConteo(false)} className="cursor-pointer">
                        <Box className="mr-2 h-4 w-4 text-slate-600" /> Hoja de Verificación
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={exportarExcel} className="cursor-pointer">
                        <FileDown className="mr-2 h-4 w-4 text-green-600" /> Descargar Excel
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Package className="h-16 w-16 text-blue-600" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Total Inventario</p>
                    <h2 className="text-2xl font-bold text-slate-800 mt-1">${totalCostoInventario.toLocaleString('en-US', {minimumFractionDigits: 2})}</h2>
                </div>
                <div className="mt-4">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] font-bold">COSTO BASE</Badge>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Layers className="h-16 w-16 text-slate-600" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidades en Existencia</p>
                    <h2 className="text-2xl font-bold text-slate-800 mt-1">{totalItems.toLocaleString()}</h2>
                </div>
                <div className="mt-4">
                     <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">TOTAL ITEMS</Badge>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Tag className="h-16 w-16 text-purple-600" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referencias Distintas</p>
                    <h2 className="text-2xl font-bold text-slate-800 mt-1">{filtered.length}</h2>
                </div>
                 <div className="mt-4">
                     <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 text-[10px] font-bold">SKUs ACTIVOS</Badge>
                </div>
            </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-500 mr-2">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Filtros:</span>
            </div>

            <div className="w-40">
                <Select value={filtroMarca} onValueChange={setFiltroMarca}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Marca" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODAS">Todas las Marcas</SelectItem>
                        {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-40">
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODAS">Todas las Categorías</SelectItem>
                        {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="relative flex-1 min-w-[200px]">
                <Input 
                    placeholder="Buscar producto..." 
                    className="h-8 pl-3 bg-slate-50 text-xs border-slate-200 focus-visible:ring-blue-500"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button 
                variant={verStockCero ? "default" : "outline"} 
                size="sm" 
                className={verStockCero ? "bg-slate-800 text-white h-8 text-xs font-bold" : "h-8 text-xs font-bold text-slate-500"}
                onClick={() => setVerStockCero(!verStockCero)}
            >
                {verStockCero ? <X className="mr-2 h-3.5 w-3.5" /> : <AlertTriangle className="mr-2 h-3.5 w-3.5" />}
                {verStockCero ? "Ocultar Agotados" : "Ver Stock 0"}
            </Button>
        </div>

        {/* TABLA DETALLE */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                            <TableHead className="w-[35%] font-bold text-slate-700 pl-6 text-[11px] uppercase">Producto / Código</TableHead>
                            <TableHead className="w-[15%] font-bold text-slate-700 text-[11px] uppercase">Marca</TableHead>
                            <TableHead className="w-[15%] font-bold text-slate-700 text-[11px] uppercase">Categoría</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[11px] uppercase">Stock</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[11px] uppercase text-blue-600 bg-blue-50/30">Costo Unit.</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 text-[11px] uppercase text-blue-700 bg-blue-50/50 pr-6">Total Costo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">Cargando datos...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">No hay datos que coincidan.</TableCell></TableRow>
                        ) : (
                            filtered.map((item) => (
                                <TableRow key={item.id_producto} className="group border-b border-slate-50 hover:bg-slate-50/50">
                                    <TableCell className="pl-6 py-2">
                                        <div className="font-bold text-slate-700 text-xs">{item.nombre}</div>
                                        <div className="font-mono text-[10px] text-slate-400">{item.codigo}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-normal text-slate-600 border-slate-200 bg-slate-50">
                                            {item.marca}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            {item.categoria}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.stock <= 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-700"}`}>
                                            {item.stock}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`text-right font-mono text-xs bg-blue-50/10 ${item.costo_promedio === 0 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                        ${item.costo_promedio.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-blue-700 bg-blue-50/30 pr-6">
                                        ${(item.stock * item.costo_promedio).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <div className="bg-slate-50 border-t border-slate-100 p-3 px-6 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Mostrando {filtered.length} productos
                </span>
                <div className="flex gap-6">
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Costo</span>
                        <span className="text-sm font-bold text-slate-800">${totalCostoInventario.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}