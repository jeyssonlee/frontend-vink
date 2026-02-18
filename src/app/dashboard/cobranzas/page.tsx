"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  RefreshCcw, Wallet, DollarSign, Calendar, 
  CreditCard, FileText, CheckCircle2, XCircle, Eye, AlertTriangle, Search, Upload, Clock, Filter
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- TIPOS ---
interface VendedorData {
    nombre?: string; 
    apellido?: string; 
    nombre_completo?: string;
    nombre_apellido?: string;
    email?: string;
    usuario?: string;
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
      // Agregamos vendedor al cliente como respaldo
      vendedor?: VendedorData;
  };
  // Vendedor directo de la factura
  vendedor?: VendedorData; 
  total_pagar: string;
  monto_pagado: string;
  saldo_pendiente: string;
  fecha_emision: string;
  fecha_vencimiento: string; 
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

// --- SCHEMA PAGO ---
const pagoSchema = z.object({
  monto: z.string().min(1, "Monto obligatorio"),
  metodo: z.enum(["EFECTIVO_USD", "ZELLE", "PAGO_MOVIL", "TRANSFERENCIA", "PUNTO_VENTA"]),
  referencia: z.string().optional(),
  nota: z.string().optional(),
  archivo: z.any().optional(), 
}).refine((data) => {
  if (data.metodo !== "EFECTIVO_USD" && (!data.referencia || data.referencia.length < 4)) {
    return false;
  }
  return true;
}, { message: "Referencia requerida para este método", path: ["referencia"] });

