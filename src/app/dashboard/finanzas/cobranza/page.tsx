"use client";

import { useEffect, useState } from "react";
import { 
  Search, Plus, FileText, CheckCircle2, 
  XCircle, Eye, RefreshCcw, DollarSign, User, FileSpreadsheet, Download,
  Trash2 // 👈 Añadido icono para anular
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";

// --- TIPOS ---
interface Cliente {
    id_cliente: string;
    razon_social: string;
    rif: string;
}

interface CobranzaHistorial {
    id_cobranza: string;
    consecutivo: string;
    fecha_reporte: string;
    monto_total: string;
    cliente: any;   
    vendedor: any;  
    metodos: any;   
    estado: string;
    url_comprobante?: string;
}

interface FacturaPendiente {
    id_factura: string;
    serie: string;
    numero_consecutivo: number;
    saldo_pendiente: string;
    total_pagar: string;
    fecha_emision: string;
}

interface CobranzaPendiente {
  id_cobranza: string;
  consecutivo: string;
  fecha_reporte: string;
  monto_total: string;
  url_comprobante?: string;
  nota_vendedor?: string;
  vendedor: { nombre_completo: string; email: string }; 
  metodos: { metodo: string; monto: string; referencia?: string; banco?: string }[];
  facturas_afectadas: { factura: { serie: string; numero_consecutivo: number }; monto_aplicado: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
// --- SCHEMA REGISTRO MANUAL ---
const manualPaymentSchema = z.object({
    metodo: z.enum(["EFECTIVO_USD", "ZELLE", "PAGO_MOVIL", "TRANSFERENCIA", "PUNTO_VENTA"]),
    referencia: z.string().optional(),
    nota: z.string().optional(),
    monto_recibido: z.string().min(1, "Monto requerido"),
});

export default function GestionCobranzasPage() {
    const idEmpresa = getEmpresaId();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(false);

    // --- ESTADOS TAB 1: HISTORIAL ---
    const [historial, setHistorial] = useState<CobranzaHistorial[]>([]);
    const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
    const [filtroFechaFin, setFiltroFechaFin] = useState("");
    const [filtroTexto, setFiltroTexto] = useState(""); 

    // --- ESTADOS TAB 2: REGISTRO MANUAL ---
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
    const [facturasCliente, setFacturasCliente] = useState<FacturaPendiente[]>([]);
    const [facturasA_Pagar, setFacturasA_Pagar] = useState<string[]>([]); 
    const [montoTotalSeleccionado, setMontoTotalSeleccionado] = useState(0);

    // --- ESTADOS TAB 3: APROBACIONES ---
    const [pendientes, setPendientes] = useState<CobranzaPendiente[]>([]);
    const [verComprobante, setVerComprobante] = useState<string | null>(null);
    const [cobranzaRechazar, setCobranzaRechazar] = useState<string | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState("");

    const formManual = useForm<z.infer<typeof manualPaymentSchema>>({
        resolver: zodResolver(manualPaymentSchema),
        defaultValues: { metodo: "EFECTIVO_USD", referencia: "", nota: "", monto_recibido: "" }
    });

    const metodoSeleccionado = formManual.watch("metodo");
    const requiereReferencia = !["EFECTIVO_USD", "EFECTIVO_BSD"].includes(metodoSeleccionado);

    useEffect(() => {
        if (!requiereReferencia) {
            formManual.setValue("referencia", "");
        }
    }, [requiereReferencia, formManual]);
    
    // --- CARGA INICIAL ---
    useEffect(() => {
        if (idEmpresa) {
            fetchHistorial();
            fetchClientes();
            fetchPendientes();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    // 1. FETCH HISTORIAL
    const fetchHistorial = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/cobranzas/historial?id_empresa=${idEmpresa}`);
            setHistorial(res.data);
        } catch (error) { 
            console.error(error); 
        } finally {
            setLoading(false);
        }
    };

    // 2. FETCH CLIENTES 
    const fetchClientes = async () => {
        try {
            const res = await api.get(`/clientes?id_empresa=${idEmpresa}`);
            setClientes(res.data);
        } catch (error) { console.error(error); }
    };

    // 3. FETCH PENDIENTES
    const fetchPendientes = async () => {
        try {
            const res = await api.get(`/cobranzas/pendientes?id_empresa=${idEmpresa}`);
            setPendientes(res.data);
        } catch (error) { console.error(error); }
    };

    // --- LÓGICA TAB 2: SELECCIÓN ---
    const handleClienteChange = async (idCliente: string) => {
        setClienteSeleccionado(idCliente);
        setFacturasA_Pagar([]);
        setMontoTotalSeleccionado(0);
        if (!idCliente) {
            setFacturasCliente([]);
            return;
        }
        try {
            const res = await api.get(`/facturas?id_empresa=${idEmpresa}&id_cliente=${idCliente}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pendientes = res.data.filter((f: any) => Number(f.saldo_pendiente) > 0.01);
            setFacturasCliente(pendientes);
        } catch (error) { toast.error("Error cargando facturas del cliente"); }
    };

    const toggleFactura = (idFactura: string, saldo: number) => {
        if (facturasA_Pagar.includes(idFactura)) {
            setFacturasA_Pagar(prev => prev.filter(id => id !== idFactura));
            setMontoTotalSeleccionado(prev => prev - saldo);
        } else {
            setFacturasA_Pagar(prev => [...prev, idFactura]);
            setMontoTotalSeleccionado(prev => prev + saldo);
        }
    };

    const onSubmitManual = async (values: z.infer<typeof manualPaymentSchema>) => {
        if (facturasA_Pagar.length === 0) return toast.error("Seleccione al menos una factura");
        
        const montoIngresado = parseFloat(values.monto_recibido);
        
        try {
            const payload = {
                id_empresa: idEmpresa,
                fecha_reporte: new Date().toISOString().split('T')[0],
                monto_total: montoIngresado,
                nota_vendedor: values.nota || "Cobranza Manual en Oficina",
                id_cliente: clienteSeleccionado,
                metodos: [{
                    metodo: values.metodo,
                    monto: montoIngresado,
                    referencia: values.referencia,
                    banco: "CAJA OFICINA"
                }],
                facturas: facturasA_Pagar.map(id => ({ id_factura: id, monto_aplicado: 0 })) 
            };

            await api.post("/cobranzas/manual", payload); 
            toast.success("Cobranza registrada exitosamente");
            
            formManual.reset();
            handleClienteChange(clienteSeleccionado); 
            fetchHistorial();
        } catch (error) {
            toast.error("Error registrando cobranza");
        }
    };

    // --- HELPERS (BLINDADOS) ---
    // 👇 ACTUALIZADO: Lógica robusta para extraer el nombre sin importar las columnas de la BD
    const getNombreSeguro = (obj: any) => {
        if (!obj) return 'Sin asignar';
        if (typeof obj === 'string') return obj;

        // 1. Intentar construir si viene separado
        if (obj.nombre && obj.apellido) return `${obj.nombre} ${obj.apellido}`.trim();
        if (obj.nombres && obj.apellidos) return `${obj.nombres} ${obj.apellidos}`.trim();

        // 2. Extraer el primer valor válido
        return (
            obj.nombre_completo || 
            obj.nombre_apellido ||
            obj.nombre || 
            obj.nombres || 
            obj.usuario ||
            obj.username || 
            obj.email ||
            obj.razon_social || 
            'Sin asignar'
        );
    }

    // --- LÓGICA FILTROS HISTORIAL ---
    const historialFiltrado = historial.filter(c => {
        // 1. Filtrado por texto
        const termino = filtroTexto.toLowerCase();
        
        // Usamos nuestro helper blindado para no repetir lógica
        const nombreCliente = getNombreSeguro(c.cliente);
        const nombreVendedor = getNombreSeguro(c.vendedor || c.cliente?.vendedor);
        const refConsecutivo = c.consecutivo || '';
    
        const cumpleTexto = nombreCliente.toLowerCase().includes(termino) ||
            nombreVendedor.toLowerCase().includes(termino) ||
            refConsecutivo.toLowerCase().includes(termino);

        // 2. Filtrado por fechas
        let cumpleFecha = true;
        const fechaCobro = c.fecha_reporte.split('T')[0]; // Extrae "YYYY-MM-DD"
        
        if (filtroFechaInicio && fechaCobro < filtroFechaInicio) {
            cumpleFecha = false;
        }
        if (filtroFechaFin && fechaCobro > filtroFechaFin) {
            cumpleFecha = false;
        }

        return cumpleTexto && cumpleFecha;
    });

    // --- ACCIONES APROBACIONES Y ANULACIONES ---
    const handleAprobar = async (id: string) => {
        try { await api.patch(`/cobranzas/${id}/aprobar`); toast.success("Aprobado"); fetchPendientes(); fetchHistorial(); } 
        catch { toast.error("Error al aprobar"); }
    };
    const handleRechazarAction = async () => {
        if(!cobranzaRechazar) return;
        try { await api.patch(`/cobranzas/${cobranzaRechazar}/rechazar`, { motivo: motivoRechazo }); toast.info("Rechazado"); setCobranzaRechazar(null); fetchPendientes(); } 
        catch { toast.error("Error al rechazar"); }
    };

    // Lógica para anular cobranza
    const handleAnular = async (id: string) => {
        if (!window.confirm("¿Está seguro de anular esta cobranza? La deuda de las facturas volverá a su estado anterior.")) return;
        
        try {
            await api.patch(`/cobranzas/${id}/anular`);
            toast.success("Cobranza anulada exitosamente");
            fetchHistorial();
        } catch (error) {
            console.error(error);
            toast.error("Error al anular la cobranza");
        }
    };

    // --- REPORTES ---
    const exportarExcel = () => {
        const data = historialFiltrado.map(h => ({
            "Recibo": h.consecutivo, 
            "Fecha": h.fecha_reporte, 
            "Cliente": getNombreSeguro(h.cliente),
            "Vendedor": getNombreSeguro(h.vendedor || h.cliente?.vendedor), 
            "Monto": Number(h.monto_total)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cobranzas");
        XLSX.writeFile(wb, "Reporte_Cobranzas.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Reporte de Cobranzas Realizadas", 14, 15);
        autoTable(doc, {
            startY: 20,
            head: [['Recibo', 'Fecha', 'Cliente', 'Vendedor', 'Monto']],
            body: historialFiltrado.map(h => [
                h.consecutivo, 
                new Date(h.fecha_reporte).toLocaleDateString(), 
                getNombreSeguro(h.cliente), 
                getNombreSeguro(h.vendedor || h.cliente?.vendedor),
                `$${Number(h.monto_total).toFixed(2)}`
            ]),
        });
        doc.save("Reporte_Cobranzas.pdf");
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50/30">
            {/* Header */}
            <nav className="h-14 bg-white border-b px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finanzas / Gestión de Cobranzas</span>
                </div>
                <div className="flex gap-2">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2">
                                <Download className="h-3.5 w-3.5" /> Reportes
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportarExcel}><FileSpreadsheet className="mr-2 h-4 w-4 text-green-600"/> Excel Detallado</DropdownMenuItem>
                            <DropdownMenuItem onClick={exportarPDF}><FileText className="mr-2 h-4 w-4 text-red-600"/> PDF Listado</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => { fetchHistorial(); fetchPendientes(); }} className="h-8"><RefreshCcw className="h-3.5 w-3.5" /></Button>
                </div>
            </nav>

            <main className="flex-1 p-6 overflow-y-auto">
                <Tabs defaultValue="historial" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="historial" className="gap-2"><FileText className="h-4 w-4"/> Historial de Cobros</TabsTrigger>
                        <TabsTrigger value="manual" className="gap-2"><Plus className="h-4 w-4"/> Registro Manual (Caja)</TabsTrigger>
                        <TabsTrigger value="aprobaciones" className="gap-2 relative">
                            <CheckCircle2 className="h-4 w-4"/> Bandeja Aprobaciones
                            {pendientes.length > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{pendientes.length}</span>}
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: HISTORIAL */}
                    <TabsContent value="historial" className="space-y-4">
                        <div className="bg-white p-3 rounded-xl border shadow-sm flex flex-wrap gap-4 items-end">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Desde</span>
                                <Input type="date" className="h-8 text-xs w-36" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta</span>
                                <Input type="date" className="h-8 text-xs w-36" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Búsqueda Rápida</span>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Cliente, Vendedor o N° Recibo..." className="pl-8 h-8 text-xs" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Recibo</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Vendedor</TableHead>
                                        <TableHead>Métodos</TableHead>
                                        <TableHead className="text-right">Monto Total</TableHead>
                                        <TableHead className="text-center">Acciones</TableHead> 
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historialFiltrado.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Sin registros</TableCell></TableRow>
                                    ) : (
                                        historialFiltrado.map((h) => (
                                            <TableRow key={h.id_cobranza} className="hover:bg-slate-50">
                                                <TableCell className="font-mono text-xs font-bold">{h.consecutivo}</TableCell>
                                                <TableCell className="text-xs">{new Date(h.fecha_reporte).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {getNombreSeguro(h.cliente)}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                {getNombreSeguro(h.vendedor || h.cliente?.vendedor)}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {Array.isArray(h.metodos) 
                                                        ? h.metodos.map((m: any) => m.metodo).join(', ') 
                                                        : 'Múltiple'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600">${Number(h.monto_total).toFixed(2)}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {h.url_comprobante && (
                                                            <Button variant="ghost" size="icon" onClick={() => setVerComprobante(h.url_comprobante!)} className="h-6 w-6" title="Ver Comprobante">
                                                                <Eye className="h-3 w-3 text-blue-500"/>
                                                            </Button>
                                                        )}
                                                        {/* Botón de Anular */}
                                                        {h.estado === 'APLICADA' && (
                                                            <Button variant="ghost" size="icon" onClick={() => handleAnular(h.id_cobranza)} className="h-6 w-6" title="Anular Cobranza">
                                                                <Trash2 className="h-3 w-3 text-red-500"/>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* TAB 2: REGISTRO MANUAL */}
                    <TabsContent value="manual">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Panel Izquierdo: Selección */}
                            <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b bg-slate-50">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <User className="h-4 w-4" /> 1. Seleccionar Cliente y Facturas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500">Buscar Cliente</label>
                                        <Select onValueChange={handleClienteChange}>
                                            <SelectTrigger><SelectValue placeholder="Seleccione un cliente..." /></SelectTrigger>
                                            <SelectContent>
                                                {clientes.map(c => (
                                                    <SelectItem key={c.id_cliente} value={c.id_cliente}>{c.razon_social} ({c.rif})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {clienteSeleccionado && (
                                        <div className="border rounded-lg overflow-hidden mt-4">
                                            <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 border-b">Facturas Pendientes</div>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[50px]"></TableHead>
                                                            <TableHead>Factura</TableHead>
                                                            <TableHead>Fecha</TableHead>
                                                            <TableHead className="text-right">Saldo</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {facturasCliente.length === 0 ? (
                                                            <TableRow><TableCell colSpan={4} className="text-center text-xs text-slate-400">El cliente no tiene deuda pendiente</TableCell></TableRow>
                                                        ) : (
                                                            facturasCliente.map(f => (
                                                                <TableRow key={f.id_factura}>
                                                                    <TableCell>
                                                                        <Checkbox 
                                                                            checked={facturasA_Pagar.includes(f.id_factura)}
                                                                            onCheckedChange={() => toggleFactura(f.id_factura, Number(f.saldo_pendiente))}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-xs font-mono">{f.serie}-{f.numero_consecutivo}</TableCell>
                                                                    <TableCell className="text-xs">{new Date(f.fecha_emision).toLocaleDateString()}</TableCell>
                                                                    <TableCell className="text-right text-xs font-bold text-red-600">${Number(f.saldo_pendiente).toFixed(2)}</TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Panel Derecho: Pago */}
                            <Card className="border-emerald-100 shadow-sm bg-emerald-50/30">
                                <CardHeader className="pb-3 border-b bg-emerald-100/50">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
                                        <DollarSign className="h-4 w-4" /> 2. Detalles del Pago
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <Form {...formManual}>
                                        <form onSubmit={formManual.handleSubmit(onSubmitManual)} className="space-y-4">
                                            
                                            <div className="bg-white p-3 rounded border border-emerald-100 text-center mb-4">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Seleccionado</span>
                                                <span className="block text-2xl font-bold text-emerald-600">${montoTotalSeleccionado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <FormField control={formManual.control} name="monto_recibido" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold">Monto Recibido</FormLabel>
                                                    <FormControl><Input type="number" {...field} className="bg-white font-bold" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            <FormField control={formManual.control} name="metodo" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold">Método de Pago</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="EFECTIVO_USD">Efectivo ($)</SelectItem>
                                                            <SelectItem value="PUNTO_VENTA">Punto de Venta</SelectItem>
                                                            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                                            <SelectItem value="ZELLE">Zelle</SelectItem>
                                                            <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />

                                            <FormField control={formManual.control} name="referencia" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold">Referencia</FormLabel>
                                                    <FormControl><Input {...field} 
                                                        className="bg-white" 
                                                        disabled={!requiereReferencia}
                                                        placeholder={requiereReferencia ? "Nro de transferencia/Zelle" : "No aplica para este método"}/>
                                                        
                                                    </FormControl>
                                                </FormItem>
                                            )} />

                                             <FormField control={formManual.control} name="nota" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold">Nota Interna</FormLabel>
                                                    <FormControl><Input {...field} className="bg-white" /></FormControl>
                                                </FormItem>
                                            )} />

                                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold mt-4">
                                                Registrar Cobranza
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TAB 3: APROBACIONES */}
                    <TabsContent value="aprobaciones">
                         <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead>Detalle Pago</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="text-center">Soporte</TableHead>
                                    <TableHead className="text-center">Decisión</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendientes.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">No hay pagos pendientes</TableCell></TableRow>
                                ) : (
                                    pendientes.map((p) => (
                                        <TableRow key={p.id_cobranza} className="hover:bg-slate-50">
                                            <TableCell className="text-xs">{new Date(p.fecha_reporte).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-xs font-bold text-slate-700">{p.vendedor?.nombre_completo || 'Desconocido'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {p.metodos.map((m, i) => (
                                                        <div key={i} className="text-[10px] flex items-center gap-1 bg-slate-100 w-fit px-2 py-0.5 rounded border">
                                                            <span className="font-bold">{m.metodo}</span>
                                                            {m.referencia && <span className="font-mono text-slate-500">#{m.referencia}</span>}
                                                        </div>
                                                    ))}
                                                    <div className="text-[10px] text-slate-400">Ref Facturas: {p.facturas_afectadas.map(f => `${f.factura.serie}-${f.factura.numero_consecutivo}`).join(', ')}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-sm text-emerald-600 font-mono">${Number(p.monto_total).toFixed(2)}</TableCell>
                                            <TableCell className="text-center">
                                                {p.url_comprobante ? (
                                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setVerComprobante(p.url_comprobante!)}><Eye className="mr-1 h-3 w-3" /> Ver</Button>
                                                ) : <span className="text-[10px] text-slate-300">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 rounded-full" onClick={() => handleAprobar(p.id_cobranza)}><CheckCircle2 className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full" onClick={() => setCobranzaRechazar(p.id_cobranza)}><XCircle className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    </TabsContent>
                </Tabs>

                {/* MODALES AUXILIARES */}
                <Dialog open={!!verComprobante} onOpenChange={(open) => !open && setVerComprobante(null)}>
  <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 border-none shadow-2xl">
    <DialogHeader className="p-4 bg-white border-b shrink-0">
      <DialogTitle className="flex items-center gap-2 text-slate-700">
        <Eye className="h-5 w-5 text-blue-500" />
        Vista Previa del Comprobante
      </DialogTitle>
    </DialogHeader>
    
    <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
    {verComprobante && (
  <img 
    // Esta lógica limpia barras duplicadas y asegura que la imagen cargue sí o sí
    src={`http://localhost:3000/${verComprobante}`.replace(/([^:]\/)\/+/g, "$1")} 
    className="max-w-full max-h-full object-contain rounded-md shadow-lg" 
    alt="Comprobante"
    onError={(e) => {
      (e.target as HTMLImageElement).src = "https://placehold.co/600x800?text=Error+al+cargar+imagen";
    }}
  />
)}
    </div>
    
    <DialogFooter className="p-3 bg-slate-50 border-t shrink-0">
      <Button variant="outline" onClick={() => setVerComprobante(null)}>Cerrar</Button>
      {verComprobante && (
        <Button asChild>
          <a href={`http://localhost:3000${verComprobante}`} target="_blank" rel="noopener noreferrer">
            Abrir en pestaña nueva
          </a>
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
                <Dialog open={!!cobranzaRechazar} onOpenChange={(open) => !open && setCobranzaRechazar(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle className="text-red-600">Rechazar Pago</DialogTitle></DialogHeader>
                        <Textarea placeholder="Motivo del rechazo..." value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setCobranzaRechazar(null)}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleRechazarAction}>Confirmar Rechazo</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}