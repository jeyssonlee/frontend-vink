"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Warehouse,
  Plus,
  Pencil,
  Trash2,
  ShoppingCart,
  Package,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Almacen {
  id_almacen: string;
  nombre: string;
  es_venta: boolean;
  id_sucursal: string;
  id_empresa: string;
  sucursal?: { nombre: string };
}

interface FormData {
  nombre: string;
  es_venta: boolean;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AlmacenesPage() {
  const user = useAuthStore((state) => state.user);

  // Nota: en el JWT, sucursalId se guarda como id_almacen en el store
  const id_sucursal = user?.id_almacen ?? null;
  const id_empresa = user?.id_empresa ?? null;

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Almacen | null>(null);
  const [eliminando, setEliminando] = useState<Almacen | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<FormData>({ nombre: "", es_venta: true });

  // ── Cargar almacenes ──────────────────────────────────────────────────────

  async function cargarAlmacenes() {
    setCargando(true);
    try {
      const params = id_sucursal ? `?id_sucursal=${id_sucursal}` : "";
      const { data } = await api.get(`/almacenes${params}`);
      setAlmacenes(data);
    } catch {
      toast.error("Error al cargar almacenes");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarAlmacenes();
  }, []);

  // ── Abrir modal ───────────────────────────────────────────────────────────

  function abrirCrear() {
    setEditando(null);
    setForm({ nombre: "", es_venta: true });
    setModalAbierto(true);
  }

  function abrirEditar(almacen: Almacen) {
    setEditando(almacen);
    setForm({ nombre: almacen.nombre, es_venta: almacen.es_venta });
    setModalAbierto(true);
  }

  // ── Guardar (crear o editar) ───────────────────────────────────────────────

  async function handleGuardar() {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await api.patch(`/almacenes/${editando.id_almacen}`, form);
        toast.success("Almacén actualizado");
      } else {
        await api.post("/almacenes", {
          ...form,
          id_sucursal,
          id_empresa,
        });
        toast.success("Almacén creado");
      }
      setModalAbierto(false);
      cargarAlmacenes();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  // ── Toggle es_venta rápido ────────────────────────────────────────────────

  async function handleToggleTipo(almacen: Almacen) {
    try {
      await api.patch(`/almacenes/${almacen.id_almacen}`, {
        es_venta: !almacen.es_venta,
      });
      setAlmacenes((prev) =>
        prev.map((a) =>
          a.id_almacen === almacen.id_almacen
            ? { ...a, es_venta: !a.es_venta }
            : a
        )
      );
      toast.success(`Tipo actualizado`);
    } catch {
      toast.error("Error al actualizar tipo");
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  async function handleEliminar() {
    if (!eliminando) return;
    try {
      await api.delete(`/almacenes/${eliminando.id_almacen}`);
      toast.success("Almacén eliminado");
      setEliminando(null);
      cargarAlmacenes();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error al eliminar");
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalVenta = almacenes.filter((a) => a.es_venta).length;
  const totalInterno = almacenes.filter((a) => !a.es_venta).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Warehouse className="h-6 w-6 text-indigo-600" />
            Almacenes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestioná los almacenes de tu sucursal
          </p>
        </div>
        <Button onClick={abrirCrear} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Almacén
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 max-w-sm">
        {[
          { label: "Total", value: almacenes.length, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "De Venta", value: totalVenta, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
          { label: "Internos", value: totalInterno, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border p-4", s.bg)}>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Lista ── */}
      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : almacenes.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay almacenes todavía</p>
          <p className="text-sm mt-1">Creá el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {almacenes.map((almacen) => (
            <AlmacenCard
              key={almacen.id_almacen}
              almacen={almacen}
              onEditar={() => abrirEditar(almacen)}
              onEliminar={() => setEliminando(almacen)}
              onToggleTipo={() => handleToggleTipo(almacen)}
            />
          ))}
        </div>
      )}

      {/* ── Modal Crear/Editar ── */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Almacén" : "Nuevo Almacén"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del almacén</Label>
              <Input
                id="nombre"
                placeholder="Ej: Almacén Central, Depósito Norte..."
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 bg-slate-50">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-700">
                  {form.es_venta ? "Almacén de Venta" : "Almacén Interno"}
                </p>
                <p className="text-xs text-slate-500">
                  {form.es_venta
                    ? "Disponible para el punto de venta"
                    : "Solo para uso interno (dañados, cuarentena, etc.)"}
                </p>
              </div>
              <Switch
                checked={form.es_venta}
                onCheckedChange={(v) => setForm({ ...form, es_venta: v })}
              />
            </div>

            {/* Preview del tipo */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              form.es_venta
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            )}>
              {form.es_venta
                ? <ShoppingCart className="h-4 w-4" />
                : <Package className="h-4 w-4" />}
              {form.es_venta ? "Aparecerá en Ventas/POS" : "Solo uso interno"}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleGuardar}
              disabled={guardando}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
            >
              {guardando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editando ? (
                "Guardar cambios"
              ) : (
                "Crear almacén"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminación ── */}
      <AlertDialog open={!!eliminando} onOpenChange={() => setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar almacén?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <span className="font-semibold text-slate-700">"{eliminando?.nombre}"</span>.
              Esta acción no se puede deshacer. Asegurate de que no tenga stock asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Card de almacén ──────────────────────────────────────────────────────────

function AlmacenCard({
  almacen,
  onEditar,
  onEliminar,
  onToggleTipo,
}: {
  almacen: Almacen;
  onEditar: () => void;
  onEliminar: () => void;
  onToggleTipo: () => void;
}) {
  return (
    <div className="group relative rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Tipo badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          almacen.es_venta
            ? "bg-indigo-50 text-indigo-700"
            : "bg-amber-50 text-amber-700"
        )}>
          {almacen.es_venta
            ? <ShoppingCart className="h-3 w-3" />
            : <Package className="h-3 w-3" />}
          {almacen.es_venta ? "Venta" : "Interno"}
        </div>

        {/* Acciones */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-indigo-600"
            onClick={onEditar}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-red-600"
            onClick={onEliminar}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Ícono y nombre */}
      <div className={cn(
        "flex items-center justify-center rounded-lg w-10 h-10 mb-3",
        almacen.es_venta ? "bg-indigo-100" : "bg-amber-100"
      )}>
        <Warehouse className={cn(
          "h-5 w-5",
          almacen.es_venta ? "text-indigo-600" : "text-amber-600"
        )} />
      </div>

      <h3 className="font-semibold text-slate-800 text-sm mb-1">{almacen.nombre}</h3>

      {almacen.sucursal && (
        <p className="text-xs text-slate-400">{almacen.sucursal.nombre}</p>
      )}

      {/* Toggle tipo rápido */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {almacen.es_venta ? "Disponible en POS" : "Solo interno"}
        </span>
        <Switch
          checked={almacen.es_venta}
          onCheckedChange={onToggleTipo}
          className="scale-75"
        />
      </div>
    </div>
  );
}
