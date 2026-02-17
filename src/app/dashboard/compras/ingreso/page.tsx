"use client";

import { useState, useEffect } from "react";
import { 
  Save, Search, Trash2, Plus, Package, 
  ChevronRight, X, User, Check, AlertCircle, FileText, ShoppingBag 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function IngresoMercanciaPage() {
  // --- LÓGICA ORIGINAL (INTACTA) ---
  const [ids, setIds] = useState({ empresa: "", almacen: "" });
  const [loadingIds, setLoadingIds] = useState(true);
  const [nombreAlmacen, setNombreAlmacen] = useState("");

  const [proveedores, setProveedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    num_factura: "",
    id_proveedor: "",
    forma_pago: "CONTADO",
    detalles: [] as any[]
  });

  const initSystem = async () => {
      const idEmpresa = getEmpresaId() || localStorage.getItem("ID_EMPRESA_GLOBAL");
      if (!idEmpresa) {
          setLoadingIds(false);
          return toast.error("Sesión inválida");
      }
      try {
          const [resAlmacenes, resProv, resProd] = await Promise.all([
              api.get(`/almacenes?id_empresa=${idEmpresa}`),
              api.get(`/proveedores?id_empresa=${idEmpresa}`),
              api.get(`/productos?id_empresa=${idEmpresa}`)
          ]);
          const listaAlmacenes = resAlmacenes.data;
          if (listaAlmacenes && listaAlmacenes.length > 0) {
              const almacenPrincipal = listaAlmacenes[0];
              setIds({ empresa: idEmpresa, almacen: almacenPrincipal.id_almacen });
              setNombreAlmacen(almacenPrincipal.nombre || "Principal");
          }
          setProveedores(resProv.data);
          setProductos(resProd.data);
      } catch (error) {
          toast.error("Error cargando datos");
      } finally {
          setLoadingIds(false);
      }
  };

  useEffect(() => { initSystem(); }, []);

  const agregarLinea = () => {
    setForm({...form, detalles: [...form.detalles, { id_producto: "", cantidad: 1, costo_unitario: 0 }]});
  };

  const eliminarLinea = (index: number) => {
    setForm({...form, detalles: form.detalles.filter((_, i) => i !== index)});
  };

  const procesar = async () => {
      if (!ids.empresa || !ids.almacen) return toast.error("Falta Almacén");
      if (!form.num_factura) return toast.error("Falta Factura");
      if (!form.id_proveedor) return toast.error("Falta Proveedor");
      if (form.detalles.length === 0) return toast.error("Carrito vacío");

      try {
        const payload = {
            num_factura: form.num_factura,
            id_proveedor: form.id_proveedor,
            forma_pago: form.forma_pago,
            id_empresa: ids.empresa,
            id_almacen: ids.almacen,
            detalles: form.detalles.map(d => ({
                id_producto: d.id_producto,
                cantidad: Number(d.cantidad),
                costo_unitario: Number(d.costo_unitario)
            }))
        };
        await api.post('/compras', payload);
        toast.success("¡Ingreso Exitoso!");
        setForm({ num_factura: "", id_proveedor: "", forma_pago: "CONTADO", detalles: [] });
      } catch (error: any) {
          toast.error(error.response?.data?.message || "Error al procesar");
      }
  };

  // Cálculos para totales
  const totalInversion = form.detalles.reduce((acc, d) => acc + (d.cantidad * d.costo_unitario), 0);

  // --- RENDERIZADO VISUAL (ESTILO VENTAS) ---
  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-50 text-sm">
      
      {/* 1. BARRA DE ACCIÓN SUPERIOR (Idéntica a Ventas) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm h-16">
        <div className="flex items-center gap-4">
             {/* SidebarTrigger integrado */}
             <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                <SidebarTrigger />
             </div>

             <div className="flex gap-2">
                <Button 
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm h-9 px-4"
                    onClick={procesar}
                >
                    Confirmar Ingreso
                </Button>
                <Button 
                    variant="ghost" 
                    className="text-slate-500 hover:text-red-600 h-9" 
                    onClick={() => setForm({ num_factura: "", id_proveedor: "", forma_pago: "CONTADO", detalles: [] })}
                >
                    Descartar
                </Button>
            </div>
        </div>

        {/* STATUS BAR (Cinta de Estado) */}
        <div className="flex items-center bg-slate-100 rounded-full px-1 py-1 border border-slate-200">
             {['Borrador', 'Recibido'].map((status, idx) => (
                 <div key={status} className="flex items-center">
                     <div className={cn(
                         "px-4 py-1 rounded-full font-medium text-xs uppercase tracking-wide cursor-default transition-all",
                         idx === 0 
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                            : "text-slate-400"
                     )}>
                         {status}
                     </div>
                     {idx < 1 && <ChevronRight className="h-3 w-3 text-slate-300 mx-1" />}
                 </div>
             ))}
        </div>
      </div>

      {/* 2. CUERPO DEL DOCUMENTO (HOJA DE PAPEL) */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-[1100px] bg-white border border-slate-200 shadow-sm rounded-lg p-8 min-h-[800px]">
            
            {/* CABECERA DOCUMENTO */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 flex items-center gap-2">
                        <Package className="h-8 w-8 text-slate-300"/>
                        Nuevo Ingreso <span className="text-slate-300">/ Borrador</span>
                    </h1>
                </div>
                {/* Info de Almacén (Ocupando el lugar de la Tasa BCV en Ventas) */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Destino:</span>
                    <span className="text-xs font-bold text-slate-800 uppercase">{nombreAlmacen}</span>
                </div>
            </div>

            {/* FORMULARIO SUPERIOR (2 COLUMNAS) */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">
                
                {/* COLUMNA IZQUIERDA: PROVEEDOR */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</label>
                        <Select 
                            value={form.id_proveedor} 
                            onValueChange={(v) => setForm({...form, id_proveedor: v})}
                        >
                            <SelectTrigger className="border-t-0 border-x-0 border-b border-slate-300 rounded-none px-0 focus:ring-0 h-9 text-base shadow-none bg-transparent font-bold text-blue-700">
                                <SelectValue placeholder="Seleccionar proveedor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {proveedores.map((p: any) => (
                                    <SelectItem key={p.id_proveedor} value={p.id_proveedor}>
                                        {p.nombre_empresa}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DATOS FISCALES */}
                <div className="space-y-4 pl-4 border-l border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-600">N° Factura Física</label>
                        <Input 
                            value={form.num_factura}
                            onChange={(e) => setForm({...form, num_factura: e.target.value})}
                            placeholder="Ej: 000123"
                            className="h-8 border-t-0 border-x-0 border-b border-slate-300 rounded-none shadow-none px-2 w-48 text-right font-medium text-slate-900 focus-visible:ring-0" 
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-600">Condición de Pago</label>
                        <Select 
                            value={form.forma_pago} 
                            onValueChange={(v) => setForm({...form, forma_pago: v})}
                        >
                            <SelectTrigger className="h-8 border-t-0 border-x-0 border-b border-slate-300 rounded-none shadow-none focus:ring-0 px-2 w-48 text-right font-medium text-slate-900">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CONTADO">Contado</SelectItem>
                                <SelectItem value="CREDITO">Crédito</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-600">Fecha de Registro</label>
                        <div className="h-8 flex items-center justify-end px-2 w-48 border-b border-slate-300 text-slate-500 cursor-not-allowed">
                            {format(new Date(), "dd/MM/yyyy")}
                        </div>
                    </div>
                </div>
            </div>

            {/* PESTAÑAS Y TABLA */}
            <Tabs defaultValue="lines" className="w-full">
                <TabsList className="bg-transparent p-0 border-b border-slate-200 w-full justify-start h-10 rounded-none gap-6">
                    <TabsTrigger 
                        value="lines" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Líneas de Compra
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-6">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-slate-200">
                                <TableHead className="w-[40%] font-bold text-slate-900 h-9 pl-0">Producto / Ítem</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9">Cantidad</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9">Costo ($)</TableHead>
                                <TableHead className="text-right font-bold text-slate-900 h-9 pr-0">Total Línea</TableHead>
                                <TableHead className="w-[30px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {form.detalles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-400 italic">
                                        No se han agregado productos al ingreso.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                form.detalles.map((d, i) => (
                                    <TableRow key={i} className="group border-b border-slate-100 hover:bg-slate-50/80">
                                        <TableCell className="p-0 relative pl-0">
                                            <div className="py-2">
                                                <Select 
                                                    value={d.id_producto} 
                                                    onValueChange={(v) => { const nd = [...form.detalles]; nd[i].id_producto = v; setForm({...form, detalles: nd}); }}
                                                >
                                                    <SelectTrigger className="border-none shadow-none focus:ring-0 bg-transparent h-auto p-0 font-medium text-slate-800 text-sm">
                                                        <SelectValue placeholder="Seleccionar producto..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {productos.map((p: any) => (
                                                            <SelectItem key={p.id_producto} value={p.id_producto}>{p.nombre}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    SKU: {d.id_producto ? d.id_producto.split('-')[0] : '---'}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input 
                                                type="number" 
                                                value={d.cantidad}
                                                onChange={(e) => { const nd = [...form.detalles]; nd[i].cantidad = e.target.value; setForm({...form, detalles: nd}); }}
                                                className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent font-medium" 
                                            />
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                value={d.costo_unitario}
                                                onChange={(e) => { const nd = [...form.detalles]; nd[i].costo_unitario = e.target.value; setForm({...form, detalles: nd}); }}
                                                className="h-full w-full border-none shadow-none text-right focus-visible:ring-0 bg-transparent text-slate-600" 
                                            />
                                        </TableCell>
                                        <TableCell className="text-right pr-0 font-bold text-slate-900">
                                            ${(d.cantidad * d.costo_unitario).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </TableCell>
                                        <TableCell className="p-0 text-center">
                                            <Trash2 
                                                className="h-4 w-4 text-slate-300 hover:text-red-500 cursor-pointer mx-auto opacity-0 group-hover:opacity-100 transition-opacity" 
                                                onClick={() => eliminarLinea(i)} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            
                            {/* BOTÓN AGREGAR LÍNEA */}
                            <TableRow>
                                <TableCell colSpan={5} className="p-2 pl-0">
                                    <Button 
                                        variant="ghost" 
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 pl-2 h-8 font-medium text-sm"
                                        onClick={agregarLinea}
                                    >
                                        Agrega una línea
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* TOTALES */}
                    <div className="flex justify-end mt-8">
                        <div className="w-1/3 min-w-[300px] bg-slate-50 p-6 rounded-lg border border-slate-100">
                            <div className="flex justify-between text-sm text-slate-600 pb-2 border-b border-slate-200">
                                <span className="font-medium">Total Ítems</span>
                                <span>{form.detalles.length}</span>
                            </div>
                            <div className="flex justify-between items-end pt-3">
                                <span className="text-lg font-bold text-slate-900">Total Inversión</span>
                                <span className="text-xl font-bold text-slate-900">
                                    ${totalInversion.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}