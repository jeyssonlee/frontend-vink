"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList, Search, Plus, Trash2, Save, Send,
  Package, ChevronLeft, User, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Cliente {
  id_cliente: string;
  razon_social: string;
  rif: string;
  dias_credito_default: number;
  tipo_precio: string;
}

interface Producto {
  id_producto: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  stock_disponible: number;
}

interface LineaPedido {
  id_producto: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  stock_disponible: number;
}

export default function NuevoPedidoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editarId = searchParams.get("editar");
  const esEdicion = !!editarId;

  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarDropCliente, setMostrarDropCliente] = useState(false);

  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mostrarDropProducto, setMostrarDropProducto] = useState(false);

  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [nota, setNota] = useState("");
  const [metodoPago, setMetodoPago] = useState("CREDITO");
  const [diasCredito, setDiasCredito] = useState(15);
  const [guardando, setGuardando] = useState(false);

  // Cargar clientes y productos al montar
  useEffect(() => {
    api.get("/clientes").then(r => setClientes(r.data)).catch(() => {});
    api.get("/productos/inventario-consulta").then(r => setProductos(r.data)).catch(() => {});
  }, []);

  // Si es edición, cargar pedido existente
  useEffect(() => {
    if (!editarId) return;
    api.get(`/pedidos/${editarId}`).then(({ data }) => {
      if (data.cliente) setClienteSeleccionado(data.cliente);
      if (data.nota) setNota(data.nota);
      if (data.metodo_pago) setMetodoPago(data.metodo_pago);
      if (data.dias_credito) setDiasCredito(data.dias_credito);
      if (data.detalles) {
        setLineas(data.detalles.map((d: any) => ({
          id_producto: d.id_producto,
          codigo: d.producto?.codigo || "",
          nombre: d.producto?.nombre || d.id_producto,
          cantidad: d.cantidad,
          precio_unitario: Number(d.precio_unitario),
          stock_disponible: 9999,
        })));
      }
    }).catch(() => toast.error("Error al cargar pedido"));
  }, [editarId]);

  const clientesFiltrados = clientes.filter(c =>
    busquedaCliente.length > 1 && (
      c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      c.rif.toLowerCase().includes(busquedaCliente.toLowerCase())
    )
  ).slice(0, 6);

  const productosFiltrados = productos.filter(p =>
    busquedaProducto.length > 1 && (
      p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase())
    )
  ).slice(0, 8);

  const seleccionarCliente = (c: Cliente) => {
    setClienteSeleccionado(c);
    setBusquedaCliente(c.razon_social);
    setMostrarDropCliente(false);
    setDiasCredito(c.dias_credito_default || 15);
  };

  const agregarProducto = (p: Producto) => {
    const existe = lineas.find(l => l.id_producto === p.id_producto);
    if (existe) {
      setLineas(lineas.map(l =>
        l.id_producto === p.id_producto ? { ...l, cantidad: l.cantidad + 1 } : l
      ));
    } else {
      setLineas([...lineas, {
        id_producto: p.id_producto,
        codigo: p.codigo,
        nombre: p.nombre,
        cantidad: 1,
        precio_unitario: Number(p.precio_venta),
        stock_disponible: p.stock_disponible,
      }]);
    }
    setBusquedaProducto("");
    setMostrarDropProducto(false);
  };

  const actualizarLinea = (idx: number, campo: "cantidad" | "precio_unitario", valor: number) => {
    setLineas(lineas.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  };

  const eliminarLinea = (idx: number) => {
    setLineas(lineas.filter((_, i) => i !== idx));
  };

  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);

  const buildPayload = () => ({
    id_cliente: clienteSeleccionado!.id_cliente,
    nota: nota || undefined,
    metodo_pago: metodoPago,
    dias_credito: diasCredito,
    detalles: lineas.map(l => ({
      id_producto: l.id_producto,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    })),
  });

  const guardarBorrador = async () => {
    if (!clienteSeleccionado) return toast.error("Selecciona un cliente");
    if (lineas.length === 0) return toast.error("Agrega al menos un producto");
    try {
      setGuardando(true);
      if (esEdicion) {
        await api.patch(`/pedidos/${editarId}`, buildPayload());
        toast.success("Pedido actualizado");
      } else {
        await api.post("/pedidos", buildPayload());
        toast.success("Borrador guardado");
      }
      router.push("/dashboard/pedidos");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const enviarPedido = async () => {
    if (!clienteSeleccionado) return toast.error("Selecciona un cliente");
    if (lineas.length === 0) return toast.error("Agrega al menos un producto");
    try {
      setGuardando(true);
      let idPedido = editarId;
      if (!esEdicion) {
        const { data } = await api.post("/pedidos", buildPayload());
        idPedido = data.id_pedido;
      } else {
        await api.patch(`/pedidos/${editarId}`, buildPayload());
      }
      await api.patch(`/pedidos/${idPedido}/enviar`);
      toast.success("Pedido enviado a revisión");
      router.push("/dashboard/pedidos");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al enviar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 gap-1"
            onClick={() => router.push("/dashboard/pedidos")}>
            <ChevronLeft className="h-3.5 w-3.5" /> Mis Pedidos
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {esEdicion ? "Editar Pedido" : "Nuevo Pedido"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1.5"
            onClick={guardarBorrador} disabled={guardando}>
            <Save className="h-3.5 w-3.5" /> Guardar Borrador
          </Button>
          <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase gap-1.5"
            onClick={enviarPedido} disabled={guardando}>
            <Send className="h-3.5 w-3.5" /> Enviar a Revisión
          </Button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* CLIENTE */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" /> Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar cliente por nombre o RIF..."
                    className="pl-9 h-9 text-sm"
                    value={busquedaCliente}
                    onChange={(e) => { setBusquedaCliente(e.target.value); setMostrarDropCliente(true); setClienteSeleccionado(null); }}
                    onFocus={() => setMostrarDropCliente(true)}
                  />
                  {mostrarDropCliente && clientesFiltrados.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      {clientesFiltrados.map(c => (
                        <button key={c.id_cliente} onClick={() => seleccionarCliente(c)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{c.razon_social}</div>
                            <div className="text-xs text-slate-400 font-mono">{c.rif}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{c.tipo_precio}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {clienteSeleccionado && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{clienteSeleccionado.razon_social}</div>
                      <div className="text-xs text-slate-500 font-mono">{clienteSeleccionado.rif}</div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                      {clienteSeleccionado.tipo_precio}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CONDICIONES */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-500" /> Condiciones
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Método de Pago</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDITO">Crédito</SelectItem>
                      <SelectItem value="CONTADO">Contado</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Días de Crédito</Label>
                  <Input
                    type="number"
                    className="h-9 text-sm mt-1"
                    value={diasCredito}
                    onChange={(e) => setDiasCredito(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PRODUCTOS */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" /> Productos
              </CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar y agregar producto..."
                  className="pl-9 h-8 text-sm"
                  value={busquedaProducto}
                  onChange={(e) => { setBusquedaProducto(e.target.value); setMostrarDropProducto(true); }}
                  onFocus={() => setMostrarDropProducto(true)}
                />
                {mostrarDropProducto && productosFiltrados.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    {productosFiltrados.map(p => (
                      <button key={p.id_producto} onClick={() => agregarProducto(p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{p.nombre}</div>
                          <div className="text-xs text-slate-400 font-mono">{p.codigo}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-700 text-sm">${Number(p.precio_venta).toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">Stock: {p.stock_disponible}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {lineas.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Busca y agrega productos al pedido</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-6 py-3">Producto</th>
                      <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-28">Cantidad</th>
                      <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-36">Precio Unit.</th>
                      <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-6 py-3 w-32">Subtotal</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineas.map((l, idx) => (
                      <tr key={l.id_producto} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3">
                          <div className="font-bold text-slate-800 text-sm">{l.nombre}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{l.codigo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={1}
                            value={l.cantidad}
                            onChange={(e) => actualizarLinea(idx, "cantidad", Number(e.target.value))}
                            className="h-8 text-sm text-center w-24 mx-auto"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={l.precio_unitario}
                            onChange={(e) => actualizarLinea(idx, "precio_unitario", Number(e.target.value))}
                            className="h-8 text-sm text-right w-32 ml-auto"
                          />
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800">
                          ${(l.cantidad * l.precio_unitario).toFixed(2)}
                        </td>
                        <td className="pr-4">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => eliminarLinea(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                        Total del Pedido
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900 text-lg">
                        ${total.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>

          {/* NOTA */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-700">Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="Instrucciones especiales, condiciones de entrega, referencias..."
                className="text-sm resize-none"
                rows={3}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
