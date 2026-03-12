"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Save, Search, Trash2, Plus, Calendar as CalendarIcon,
  ChevronRight, X, User, AlertCircle,
  FileText, Printer, Download, Eye, ClipboardList, UserPlus, PackageSearch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";
import { useProductSearch } from "@/hooks/useProductSearch";

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
  dias_credito: z.coerce.number().min(0).default(0),
  observaciones: z.string().optional(),
  tasa_cambio: z.coerce.number().min(0.01),
  items: z.array(z.object({
    id_producto: z.string(),
    codigo: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0.01),
    precio: z.coerce.number().min(0),
    descuento_porcentaje: z.coerce.number().min(0).max(100).default(0),
    stock_max: z.coerce.number(),
  })).min(1, "Agregue al menos un item"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// --- ESQUEMA NUEVO CLIENTE ---
const nuevoClienteSchema = z.object({
  razon_social: z.string().min(2, "Requerido"),
  rif: z.string().min(5, "Requerido"),
  telefono: z.string().optional(),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  direccion_fiscal: z.string().optional(),
});
type NuevoClienteValues = z.infer<typeof nuevoClienteSchema>;


// Helper: construye el número legible de factura
const buildNroFactura = (f: any): string => {
  if (!f) return "";
  const serie = f.serie || "A";
  const nro = String(f.numero_consecutivo || 0).padStart(4, "0");
  return `${serie}-${nro}`;
};

export default function OdooInvoicePage() {
  const idEmpresa = getEmpresaId();
  const [procesando, setProcesando] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);

  // UI States
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [indexFilaActiva, setIndexFilaActiva] = useState<number | null>(null);
  const [busquedaProd, setBusquedaProd] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteObj, setClienteObj] = useState<any | null>(null);
  const [mostrarResultadosClientes, setMostrarResultadosClientes] = useState(false);

  // --- NUEVOS ESTADOS ---
  // Modo revisión
  const [modoRevision, setModoRevision] = useState(false);
  const [facturaRevisada, setFacturaRevisada] = useState<any>(null);
  const [modalBuscarFacturaOpen, setModalBuscarFacturaOpen] = useState(false);
  const [busquedaFactura, setBusquedaFactura] = useState("");
  const [facturasLista, setFacturasLista] = useState<any[]>([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  // Importar pedido
  const [modalImportarPedidoOpen, setModalImportarPedidoOpen] = useState(false);
  const [pedidosRevisados, setPedidosRevisados] = useState<any[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [busquedaPedido, setBusquedaPedido] = useState("");

  // Nuevo cliente
  const [modalNuevoClienteOpen, setModalNuevoClienteOpen] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // Última factura
  const [ultimaFacturaNro, setUltimaFacturaNro] = useState<string>("");

  // Hook de búsqueda de productos con debounce
  const { results: filteredProds, loading: buscandoProd } = useProductSearch(busquedaProd);

  // --- FORM PRINCIPAL ---
  const form = useForm<InvoiceFormValues, any, InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      fecha_emision: new Date(),
      metodo_pago: "EFECTIVO_USD",
      dias_credito: 0,
      tasa_cambio: 0,
      items: [],
      id_cliente: "",
    },
  });

  // --- FORM NUEVO CLIENTE ---
  const clienteForm = useForm<NuevoClienteValues>({
    resolver: zodResolver(nuevoClienteSchema),
    defaultValues: { razon_social: "", rif: "", telefono: "", correo: "", direccion_fiscal: "" },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = useWatch({ control: form.control, name: "items" }) as any[];
  const tasaCambio = useWatch({ control: form.control, name: "tasa_cambio" }) as number;
  const metodoPago = useWatch({ control: form.control, name: "metodo_pago" });
  const fechaEmision = useWatch({ control: form.control, name: "fecha_emision" });

  // --- TASA BCV ---
  useEffect(() => {
    const buscarTasaDia = async () => {
      try {
        const response = await api.get("/monitor-dolar/bcv");
        const data = response.data;
        if (data?.tasa) {
          form.setValue("tasa_cambio", data.tasa);
          if (data.origen === "FALLBACK") {
            toast.warning(`Usando tasa de emergencia (Bs. ${data.tasa}).`);
          } else {
            toast.success(`Tasa BCV sincronizada: Bs. ${data.tasa}`);
          }
        }
      } catch {
        toast.error("No se pudo obtener la tasa del BCV.");
      }
    };
    buscarTasaDia();
  }, [form]);

  // --- CARGA INICIAL ---
  useEffect(() => {
    if (!idEmpresa) return;
    const loadData = async () => {
      try {
        // Clientes
        const resCli = await api.get("/clientes");
        setClientes(resCli.data);

        // Última factura
        try {
          const resFact = await api.get("/facturas", {
            params: { id_empresa: idEmpresa },
          });
          const lista = resFact.data as any[];
          if (lista?.length > 0) {
            const ultima = lista[lista.length - 1];
            setUltimaFacturaNro(buildNroFactura(ultima));
          }
        } catch {
          // silencioso
        }
      } catch {
        toast.error("Error cargando datos");
      }
    };
    loadData();
  }, [idEmpresa]);

  // --- CALCULOS ---
  const subtotal =
    items?.reduce((acc, item) => {
      const cant = Number(item.cantidad) || 0;
      const prec = Number(item.precio) || 0;
      const desc = Number(item.descuento_porcentaje) || 0;
      return acc + cant * prec * (1 - desc / 100);
    }, 0) || 0;

  const iva = subtotal * 0.16;
  const totalUSD = subtotal + iva;
  const totalBs = totalUSD * (Number(tasaCambio) || 0);

  // Crédito usado del cliente
  const creditoUsado = totalUSD;
  const limiteCredito = clienteObj?.limite_credito ?? null;
  const excedeLimite =
    metodoPago === "CREDITO" && limiteCredito !== null && creditoUsado > limiteCredito;

  // --- HANDLERS ---
  const handleClienteSelect = (c: any) => {
    setClienteObj(c);
    form.setValue("id_cliente", c.id_cliente);
    setBusquedaCliente(c.razon_social);
    setMostrarResultadosClientes(false);
  };

  const handleProductoSelect = (p: any) => {
    const stockDisp = p.stock_disponible ?? p.stock ?? 0;
    const newItem = {
      id_producto: p.id_producto,
      codigo: p.codigo,
      nombre: p.nombre,
      cantidad: 1,
      precio: Number(p.precio_venta || 0),
      descuento_porcentaje: 0,
      stock_max: stockDisp,
    };
    if (indexFilaActiva !== null) {
      update(indexFilaActiva, newItem);
      setIndexFilaActiva(null);
    } else {
      append(newItem);
    }
    setModalProductoOpen(false);
    setBusquedaProd("");
  };

  const onSubmit = async (data: InvoiceFormValues, estado: "BORRADOR" | "PAGADA") => {
    setProcesando(true);
    try {
      const payload = {
        id_empresa: idEmpresa,
        id_cliente: data.id_cliente,
        metodo_pago: data.metodo_pago,
        estado: estado === "PAGADA" && data.metodo_pago === "CREDITO" ? "PENDIENTE" : estado,
        dias_credito: data.metodo_pago === "CREDITO" ? data.dias_credito : 0,
        items: data.items.map((i) => ({
          id_producto: i.id_producto,
          cantidad: i.cantidad,
          precio_personalizado: i.precio,
          descuento_porcentaje: i.descuento_porcentaje,
        })),
      };
      const res = await api.post("/facturas", payload);
      toast.success(`Factura ${buildNroFactura(res.data.data) || "Guardada"} creada`);
      form.reset();
      setClienteObj(null);
      setBusquedaCliente("");
      setUltimaFacturaNro(buildNroFactura(res.data.data));
    } catch (error: any) {
      const mensaje = error?.response?.data?.message || "Error al guardar la factura";
      toast.error(mensaje, {
        duration: 6000,
        description: "Verifica el stock y los precios antes de continuar.",
      });
    } finally {
      setProcesando(false);
    }
  };

  // --- IMPORTAR PEDIDO ---
  const abrirImportarPedido = async () => {
    setCargandoPedidos(true);
    setModalImportarPedidoOpen(true);
    try {
      const res = await api.get("/pedidos/revisados");
      setPedidosRevisados(res.data || []);
    } catch {
      toast.error("Error cargando pedidos revisados");
    } finally {
      setCargandoPedidos(false);
    }
  };

  const handleImportarPedido = (pedido: any) => {
    // Poblar cliente
    if (pedido.cliente) {
      handleClienteSelect(pedido.cliente);
    }
    // Poblar items
    form.setValue("items", []);
    const itemsRaw = pedido.detalles || pedido.items || [];
    itemsRaw.forEach((item: any) => {
      append({
        id_producto: item.id_producto,
        codigo: item.producto?.codigo || "",
        nombre: item.producto?.nombre || "",
        cantidad: Number(item.cantidad),
        precio: Number(item.precio_unitario || 0),
        descuento_porcentaje: Number(item.descuento_porcentaje || 0),
        stock_max: Number(item.producto?.stock_disponible ?? item.producto?.stock ?? 0),
      });
    });
    if (pedido.observaciones) form.setValue("observaciones", pedido.observaciones);
    setModalImportarPedidoOpen(false);
    toast.success(`Pedido importado correctamente`);
  };

  const pedidosFiltrados = pedidosRevisados.filter((p) => {
    const q = busquedaPedido.toLowerCase();
    return (
      p.numero_pedido?.toLowerCase().includes(q) ||
      p.id_pedido_local?.toLowerCase().includes(q) ||
      p.cliente?.razon_social?.toLowerCase().includes(q) ||
      p.vendedor?.nombre_apellido?.toLowerCase().includes(q)
    );
  });

  // --- BUSCAR FACTURA ---
  const abrirBuscarFactura = async () => {
    setCargandoFacturas(true);
    setModalBuscarFacturaOpen(true);
    try {
      const res = await api.get("/facturas", { params: { id_empresa: idEmpresa } });
      setFacturasLista(res.data || []);
    } catch {
      toast.error("Error cargando facturas");
    } finally {
      setCargandoFacturas(false);
    }
  };

  const handleVerFactura = async (factura: any) => {
    try {
      const res = await api.get(`/facturas/${factura.id_factura}`);
      setFacturaRevisada(res.data);
      setModoRevision(true);
      setModalBuscarFacturaOpen(false);
      setBusquedaFactura("");
    } catch {
      toast.error("Error cargando el detalle de la factura");
    }
  };

  const salirModoRevision = () => {
    setModoRevision(false);
    setFacturaRevisada(null);
  };

  const facturasFiltradas = facturasLista.filter((f) => {
    const q = busquedaFactura.toLowerCase();
    return (
      buildNroFactura(f).toLowerCase().includes(q) ||
      f.cliente?.razon_social?.toLowerCase().includes(q)
    );
  });

  // --- NUEVO CLIENTE ---
  const handleGuardarNuevoCliente = async (data: NuevoClienteValues) => {
    setGuardandoCliente(true);
    try {
      const res = await api.post("/clientes", { ...data, id_empresa: idEmpresa });
      const nuevo = res.data;
      setClientes((prev) => [...prev, nuevo]);
      handleClienteSelect(nuevo);
      setModalNuevoClienteOpen(false);
      clienteForm.reset();
      toast.success("Cliente creado correctamente");
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Error al crear cliente";
      toast.error(msg);
    } finally {
      setGuardandoCliente(false);
    }
  };

  // --- IMPRIMIR PDF (placeholder) ---
  const handleImprimirPDF = () => {
    toast.info("Modelo de impresión pendiente de definir", {
      description: "El diseño de la factura PDF será configurado en la próxima sesión.",
    });
  };

  // ============================================================
  // MODO REVISIÓN — factura procesada en solo lectura
  // ============================================================
  if (modoRevision && facturaRevisada) {
    const f = facturaRevisada;
    const itemsF = f.detalles || [];
    const subtotalF = Number(f.subtotal_base || 0);
    const ivaF = Number(f.monto_iva || 0);
    const totalF = Number(f.total_pagar || 0);

    return (
      <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-50 text-sm">
        {/* BARRA MODO REVISIÓN */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm h-16">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-amber-800">Modo revisión — {buildNroFactura(f)}</span>
            <Badge className="bg-amber-100 text-amber-700 border border-amber-300 font-medium">
              {f.estado}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleImprimirPDF}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir PDF
            </Button>
            <Button variant="outline" className="h-9" onClick={salirModoRevision}>
              <X className="h-4 w-4 mr-2" /> Cerrar revisión
            </Button>
          </div>
        </div>

        {/* CUERPO REVISIÓN */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-[1100px] bg-white border border-slate-200 shadow-sm rounded-lg p-8 min-h-[800px]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-light text-slate-800 flex items-center gap-2">
                  <FileText className="h-8 w-8 text-slate-300" />
                  {buildNroFactura(f)}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Emitida: {f.fecha_emision ? format(new Date(f.fecha_emision), "dd/MM/yyyy") : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-xs font-bold text-slate-500">TASA BCV:</span>
                <span className="text-sm font-mono font-bold text-slate-800">
                  Bs. {Number(f.tasa_cambio || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                <div className="font-bold text-blue-700 text-base mt-1">{f.cliente?.razon_social}</div>
                <div className="text-sm text-slate-500">{f.cliente?.rif}</div>
                <div className="text-sm text-slate-500">{f.cliente?.direccion_fiscal}</div>
              </div>
              <div className="pl-4 border-l border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Método de pago</span>
                  <span className="font-medium text-slate-800">{f.metodo_pago}</span>
                </div>
                {f.dias_credito > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Días de crédito</span>
                    <span className="font-medium text-slate-800">{f.dias_credito}</span>
                  </div>
                )}
              </div>
            </div>

            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  <TableHead className="font-bold text-slate-900 pl-0">Producto</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">Cant.</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">Precio ($)</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">Desc (%)</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 pr-0">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsF.map((item: any, idx: number) => {
                  const cant = Number(item.cantidad);
                  const prec = Number(item.precio_unitario || 0);
                  const desc = Number(item.descuento_porcentaje || 0);
                  const sub = Number(item.total_linea || cant * prec * (1 - desc / 100));
                  return (
                    <TableRow key={idx} className="border-b border-slate-100">
                      <TableCell className="pl-0">
                        <div className="font-medium text-slate-800">{item.nombre_producto || item.producto?.nombre}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.codigo_producto || item.producto?.codigo}</div>
                      </TableCell>
                      <TableCell className="text-right">{cant}</TableCell>
                      <TableCell className="text-right">${prec.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{desc}%</TableCell>
                      <TableCell className="text-right font-bold pr-0">
                        ${sub.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-end mt-8">
              <div className="w-1/3 min-w-[300px] bg-slate-50 p-6 rounded-lg border border-slate-100">
                <div className="flex justify-between text-sm text-slate-600 pb-2 border-b border-slate-200">
                  <span className="font-medium">Subtotal</span>
                  <span>${subtotalF.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 py-2 border-b border-slate-200">
                  <span>Impuestos (16%)</span>
                  <span>${ivaF.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-end pt-3">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-slate-900">
                    ${totalF.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {f.tasa_cambio > 0 && (
                  <div className="flex justify-between text-xs text-slate-500 mt-2 bg-white px-2 py-1 rounded border border-slate-200">
                    <span>Equivalente en Bs:</span>
                    <span className="font-mono font-bold">
                      Bs {(totalF * Number(f.tasa_cambio)).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {f.observaciones && (
              <div className="mt-6 p-4 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</p>
                <p className="text-sm text-slate-700">{f.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MODO NORMAL — NUEVA FACTURA
  // ============================================================
  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-50 text-sm">

      {/* 1. BARRA DE ACCIÓN SUPERIOR */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm h-16">
        <div className="flex gap-2">
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm h-9 px-4"
            onClick={form.handleSubmit((d) => onSubmit(d, "PAGADA"))}
            disabled={procesando}
          >
            Confirmar Venta
          </Button>
          <Button
            variant="outline"
            className="text-slate-700 border-slate-300 h-9 hover:bg-slate-50"
            onClick={form.handleSubmit((d) => onSubmit(d, "BORRADOR"))}
            disabled={procesando}
          >
            <Save className="h-4 w-4 mr-1" /> Borrador
          </Button>
          <Button
            variant="outline"
            className="text-slate-700 border-slate-300 h-9 hover:bg-slate-50"
            onClick={abrirImportarPedido}
          >
            <ClipboardList className="h-4 w-4 mr-1" /> Importar Pedido
          </Button>
          <Button
            variant="outline"
            className="text-slate-600 border-slate-300 h-9 hover:bg-slate-50"
            onClick={abrirBuscarFactura}
          >
            <Eye className="h-4 w-4 mr-1" /> Buscar Factura
          </Button>
          <Button
            variant="ghost"
            className="text-slate-500 hover:text-red-600 h-9"
            onClick={() => { form.reset(); setClienteObj(null); setBusquedaCliente(""); }}
          >
            Descartar
          </Button>
        </div>

        {/* STATUS BAR */}
        <div className="flex items-center gap-4">
          {ultimaFacturaNro && (
            <span className="text-xs text-slate-400 font-mono">
              Última: <span className="font-bold text-slate-600">{ultimaFacturaNro}</span>
            </span>
          )}
          <div className="flex items-center bg-slate-100 rounded-full px-1 py-1 border border-slate-200">
            {["Borrador", "Publicado", "Pagado"].map((status, idx) => (
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
      </div>

      {/* 2. CUERPO DE LA FACTURA */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-[1100px] bg-white border border-slate-200 shadow-sm rounded-lg p-8 min-h-[800px]">

          {/* CABECERA */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-light text-slate-800 flex items-center gap-2">
                <FileText className="h-8 w-8 text-slate-300" />
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

          {/* FORMULARIO SUPERIOR */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">

            {/* COLUMNA IZQUIERDA: CLIENTE */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                    onClick={() => setModalNuevoClienteOpen(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Nuevo cliente
                  </Button>
                </div>

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
                      <Search className="h-4 w-4 text-slate-400 -ml-6 pointer-events-none group-focus-within:text-blue-600" />
                    </div>
                    {mostrarResultadosClientes && busquedaCliente && (
                      <div className="absolute z-50 bg-white border border-slate-200 shadow-xl w-full mt-1 max-h-48 overflow-auto rounded-md">
                        {clientes
                          .filter((c) => c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase()))
                          .map((c) => (
                            <div
                              key={c.id_cliente}
                              className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0 border-slate-100"
                              onClick={() => handleClienteSelect(c)}
                            >
                              <div className="font-bold text-slate-800">{c.razon_social}</div>
                              <div className="text-xs text-slate-500 flex gap-2">
                                <Badge variant="secondary" className="text-[10px] h-5">{c.rif}</Badge>
                                <span className="truncate max-w-[200px]">{c.direccion_fiscal}</span>
                              </div>
                            </div>
                          ))}
                        {clientes.filter((c) => c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())).length === 0 && (
                          <div className="p-3 text-sm text-slate-400 text-center">Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="group flex items-center justify-between border border-transparent hover:border-slate-200 hover:bg-slate-50 p-2 -ml-2 rounded transition-all">
                    <div>
                      <div className="font-bold text-blue-700 cursor-pointer hover:underline text-base flex items-center gap-2">
                        <User className="h-4 w-4" /> {clienteObj.razon_social}
                      </div>
                      <div className="text-sm text-slate-600 pl-6">{clienteObj.direccion_fiscal}</div>
                      <div className="text-xs text-slate-400 pl-6 mt-0.5">RIF: {clienteObj.rif}</div>

                      {/* LÍMITE DE CRÉDITO */}
                      {metodoPago === "CREDITO" && limiteCredito !== null && (
                        <div className={cn(
                          "pl-6 mt-1 text-xs font-medium flex items-center gap-1",
                          excedeLimite ? "text-red-600" : "text-green-600"
                        )}>
                          {excedeLimite ? (
                            <><AlertCircle className="h-3 w-3" /> Excede límite — Disponible: ${Number(limiteCredito).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
                          ) : (
                            <>Límite de crédito: ${Number(limiteCredito).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setClienteObj(null); form.setValue("id_cliente", ""); }}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
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
                    <Button
                      variant="ghost"
                      className="h-8 justify-start text-left font-normal px-2 hover:bg-slate-50 w-48 border-b border-slate-300 rounded-none text-slate-900"
                    >
                      {fechaEmision ? format(fechaEmision, "dd/MM/yyyy") : <span>Seleccionar</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaEmision}
                      onSelect={(d) => d && form.setValue("fecha_emision", d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600">Términos de Pago</label>
                <Select
                  value={metodoPago}
                  onValueChange={(val) => {
                    form.setValue("metodo_pago", val);
                    if (val !== "CREDITO") form.setValue("dias_credito", 0);
                  }}
                >
                  <SelectTrigger className="h-8 border-t-0 border-x-0 border-b border-slate-300 rounded-none shadow-none focus:ring-0 px-2 w-48 text-right font-medium text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO_USD">Efectivo ($)</SelectItem>
                    <SelectItem value="EFECTIVO_BSD">Efectivo (Bs)</SelectItem>
                    <SelectItem value="PUNTO_VENTA">Punto de Venta (TDD/TDC)</SelectItem>
                    <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia Nacional</SelectItem>
                    <SelectItem value="ZELLE">Zelle</SelectItem>
                    <SelectItem value="BINANCE">Binance / USDT</SelectItem>
                    <SelectItem value="CREDITO">Crédito (Neto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {metodoPago === "CREDITO" && (
                <div className="flex items-center justify-between animate-in fade-in slide-in-from-left-2">
                  <label className="text-sm font-medium text-slate-600">Días de Crédito</label>
                  <Input
                    type="number"
                    className="h-8 border-t-0 border-x-0 border-b border-slate-300 rounded-none shadow-none px-2 w-48 text-right font-medium"
                    {...form.register("dias_credito")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* PESTAÑAS Y TABLA */}
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
                    const sub = cant * prec * (1 - desc / 100);
                    const stock = form.watch(`items.${index}.stock_max`);

                    return (
                      <TableRow key={field.id} className="group border-b border-slate-100 hover:bg-slate-50/80">
                        <TableCell className="p-0 relative pl-0">
                          <div className="flex flex-col py-2 cursor-text relative">
                            <div className="flex gap-2 items-center">
                              <span className="font-medium text-slate-800 text-sm">
                                {form.getValues(`items.${index}.nombre`)}
                              </span>
                              {cant > stock && <AlertCircle className="h-3 w-3 text-red-500" />}
                            </div>
                            <div className="flex gap-2 text-xs text-slate-400 font-mono">
                              <span>{form.getValues(`items.${index}.codigo`)}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              className="absolute inset-0 w-full h-full opacity-0 z-10"
                              onClick={() => {
                                setIndexFilaActiva(index);
                                setBusquedaProd("");
                                setModalProductoOpen(true);
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-0">
                          <Input
                            type="number"
                            className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent font-medium"
                            {...form.register(`items.${index}.cantidad`)}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent text-slate-600"
                            {...form.register(`items.${index}.precio`)}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <Input
                            type="number"
                            className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent text-slate-500"
                            {...form.register(`items.${index}.descuento_porcentaje`)}
                          />
                        </TableCell>
                        <TableCell className="text-right pr-0 font-bold text-slate-900">
                          {sub.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="p-0 text-center">
                          <Trash2
                            className="h-4 w-4 text-slate-300 hover:text-red-500 cursor-pointer mx-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => remove(index)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableRow>
                    <TableCell colSpan={6} className="p-2 pl-0">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 pl-2 h-8 font-medium text-sm"
                        onClick={() => {
                          setIndexFilaActiva(null);
                          setBusquedaProd("");
                          setModalProductoOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Agrega una línea
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* TOTALES */}
              <div className="flex justify-end mt-8">
                <div className="w-1/3 min-w-[300px] bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-sm text-slate-600 pb-2 border-b border-slate-200">
                    <span className="font-medium">Subtotal</span>
                    <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 py-2 border-b border-slate-200">
                    <span>Impuestos (16%)</span>
                    <span>${iva.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-end pt-3">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-slate-900">
                      ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-2 bg-white px-2 py-1 rounded border border-slate-200">
                    <span>Equivalente en Bs:</span>
                    <span className="font-mono font-bold">
                      Bs {totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="info">
              <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50">
                <label className="text-sm font-bold text-slate-700 block mb-2">
                  Notas internas / Observaciones
                </label>
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

      {/* ====================================================== */}
      {/* MODAL — CATÁLOGO DE PRODUCTOS                          */}
      {/* ====================================================== */}
      <Dialog open={modalProductoOpen} onOpenChange={(open) => { setModalProductoOpen(open); if (!open) setBusquedaProd(""); }}>
        <DialogContent style={{ maxWidth: "860px", width: "90vw" }} className="p-0 gap-0 flex flex-col" >
          <DialogHeader className="px-6 pt-7 pb-4 border-b border-slate-200 shrink-0">
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-slate-500" /> Buscar Producto
            </DialogTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código... (mínimo 2 caracteres)"
                className="pl-9 bg-white border-slate-300 focus-visible:ring-slate-400 h-9"
                value={busquedaProd}
                onChange={(e) => setBusquedaProd(e.target.value)}
                autoFocus
              />
            </div>
          </DialogHeader>

          {/* Altura fija — siempre muestra espacio para ~10 filas */}
          <div className="overflow-y-auto px-6" style={{ height: "420px" }}>
            <Table>
              <TableHeader className="bg-white sticky top-0 z-10 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[160px] pl-0 font-semibold text-slate-600 text-xs uppercase tracking-wide">Código</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Nombre</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 text-xs uppercase tracking-wide">Stock Disp.</TableHead>
                  <TableHead className="text-right pr-0 font-semibold text-slate-600 text-xs uppercase tracking-wide">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buscandoProd ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      Buscando...
                    </TableCell>
                  </TableRow>
                ) : busquedaProd.length < 2 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      Escribe al menos 2 caracteres para buscar
                    </TableCell>
                  </TableRow>
                ) : filteredProds.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      Sin resultados con existencia para "{busquedaProd}"
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProds.map((p) => {
                    const stockDisp = p.stock_disponible ?? p.stock ?? 0;
                    return (
                      <TableRow
                        key={p.id_producto}
                        className="cursor-pointer hover:bg-blue-50 text-sm border-b border-slate-100 last:border-0 transition-colors"
                        onClick={() => handleProductoSelect(p)}
                      >
                        <TableCell className="pl-0 font-mono text-xs text-slate-500">{p.codigo}</TableCell>
                        <TableCell className="font-medium text-slate-800">{p.nombre}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-normal bg-green-50 text-green-700 border-green-200">
                            {stockDisp}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-0 font-semibold text-slate-800">
                          ${Number(p.precio_venta).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====================================================== */}
      {/* MODAL — IMPORTAR PEDIDO REVISADO                       */}
      {/* ====================================================== */}
      <Dialog open={modalImportarPedidoOpen} onOpenChange={setModalImportarPedidoOpen}>
        <DialogContent style={{ maxWidth: "860px", width: "90vw" }} className="p-4 gap-4 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-slate-500" /> Importar Pedido Revisado
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por número o cliente..."
              className="pl-9 border-slate-300 focus-visible:ring-slate-400 h-9"
              value={busquedaPedido}
              onChange={(e) => setBusquedaPedido(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto rounded border border-slate-200" style={{ height: "420px" }}>
            <Table>
              <TableHeader className="bg-white sticky top-0 z-10 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Número</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Cliente</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Vendedor</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 text-xs uppercase tracking-wide">Total</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoPedidos ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      Cargando pedidos revisados...
                    </TableCell>
                  </TableRow>
                ) : pedidosFiltrados.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      No hay pedidos revisados pendientes de facturar
                    </TableCell>
                  </TableRow>
                ) : (
                  pedidosFiltrados.map((p) => (
                    <TableRow key={p.id_pedido} className="border-b border-slate-100 hover:bg-blue-50 text-sm transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {p.numero_pedido ?? p.id_pedido_local ?? p.id_pedido.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-slate-700">{p.cliente?.razon_social}</TableCell>
                      <TableCell className="text-slate-500">{p.vendedor?.nombre_apellido ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        ${Number(p.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {p.fecha_revision
                          ? format(new Date(p.fecha_revision), "dd/MM/yyyy")
                          : p.fecha
                          ? format(new Date(p.fecha), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-7 bg-slate-900 hover:bg-slate-700 text-white text-xs"
                          onClick={() => handleImportarPedido(p)}
                        >
                          Importar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====================================================== */}
      {/* MODAL — BUSCAR FACTURA                                 */}
      {/* ====================================================== */}
      <Dialog open={modalBuscarFacturaOpen} onOpenChange={setModalBuscarFacturaOpen}>
        <DialogContent style={{ maxWidth: "860px", width: "90vw" }} className="p-4 gap-4 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Eye className="h-5 w-5 text-slate-500" /> Buscar Factura
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por número o cliente..."
              className="pl-9 border-slate-300 focus-visible:ring-slate-400 h-9"
              value={busquedaFactura}
              onChange={(e) => setBusquedaFactura(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto rounded border border-slate-200" style={{ height: "420px" }}>
            <Table>
              <TableHeader className="bg-white sticky top-0 z-10 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Número</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Cliente</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Estado</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 text-xs uppercase tracking-wide">Total</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoFacturas ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      Cargando facturas...
                    </TableCell>
                  </TableRow>
                ) : facturasFiltradas.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-slate-400 text-sm" style={{ height: "360px" }}>
                      {busquedaFactura ? `Sin resultados para "${busquedaFactura}"` : "No hay facturas"}
                    </TableCell>
                  </TableRow>
                ) : (
                  facturasFiltradas.map((f) => (
                    <TableRow key={f.id_factura} className="border-b border-slate-100 hover:bg-blue-50 text-sm transition-colors">
                      <TableCell className="font-mono font-bold text-slate-700">{buildNroFactura(f)}</TableCell>
                      <TableCell className="text-slate-700">{f.cliente?.razon_social}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-xs font-normal",
                          f.estado === "PAGADA" ? "bg-green-50 text-green-700 border-green-200" :
                          f.estado === "PENDIENTE" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          f.estado === "ANULADA" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {f.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        ${Number(f.total_pagar || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {f.fecha_emision ? format(new Date(f.fecha_emision), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-slate-300"
                          onClick={() => handleVerFactura(f)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====================================================== */}
      {/* MODAL — NUEVO CLIENTE                                  */}
      {/* ====================================================== */}
      <Dialog open={modalNuevoClienteOpen} onOpenChange={setModalNuevoClienteOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-slate-500" /> Nuevo Cliente
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 -mt-2">
            Completa los datos básicos. Podés agregar el resto desde la sección de Clientes.
          </p>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Razón Social *</label>
              <Input
                className="mt-1 border-slate-300 focus-visible:ring-slate-400"
                placeholder="Empresa S.A."
                {...clienteForm.register("razon_social")}
              />
              {clienteForm.formState.errors.razon_social && (
                <p className="text-xs text-red-500 mt-1">{clienteForm.formState.errors.razon_social.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">RIF *</label>
              <Input
                className="mt-1 border-slate-300 focus-visible:ring-slate-400"
                placeholder="J-12345678-9"
                {...clienteForm.register("rif")}
              />
              {clienteForm.formState.errors.rif && (
                <p className="text-xs text-red-500 mt-1">{clienteForm.formState.errors.rif.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                <Input
                  className="mt-1 border-slate-300 focus-visible:ring-slate-400"
                  placeholder="0414-0000000"
                  {...clienteForm.register("telefono")}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Correo</label>
                <Input
                  className="mt-1 border-slate-300 focus-visible:ring-slate-400"
                  placeholder="correo@empresa.com"
                  {...clienteForm.register("correo")}
                />
                {clienteForm.formState.errors.correo && (
                  <p className="text-xs text-red-500 mt-1">{clienteForm.formState.errors.correo.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Dirección Fiscal</label>
              <Input
                className="mt-1 border-slate-300 focus-visible:ring-slate-400"
                placeholder="Av. Principal..."
                {...clienteForm.register("direccion_fiscal")}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button
              variant="ghost"
              className="text-slate-500"
              onClick={() => { setModalNuevoClienteOpen(false); clienteForm.reset(); }}
              disabled={guardandoCliente}
            >
              Cancelar
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={clienteForm.handleSubmit(handleGuardarNuevoCliente)}
              disabled={guardandoCliente}
            >
              {guardandoCliente ? "Guardando..." : "Crear Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}