export default function CobranzasPage() {
  const idEmpresa = getEmpresaId();
  
  // Estados Generales
  const [loading, setLoading] = useState(false);
  
  // Estados Tab 1: CXC
  const [facturas, setFacturas] = useState<FacturaCXC[]>([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [filterVendedor, setFilterVendedor] = useState("TODOS"); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaCXC | null>(null);

  // Estados Tab 2: Aprobaciones
  const [pendientes, setPendientes] = useState<CobranzaPendiente[]>([]);
  const [searchVendedor, setSearchVendedor] = useState(""); 
  const [verComprobante, setVerComprobante] = useState<string | null>(null);
  const [cobranzaRechazar, setCobranzaRechazar] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const form = useForm<z.infer<typeof pagoSchema>>({
    resolver: zodResolver(pagoSchema),
    defaultValues: { monto: "", metodo: "EFECTIVO_USD", referencia: "", nota: "" },
  });

  // --- HELPER INTELIGENTE PARA OBTENER NOMBRE DEL VENDEDOR ---
  // Busca en la factura, si no hay, busca en el cliente
  const getNombreVendedor = (f: FacturaCXC): string | null => {
      const v = f.vendedor || f.cliente.vendedor;
      if (!v) return null;
      return (
        v.nombre_apellido ||           // 👈 Prioridad 1: Tu formato actual
        v.nombre_completo ||           // Prioridad 2: Formato estándar
        `${v.nombre || ''} ${v.apellido || ''}`.trim() || // Prioridad 3: Separado
        v.usuario ||                   // Prioridad 4: Usuario
        v.email ||                     // Prioridad 5: Email
        null
    );
  };

  // --- CARGA DE DATOS ---
  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/facturas?id_empresa=${idEmpresa}`);
      // Filtramos solo las que tienen deuda
      const conDeuda = res.data.filter((f: any) => Number(f.saldo_pendiente) > 0.01);
      setFacturas(conDeuda);
    } catch (error) {
      toast.error("Error cargando facturas");
    } finally { setLoading(false); }
  };

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/cobranzas/pendientes?id_empresa=${idEmpresa}`);
      setPendientes(res.data);
    } catch (error) {
      toast.error("Error cargando aprobaciones");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (idEmpresa) {
        fetchFacturas();
        fetchPendientes();
    }
  }, [idEmpresa]);

  // --- OBTENER VENDEDORES ÚNICOS PARA EL FILTRO ---
  const vendedoresUnicos = useMemo(() => {
    const nombres = facturas
        .map(f => getNombreVendedor(f))
        .filter((nombre): nombre is string => !!nombre && nombre !== "");
    return Array.from(new Set(nombres));
  }, [facturas]);

  // --- FILTROS DE BÚSQUEDA COMBINADOS ---
  const facturasFiltradas = facturas.filter((f) => {
    // 1. Filtro por Texto
    const matchesSearch = 
        f.cliente.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cliente.rif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.numero_consecutivo.toString().includes(searchTerm);

    // 2. Filtro por Vendedor (Usando el helper inteligente)
    const nombreVendedor = getNombreVendedor(f);
    const matchesVendedor = 
        filterVendedor === "TODOS" || 
        nombreVendedor === filterVendedor;

    return matchesSearch && matchesVendedor;
  });

  const pendientesFiltrados = pendientes.filter((p) =>
    p.vendedor?.nombre_completo?.toLowerCase().includes(searchVendedor.toLowerCase())
  );

  // --- ACCIONES TAB 1: REGISTRAR PAGO ---
  const handleOpenPay = (factura: FacturaCXC) => {
    setFacturaSeleccionada(factura);
    form.reset({
      monto: factura.saldo_pendiente,
      metodo: "EFECTIVO_USD",
      referencia: "",
      nota: `Pago a factura ${factura.serie}-${factura.numero_consecutivo}`
    });
    setIsDialogOpen(true);
  };

  const onSubmitPago = async (values: z.infer<typeof pagoSchema>) => {
    if (!facturaSeleccionada) return;
    const montoPagar = parseFloat(values.monto);
    
    if (montoPagar > parseFloat(facturaSeleccionada.saldo_pendiente) + 0.01) {
      toast.error("El monto excede la deuda pendiente");
      return;
    }

    try {
      const dataPayload = {
        fecha_reporte: new Date().toISOString().split('T')[0],
        monto_total: montoPagar,
        nota_vendedor: values.nota,
        id_empresa: idEmpresa,
        metodos: [{
            metodo: values.metodo,
            monto: montoPagar,
            referencia: values.referencia || undefined,
            banco: values.referencia ? "BANCO REFERENCIAL" : undefined
        }],
        facturas: [{ id_factura: facturaSeleccionada.id_factura, monto_aplicado: montoPagar }]
      };

      const formData = new FormData();
      if (values.archivo && values.archivo instanceof FileList && values.archivo.length > 0) {
        formData.append("file", values.archivo[0]);
      } else if (values.archivo instanceof File) {
         formData.append("file", values.archivo);
      }
       formData.append("data", JSON.stringify(dataPayload));
      
      await api.post("/cobranzas/upload", formData, { 
         headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Pago registrado correctamente");
      setIsDialogOpen(false);
      fetchFacturas(); 
      fetchPendientes(); 
    } catch (error: any) {
      if(error.response?.status === 404 || error.response?.status === 415) {
          try {
             // Fallback JSON simple
             const simplePayload = {
                fecha_reporte: new Date().toISOString().split('T')[0],
                monto_total: montoPagar,
                nota_vendedor: values.nota,
                id_empresa: idEmpresa,
                metodos: [{ metodo: values.metodo, monto: montoPagar, referencia: values.referencia || undefined }],
                facturas: [{ id_factura: facturaSeleccionada.id_factura, monto_aplicado: montoPagar }]
             };
             await api.post("/cobranzas", simplePayload);
             toast.success("Pago registrado (Sin archivo adjunto)");
             setIsDialogOpen(false);
             fetchFacturas();
             fetchPendientes();
             return;
          } catch (e) {}
      }
      toast.error(error.response?.data?.message || "Error procesando pago");
    }
  };

  // --- ACCIONES TAB 2: APROBACIONES ---
  const handleAprobar = async (idCobranza: string) => {
    try {
        await api.patch(`/cobranzas/${idCobranza}/aprobar`);
        toast.success("✅ Cobranza Aprobada");
        fetchPendientes();
        fetchFacturas(); 
    } catch (error: any) {
        toast.error(error.response?.data?.message || "Error al aprobar");
    }
  };

  const handleRechazar = async () => {
    if (!cobranzaRechazar || !motivoRechazo) return;
    try {
        await api.patch(`/cobranzas/${cobranzaRechazar}/rechazar`, { motivo: motivoRechazo });
        toast.info("🚫 Cobranza Rechazada");
        setCobranzaRechazar(null);
        setMotivoRechazo("");
        fetchPendientes();
    } catch (error: any) {
        toast.error("Error al rechazar");
    }
  };

  const totalPorCobrar = facturas.reduce((acc, f) => acc + Number(f.saldo_pendiente), 0);
  const totalPorAprobar = pendientes.reduce((acc, p) => acc + Number(p.monto_total), 0);

  const calcularEstado = (vencimiento: string) => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const fechaVenc = new Date(vencimiento);
    fechaVenc.setHours(0,0,0,0);
    const diffTime = fechaVenc.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { diffDays };
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      
      {/* HEADER */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finanzas / Gestión de Cobros</span>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => { fetchFacturas(); fetchPendientes(); }}>
            <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
        </Button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6">
        
        {/* RESUMEN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
           <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 col-span-2">
              <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                  <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                  <h1 className="text-xl font-bold text-slate-800">${totalPorCobrar.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Cartera por Cobrar</p>
              </div>
           </div>
           
           <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm flex items-center gap-4 col-span-2">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                  <h1 className="text-xl font-bold text-slate-800">${totalPorAprobar.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pendiente por Aprobar</p>
              </div>
           </div>
        </div>

        <Tabs defaultValue="cxc" className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="cxc" className="flex gap-2">
                    <FileText className="h-4 w-4" /> Cuentas por Cobrar
                </TabsTrigger>
                <TabsTrigger value="aprobaciones" className="flex gap-2 relative">
                    <CheckCircle2 className="h-4 w-4" /> Bandeja de Aprobaciones
                    {pendientes.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                            {pendientes.length}
                        </span>
                    )}
                </TabsTrigger>
            </TabsList>

            {/* --- TAB 1: CUENTAS POR COBRAR --- */}
            <TabsContent value="cxc">
                <div className="space-y-4">
                    
                    {/* BARRA DE FILTROS */}
                    <div className="flex gap-2 items-center bg-white p-1.5 rounded-xl border shadow-sm w-fit">
                        {/* Buscador de Texto */}
                        <div className="flex items-center px-2 bg-slate-50 rounded-lg border border-transparent focus-within:border-slate-300 focus-within:bg-white transition-all">
                            <Search className="h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Cliente, RIF o N°..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-0 focus-visible:ring-0 h-9 w-48 text-xs bg-transparent"
                            />
                        </div>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Filtro Dropdown Vendedor */}
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5 text-slate-400 ml-1" />
                            <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                                <SelectTrigger className="w-[180px] h-9 text-xs border-0 focus:ring-0 bg-transparent shadow-none hover:bg-slate-50">
                                    <SelectValue placeholder="Filtrar por Vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos los Vendedores</SelectItem>
                                    {vendedoresUnicos.map((vendedor) => (
                                        <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>
                                    ))}
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
                                    <TableHead className="text-center font-bold text-[11px] uppercase">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {facturasFiltradas.length === 0 ? (
                                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400 text-xs">No se encontraron facturas</TableCell></TableRow>
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
                                              
                                              {/* COLUMNA VENDEDOR INTELIGENTE */}
                                              <TableCell className="text-xs text-slate-600">
                                                {nombreVendedor ? (
                                                    <span className="font-medium text-slate-700">{nombreVendedor}</span>
                                                ) : (
                                                    <span className="text-slate-300 italic">Sin asignar</span>
                                                )}
                                              </TableCell>

                                              <TableCell className="text-xs text-center text-slate-500">
                                                {new Date(f.fecha_emision).toLocaleDateString()}
                                              </TableCell>
                                              <TableCell className="text-xs text-center font-bold text-slate-700">
                                                {new Date(f.fecha_vencimiento).toLocaleDateString()}
                                              </TableCell>

                                              <TableCell className="text-center">
                                                {diffDays < 0 ? (
                                                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                                                    Vencida hace {Math.abs(diffDays)} días
                                                  </Badge>
                                                ) : diffDays === 0 ? (
                                                  <Badge className="text-[10px] h-5 px-1.5 font-bold bg-amber-500 hover:bg-amber-600 text-white border-none">
                                                    Vence hoy
                                                  </Badge>
                                                ) : (
                                                  <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                                                    <Clock className="h-3 w-3" /> Faltan {diffDays} días
                                                  </span>
                                                )}
                                              </TableCell>

                                              <TableCell className="text-right text-xs font-mono text-slate-500">${Number(f.total_pagar).toFixed(2)}</TableCell>
                                              <TableCell className="text-right text-xs font-mono font-bold text-red-600">${Number(f.saldo_pendiente).toFixed(2)}</TableCell>
                                              <TableCell className="text-center">
                                                  <Button size="sm" onClick={() => handleOpenPay(f)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 shadow-sm">
                                                      <DollarSign className="mr-1 h-3 w-3" /> Pagar
                                                  </Button>
                                              </TableCell>
                                          </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </TabsContent>

            {/* --- TAB 2: APROBACIONES (Sin cambios significativos) --- */}
            <TabsContent value="aprobaciones">
                <div className="space-y-4">
                    <div className="flex w-full max-w-sm items-center space-x-2 bg-white p-1 rounded-lg border shadow-sm">
                        <Search className="h-4 w-4 text-slate-400 ml-2" />
                        <Input 
                            placeholder="Filtrar por vendedor..." 
                            value={searchVendedor}
                            onChange={(e) => setSearchVendedor(e.target.value)}
                            className="border-0 focus-visible:ring-0 h-8 text-xs"
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-[11px] uppercase">Fecha</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase">Vendedor</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase">Detalle Pago</TableHead>
                                    <TableHead className="text-right font-bold text-[11px] uppercase">Monto</TableHead>
                                    <TableHead className="text-center font-bold text-[11px] uppercase">Soporte</TableHead>
                                    <TableHead className="text-center font-bold text-[11px] uppercase">Decisión</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendientesFiltrados.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">No hay pagos pendientes coincidentes</TableCell></TableRow>
                                ) : (
                                    pendientesFiltrados.map((p) => (
                                        <TableRow key={p.id_cobranza} className="hover:bg-slate-50">
                                            <TableCell className="text-xs">{new Date(p.fecha_reporte).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-xs font-bold text-slate-700">
                                                {p.vendedor?.nombre_completo || 'Desconocido'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {p.metodos.map((m, i) => (
                                                        <div key={i} className="text-[10px] flex items-center gap-1 bg-slate-100 w-fit px-2 py-0.5 rounded border">
                                                            <span className="font-bold">{m.metodo}</span>
                                                            {m.referencia && <span className="font-mono text-slate-500">#{m.referencia}</span>}
                                                        </div>
                                                    ))}
                                                    <div className="text-[10px] text-slate-400">
                                                        Ref: {p.facturas_afectadas.map(f => `${f.factura.serie}-${f.factura.numero_consecutivo}`).join(', ')}
                                                    </div>
                                                    {p.nota_vendedor && (
                                                        <div className="text-[10px] italic text-slate-500 bg-yellow-50 px-1 rounded border border-yellow-100 w-fit">
                                                            "{p.nota_vendedor}"
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-sm text-emerald-600 font-mono">
                                                ${Number(p.monto_total).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {p.url_comprobante ? (
                                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setVerComprobante(p.url_comprobante!)}>
                                                        <Eye className="mr-1 h-3 w-3" /> Ver Foto
                                                    </Button>
                                                ) : <span className="text-[10px] text-slate-300">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-sm" onClick={() => handleAprobar(p.id_cobranza)}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full shadow-sm" onClick={() => setCobranzaRechazar(p.id_cobranza)}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </TabsContent>
        </Tabs>

        {/* MODALES IGUAL QUE ANTES (Pago, Ver Foto, Rechazar) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogContent className="sm:max-w-[500px]">
             <DialogHeader><DialogTitle>Registrar Nuevo Pago</DialogTitle></DialogHeader>
             <Form {...form}>
                 <form onSubmit={form.handleSubmit(onSubmitPago)} className="space-y-4">
                     {/* ... (Formulario de pago sin cambios) ... */}
                      <div className="space-y-1">
                        <FormLabel className="text-xs">Factura a Pagar</FormLabel>
                        <Input disabled value={facturaSeleccionada ? `${facturaSeleccionada.cliente.razon_social} (Fac: ${facturaSeleccionada.serie}-${facturaSeleccionada.numero_consecutivo})` : ''} className="bg-slate-100 text-slate-500 font-mono text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="monto" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">Monto ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="font-bold text-emerald-700" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="metodo" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">Método</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="EFECTIVO_USD">Efectivo ($)</SelectItem>
                                        <SelectItem value="ZELLE">Zelle</SelectItem>
                                        <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                        <SelectItem value="PUNTO_VENTA">Punto de Venta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="referencia" render={({ field }) => (
                         <FormItem><FormLabel className="text-xs">Ref #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="nota" render={({ field }) => (
                         <FormItem><FormLabel className="text-xs">Nota</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="archivo" render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem><FormLabel className="text-xs">Foto (Opcional)</FormLabel><FormControl><Input {...fieldProps} type="file" onChange={(e) => onChange(e.target.files)} className="text-xs" /></FormControl></FormItem>
                      )} />
                     <DialogFooter className="pt-2">
                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Registrar</Button>
                     </DialogFooter>
                 </form>
             </Form>
           </DialogContent>
        </Dialog>
        
        {/* Modal Foto */}
        <Dialog open={!!verComprobante} onOpenChange={(open) => !open && setVerComprobante(null)}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b bg-slate-50">
                <DialogTitle>Comprobante de Pago</DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                    Visualización del soporte adjunto.
                </DialogDescription>
            </DialogHeader>
                <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 overflow-auto">
                    {verComprobante && <img src={`http://localhost:3000${verComprobante}`} alt="Comprobante" className="max-w-full max-h-full object-contain rounded-md" />}
                </div>
            </DialogContent>
        </Dialog>

        {/* Modal Rechazo */}
        <Dialog open={!!cobranzaRechazar} onOpenChange={(open) => !open && setCobranzaRechazar(null)}>
            <DialogContent>
                <DialogHeader><DialogTitle className="text-red-600">Rechazar Cobranza</DialogTitle></DialogHeader>
                <Textarea placeholder="Motivo..." value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setCobranzaRechazar(null)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleRechazar}>Confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}