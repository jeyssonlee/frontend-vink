"use client";

import { useEffect, useState } from "react";
import {
  Receipt, RefreshCcw, Search, Filter, CheckSquare, Square,
  FileCheck, Package, User, Clock, AlertCircle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Pedido {
  id_pedido: string;
  fecha: string;
  total: number;
  metodo_pago: string;
  dias_credito: number;
  cliente?: { id_cliente: string; razon_social: string; rif: string; ciudad?: string };
  vendedor?: { id_vendedor: string; nombre_apellido: string };
  detalles?: any[];
}

export default function FacturacionPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("TODOS");
  const [filtroCliente, setFiltroCliente] = useState("TODOS");
  const [filtroCiudad, setFiltroCiudad] = useState("");

  // Selección
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  // Modales
  const [confirmar, setConfirmar] = useState(false);
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [procesando, setProcesando] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setSeleccionados(new Set());
      const params = new URLSearchParams();
      if (filtroVendedor !== "TODOS") params.set("vendedorId", filtroVendedor);
      if (filtroCliente !== "TODOS") params.set("clienteId", filtroCliente);
      if (filtroCiudad) params.set("ciudad", filtroCiudad);
      const { data } = await api.get(`/pedidos/revisados?${params}`);
      setPedidos(data);
    } catch {
      toast.error("Error al cargar pedidos revisados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    api.get("/vendedores").then(r => setVendedores(r.data)).catch(() => {});
    api.get("/clientes").then(r => setClientes(r.data)).catch(() => {});
  }, []);

  const filtered = pedidos.filter(p =>
    p.cliente?.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.id_pedido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const toggleSeleccion = (id: string) => {
    const nuevo = new Set(seleccionados);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    setSeleccionados(nuevo);
  };

  const toggleTodos = () => {
    if (seleccionados.size === filtered.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(filtered.map(p => p.id_pedido)));
    }
  };

  const totalSeleccionado = filtered
    .filter(p => seleccionados.has(p.id_pedido))
    .reduce((acc, p) => acc + Number(p.total), 0);

  const handleFacturar = async () => {
    if (seleccionados.size === 0) return;
    try {
      setProcesando(true);
      await api.post("/facturas/masivo", {
        ids_pedidos: Array.from(seleccionados),
      });
      toast.success(`${seleccionados.size} pedido(s) marcados como facturados`);
      setConfirmar(false);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al facturar");
    } finally {
      setProcesando(false);
    }
  };

  const abrirDetalle = async (p: Pedido) => {
    try {
      const { data } = await api.get(`/pedidos/${p.id_pedido}`);
      setPedidoDetalle(data);
    } catch {
      toast.error("Error al cargar detalle");
    }
  };

  const todosSeleccionados = filtered.length > 0 && seleccionados.size === filtered.length;
  const algunoSeleccionado = seleccionados.size > 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Plataforma / Pedidos / Facturación
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchData}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
        </Button>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-violet-50 rounded-lg flex items-center justify-center border border-violet-100">
            <Receipt className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Facturación en Lote</h1>
            <p className="text-sm text-slate-500">{pedidos.length} pedido(s) revisados listos para facturar</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar cliente..." className="pl-9 h-9 text-sm"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
            <SelectTrigger className="h-9 w-48 text-sm">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los vendedores</SelectItem>
              {vendedores.map(v => (
                <SelectItem key={v.id_vendedor} value={v.id_vendedor}>{v.nombre_apellido}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger className="h-9 w-48 text-sm">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los clientes</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id_cliente} value={c.id_cliente}>{c.razon_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Ciudad..." className="h-9 w-36 text-sm"
            value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} />
          <Button size="sm" className="h-9 text-xs font-bold bg-slate-900" onClick={fetchData}>
            Aplicar
          </Button>
        </div>

        {/* BARRA DE ACCIÓN FLOTANTE */}
        {algunoSeleccionado && (
          <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-sm">{seleccionados.size} pedido(s) seleccionado(s)</div>
                <div className="text-slate-400 text-xs">Total a facturar: ${totalSeleccionado.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border-white/20 text-white hover:bg-white/10"
                onClick={() => setSeleccionados(new Set())}>
                Limpiar
              </Button>
              <Button size="sm" className="h-8 bg-violet-600 hover:bg-violet-700 text-xs font-bold gap-1.5"
                onClick={() => setConfirmar(true)}>
                <Receipt className="h-3.5 w-3.5" /> Facturar Seleccionados
              </Button>
            </div>
          </div>
        )}

        {/* TABLA */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleTodos} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {todosSeleccionados
                      ? <CheckSquare className="h-4 w-4 text-violet-600" />
                      : <Square className="h-4 w-4" />
                    }
                  </button>
                </th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Cliente</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Vendedor</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Ciudad</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Fecha</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Condición</th>
                <th className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Total</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="h-40 text-center text-slate-400 italic">Cargando pedidos revisados...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileCheck className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">No hay pedidos revisados</p>
                      <p className="text-xs">Los pedidos revisados en la bandeja aparecerán aquí</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const seleccionado = seleccionados.has(p.id_pedido);
                  return (
                    <tr key={p.id_pedido}
                      className={`group transition-colors ${seleccionado ? "bg-violet-50/50" : "hover:bg-slate-50/50"}`}>
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleSeleccion(p.id_pedido)}
                          className="text-slate-400 hover:text-violet-600 transition-colors">
                          {seleccionado
                            ? <CheckSquare className="h-4 w-4 text-violet-600" />
                            : <Square className="h-4 w-4" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 text-sm">{p.cliente?.razon_social}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.cliente?.rif}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {p.vendedor?.nombre_apellido || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {p.cliente?.ciudad || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(p.fecha).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-700">{p.metodo_pago}</div>
                        <div className="text-[10px] text-slate-400">{p.dias_credito} días</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                        ${Number(p.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100"
                          title="Ver detalle" onClick={() => abrirDetalle(p)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                    Total general ({filtered.length} pedidos)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    ${filtered.reduce((a, p) => a + Number(p.total), 0).toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>

      {/* CONFIRM FACTURAR */}
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Facturar {seleccionados.size} pedido(s)?</AlertDialogTitle>
            <AlertDialogDescription asChild>
  <div className="space-y-2">
    <span className="block">Se marcarán como <strong>FACTURADO</strong> los siguientes pedidos:</span>
    <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
      {filtered.filter(p => seleccionados.has(p.id_pedido)).map(p => (
        <div key={p.id_pedido} className="flex justify-between">
          <span>{p.cliente?.razon_social}</span>
        </div>
      ))}
    </div>
  </div>
</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFacturar} disabled={procesando}
              className="bg-violet-600 hover:bg-violet-700">
              {procesando ? "Procesando..." : "Confirmar Facturación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DETALLE */}
      <Dialog open={!!pedidoDetalle} onOpenChange={() => setPedidoDetalle(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 bg-slate-900 text-white">
            <DialogTitle className="font-bold">{pedidoDetalle?.cliente?.razon_social}</DialogTitle>
            <p className="text-slate-400 text-xs mt-0.5">
              {pedidoDetalle?.vendedor?.nombre_apellido} &middot; ${Number(pedidoDetalle?.total || 0).toFixed(2)} &middot; {pedidoDetalle?.metodo_pago} {pedidoDetalle?.dias_credito}d
            </p>
          </DialogHeader>
          {pedidoDetalle && (
            <div className="bg-white p-5 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-3 py-2">Producto</th>
                    <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-3 py-2">Cant.</th>
                    <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-3 py-2">Precio</th>
                    <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pedidoDetalle.detalles?.map((d: any) => (
                    <tr key={d.id_detalle}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{d.producto?.nombre || d.id_producto}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{d.producto?.codigo}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-bold">{d.cantidad}</td>
                      <td className="px-3 py-2 text-right text-slate-600">${Number(d.precio_unitario).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold">${(d.cantidad * Number(d.precio_unitario)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
