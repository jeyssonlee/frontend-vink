"use client";

import { useEffect, useState } from "react";
import {
  Inbox, RefreshCcw, Search, Filter, FileCheck, XCircle,
  User, Package, Clock, CheckCircle2, AlertCircle, ChevronDown,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface PedidoDetalle {
  id_detalle: string;
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
  producto?: { nombre: string; codigo: string };
}

interface Pedido {
  id_pedido: string;
  fecha: string;
  total: number;
  estado: string;
  nota: string | null;
  metodo_pago: string;
  dias_credito: number;
  cliente?: { id_cliente: string; razon_social: string; rif: string; ciudad?: string };
  vendedor?: { id_vendedor: string; nombre_apellido: string };
  detalles?: PedidoDetalle[];
}

export default function BandejaPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<any[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("TODOS");
  const [filtroCiudad, setFiltroCiudad] = useState("");

  // Modal detalle + acciones
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [accion, setAccion] = useState<"revisar" | "rechazar" | null>(null);
  const [notaRechazo, setNotaRechazo] = useState("");
  const [procesando, setProcesando] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroVendedor !== "TODOS") params.set("vendedorId", filtroVendedor);
      if (filtroCiudad) params.set("ciudad", filtroCiudad);
      const { data } = await api.get(`/pedidos/bandeja?${params}`);
      setPedidos(data);
    } catch {
      toast.error("Error al cargar bandeja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    api.get("/vendedores").then(r => setVendedores(r.data)).catch(() => {});
  }, []);

  const filtered = pedidos.filter(p =>
    p.cliente?.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.id_pedido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirDetalle = async (p: Pedido) => {
    try {
      const { data } = await api.get(`/pedidos/${p.id_pedido}`);
      setPedidoActivo(data);
    } catch {
      toast.error("Error al cargar detalle");
    }
  };

  const handleRevisar = async () => {
    if (!pedidoActivo) return;
    try {
      setProcesando(true);
      await api.patch(`/pedidos/${pedidoActivo.id_pedido}/revisar`);
      toast.success("Pedido marcado como revisado ✓");
      setPedidoActivo(null);
      setAccion(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al revisar");
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!pedidoActivo || !notaRechazo.trim()) {
      toast.error("Debes ingresar el motivo del rechazo");
      return;
    }
    try {
      setProcesando(true);
      await api.patch(`/pedidos/${pedidoActivo.id_pedido}/rechazar`, { nota_rechazo: notaRechazo });
      toast.success("Pedido rechazado — el vendedor será notificado");
      setPedidoActivo(null);
      setAccion(null);
      setNotaRechazo("");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al rechazar");
    } finally {
      setProcesando(false);
    }
  };

  const sinRevisar = filtered.length;

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Plataforma / Pedidos / Bandeja
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchData}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
        </Button>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 relative">
              <Inbox className="h-6 w-6 text-blue-600" />
              {sinRevisar > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {sinRevisar > 99 ? "99+" : sinRevisar}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bandeja de Revisión</h1>
              <p className="text-sm text-slate-500">{sinRevisar} pedido(s) pendiente(s) de revisión</p>
            </div>
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
          <div className="w-48">
            <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los vendedores</SelectItem>
                {vendedores.map(v => (
                  <SelectItem key={v.id_vendedor} value={v.id_vendedor}>
                    {v.nombre_apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Input placeholder="Ciudad..." className="h-9 text-sm"
              value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} />
          </div>
          <Button size="sm" className="h-9 text-xs font-bold bg-slate-900" onClick={fetchData}>
            Aplicar
          </Button>
        </div>

        {/* LISTA DE PEDIDOS */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 italic">
            Cargando bandeja...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Inbox className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Bandeja vacía</p>
            <p className="text-slate-400 text-sm mt-1">No hay pedidos pendientes de revisión</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p.id_pedido}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => abrirDetalle(p)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-800">{p.cliente?.razon_social}</div>
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                        {p.id_pedido.slice(0, 8).toUpperCase()}
                      </Badge>
                      {p.cliente?.ciudad && (
                        <span className="text-[10px] text-slate-400">{p.cliente.ciudad}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {p.vendedor?.nombre_apellido || "Sin vendedor"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(p.fecha).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {p.detalles?.length ?? "?"} ítem(s)
                      </span>
                    </div>
                    {p.nota && (
                      <p className="text-xs text-slate-400 italic mt-1.5">"{p.nota}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-xl font-bold text-slate-800">${Number(p.total).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">{p.metodo_pago} · {p.dias_credito}d</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                  <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                    Click para revisar el detalle completo →
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => { abrirDetalle(p).then(() => setAccion("rechazar")); }}>
                      <XCircle className="h-3 w-3" /> Rechazar
                    </Button>
                    <Button size="sm"
                      className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => { abrirDetalle(p).then(() => setAccion("revisar")); }}>
                      <FileCheck className="h-3 w-3" /> Marcar Revisado
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DETALLE + ACCIÓN */}
      <Dialog open={!!pedidoActivo} onOpenChange={() => { setPedidoActivo(null); setAccion(null); setNotaRechazo(""); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Inbox className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold">
                {pedidoActivo?.cliente?.razon_social}
              </DialogTitle>
              <p className="text-slate-400 text-xs mt-0.5">
                Vendedor: {pedidoActivo?.vendedor?.nombre_apellido} &middot;{" "}
                {pedidoActivo && new Date(pedidoActivo.fecha).toLocaleDateString("es-VE")}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${Number(pedidoActivo?.total || 0).toFixed(2)}</div>
              <div className="text-xs text-slate-400">{pedidoActivo?.metodo_pago} · {pedidoActivo?.dias_credito}d</div>
            </div>
          </DialogHeader>

          {pedidoActivo && (
            <div className="bg-white max-h-[60vh] overflow-y-auto">
              {pedidoActivo.nota && (
                <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">Nota del Vendedor</span>
                  <p className="text-sm text-amber-800">{pedidoActivo.nota}</p>
                </div>
              )}
              <div className="p-6">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-2.5">Producto</th>
                        <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-2.5">Cant.</th>
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2.5">Precio</th>
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2.5">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pedidoActivo.detalles?.map(d => (
                        <tr key={d.id_detalle} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-800">{d.producto?.nombre || d.id_producto}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{d.producto?.codigo}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-700 font-bold">{d.cantidad}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">${Number(d.precio_unitario).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                            ${(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase">Total</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 text-base">
                          ${Number(pedidoActivo.total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ZONA DE ACCIÓN */}
              {accion === "rechazar" && (
                <div className="px-6 pb-6">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                    <Label className="text-xs font-bold text-rose-600 uppercase">Motivo del Rechazo *</Label>
                    <Textarea
                      placeholder="Explica al vendedor por qué se rechaza el pedido..."
                      className="text-sm resize-none border-rose-200 focus-visible:ring-rose-400"
                      rows={3}
                      value={notaRechazo}
                      onChange={(e) => setNotaRechazo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            {!accion ? (
              <>
                <Button variant="outline" className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => setAccion("rechazar")}>
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
                <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 flex-1"
                  onClick={() => setAccion("revisar")}>
                  <FileCheck className="h-4 w-4" /> Marcar como Revisado
                </Button>
              </>
            ) : accion === "revisar" ? (
              <>
                <Button variant="outline" onClick={() => setAccion(null)} disabled={procesando}>Cancelar</Button>
                <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 flex-1"
                  onClick={handleRevisar} disabled={procesando}>
                  <CheckCircle2 className="h-4 w-4" />
                  {procesando ? "Procesando..." : "Confirmar Revisión"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAccion(null)} disabled={procesando}>Cancelar</Button>
                <Button className="gap-1.5 bg-rose-600 hover:bg-rose-700 flex-1"
                  onClick={handleRechazar} disabled={procesando}>
                  <XCircle className="h-4 w-4" />
                  {procesando ? "Procesando..." : "Confirmar Rechazo"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
