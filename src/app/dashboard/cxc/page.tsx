"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  RefreshCcw, Wallet, Clock, Filter,
  Search, Download, FileSpreadsheet, FileText, Users, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, 
  DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card"; 

import * as XLSX from 'xlsx'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";

// --- TIPOS ---
// 👇 ACTUALIZADO: Expandimos las opciones para que TypeScript no se queje
interface VendedorData {
    nombre?: string; 
    apellido?: string; 
    nombres?: string;
    apellidos?: string;
    nombre_completo?: string;
    nombre_apellido?: string;
    email?: string;
    usuario?: string;
    username?: string;
    razon_social?: string;
}

interface FacturaCXC {
  id_factura: string;
  numero_control: string;
  numero_consecutivo: number;
  serie: string;
  cliente: { 
      id_cliente: string; 
      razon_social: string; 
      rif: string;
      vendedor?: VendedorData;
  };
  vendedor?: VendedorData; 
  total_pagar: string;
  monto_pagado: string;
  saldo_pendiente: string;
  fecha_emision: string;
  fecha_vencimiento: string; 
}

export default function CuentasPorCobrarPage() {
  const idEmpresa = getEmpresaId();
  const [loading, setLoading] = useState(false);
  const [facturas, setFacturas] = useState<FacturaCXC[]>([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [filterVendedor, setFilterVendedor] = useState("TODOS"); 

  // --- CARGA DE DATOS ---
  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/facturas?id_empresa=${idEmpresa}`);
      const conDeuda = res.data.filter((f: any) => Number(f.saldo_pendiente) > 0.01);
      setFacturas(conDeuda);
    } catch (error) {
      toast.error("Error cargando cartera");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (idEmpresa) fetchFacturas();
  }, [idEmpresa]);

  // --- HELPERS ---
  // 👇 ACTUALIZADO: Lógica blindada para leer el nombre sin importar cómo venga de la BD
  const getNombreVendedor = (f: FacturaCXC): string | null => {
      // Forzamos a 'any' internamente para evitar que TypeScript bloquee propiedades dinámicas
      const v: any = f.vendedor || f.cliente?.vendedor;
      if (!v) return null;

      // 1. Intentamos armarlo si vienen separados
      if (v.nombre && v.apellido) return `${v.nombre} ${v.apellido}`.trim();
      if (v.nombres && v.apellidos) return `${v.nombres} ${v.apellidos}`.trim();

      // 2. Intentamos buscar la propiedad única (la primera que exista)
      return (
        v.nombre_completo ||
        v.nombre_apellido ||
        v.nombre ||
        v.nombres ||
        v.usuario ||
        v.username ||
        v.email ||
        v.razon_social ||
        null
      );
  };

  const calcularEstado = (vencimiento: string) => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const fechaVenc = new Date(vencimiento);
    fechaVenc.setHours(0,0,0,0);
    const diffTime = fechaVenc.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { diffDays };
  };

  const clasificarDeuda = (f: FacturaCXC) => {
    const saldo = Number(f.saldo_pendiente);
    const { diffDays } = calcularEstado(f.fecha_vencimiento);
    // Nota: diffDays positivo = falta para vencer (No Vencido)
    // diffDays negativo = vencido hace X días
    const diasVencidos = diffDays < 0 ? Math.abs(diffDays) : 0;

    return {
        saldo,
        noVencido: diffDays >= 0 ? saldo : 0,
        d0_30: diasVencidos > 0 && diasVencidos <= 30 ? saldo : 0,
        d30_60: diasVencidos > 30 && diasVencidos <= 60 ? saldo : 0,
        d60_90: diasVencidos > 60 && diasVencidos <= 90 ? saldo : 0,
        dMas90: diasVencidos > 90 ? saldo : 0,
    };
  };

  const formatearMoneda = (valor: number) => {
      return valor === 0 ? '-' : valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- FILTROS ---
  const vendedoresUnicos = useMemo(() => {
    const nombres = facturas
        .map(f => getNombreVendedor(f))
        .filter((nombre): nombre is string => !!nombre && nombre !== "");
    return Array.from(new Set(nombres));
  }, [facturas]);

  const facturasFiltradas = facturas.filter((f) => {
    const matchesSearch = 
        f.cliente.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cliente.rif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.numero_consecutivo.toString().includes(searchTerm);
    const nombreVendedor = getNombreVendedor(f);
    const matchesVendedor = filterVendedor === "TODOS" || nombreVendedor === filterVendedor;
    return matchesSearch && matchesVendedor;
  });

  // --- KPIS ---
  const kpiCXC = useMemo(() => {
      const totalDeuda = facturas.reduce((acc, f) => acc + Number(f.saldo_pendiente), 0);
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      const totalVencido = facturas.reduce((acc, f) => {
          const fechaVenc = new Date(f.fecha_vencimiento);
          fechaVenc.setHours(0,0,0,0);
          return fechaVenc < hoy ? acc + Number(f.saldo_pendiente) : acc;
      }, 0);
      const clientesActivos = new Set(facturas.map(f => f.cliente.id_cliente)).size;
      return { totalDeuda, totalVencido, clientesActivos };
  }, [facturas]);

  // --- REPORTES ---
  const exportarExcel = () => {
    if (facturasFiltradas.length === 0) return toast.error("No hay datos");
    const dataExport = facturasFiltradas.map(f => {
        const aging = clasificarDeuda(f);
        return {
            "Factura": `${f.serie}-${f.numero_consecutivo}`,
            "Cliente": f.cliente.razon_social,
            "Vendedor": getNombreVendedor(f),
            "Emisión": new Date(f.fecha_emision).toLocaleDateString(),
            "Vencimiento": new Date(f.fecha_vencimiento).toLocaleDateString(),
            "Por Vencer": aging.noVencido,
            "0-30 Días": aging.d0_30,
            "30-60 Días": aging.d30_60,
            "60-90 Días": aging.d60_90,
            "> 90 Días": aging.dMas90,
            "Saldo Total": aging.saldo
        };
    });
    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aging Global");
    XLSX.writeFile(wb, `Aging_Global_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarPDFGlobal = () => {
    if (facturasFiltradas.length === 0) return toast.error("No hay datos");
    const doc = new jsPDF('p', 'mm', 'a4'); 
    const fechaReporte = new Date().toLocaleDateString();
    
    doc.setFontSize(14); doc.text("ANALISIS DE VENCIMIENTOS (GLOBAL)", 14, 15);
    doc.setFontSize(10); doc.text(`Al: ${fechaReporte}`, 14, 22);

    const tableBody = facturasFiltradas.map(f => {
        const aging = clasificarDeuda(f);
        return [
            `${f.serie}-${f.numero_consecutivo}`,
            f.cliente.razon_social.substring(0, 25),
            new Date(f.fecha_vencimiento).toLocaleDateString(),
            formatearMoneda(aging.noVencido),
            formatearMoneda(aging.d0_30),
            formatearMoneda(aging.d30_60),
            formatearMoneda(aging.d60_90),
            formatearMoneda(aging.dMas90),
            formatearMoneda(aging.saldo)
        ];
    });

    // Totales
    const totales = facturasFiltradas.reduce((acc, f) => {
        const aging = clasificarDeuda(f);
        return {
            no: acc.no + aging.noVencido, d0: acc.d0 + aging.d0_30, d30: acc.d30 + aging.d30_60,
            d60: acc.d60 + aging.d60_90, d90: acc.d90 + aging.dMas90, sal: acc.sal + aging.saldo
        };
    }, { no:0, d0:0, d30:0, d60:0, d90:0, sal:0 });

    tableBody.push(["", "TOTALES:", "", formatearMoneda(totales.no), formatearMoneda(totales.d0), formatearMoneda(totales.d30), formatearMoneda(totales.d60), formatearMoneda(totales.d90), formatearMoneda(totales.sal)]);

    autoTable(doc, {
        startY: 30,
        head: [['Fact.', 'Cliente', 'Vence', 'No Venc.', '0-30', '30-60', '60-90', '>90', 'Total']],
        body: tableBody,
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 1, halign: 'right' },
        columnStyles: { 0: { halign: 'left', cellWidth: 15 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 16 } },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, halign: 'center', fontSize: 7 },
        didParseCell: (data) => { if (data.row.index === tableBody.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [240, 240, 240]; } }
    });
    doc.save(`Analisis_Global_${fechaReporte}.pdf`);
  };

  const exportarPDFPorVendedor = () => {
    if (facturasFiltradas.length === 0) return toast.error("No hay datos");
    const doc = new jsPDF('p', 'mm', 'a4');
    const fechaReporte = new Date().toLocaleDateString();
    doc.setFontSize(14); doc.text("ANALISIS POR VENDEDOR", 14, 15);
    doc.setFontSize(10); doc.text(`Al: ${fechaReporte}`, 14, 22);

    const vendedores = Array.from(new Set(facturasFiltradas.map(f => getNombreVendedor(f) || "Sin Asignar")));
    let finalY = 25;

    vendedores.forEach((vendedor, index) => {
        if (index > 0 && finalY > 250) { doc.addPage(); finalY = 20; }
        const facturasVendedor = facturasFiltradas.filter(f => (getNombreVendedor(f) || "Sin Asignar") === vendedor);
        
        const totalesV = facturasVendedor.reduce((acc, f) => {
            const aging = clasificarDeuda(f);
            return {
                no: acc.no + aging.noVencido, d0: acc.d0 + aging.d0_30, d30: acc.d30 + aging.d30_60,
                d60: acc.d60 + aging.d60_90, d90: acc.d90 + aging.dMas90, sal: acc.sal + aging.saldo
            };
        }, { no:0, d0:0, d30:0, d60:0, d90:0, sal:0 });

        const bodyV = facturasVendedor.map(f => {
            const aging = clasificarDeuda(f);
            return [`${f.serie}-${f.numero_consecutivo}`, f.cliente.razon_social.substring(0, 25), new Date(f.fecha_vencimiento).toLocaleDateString(), formatearMoneda(aging.noVencido), formatearMoneda(aging.d0_30), formatearMoneda(aging.d30_60), formatearMoneda(aging.d60_90), formatearMoneda(aging.dMas90), formatearMoneda(aging.saldo)];
        });

        doc.setFontSize(11); doc.setTextColor(0,0,0); doc.text(`VENDEDOR: ${vendedor.toUpperCase()}`, 14, finalY + 8);
        autoTable(doc, {
            startY: finalY + 10,
            head: [['Fact.', 'Cliente', 'Vence', 'No Venc.', '0-30', '30-60', '60-90', '>90', 'Total']],
            body: bodyV,
            foot: [['TOTAL', '', '', formatearMoneda(totalesV.no), formatearMoneda(totalesV.d0), formatearMoneda(totalesV.d30), formatearMoneda(totalesV.d60), formatearMoneda(totalesV.d90), formatearMoneda(totalesV.sal)]],
            theme: 'plain',
            styles: { fontSize: 7, halign: 'right', cellPadding: 1 },
            columnStyles: { 0: { halign: 'left', cellWidth: 15 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 16 } },
            headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [200, 200, 200] },
            footStyles: { fontStyle: 'bold', textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0,0,0] },
            margin: { top: 10, bottom: 20 }
        });
        // @ts-ignore
        finalY = doc.lastAutoTable.finalY + 5;
    });
    doc.save(`Analisis_Vendedor_${fechaReporte}.pdf`);
  };

  const exportarPDFResumen = () => {
    if (facturasFiltradas.length === 0) return toast.error("No hay datos");
    const doc = new jsPDF('p', 'mm', 'a4');
    const fechaReporte = new Date().toLocaleDateString();
    doc.setFontSize(14); doc.text("RESUMEN DE SALDOS POR VENDEDOR", 14, 15);
    doc.setFontSize(10); doc.text(`Al: ${fechaReporte}`, 14, 22);

    const vendedores = Array.from(new Set(facturasFiltradas.map(f => getNombreVendedor(f) || "Sin Asignar")));
    const tableBody = vendedores.map(v => {
        const facturasV = facturasFiltradas.filter(f => (getNombreVendedor(f) || "Sin Asignar") === v);
        const t = facturasV.reduce((acc, f) => {
            const aging = clasificarDeuda(f);
            return {
                no: acc.no + aging.noVencido, d0: acc.d0 + aging.d0_30, d30: acc.d30 + aging.d30_60,
                d60: acc.d60 + aging.d60_90, d90: acc.d90 + aging.dMas90, sal: acc.sal + aging.saldo
            };
        }, { no:0, d0:0, d30:0, d60:0, d90:0, sal:0 });
        return [v.toUpperCase(), formatearMoneda(t.no), formatearMoneda(t.d0), formatearMoneda(t.d30), formatearMoneda(t.d60), formatearMoneda(t.d90), formatearMoneda(t.sal)];
    });

    autoTable(doc, {
        startY: 30,
        head: [['Vendedor', 'No Vencido', '0-30', '30-60', '60-90', '> 90', 'Total']],
        body: tableBody,
        theme: 'plain',
        styles: { fontSize: 8, halign: 'right', cellPadding: 2 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, halign: 'center' },
    });
    doc.save(`Resumen_Saldos_${fechaReporte}.pdf`);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      
      {/* HEADER */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finanzas / Cuentas por Cobrar</span>
        </div>

        <div className="flex gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <Download className="mr-2 h-3.5 w-3.5" /> Exportar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Formato Excel</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportarExcel}><FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Aging Global</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Reportes PDF</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportarPDFGlobal}><FileText className="mr-2 h-4 w-4 text-red-600" /> Vencimiento Global</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportarPDFPorVendedor}><FileText className="mr-2 h-4 w-4 text-red-600" /> Detalle por Vendedor</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportarPDFResumen}><BarChart3 className="mr-2 h-4 w-4 text-blue-600" /> Resumen Saldos</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={fetchFacturas}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
            </Button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6">
        
        {/* KPI SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Deuda Total</p>
                        <h2 className="text-2xl font-bold text-slate-800 mt-1">${kpiCXC.totalDeuda.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                    </div>
                    <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100"><Wallet className="h-5 w-5 text-blue-600" /></div>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Vencido</p>
                        <h2 className="text-2xl font-bold text-red-600 mt-1">${kpiCXC.totalVencido.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                    </div>
                    <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center border border-red-100"><Clock className="h-5 w-5 text-red-600" /></div>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clientes con Deuda</p>
                        <h2 className="text-2xl font-bold text-slate-800 mt-1">{kpiCXC.clientesActivos}</h2>
                    </div>
                    <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100"><Users className="h-5 w-5 text-emerald-600" /></div>
                </CardContent>
            </Card>
        </div>

        {/* TABLA Y FILTROS */}
        <div className="space-y-4">
            <div className="flex gap-2 items-center bg-white p-1.5 rounded-xl border shadow-sm w-fit">
                <div className="flex items-center px-2 bg-slate-50 rounded-lg border border-transparent focus-within:border-slate-300 focus-within:bg-white transition-all">
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input placeholder="Cliente, RIF o N°..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 focus-visible:ring-0 h-9 w-48 text-xs bg-transparent" />
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400 ml-1" />
                    <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                        <SelectTrigger className="w-[180px] h-9 text-xs border-0 focus:ring-0 bg-transparent shadow-none hover:bg-slate-50"><SelectValue placeholder="Filtrar por Vendedor" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODOS">Todos los Vendedores</SelectItem>
                            {vendedoresUnicos.map((vendedor) => (<SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold text-[11px] uppercase">Factura</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase">Cliente</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase">Vendedor</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase text-center">Emisión</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase text-center">Vencimiento</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase text-center">Estado</TableHead>
                            <TableHead className="text-right font-bold text-[11px] uppercase">Total</TableHead>
                            <TableHead className="text-right font-bold text-[11px] uppercase">Saldo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {facturasFiltradas.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400 text-xs">No se encontraron facturas</TableCell></TableRow>
                        ) : (
                            facturasFiltradas.map((f) => {
                                const { diffDays } = calcularEstado(f.fecha_vencimiento);
                                const nombreVendedor = getNombreVendedor(f);
                                return (
                                  <TableRow key={f.id_factura} className="hover:bg-slate-50">
                                      <TableCell className="text-xs font-mono font-bold">{f.serie}-{f.numero_consecutivo}</TableCell>
                                      <TableCell className="text-xs">
                                          <div className="flex flex-col">
                                              <span>{f.cliente.razon_social}</span>
                                              <span className="text-[10px] text-slate-400">{f.cliente.rif}</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-xs text-slate-600">{nombreVendedor ? <span className="font-medium text-slate-700">{nombreVendedor}</span> : <span className="text-slate-300 italic">Sin asignar</span>}</TableCell>
                                      <TableCell className="text-xs text-center text-slate-500">{new Date(f.fecha_emision).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-xs text-center font-bold text-slate-700">{new Date(f.fecha_vencimiento).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-center">
                                        {diffDays < 0 ? <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">Vencida hace {Math.abs(diffDays)} días</Badge> : 
                                         diffDays === 0 ? <Badge className="text-[10px] h-5 px-1.5 font-bold bg-amber-500 text-white border-none">Vence hoy</Badge> : 
                                         <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Faltan {diffDays} días</span>}
                                      </TableCell>
                                      <TableCell className="text-right text-xs font-mono text-slate-500">${Number(f.total_pagar).toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-xs font-mono font-bold text-red-600">${Number(f.saldo_pendiente).toFixed(2)}</TableCell>
                                  </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </main>
    </div>
  );
}