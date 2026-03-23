"use client";

import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Check, X, ChevronRight,
  Lock, Tag, Layers, FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Subtipo {
  id: number;
  nombre: string;
}

interface Tipo {
  id: number;
  nombre: string;
  es_sistema: boolean;
  subtipos?: Subtipo[];
}

interface Categoria {
  id: number;
  nombre: string;
  id_subtipo: number;
}

// ── EditableRow ────────────────────────────────────────────────────────────────

function EditableRow({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (nombre: string) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(value);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50">
      <Input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(nombre.trim());
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 text-sm"
      />
      <button onClick={() => onSave(nombre.trim())} className="shrink-0 text-emerald-600 hover:text-emerald-700">
        <Check className="size-4" />
      </button>
      <button onClick={onCancel} className="shrink-0 text-slate-400 hover:text-slate-600">
        <X className="size-4" />
      </button>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

interface PanelItem {
  nombre: string;
  es_sistema?: boolean;
}

function Panel<T extends PanelItem>({
  title,
  icon: Icon,
  items,
  selectedId,
  getItemId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  loading,
  disabled,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: T[];
  selectedId: number | null;
  getItemId: (item: T) => number;
  onSelect?: (item: T) => void;
  onCreate: (nombre: string) => Promise<void>;
  onUpdate: (id: number, nombre: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loading: boolean;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  useEffect(() => {
    if (disabled) { setAdding(false); setEditingId(null); }
  }, [disabled]);

  return (
    <div className={`flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-opacity
      ${disabled ? "opacity-40 pointer-events-none" : ""}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-4 text-slate-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 truncate">{title}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
            {items.length}
          </Badge>
        </div>
        {!disabled && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium shrink-0 ml-2"
          >
            <Plus className="size-3.5" />
            Agregar
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[200px] max-h-[440px]">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400">Cargando...</div>
        ) : items.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
            <Icon className="size-8 opacity-20" />
            <span className="text-xs">Sin registros</span>
          </div>
        ) : (
          <>
            {items.map((item) => {
              const id = getItemId(item);
              const isSelected = id === selectedId;
              const isSystem = item.es_sistema === true;

              if (editingId === id) {
                return (
                  <EditableRow
                    key={id}
                    value={item.nombre}
                    onSave={async (nombre) => {
                      if (!nombre) return;
                      await onUpdate(id, nombre);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <div
                  key={id}
                  onClick={() => onSelect?.(item)}
                  className={`group flex items-center gap-2 px-3 py-2.5 transition-colors
                    ${onSelect ? "cursor-pointer" : ""}
                    ${isSelected
                      ? "bg-indigo-50 border-l-2 border-indigo-500"
                      : "hover:bg-slate-50 border-l-2 border-transparent"
                    }`}
                >
                  {isSystem && <Lock className="size-3 text-slate-400 shrink-0" />}

                  <span className={`flex-1 text-sm truncate
                    ${isSelected ? "font-medium text-indigo-700" : "text-slate-700"}`}>
                    {item.nombre}
                  </span>

                  {isSystem ? (
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide shrink-0">
                      sistema
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(id); setAdding(false); }}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                        className="p-0.5 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}

                  {onSelect && (
                    <ChevronRight className={`size-3.5 shrink-0 transition-colors
                      ${isSelected ? "text-indigo-400" : "text-slate-300 group-hover:text-slate-400"}`}
                    />
                  )}
                </div>
              );
            })}

            {adding && (
              <EditableRow
                key="__new__"
                value=""
                onSave={async (nombre) => {
                  if (!nombre) { setAdding(false); return; }
                  await onCreate(nombre);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            )}
          </>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteTarget?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los registros dependientes también serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deleteTarget) return;
                await onDelete(getItemId(deleteTarget));
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ClasificacionPage() {
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [todasLasCategorias, setTodasLasCategorias] = useState<Categoria[]>([]);

  const [selectedTipo, setSelectedTipo] = useState<Tipo | null>(null);
  const [selectedSubtipo, setSelectedSubtipo] = useState<Subtipo | null>(null);

  const [loadingTipos, setLoadingTipos] = useState(true);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // Subtipos vienen embebidos en la respuesta de GET /banco/tipos
  const subtipos: Subtipo[] = selectedTipo?.subtipos ?? [];

  // Categorías filtradas client-side por subtipo
  const categorias: Categoria[] = selectedSubtipo
    ? todasLasCategorias.filter((c) => c.id_subtipo === selectedSubtipo.id)
    : [];

  // ── Carga inicial ──
  useEffect(() => {
    api.get("/banco/tipos")
      .then(({ data }) => setTipos(data))
      .catch(() => toast.error("Error cargando tipos"))
      .finally(() => setLoadingTipos(false));

    api.get("/banco/categorias")
      .then(({ data }) => setTodasLasCategorias(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Error cargando categorías"))
      .finally(() => setLoadingCategorias(false));
  }, []);

  // Limpiar subtipo al cambiar tipo
  useEffect(() => { setSelectedSubtipo(null); }, [selectedTipo]);

  // ── CRUD: Tipos ──
  const crearTipo = async (nombre: string) => {
    try {
      const { data } = await api.post("/banco/tipos", { nombre });
      setTipos((prev) => [...prev, data]);
      toast.success("Tipo creado");
    } catch { toast.error("Error creando tipo"); }
  };

  const actualizarTipo = async (id: number, nombre: string) => {
    try {
      const { data } = await api.patch(`/banco/tipos/${id}`, { nombre });
      setTipos((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
      toast.success("Tipo actualizado");
    } catch { toast.error("Error actualizando tipo"); }
  };

  const eliminarTipo = async (id: number) => {
    try {
      await api.delete(`/banco/tipos/${id}`);
      setTipos((prev) => prev.filter((t) => t.id !== id));
      if (selectedTipo?.id === id) setSelectedTipo(null);
      toast.success("Tipo eliminado");
    } catch { toast.error("Error eliminando tipo"); }
  };

  // ── CRUD: Subtipos (rutas anidadas bajo el tipo) ──
  const crearSubtipo = async (nombre: string) => {
    if (!selectedTipo) return;
    try {
      const { data } = await api.post(`/banco/tipos/${selectedTipo.id}/subtipos`, { nombre });
      const updater = (t: Tipo) =>
        t.id === selectedTipo.id
          ? { ...t, subtipos: [...(t.subtipos ?? []), data] }
          : t;
      setTipos((prev) => prev.map(updater));
      setSelectedTipo((prev) => prev ? updater(prev) : prev);
      toast.success("Subtipo creado");
    } catch { toast.error("Error creando subtipo"); }
  };

  const actualizarSubtipo = async (id: number, nombre: string) => {
    if (!selectedTipo) return;
    try {
      const { data } = await api.patch(`/banco/tipos/${selectedTipo.id}/subtipos/${id}`, { nombre });
      const updater = (t: Tipo) =>
        t.id === selectedTipo.id
          ? { ...t, subtipos: t.subtipos?.map((s) => s.id === id ? { ...s, ...data } : s) }
          : t;
      setTipos((prev) => prev.map(updater));
      setSelectedTipo((prev) => prev ? updater(prev) : prev);
      toast.success("Subtipo actualizado");
    } catch { toast.error("Error actualizando subtipo"); }
  };

  const eliminarSubtipo = async (id: number) => {
    if (!selectedTipo) return;
    try {
      await api.delete(`/banco/tipos/${selectedTipo.id}/subtipos/${id}`);
      const updater = (t: Tipo) =>
        t.id === selectedTipo.id
          ? { ...t, subtipos: t.subtipos?.filter((s) => s.id !== id) }
          : t;
      setTipos((prev) => prev.map(updater));
      setSelectedTipo((prev) => prev ? updater(prev) : prev);
      if (selectedSubtipo?.id === id) setSelectedSubtipo(null);
      toast.success("Subtipo eliminado");
    } catch { toast.error("Error eliminando subtipo"); }
  };

  // ── CRUD: Categorías ──
  const crearCategoria = async (nombre: string) => {
    if (!selectedSubtipo) return;
    try {
      const { data } = await api.post("/banco/categorias", {
        nombre,
        id_subtipo: selectedSubtipo.id,
      });
      setTodasLasCategorias((prev) => [...prev, data]);
      toast.success("Categoría creada");
    } catch { toast.error("Error creando categoría"); }
  };

  const actualizarCategoria = async (id: number, nombre: string) => {
    try {
      const { data } = await api.patch(`/banco/categorias/${id}`, { nombre });
      setTodasLasCategorias((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
      toast.success("Categoría actualizada");
    } catch { toast.error("Error actualizando categoría"); }
  };

  const eliminarCategoria = async (id: number) => {
    try {
      await api.delete(`/banco/categorias/${id}`);
      setTodasLasCategorias((prev) => prev.filter((c) => c.id !== id));
      toast.success("Categoría eliminada");
    } catch { toast.error("Error eliminando categoría"); }
  };

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
          <span>Bancos</span>
          <ChevronRight className="size-3" />
          <span>Clasificación</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Tipos · Subtipos · Categorías
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Jerarquía de clasificación para movimientos bancarios.
          Seleccioná un tipo para ver sus subtipos, y un subtipo para ver sus categorías.
        </p>
      </div>

      {/* Cascade panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Panel
          title="Tipos"
          icon={Layers}
          items={tipos}
          selectedId={selectedTipo?.id ?? null}
          getItemId={(t) => t.id}
          onSelect={(t) => setSelectedTipo(t)}
          onCreate={crearTipo}
          onUpdate={actualizarTipo}
          onDelete={eliminarTipo}
          loading={loadingTipos}
        />

        <Panel
          title={selectedTipo ? `Subtipos — ${selectedTipo.nombre}` : "Subtipos"}
          icon={FolderTree}
          items={subtipos}
          selectedId={selectedSubtipo?.id ?? null}
          getItemId={(s) => s.id}
          onSelect={(s) => setSelectedSubtipo(s)}
          onCreate={crearSubtipo}
          onUpdate={actualizarSubtipo}
          onDelete={eliminarSubtipo}
          loading={false}
          disabled={!selectedTipo}
        />

        <Panel
          title={selectedSubtipo ? `Categorías — ${selectedSubtipo.nombre}` : "Categorías"}
          icon={Tag}
          items={categorias}
          selectedId={null}
          getItemId={(c) => c.id}
          onCreate={crearCategoria}
          onUpdate={actualizarCategoria}
          onDelete={eliminarCategoria}
          loading={loadingCategorias && !!selectedSubtipo}
          disabled={!selectedSubtipo}
        />

      </div>

      {/* Breadcrumb contextual */}
      {(selectedTipo || selectedSubtipo) && (
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 w-fit">
          <Layers className="size-3 text-slate-400" />
          <span className="font-medium text-slate-600">{selectedTipo?.nombre}</span>
          {selectedSubtipo && (
            <>
              <ChevronRight className="size-3" />
              <FolderTree className="size-3 text-slate-400" />
              <span className="font-medium text-slate-600">{selectedSubtipo.nombre}</span>
            </>
          )}
        </div>
      )}

    </div>
  );
}