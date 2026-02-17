"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Save, Search, Trash2, Plus, Calendar as CalendarIcon, 
  Settings, Download, ChevronRight, X, User, Check, AlertCircle,
  FileText, Send
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- ESQUEMA ZOD ---
const invoiceSchema = z.object({
  id_cliente: z.string().min(1, "Requerido"),
  fecha_emision: z.date(),
  fecha_vencimiento: z.date().optional(),
  metodo_pago: z.string(),
  dias_credito: z.coerce.number().default(0),
  observaciones: z.string().optional(),
  tasa_cambio: z.coerce.number().min(0.01),
  items: z.array(z.object({
    id_producto: z.string(),
    codigo: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0.01),
    precio: z.coerce.number().min(0),
    descuento_porcentaje: z.coerce.number().default(0),
    stock_max: z.number(), 
  })).min(1, "Agregue al menos un item"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function OdooInvoicePage() {
  const idEmpresa = getEmpresaId();
  const [procesando, setProcesando] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  
  // UI States
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [indexFilaActiva, setIndexFilaActiva] = useState<number | null>(null);
  const [busquedaProd, setBusquedaProd] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteObj, setClienteObj] = useState<any | null>(null);
  const [mostrarResultadosClientes, setMostrarResultadosClientes] = useState(false);

  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      fecha_emision: new Date(),
      metodo_pago: "EFECTIVO",
      dias_credito: 0,
      tasa_cambio: 65.50, 
      items: [],
      id_cliente: ""
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = useWatch({ control: form.control, name: "items" }) as any[];
  const tasaCambio = useWatch({ control: form.control, name: "tasa_cambio" }) as number;
  const metodoPago = useWatch({ control: form.control, name: "metodo_pago" });
  const fechaEmision = useWatch({ control: form.control, name: "fecha_emision" });

  // --- CARGA DE DATOS ---
  useEffect(() => {
    if (!idEmpresa) return;
    const loadData = async () => {
      try {
        const [resCli, resProd] = await Promise.all([
          api.get("/clientes"),
          api.get("/productos"),
        ]);
        setClientes(resCli.data);
        setProductos(resProd.data);
      } catch (error) {
        toast.error("Error cargando datos");
      }
    };
    loadData();
  }, [idEmpresa]);

  // --- CALCULOS ---
  const subtotal = items?.reduce((acc, item) => {
    const cant = Number(item.cantidad) || 0;
    const prec = Number(item.precio) || 0;
    const desc = Number(item.descuento_porcentaje) || 0;
    return acc + ((cant * prec) * (1 - desc/100));
  }, 0) || 0;

  const iva = subtotal * 0.16;
  const totalUSD = subtotal + iva;
  const totalBs = totalUSD * (Number(tasaCambio) || 0);

  // --- HANDLERS ---
  const handleClienteSelect = (c: any) => {
    setClienteObj(c);
    form.setValue("id_cliente", c.id_cliente);
    setBusquedaCliente(c.razon_social);
    setMostrarResultadosClientes(false);
  };

  const handleProductoSelect = (p: any) => {
    const newItem = {
      id_producto: p.id_producto,
      codigo: p.codigo,
      nombre: p.nombre,
      cantidad: 1,
      precio: Number(p.precio_venta || 0),
      descuento_porcentaje: 0,
      stock_max: Number(p.stock || 0)
    };
    if (indexFilaActiva !== null) {
      update(indexFilaActiva, newItem);
      setIndexFilaActiva(null);
    } else {
      append(newItem);
    }
    setModalProductoOpen(false);
  };

  const onSubmit = async (data: InvoiceFormValues, estado: 'BORRADOR' | 'PAGADA') => {
    setProcesando(true);
    try {
        const payload = {
            id_empresa: idEmpresa,
            id_cliente: data.id_cliente,
            metodo_pago: data.metodo_pago,
            estado: estado === 'PAGADA' && data.metodo_pago === 'CREDITO' ? 'PENDIENTE' : estado,
            dias_credito: data.metodo_pago === 'CREDITO' ? data.dias_credito : 0,
            items: data.items.map(i => ({
              id_producto: i.id_producto,
              cantidad: i.cantidad,
              precio_personalizado: i.precio, 
              descuento_porcentaje: i.descuento_porcentaje
            })),
        };
        const res = await api.post("/facturas", payload);
        toast.success(`Factura ${res.data.data.numero_completo || 'Guardada'} creada`);
        form.reset();
        setClienteObj(null);
        setBusquedaCliente("");
    } catch (error: any) {
        toast.error("Error al guardar");
    } finally {
        setProcesando(false);
    }
  };

  const filteredProds = productos.filter(p => 
    p.nombre.toLowerCase().includes(busquedaProd.toLowerCase()) || 
    p.codigo.toLowerCase().includes(busquedaProd.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-50 text-sm">
      
      {/* 1. BARRA DE ACCIÓN SUPERIOR (Estilo ERP Negro/Gris) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm h-16">
        <div className="flex gap-2">
            <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm h-9 px-4"
                onClick={form.handleSubmit(d => onSubmit(d as any, 'PAGADA'))}
                disabled={procesando}
            >
                Confirmar Venta
            </Button>
            <Button 
                variant="outline" 
                className="text-slate-700 border-slate-300 h-9 hover:bg-slate-50"
                onClick={form.handleSubmit(d => onSubmit(d as any, 'BORRADOR'))}
            >
                Guardar Borrador
            </Button>
            <Button variant="ghost" className="text-slate-500 hover:text-red-600 h-9" onClick={() => form.reset()}>
                Descartar
            </Button>
        </div>

        {/* STATUS BAR (Cinta de Estado - Estilo Minimalista) */}
        <div className="flex items-center bg-slate-100 rounded-full px-1 py-1 border border-slate-200">
             {['Borrador', 'Publicado', 'Pagado'].map((status, idx) => (
                 <div key={status} className="flex items-center">
                     <div className={cn(
                         "px-4 py-1 rounded-full font-medium text-xs uppercase tracking-wide cursor-default transition-all",
                         idx === 0 
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                            : "text-slate-400"
                     )}>
                         {status}
                     </div>
                     {idx < 2 && <ChevronRight className="h-3 w-3 text-slate-300 mx-1" />}
                 </div>
             ))}
        </div>
      </div>

      {/* 2. CUERPO DE LA FACTURA (HOJA DE PAPEL) */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-[1100px] bg-white border border-slate-200 shadow-sm rounded-lg p-8 min-h-[800px]">
            
            {/* CABECERA DOCUMENTO */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 flex items-center gap-2">
                        <FileText className="h-8 w-8 text-slate-300"/>
                        Nueva Factura <span className="text-slate-300">/ Borrador</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-xs font-bold text-slate-500">TASA BCV:</span>
                    <Input 
                        type="number" 
                        step="0.01" 
                        className="h-6 w-20 text-right bg-white border-slate-200 text-xs focus-visible:ring-slate-400" 
                        {...form.register("tasa_cambio")}
                    />
                    <span className="text-xs text-slate-500 font-medium">Bs/$</span>
                </div>
            </div>

            {/* FORMULARIO SUPERIOR (2 COLUMNAS) */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">
                
                {/* COLUMNA IZQUIERDA: CLIENTE */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                        
                        {!clienteObj ? (
                           <div className="relative group">
                               <div className="flex items-center">
                                   <Input 
                                       placeholder="Buscar cliente..." 
                                       className="border-t-0 border-x-0 border-b border-slate-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-600 h-9 text-base shadow-none bg-transparent placeholder:text-slate-400"
                                       value={busquedaCliente}
                                       onChange={(e) => {
                                           setBusquedaCliente(e.target.value);
                                           setMostrarResultadosClientes(true);
                                       }}
                                   />
                                   <Search className="h-4 w-4 text-slate-400 -ml-6 pointer-events-none group-focus-within:text-blue-600"/>
                               </div>
                               {mostrarResultadosClientes && busquedaCliente && (
                                   <div className="absolute z-50 bg-white border border-slate-200 shadow-xl w-full mt-1 max-h-48 overflow-auto rounded-md">
                                       {clientes.filter(c => c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())).map(c => (
                                           <div key={c.id_cliente} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0 border-slate-100" onClick={() => handleClienteSelect(c)}>
                                               <div className="font-bold text-slate-800">{c.razon_social}</div>
                                               <div className="text-xs text-slate-500 flex gap-2">
                                                   <Badge variant="secondary" className="text-[10px] h-5">{c.rif}</Badge>
                                                   <span className="truncate max-w-[200px]">{c.direccion_fiscal}</span>
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               )}
                           </div>
                        ) : (
                           <div className="group flex items-center justify-between border border-transparent hover:border-slate-200 hover:bg-slate-50 p-2 -ml-2 rounded transition-all">
                               <div>
                                   <div className="font-bold text-blue-700 cursor-pointer hover:underline text-base flex items-center gap-2">
                                       <User className="h-4 w-4"/> {clienteObj.razon_social}
                                   </div>
                                   <div className="text-sm text-slate-600 pl-6">{clienteObj.direccion_fiscal}</div>
                                   <div className="text-xs text-slate-400 pl-6 mt-0.5">RIF: {clienteObj.rif}</div>
                               </div>
                               <Button variant="ghost" size="icon" onClick={() => { setClienteObj(null); form.setValue("id_cliente", ""); }} className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-400 hover:text-red-500">
                                   <X className="h-4 w-4"/>
                               </Button>
                           </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: FECHAS Y PAGO */}
                <div className="space-y-4 pl-4 border-l border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-600">Fecha de Factura</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-8 justify-start text-left font-normal px-2 hover:bg-slate-50 w-48 border-b border-slate-300 rounded-none text-slate-900">
                                    {fechaEmision ? format(fechaEmision, "dd/MM/yyyy") : <span>Seleccionar</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaEmision} onSelect={(d) => d && form.setValue("fecha_emision", d)} initialFocus /></PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-600">Términos de Pago</label>
                        <Select value={metodoPago} onValueChange={(val) => { form.setValue("metodo_pago", val); if(val!=='CREDITO') form.setValue("dias_credito", 0); }}>
                            <SelectTrigger className="h-8 border-t-0 border-x-0 border-b border-slate-300 rounded-none shadow-none focus:ring-0 px-2 w-48 text-right font-medium text-slate-900">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EFECTIVO">Contado</SelectItem>
                                <SelectItem value="CREDITO">Crédito (Neto)</SelectItem>
                                <SelectItem value="ZELLE">Zelle</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {metodoPago === 'CREDITO' && (
                         <div className="flex items-center justify-between animate-in fade-in slide-in-from-left-2">
                            <label className="text-sm font-medium text-slate-600">Días de Crédito</label>
                            <Input type="number" className="h-8 border-t-0 border-x-0 border-b border-slate-300 rounded-none shadow-none px-2 w-48 text-right font-medium" {...form.register("dias_credito")} />
                        </div>
                    )}
                </div>
            </div>

            {/* PESTAÑAS Y TABLA (Estilo Clean) */}
            <Tabs defaultValue="lines" className="w-full">
                <TabsList className="bg-transparent p-0 border-b border-slate-200 w-full justify-start h-10 rounded-none gap-6">
                    <TabsTrigger 
                        value="lines" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Líneas de Factura
                    </TabsTrigger>
                    <TabsTrigger 
                        value="info" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Otra Información
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-6">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-slate-200">
                                <TableHead className="w-[40%] font-bold text-slate-900 h-9 pl-0">Producto</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9">Cantidad</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9">Precio ($)</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9">Desc (%)</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9 pr-0">Subtotal</TableHead>
                                <TableHead className="w-[30px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                                const cant = Number(form.watch(`items.${index}.cantidad`));
                                const prec = Number(form.watch(`items.${index}.precio`));
                                const desc = Number(form.watch(`items.${index}.descuento_porcentaje`));
                                const sub = (cant * prec) * (1 - desc/100);
                                const stock = form.watch(`items.${index}.stock_max`);
                                
                                return (
                                    <TableRow key={field.id} className="group border-b border-slate-100 hover:bg-slate-50/80">
                                        <TableCell className="p-0 relative pl-0">
                                            <div className="flex flex-col py-2 cursor-text relative">
                                                <div className="flex gap-2 items-center">
                                                    <span className="font-medium text-slate-800 text-sm">{form.getValues(`items.${index}.nombre`)}</span>
                                                    {cant > stock && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                </div>
                                                <div className="flex gap-2 text-xs text-slate-400 font-mono">
                                                    <span>{form.getValues(`items.${index}.codigo`)}</span>
                                                </div>
                                                <Button 
                                                    type="button"
                                                    variant="ghost" 
                                                    className="absolute inset-0 w-full h-full opacity-0 z-10"
                                                    onClick={() => { setIndexFilaActiva(index); setModalProductoOpen(true); }}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input type="number" className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent font-medium" {...form.register(`items.${index}.cantidad`)} />
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input type="number" step="0.01" className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent text-slate-600" {...form.register(`items.${index}.precio`)} />
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input type="number" className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent text-slate-500" {...form.register(`items.${index}.descuento_porcentaje`)} />
                                        </TableCell>
                                        <TableCell className="text-right pr-0 font-bold text-slate-900">
                                            {sub.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </TableCell>
                                        <TableCell className="p-0 text-center">
                                            <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500 cursor-pointer mx-auto opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            
                            {/* BOTÓN AGREGAR LÍNEA (Azul Clásico) */}
                            <TableRow>
                                <TableCell colSpan={6} className="p-2 pl-0">
                                    <Button 
                                        variant="ghost" 
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 pl-2 h-8 font-medium text-sm"
                                        onClick={() => { setIndexFilaActiva(null); setModalProductoOpen(true); }}
                                    >
                                        Agrega una línea
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* TOTALES (Diseño Limpio) */}
                    <div className="flex justify-end mt-8">
                        <div className="w-1/3 min-w-[300px] bg-slate-50 p-6 rounded-lg border border-slate-100">
                            <div className="flex justify-between text-sm text-slate-600 pb-2 border-b border-slate-200">
                                <span className="font-medium">Subtotal</span>
                                <span>${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 py-2 border-b border-slate-200">
                                <span>Impuestos (16%)</span>
                                <span>${iva.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between items-end pt-3">
                                <span className="text-lg font-bold text-slate-900">Total</span>
                                <span className="text-xl font-bold text-slate-900">${totalUSD.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-2 bg-white px-2 py-1 rounded border border-slate-200">
                                <span>Equivalente en Bs:</span>
                                <span className="font-mono font-bold">Bs {totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="info">
                    <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50">
                        <label className="text-sm font-bold text-slate-700 block mb-2">Notas internas / Observaciones</label>
                        <Textarea 
                            className="bg-white border-slate-300 focus-visible:ring-slate-400" 
                            placeholder="Escribe términos de entrega o notas internas..." 
                            {...form.register("observaciones")}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* MODAL CATALOGO */}
      <Dialog open={modalProductoOpen} onOpenChange={setModalProductoOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-white">
            <DialogHeader className="p-4 border-b border-slate-100 bg-slate-50">
                <DialogTitle className="text-slate-800">Buscar Producto</DialogTitle>
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Filtrar por nombre, código..." 
                        className="pl-9 bg-white border-slate-300 focus-visible:ring-slate-400" 
                        value={busquedaProd}
                        onChange={(e) => setBusquedaProd(e.target.value)}
                        autoFocus
                    />
                </div>
            </DialogHeader>
            <ScrollArea className="h-[500px]">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow className="border-b border-slate-200">
                            <TableHead className="w-[120px] font-bold text-slate-700">Ref. Interna</TableHead>
                            <TableHead className="font-bold text-slate-700">Nombre</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Stock</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Precio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProds.map(p => (
                            <TableRow 
                                key={p.id_producto} 
                                className="cursor-pointer hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                                onClick={() => handleProductoSelect(p)}
                            >
                                <TableCell className="font-mono text-xs text-slate-500 font-medium">{p.codigo}</TableCell>
                                <TableCell className="font-medium text-slate-700">{p.nombre}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline" className={cn("font-normal", p.stock > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                                        {p.stock}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800">${Number(p.precio_venta).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}