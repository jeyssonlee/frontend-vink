"use client";

import { useEffect, useState } from "react";
import {
  Building2, Users, Shield, Globe, ChevronDown, ChevronRight,
  RefreshCcw, Plus, Pencil, Trash2, Check, UserCheck, UserX,
  MapPin, AlertCircle, Save, Eye, EyeOff, Layers, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { api } from "@/lib/api";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Permisos agrupados ───────────────────────────────────────────────────────

const MODULOS_PERMISOS: Record<string, { label: string; permisos: { key: string; label: string }[] }> = {
  empresa:     { label: "Empresa",     permisos: [{ key: "ver_empresa", label: "Ver" }, { key: "editar_empresa", label: "Editar" }] },
  usuarios:    { label: "Usuarios",    permisos: [{ key: "ver_usuarios", label: "Ver" }, { key: "crear_usuarios", label: "Crear" }, { key: "editar_usuarios", label: "Editar" }] },
  roles:       { label: "Roles",       permisos: [{ key: "ver_roles", label: "Ver" }, { key: "crear_roles", label: "Crear" }, { key: "editar_roles", label: "Editar" }, { key: "eliminar_roles", label: "Eliminar" }] },
  vendedores:  { label: "Vendedores",  permisos: [{ key: "ver_vendedores", label: "Ver" }, { key: "crear_vendedores", label: "Crear" }, { key: "editar_vendedores", label: "Editar" }, { key: "eliminar_vendedores", label: "Eliminar" }] },
  clientes:    { label: "Clientes",    permisos: [{ key: "ver_clientes", label: "Ver" }, { key: "crear_clientes", label: "Crear" }, { key: "editar_clientes", label: "Editar" }, { key: "ver_perfil_cliente", label: "Perfil 360" }] },
  ventas:      { label: "Ventas",      permisos: [{ key: "ver_ventas", label: "Ver" }, { key: "crear_ventas", label: "Crear" }, { key: "anular_ventas", label: "Anular" }, { key: "ver_reportes_ventas", label: "Reportes" }] },
  pedidos:     { label: "Pedidos",     permisos: [{ key: "ver_pedidos", label: "Ver" }, { key: "crear_pedidos", label: "Crear" }, { key: "editar_pedidos", label: "Editar" }, { key: "revisar_pedidos", label: "Revisar" }, { key: "facturar_pedidos", label: "Facturar" }] },
  cobranzas:   { label: "Cobranzas",   permisos: [{ key: "ver_cobranzas", label: "Ver" }, { key: "aprobar_cobranzas", label: "Aprobar" }, { key: "rechazar_cobranzas", label: "Rechazar" }, { key: "ver_cxc", label: "Ver CXC" }] },
  inventario:  { label: "Inventario",  permisos: [{ key: "ver_inventario", label: "Ver" }, { key: "editar_inventario", label: "Editar" }, { key: "ver_kardex", label: "Kardex" }, { key: "ver_inventario_valorizado", label: "Valorizado" }] },
  productos:   { label: "Productos",   permisos: [{ key: "ver_productos", label: "Ver" }, { key: "crear_productos", label: "Crear" }, { key: "editar_productos", label: "Editar" }, { key: "eliminar_productos", label: "Eliminar" }] },
  almacenes:   { label: "Almacenes",   permisos: [{ key: "ver_almacenes", label: "Ver" }, { key: "editar_almacenes", label: "Editar" }] },
  compras:     { label: "Compras",     permisos: [{ key: "ver_compras", label: "Ver" }, { key: "crear_compras", label: "Crear" }, { key: "ver_reportes_compras", label: "Reportes" }, { key: "ver_cuentas_pagar", label: "Ver CxP" }, { key: "pagar_cuentas", label: "Pagar" }] },
  proveedores: { label: "Proveedores", permisos: [{ key: "ver_proveedores", label: "Ver" }, { key: "crear_proveedores", label: "Crear" }, { key: "editar_proveedores", label: "Editar" }, { key: "eliminar_proveedores", label: "Eliminar" }] },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Holding   { id_holding: string; nombre: string; }
interface Sucursal  { id_sucursal: string; nombre: string; direccion?: string; }
interface Empresa   { id: string; razon_social: string; rif?: string; holding?: { id_holding: string; nombre: string }; }
interface Rol       { id_rol: string; nombre: string; descripcion?: string; permisos: string[]; }
interface Usuario   { id: string; nombre_completo: string; correo: string; activo: boolean; rol?: { id_rol: string; nombre: string }; empresa?: { id: string; razon_social: string }; sucursal?: { id_sucursal: string; nombre: string }; }
interface Vendedor  { id_vendedor: string; nombre_apellido: string; correo?: string; telefono?: string; empresa?: { id: string; razon_social: string }; }

type Tab       = "holding" | "roles" | "usuarios" | "vendedores";
type ModalTipo = "holding" | "empresa" | "sucursal" | "rol" | "usuario" | "vendedor" | null;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const holdingSchema  = z.object({ nombre: z.string().min(2, "Requerido") });
const empresaSchema  = z.object({ razon_social: z.string().min(2, "Requerido"), rif: z.string().optional(), id_holding: z.string().optional() });
const sucursalSchema = z.object({ nombre: z.string().min(2, "Requerido"), direccion: z.string().optional(), id_empresa: z.string() });
const rolSchema      = z.object({ nombre: z.string().min(2, "Requerido"), descripcion: z.string().optional() });
const usuarioSchema  = z.object({
  nombre_completo: z.string().min(2, "Requerido"),
  correo: z.string().email("Correo inválido"),
  clave: z.string().min(6, "Mínimo 6 caracteres").optional().or(z.literal("")),
  id_empresa: z.string().min(1, "Requerido"),
  id_sucursal: z.string().optional(),
  id_rol: z.string().min(1, "Requerido"),
});
const vendedorSchema = z.object({
  nombre_apellido: z.string().min(2, "Requerido"),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  id_empresa: z.string().min(1, "Requerido"),
});

// ─── Chip de permiso ──────────────────────────────────────────────────────────

function PermisoChip({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
        activo
          ? "bg-violet-50 border-violet-300 text-violet-700"
          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
      }`}>
      {activo && <Check className="inline h-2.5 w-2.5 mr-1 text-violet-500" />}{label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA
// ════════════════════════════════════════════════════════════════════════════

export default function SuperAdminPage() {
  const [tab, setTab] = useState<Tab>("holding");

  // Data
  const [holdings, setHoldings]           = useState<Holding[]>([]);
  const [empresas, setEmpresas]           = useState<Empresa[]>([]);
  const [sucursalesMap, setSucursalesMap] = useState<Record<string, Sucursal[]>>({});
  const [roles, setRoles]                 = useState<Rol[]>([]);
  const [usuarios, setUsuarios]           = useState<Usuario[]>([]);
  const [vendedores, setVendedores]       = useState<Vendedor[]>([]);
  const [loading, setLoading]             = useState(true);

  // UI
  const [empresaExpandida, setEmpresaExpandida]   = useState<string | null>(null);
  const [loadingSucursales, setLoadingSucursales] = useState<string | null>(null);
  const [rolSeleccionado, setRolSeleccionado]     = useState<Rol | null>(null);
  const [permisosEditando, setPermisosEditando]   = useState<string[]>([]);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);
  const [busquedaUsuario, setBusquedaUsuario]     = useState("");
  const [filtroEmpresaU, setFiltroEmpresaU]       = useState("todas");
  const [busquedaVendedor, setBusquedaVendedor]   = useState("");
  const [filtroEmpresaV, setFiltroEmpresaV]       = useState("todas");
  const [sucursalesModal, setSucursalesModal]     = useState<Sucursal[]>([]);
  const [showClave, setShowClave]                 = useState(false);

  // Modal
  const [modal, setModal]         = useState<ModalTipo>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Forms
  const holdingForm  = useForm<z.infer<typeof holdingSchema>>({ resolver: zodResolver(holdingSchema), defaultValues: { nombre: "" } });
  const empresaForm  = useForm<z.infer<typeof empresaSchema>>({ resolver: zodResolver(empresaSchema), defaultValues: { razon_social: "", rif: "", id_holding: "" } });
  const sucursalForm = useForm<z.infer<typeof sucursalSchema>>({ resolver: zodResolver(sucursalSchema), defaultValues: { nombre: "", direccion: "", id_empresa: "" } });
  const rolForm      = useForm<z.infer<typeof rolSchema>>({ resolver: zodResolver(rolSchema), defaultValues: { nombre: "", descripcion: "" } });
  const usuarioForm  = useForm<z.infer<typeof usuarioSchema>>({ resolver: zodResolver(usuarioSchema), defaultValues: { nombre_completo: "", correo: "", clave: "", id_empresa: "", id_sucursal: "", id_rol: "" } });
  const vendedorForm = useForm<z.infer<typeof vendedorSchema>>({ resolver: zodResolver(vendedorSchema), defaultValues: { nombre_apellido: "", correo: "", telefono: "", id_empresa: "" } });

  // ── Carga ─────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rH, rE, rR] = await Promise.all([api.get("/holding"), api.get("/empresas"), api.get("/roles")]);
      setHoldings(rH.data);
      setEmpresas(rE.data);
      setRoles(rR.data);

      // Usuarios por empresa
      const uAll = await Promise.all(
        (rE.data as Empresa[]).map((e) =>
          api.get(`/usuarios?id_empresa=${e.id}`)
            .then((r) => r.data.map((u: Usuario) => ({ ...u, empresa: { id: e.id, razon_social: e.razon_social } })))
            .catch(() => [])
        )
      );
      setUsuarios(uAll.flat());

      // Vendedores por empresa
      const vAll = await Promise.all(
        (rE.data as Empresa[]).map((e) =>
          api.get(`/vendedores?id_empresa=${e.id}`)
            .then((r) => r.data.map((v: Vendedor) => ({ ...v, empresa: { id: e.id, razon_social: e.razon_social } })))
            .catch(() => [])
        )
      );
      setVendedores(vAll.flat());
    } catch { toast.error("Error al cargar datos"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Sucursales lazy ───────────────────────────────────────────────────────
  const toggleEmpresa = async (id: string) => {
    if (empresaExpandida === id) { setEmpresaExpandida(null); return; }
    setEmpresaExpandida(id);
    if (sucursalesMap[id]) return;
    setLoadingSucursales(id);
    try {
      const res = await api.get(`/sucursales?id_empresa=${id}`);
      setSucursalesMap((p) => ({ ...p, [id]: res.data }));
    } catch { setSucursalesMap((p) => ({ ...p, [id]: [] })); }
    finally { setLoadingSucursales(null); }
  };

  const recargarSucursales = async (idEmpresa: string) => {
    const res = await api.get(`/sucursales?id_empresa=${idEmpresa}`);
    setSucursalesMap((p) => ({ ...p, [idEmpresa]: res.data }));
  };

  // ── Holdings CRUD ─────────────────────────────────────────────────────────
  const onHolding = async (v: z.infer<typeof holdingSchema>) => {
    try {
      editandoId ? await api.patch(`/holding/${editandoId}`, v) : await api.post("/holding", v);
      toast.success(editandoId ? "Holding actualizado" : "Holding creado");
      setModal(null); fetchAll();
    } catch { toast.error("Error al guardar"); }
  };

  const eliminarHolding = async (id: string) => {
    if (!confirm("¿Eliminar holding?")) return;
    try { await api.delete(`/holding/${id}`); toast.success("Eliminado"); fetchAll(); }
    catch { toast.error("Error al eliminar"); }
  };

  // ── Empresas CRUD ─────────────────────────────────────────────────────────
  const onEmpresa = async (v: z.infer<typeof empresaSchema>) => {
    try {
      const payload = { ...v, id_holding: v.id_holding || undefined };
      editandoId ? await api.patch(`/empresas/${editandoId}`, payload) : await api.post("/empresas", payload);
      toast.success(editandoId ? "Empresa actualizada" : "Empresa creada");
      setModal(null); fetchAll();
    } catch { toast.error("Error al guardar"); }
  };

  const eliminarEmpresa = async (id: string) => {
    if (!confirm("¿Eliminar empresa?")) return;
    try { await api.delete(`/empresas/${id}`); toast.success("Eliminada"); fetchAll(); }
    catch { toast.error("No se puede eliminar (tiene datos asociados)"); }
  };

  // ── Sucursales CRUD ───────────────────────────────────────────────────────
  const onSucursal = async (v: z.infer<typeof sucursalSchema>) => {
    try {
      editandoId ? await api.patch(`/sucursales/${editandoId}`, v) : await api.post("/sucursales", v);
      toast.success(editandoId ? "Sucursal actualizada" : "Sucursal creada");
      await recargarSucursales(v.id_empresa);
      setModal(null);
    } catch { toast.error("Error al guardar"); }
  };

  const eliminarSucursal = async (idSucursal: string, idEmpresa: string) => {
    if (!confirm("¿Eliminar sucursal?")) return;
    try { await api.delete(`/sucursales/${idSucursal}`); toast.success("Eliminada"); await recargarSucursales(idEmpresa); }
    catch { toast.error("Error al eliminar"); }
  };

  // ── Roles CRUD + Permisos ─────────────────────────────────────────────────
  const onRol = async (v: z.infer<typeof rolSchema>) => {
    try {
      await api.post("/roles", { ...v, permisos: [] });
      toast.success("Rol creado — asigna sus permisos desde el editor");
      setModal(null); fetchAll();
    } catch { toast.error("Error al crear rol"); }
  };

  const seleccionarRol = (r: Rol) => { setRolSeleccionado(r); setPermisosEditando([...r.permisos]); };

  const togglePermiso = (key: string) =>
    setPermisosEditando((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);

  const toggleModulo = (mod: string) => {
    const todos = MODULOS_PERMISOS[mod].permisos.map((p) => p.key);
    const activos = todos.every((k) => permisosEditando.includes(k));
    setPermisosEditando((p) => activos ? p.filter((k) => !todos.includes(k)) : [...new Set([...p, ...todos])]);
  };

  const guardarPermisos = async () => {
    if (!rolSeleccionado) return;
    setGuardandoPermisos(true);
    try {
      await api.patch(`/roles/${rolSeleccionado.id_rol}/permisos`, { permisos: permisosEditando });
      toast.success(`Permisos de "${rolSeleccionado.nombre}" guardados`);
      setRolSeleccionado((r) => r ? { ...r, permisos: permisosEditando } : r);
      fetchAll();
    } catch { toast.error("Error al guardar permisos"); }
    finally { setGuardandoPermisos(false); }
  };

  const eliminarRol = async (id: string) => {
    if (!confirm("¿Eliminar rol?")) return;
    try {
      await api.delete(`/roles/${id}`);
      toast.success("Rol eliminado");
      if (rolSeleccionado?.id_rol === id) setRolSeleccionado(null);
      fetchAll();
    } catch { toast.error("Error al eliminar"); }
  };

  // ── Usuarios CRUD ─────────────────────────────────────────────────────────
  const onUsuario = async (v: z.infer<typeof usuarioSchema>) => {
    try {
      const payload = { ...v, id_sucursal: v.id_sucursal || undefined, clave: v.clave || undefined };
      editandoId ? await api.patch(`/usuarios/${editandoId}`, payload) : await api.post("/usuarios", payload);
      toast.success(editandoId ? "Usuario actualizado" : "Usuario creado");
      setModal(null); fetchAll();
    } catch { toast.error("Error al guardar usuario"); }
  };

  const toggleUsuario = async (id: string) => {
    try { await api.patch(`/usuarios/${id}/toggle-activo`); toast.success("Estado actualizado"); fetchAll(); }
    catch { toast.error("Error"); }
  };

  const eliminarUsuario = async (id: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    try { await api.delete(`/usuarios/${id}`); toast.success("Eliminado"); fetchAll(); }
    catch { toast.error("Error al eliminar"); }
  };

  const handleEmpresaUsuario = async (idEmpresa: string, onChange: (v: string) => void) => {
    onChange(idEmpresa);
    usuarioForm.setValue("id_sucursal", "");
    try {
      if (sucursalesMap[idEmpresa]) { setSucursalesModal(sucursalesMap[idEmpresa]); return; }
      const res = await api.get(`/sucursales?id_empresa=${idEmpresa}`);
      setSucursalesModal(res.data);
      setSucursalesMap((p) => ({ ...p, [idEmpresa]: res.data }));
    } catch { setSucursalesModal([]); }
  };

  // ── Vendedores CRUD ───────────────────────────────────────────────────────
  const onVendedor = async (v: z.infer<typeof vendedorSchema>) => {
    try {
      const payload = { ...v, correo: v.correo || undefined };
      editandoId
        ? await api.put(`/vendedores/${editandoId}`, payload)
        : await api.post("/vendedores", payload);
      toast.success(editandoId ? "Vendedor actualizado" : "Vendedor creado");
      setModal(null); fetchAll();
    } catch { toast.error("Error al guardar vendedor"); }
  };

  const eliminarVendedor = async (id: string) => {
    if (!confirm("¿Eliminar vendedor?")) return;
    try { await api.delete(`/vendedores/${id}`); toast.success("Vendedor eliminado"); fetchAll(); }
    catch { toast.error("Error al eliminar"); }
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busquedaUsuario.toLowerCase();
    return (
      (u.nombre_completo?.toLowerCase().includes(q) || u.correo?.toLowerCase().includes(q)) &&
      (filtroEmpresaU === "todas" || u.empresa?.id === filtroEmpresaU)
    );
  });

  const vendedoresFiltrados = vendedores.filter((v) => {
    const q = busquedaVendedor.toLowerCase();
    return (
      (v.nombre_apellido?.toLowerCase().includes(q) || v.correo?.toLowerCase().includes(q)) &&
      (filtroEmpresaV === "todas" || v.empresa?.id === filtroEmpresaV)
    );
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: "holding",   label: "Holding & Empresas", icon: Globe,     count: empresas.length },
    { id: "roles",     label: "Roles & Permisos",   icon: Shield,    count: roles.length },
    { id: "usuarios",  label: "Usuarios",            icon: Users,     count: usuarios.length },
    { id: "vendedores",label: "Vendedores",          icon: Briefcase, count: vendedores.length },
  ];

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">

      {/* Nav */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sistema / Panel SUPER_ADMIN</span>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchAll}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
        </Button>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-violet-50 rounded-lg flex items-center justify-center border border-violet-100">
              <Shield className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Control del Sistema</h1>
              <p className="text-sm text-slate-500">Gestión completa de estructura, roles y accesos del holding.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><Building2 className="h-3 w-3 text-violet-500" />{empresas.length} empresas</span>
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-violet-500" />{usuarios.length} usuarios</span>
            <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-violet-500" />{vendedores.length} vendedores</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-violet-500" />{roles.length} roles</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                tab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ══ TAB: HOLDING & EMPRESAS ══════════════════════════════════════════ */}
        {tab === "holding" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Holdings */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Holdings</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{holdings.length} registrados</p>
                </div>
                <Button size="sm" className="h-7 bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-bold px-3"
                  onClick={() => { setEditandoId(null); holdingForm.reset({ nombre: "" }); setModal("holding"); }}>
                  <Plus className="h-3 w-3 mr-1" /> Nuevo
                </Button>
              </div>
              <div className="divide-y divide-slate-50">
                {holdings.length === 0
                  ? <p className="text-xs text-slate-400 italic p-5">Sin holdings registrados.</p>
                  : holdings.map((h) => (
                  <div key={h.id_holding} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 border border-violet-100">
                      <Globe className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 flex-1">{h.nombre}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => { setEditandoId(h.id_holding); holdingForm.reset({ nombre: h.nombre }); setModal("holding"); }}>
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => eliminarHolding(h.id_holding)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Empresas + Sucursales */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Empresas</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Haz click para ver y gestionar sucursales</p>
                </div>
                <Button size="sm" className="h-7 bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-bold px-3"
                  onClick={() => { setEditandoId(null); empresaForm.reset({ razon_social: "", rif: "", id_holding: "" }); setModal("empresa"); }}>
                  <Plus className="h-3 w-3 mr-1" /> Nueva
                </Button>
              </div>
              <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                {loading
                  ? <p className="text-xs text-slate-400 italic p-5">Cargando...</p>
                  : empresas.map((e) => (
                  <div key={e.id}>
                    <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 group transition-colors"
                      onClick={() => toggleEmpresa(e.id)}>
                      <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{e.razon_social}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {e.rif && <span className="text-[10px] font-mono text-slate-400">{e.rif}</span>}
                          {e.holding && <span className="text-[10px] text-violet-600 font-semibold flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{e.holding.nombre}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(ev) => ev.stopPropagation()}>
                          <button className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => { setEditandoId(e.id); empresaForm.reset({ razon_social: e.razon_social, rif: e.rif ?? "", id_holding: e.holding?.id_holding ?? "" }); setModal("empresa"); }}>
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Nueva sucursal"
                            onClick={() => { setEditandoId(null); sucursalForm.reset({ nombre: "", direccion: "", id_empresa: e.id }); setModal("sucursal"); }}>
                            <Plus className="h-3 w-3" />
                          </button>
                          <button className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => eliminarEmpresa(e.id)}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {empresaExpandida === e.id ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                    </div>

                    {empresaExpandida === e.id && (
                      <div className="px-5 pb-3 bg-slate-50/60">
                        {loadingSucursales === e.id
                          ? <p className="text-[11px] text-slate-400 italic py-2 pl-10">Cargando sucursales...</p>
                          : (sucursalesMap[e.id] ?? []).length === 0
                          ? <p className="text-[11px] text-slate-400 italic py-2 pl-10 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" />Sin sucursales</p>
                          : (sucursalesMap[e.id] ?? []).map((s) => (
                            <div key={s.id_sucursal} className="flex items-center gap-2.5 py-2 pl-10 group/suc border-b border-slate-100 last:border-0">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-600">{s.nombre}</p>
                                {s.direccion && <p className="text-[10px] text-slate-400 truncate">{s.direccion}</p>}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/suc:opacity-100 transition-opacity">
                                <button className="h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => { setEditandoId(s.id_sucursal); sucursalForm.reset({ nombre: s.nombre, direccion: s.direccion ?? "", id_empresa: e.id }); setModal("sucursal"); }}>
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                                <button className="h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={() => eliminarSucursal(s.id_sucursal, e.id)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: ROLES & PERMISOS ════════════════════════════════════════════ */}
        {tab === "roles" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ height: "calc(100vh - 230px)" }}>

            {/* Lista roles */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Roles</p>
                <Button size="sm" className="h-7 bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-bold px-3"
                  onClick={() => { setEditandoId(null); rolForm.reset({ nombre: "", descripcion: "" }); setModal("rol"); }}>
                  <Plus className="h-3 w-3 mr-1" /> Nuevo
                </Button>
              </div>
              <div className="divide-y divide-slate-50 overflow-y-auto flex-1">
                {roles.map((r) => (
                  <div key={r.id_rol}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer group transition-colors ${rolSeleccionado?.id_rol === r.id_rol ? "bg-violet-50 border-l-2 border-violet-500" : "hover:bg-slate-50 border-l-2 border-transparent"}`}
                    onClick={() => seleccionarRol(r)}>
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ${rolSeleccionado?.id_rol === r.id_rol ? "bg-violet-100 border-violet-200" : "bg-slate-50 border-slate-100"}`}>
                      <Shield className={`h-3.5 w-3.5 ${rolSeleccionado?.id_rol === r.id_rol ? "text-violet-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${rolSeleccionado?.id_rol === r.id_rol ? "text-violet-700" : "text-slate-700"}`}>{r.nombre}</p>
                      <p className="text-[10px] text-slate-400">{r.permisos?.length ?? 0} permisos</p>
                    </div>
                    <button className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); eliminarRol(r.id_rol); }}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor permisos */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              {!rolSeleccionado ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Shield className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Selecciona un rol para editar sus permisos</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{rolSeleccionado.nombre}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{permisosEditando.length} permisos activos</p>
                    </div>
                    <Button size="sm" className="h-8 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-4"
                      onClick={guardarPermisos} disabled={guardandoPermisos}>
                      <Save className="h-3 w-3 mr-1.5" />{guardandoPermisos ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                  <div className="p-5 space-y-5 overflow-y-auto flex-1">
                    {Object.entries(MODULOS_PERMISOS).map(([key, mod]) => {
                      const todosActivos = mod.permisos.every((p) => permisosEditando.includes(p.key));
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${todosActivos ? "text-violet-600" : "text-slate-400"}`}>
                              {mod.label}
                            </span>
                            <div className="flex-1 h-px bg-slate-100" />
                            <button type="button" className="text-[9px] text-slate-300 hover:text-slate-500 transition-colors" onClick={() => toggleModulo(key)}>
                              {todosActivos ? "quitar todos" : "marcar todos"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {mod.permisos.map((p) => (
                              <PermisoChip key={p.key} label={p.label} activo={permisosEditando.includes(p.key)} onClick={() => togglePermiso(p.key)} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: USUARIOS ════════════════════════════════════════════════════ */}
        {tab === "usuarios" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Users className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input placeholder="Buscar usuario..." className="pl-9 h-9 text-sm bg-white"
                    value={busquedaUsuario} onChange={(e) => setBusquedaUsuario(e.target.value)} />
                </div>
                <Select value={filtroEmpresaU} onValueChange={setFiltroEmpresaU}>
                  <SelectTrigger className="h-9 text-sm w-52 bg-white"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las empresas</SelectItem>
                    {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-9 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-4"
                onClick={() => { setEditandoId(null); setSucursalesModal([]); usuarioForm.reset({ nombre_completo: "", correo: "", clave: "", id_empresa: "", id_sucursal: "", id_rol: "" }); setModal("usuario"); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Nuevo Usuario
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 pl-6">Usuario</th>
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sucursal</th>
                    <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="h-40 text-center text-slate-400 italic text-sm">Cargando...</td></tr>
                  ) : usuariosFiltrados.length === 0 ? (
                    <tr><td colSpan={6} className="h-40 text-center text-slate-400 text-sm">Sin resultados.</td></tr>
                  ) : usuariosFiltrados.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="pl-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">
                            {u.nombre_completo?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{u.nombre_completo}</p>
                            <p className="text-[10px] text-slate-400">{u.correo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-500">{u.empresa?.razon_social || "—"}</td>
                      <td>
                        <Badge variant="outline" className="text-[10px] font-bold bg-violet-50 text-violet-700 border-violet-100">
                          {u.rol?.nombre || "Sin rol"}
                        </Badge>
                      </td>
                      <td className="text-xs text-slate-400">{u.sucursal?.nombre || <span className="italic text-slate-300">—</span>}</td>
                      <td className="text-center">
                        {u.activo
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><UserCheck className="h-2.5 w-2.5" />Activo</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><UserX className="h-2.5 w-2.5" />Inactivo</span>}
                      </td>
                      <td className="pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setEditandoId(u.id);
                              if (u.empresa?.id) handleEmpresaUsuario(u.empresa.id, (v) => usuarioForm.setValue("id_empresa", v));
                              usuarioForm.reset({ nombre_completo: u.nombre_completo, correo: u.correo, clave: "", id_empresa: u.empresa?.id ?? "", id_sucursal: u.sucursal?.id_sucursal ?? "", id_rol: u.rol?.id_rol ?? "" });
                              setModal("usuario");
                            }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${u.activo ? "text-slate-400 hover:text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                            onClick={() => toggleUsuario(u.id)} title={u.activo ? "Desactivar" : "Activar"}>
                            {u.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                          <button className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => eliminarUsuario(u.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && usuariosFiltrados.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-50 text-[11px] text-slate-400">
                  {usuariosFiltrados.length} de {usuarios.length} usuarios
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: VENDEDORES ══════════════════════════════════════════════════ */}
        {tab === "vendedores" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Briefcase className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input placeholder="Buscar vendedor..." className="pl-9 h-9 text-sm bg-white"
                    value={busquedaVendedor} onChange={(e) => setBusquedaVendedor(e.target.value)} />
                </div>
                <Select value={filtroEmpresaV} onValueChange={setFiltroEmpresaV}>
                  <SelectTrigger className="h-9 text-sm w-52 bg-white"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las empresas</SelectItem>
                    {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-9 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-4"
                onClick={() => { setEditandoId(null); vendedorForm.reset({ nombre_apellido: "", correo: "", telefono: "", id_empresa: "" }); setModal("vendedor"); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Nuevo Vendedor
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 pl-6">Vendedor</th>
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={4} className="h-40 text-center text-slate-400 italic text-sm">Cargando...</td></tr>
                  ) : vendedoresFiltrados.length === 0 ? (
                    <tr><td colSpan={4} className="h-40 text-center text-slate-400 text-sm">Sin resultados.</td></tr>
                  ) : vendedoresFiltrados.map((v) => (
                    <tr key={v.id_vendedor} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="pl-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-bold text-blue-600 shrink-0 border border-blue-100">
                            {v.nombre_apellido?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{v.nombre_apellido}</p>
                            {v.correo && <p className="text-[10px] text-slate-400">{v.correo}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-500">{v.empresa?.razon_social || "—"}</td>
                      <td className="text-xs text-slate-400">{v.telefono || <span className="italic text-slate-300">—</span>}</td>
                      <td className="pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setEditandoId(v.id_vendedor);
                              vendedorForm.reset({ nombre_apellido: v.nombre_apellido, correo: v.correo ?? "", telefono: v.telefono ?? "", id_empresa: v.empresa?.id ?? "" });
                              setModal("vendedor");
                            }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => eliminarVendedor(v.id_vendedor)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && vendedoresFiltrados.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-50 text-[11px] text-slate-400">
                  {vendedoresFiltrados.length} de {vendedores.length} vendedores
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ════ MODALES ════════════════════════════════════════════════════════ */}

      {/* Holding */}
      <Dialog open={modal === "holding"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editandoId ? "Editar Holding" : "Nuevo Holding"}</DialogTitle></DialogHeader>
          <Form {...holdingForm}>
            <form onSubmit={holdingForm.handleSubmit(onHolding)} className="space-y-4 pt-2">
              <FormField control={holdingForm.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" className="text-xs font-bold" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-xs font-bold px-6">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Empresa */}
      <Dialog open={modal === "empresa"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoId ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle></DialogHeader>
          <Form {...empresaForm}>
            <form onSubmit={empresaForm.handleSubmit(onEmpresa)} className="space-y-4 pt-2">
              <FormField control={empresaForm.control} name="razon_social" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Razón Social</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={empresaForm.control} name="rif" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">RIF</FormLabel>
                  <FormControl><Input {...field} placeholder="J-00000000-0" className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={empresaForm.control} name="id_holding" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Holding</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin holding" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {holdings.map((h) => <SelectItem key={h.id_holding} value={h.id_holding}>{h.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" className="text-xs font-bold" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-xs font-bold px-6">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sucursal */}
      <Dialog open={modal === "sucursal"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoId ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle></DialogHeader>
          <Form {...sucursalForm}>
            <form onSubmit={sucursalForm.handleSubmit(onSucursal)} className="space-y-4 pt-2">
              <FormField control={sucursalForm.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={sucursalForm.control} name="direccion" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Dirección</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" className="text-xs font-bold" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-xs font-bold px-6">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rol */}
      <Dialog open={modal === "rol"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Rol</DialogTitle></DialogHeader>
          <Form {...rolForm}>
            <form onSubmit={rolForm.handleSubmit(onRol)} className="space-y-4 pt-2">
              <FormField control={rolForm.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre del Rol</FormLabel>
                  <FormControl><Input {...field} placeholder="Ej: GERENTE_REGIONAL" className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={rolForm.control} name="descripcion" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Descripción</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <p className="text-[11px] text-slate-400">El rol se creará vacío — asigna sus permisos desde el editor.</p>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" className="text-xs font-bold" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-xs font-bold px-6">Crear Rol</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Usuario */}
      <Dialog open={modal === "usuario"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoId ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle></DialogHeader>
          <Form {...usuarioForm}>
            <form onSubmit={usuarioForm.handleSubmit(onUsuario)} className="space-y-3 pt-2">
              <FormField control={usuarioForm.control} name="nombre_completo" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={usuarioForm.control} name="correo" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Correo</FormLabel>
                    <FormControl><Input {...field} type="email" className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={usuarioForm.control} name="clave" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">{editandoId ? "Nueva Clave" : "Clave"}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type={showClave ? "text" : "password"} className="h-9 text-sm pr-9" />
                        <button type="button" className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => setShowClave(!showClave)}>
                          {showClave ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={usuarioForm.control} name="id_empresa" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Empresa</FormLabel>
                  <Select onValueChange={(v) => handleEmpresaUsuario(v, field.onChange)} value={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={usuarioForm.control} name="id_sucursal" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Sucursal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {sucursalesModal.map((s) => <SelectItem key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={usuarioForm.control} name="id_rol" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar rol" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {roles.map((r) => <SelectItem key={r.id_rol} value={r.id_rol}>{r.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" className="text-xs font-bold" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-xs font-bold px-6">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Vendedor */}
      <Dialog open={modal === "vendedor"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoId ? "Editar Vendedor" : "Nuevo Vendedor"}</DialogTitle></DialogHeader>
          <Form {...vendedorForm}>
            <form onSubmit={vendedorForm.handleSubmit(onVendedor)} className="space-y-4 pt-2">
              <FormField control={vendedorForm.control} name="nombre_apellido" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre y Apellido</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={vendedorForm.control} name="correo" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Correo</FormLabel>
                    <FormControl><Input {...field} type="email" placeholder="Opcional" className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={vendedorForm.control} name="telefono" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Teléfono</FormLabel>
                    <FormControl><Input {...field} placeholder="Opcional" className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={vendedorForm.control} name="id_empresa" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Empresa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" className="text-xs font-bold" onClick={() => setModal(null)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-xs font-bold px-6">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
