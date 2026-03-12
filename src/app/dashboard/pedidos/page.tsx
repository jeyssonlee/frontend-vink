"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Search, RefreshCcw, Plus, Eye, Pencil,
  Send, XCircle, CheckCircle2, Clock, AlertCircle, Ban,
  FileCheck, Package,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePermisos } from "@/hooks/usePermisos";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  nota_rechazo: string | null;
  metodo_pago: string;
  dias_credito: number;
  cliente?: { id_cliente: string; razon_social: string; rif: string };
  vendedor?: { nombre_apellido: string };
  detalles?: PedidoDetalle[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  BORRADOR:   { label: "Borrador",   color: "bg-slate-100 text-slate-600 border-slate-200",   icon: Clock },
  ENVIADO:    { label: "Enviado",    color: "bg-blue-100 text-blue-700 border-blue-200",       icon: Send },
  REVISADO:   { label: "Revisado",   color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: FileCheck },
  RECHAZADO:  { label: "Rechazado",  color: "bg-rose-100 text-rose-700 border-rose-200",       icon: AlertCircle },
  FACTURADO:  { label: "Facturado",  color: "bg-violet-100 text-violet-700 border-violet-200", icon: CheckCircle2 },
  ANULADO:    { label: "Anulado",    color: "bg-red-100 text-red-700 border-red-200",          icon: Ban },
  APARTADO:   { label: "Enviado",    color: "bg-blue-100 text-blue-700 border-blue-200",       icon: Send },
  COMPLETADO: { label: "Completado", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[10px] font-bold gap-1 ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

export default function MisPedidosPage() {
  const router = useRouter();
  const { tienePermiso, rol } = usePermisos();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const esAdmin = tienePermiso("revisar_pedidos");

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [anularId, setAnularId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoint = esAdmin ? "/pedidos" : "/pedidos/mis-pedidos";
      const { data } = await api.get(endpoint);
      setPedidos(data);
    } catch {
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = pedidos.filter(p => {
    const matchBusqueda =
      p.cliente?.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id_pedido.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === "TODOS" || p.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const handleVerDetalle = async (pedido: Pedido) => {
    try {
      const { data } = await api.get(`/pedidos/${pedido.id_pedido}`);
      setPedidoDetalle(data);
    } catch {
      toast.error("Error al cargar detalle");
    }
  };

  const handleEnviar = async (id: string) => {
    try {
      await api.patch(`/pedidos/${id}/enviar`);
      toast.success("Pedido enviado a revisión");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al enviar");
    }
  };

  const handleAnular = async () => {
    if (!anularId) return;
    try {
      await api.patch(`/pedidos/${anularId}/anular`);
      toast.success("Pedido anulado");
      setAnularId(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al anular");
    }
  };

  const puedeEditar = (estado: string) =>
    ["BORRADOR", "RECHAZADO", "ENVIADO", "REVISADO"].includes(estado);

  const puedeEnviar = (estado: string) =>
    ["BORRADOR", "RECHAZADO"].includes(estado);

  const puedeAnular = (estado: string) =>
    !["ANULADO", "FACTURADO", "COMPLETADO"].includes(estado);

  if (!montado) return null;
  
  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Plataforma / Pedidos
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchData}>
            <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
          </Button>
          {tienePermiso("crear_pedidos") && (
            <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase"
              onClick={() => router.push("/dashboard/pedidos/nuevo")}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Nuevo Pedido
            </Button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-violet-50 rounded-lg flex items-center justify-center border border-violet-100">
              <ClipboardList className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {esAdmin ? "Todos los Pedidos" : "Mis Pedidos"}
              </h1>
              <p className="text-sm text-slate-500">{filtered.length} pedidos encontrados</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                placeholder="Buscar por cliente o ID..."
                className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="h-10 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="REVISADO">Revisado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="FACTURADO">Facturado</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">Cliente</TableHead>
                {esAdmin && <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Vendedor</TableHead>}
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Fecha</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center">Estado</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-slate-400 italic">Cargando pedidos...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Package className="h-8 w-8 opacity-30" />
                      <span className="text-sm">No hay pedidos</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id_pedido} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{p.cliente?.razon_social || "—"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.id_pedido.slice(0, 8).toUpperCase()}</div>
                      {p.nota_rechazo && (
                        <div className="text-[10px] text-rose-500 mt-0.5 italic">⚠ {p.nota_rechazo}</div>
                      )}
                    </TableCell>
                    {esAdmin && (
                      <TableCell className="text-sm text-slate-600">{p.vendedor?.nombre_apellido || "—"}</TableCell>
                    )}
                    <TableCell className="text-xs text-slate-500">
                      {new Date(p.fecha).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-800">
                      ${Number(p.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <EstadoBadge estado={p.estado} />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                          title="Ver detalle" onClick={() => handleVerDetalle(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {puedeEditar(p.estado) && tienePermiso("editar_pedidos") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            title="Editar" onClick={() => router.push(`/dashboard/pedidos/nuevo?editar=${p.id_pedido}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {puedeEnviar(p.estado) && tienePermiso("editar_pedidos") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            title="Enviar a revisión" onClick={() => handleEnviar(p.id_pedido)}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {puedeAnular(p.estado) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="Anular" onClick={() => setAnularId(p.id_pedido)}>
                            <XCircle className="h-4 w-4" />
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
      </main>

      {/* MODAL DETALLE */}
      <Dialog open={!!pedidoDetalle} onOpenChange={() => setPedidoDetalle(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold">Detalle del Pedido</DialogTitle>
              {pedidoDetalle && (
                <p className="text-slate-400 text-xs mt-0.5 font-mono">{pedidoDetalle.id_pedido}</p>
              )}
            </div>
            {pedidoDetalle && <EstadoBadge estado={pedidoDetalle.estado} />}
          </DialogHeader>
          {pedidoDetalle && (
            <div className="p-6 space-y-4 bg-white max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cliente</span>
                  <p className="font-bold text-slate-800">{pedidoDetalle.cliente?.razon_social}</p>
                  <p className="text-slate-500 text-xs">{pedidoDetalle.cliente?.rif}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vendedor</span>
                  <p className="font-bold text-slate-800">{pedidoDetalle.vendedor?.nombre_apellido || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Método de Pago</span>
                  <p className="font-bold text-slate-800">{pedidoDetalle.metodo_pago}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Días de Crédito</span>
                  <p className="font-bold text-slate-800">{pedidoDetalle.dias_credito} días</p>
                </div>
              </div>
              {pedidoDetalle.nota && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nota</span>
                  <p className="text-sm text-slate-700">{pedidoDetalle.nota}</p>
                </div>
              )}
              {pedidoDetalle.nota_rechazo && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-rose-400 uppercase block mb-1">Motivo de Rechazo</span>
                  <p className="text-sm text-rose-700">{pedidoDetalle.nota_rechazo}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Productos</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Producto</th>
                        <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Cant.</th>
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Precio</th>
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pedidoDetalle.detalles?.map((d) => (
                        <tr key={d.id_detalle} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-800">{d.producto?.nombre || d.id_producto}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{d.producto?.codigo}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-700">{d.cantidad}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">${Number(d.precio_unitario).toFixed(2)}</td>
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
                          ${Number(pedidoDetalle.total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM ANULAR */}
      <AlertDialog open={!!anularId} onOpenChange={() => setAnularId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción liberará el stock apartado y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnular} className="bg-red-600 hover:bg-red-700">
              Anular Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
