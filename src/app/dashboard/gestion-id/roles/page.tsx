"use client";

import { useEffect, useState } from "react";
import { Shield, Plus, Save, ChevronRight, Check, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ================================================================
// TODOS LOS PERMISOS AGRUPADOS POR MÓDULO
// ================================================================
const MODULOS_PERMISOS = [
  {
    modulo: "Empresa",
    permisos: [
      { key: "ver_empresa", label: "Ver empresa" },
      { key: "editar_empresa", label: "Editar empresa" },
    ],
  },
  {
    modulo: "Usuarios",
    permisos: [
      { key: "ver_usuarios", label: "Ver usuarios" },
      { key: "crear_usuarios", label: "Crear usuarios" },
      { key: "editar_usuarios", label: "Editar usuarios" },
    ],
  },
  {
    modulo: "Roles",
    permisos: [
      { key: "ver_roles", label: "Ver roles" },
      { key: "crear_roles", label: "Crear roles" },
      { key: "editar_roles", label: "Editar roles" },
      { key: "eliminar_roles", label: "Eliminar roles" },
    ],
  },
  {
    modulo: "Inventario",
    permisos: [
      { key: "ver_inventario", label: "Ver inventario" },
      { key: "editar_inventario", label: "Editar inventario" },
      { key: "ver_kardex", label: "Ver kardex" },
      { key: "ver_inventario_valorizado", label: "Ver inventario valorizado" },
    ],
  },
  {
    modulo: "Productos",
    permisos: [
      { key: "ver_productos", label: "Ver Productos" },
      { key: "crear_productos", label: "Crear Productos" },
      { key: "editar_productos", label: "Editar Productos" },
      { key: "eliminar_productos", label: "Eliminar Productos" },
    ],
  },
  {
    modulo: "Compras",
    permisos: [
      { key: "ver_compras", label: "Ver compras" },
      { key: "crear_compras", label: "Crear compras" },
      { key: "ver_reportes_compras", label: "Ver reportes de compras" },
      { key: "ver_cuentas_pagar", label: "Ver cuentas por pagar" },
      { key: "pagar_cuentas", label: "Pago Proveedores" },
    ],
  },
  {
    modulo: "Proveedores",
    permisos: [
      { key: "ver_proveedores", label: "Ver proveedores" },
      { key: "crear_proveedores", label: "Crear proveedores" },
      { key: "editar_proveedores", label: "Editar proveedores" },
      { key: "eliminar_proveedores", label: "Eliminar proveedores" }, // ← agregar
    ],
  },
  {
    modulo: "Almacenes",
    permisos: [
      { key: "ver_almacenes", label: "Ver almacenes" },
      { key: "editar_almacenes", label: "Editar almacenes" },
    ],
  },
  {
    modulo: "Ventas",
    permisos: [
      { key: "ver_ventas", label: "Ver ventas" },
      { key: "crear_ventas", label: "Crear ventas" },
      { key: "anular_ventas", label: "Anular ventas" },
    ],
  },
  {
    modulo: "Pedidos",
    permisos: [
      { key: "ver_pedidos", label: "Ver pedidos" },
      { key: "crear_pedidos", label: "Crear pedidos" },
      { key: "editar_pedidos", label: "Editar pedidos" },       // ← agregar
      { key: "revisar_pedidos", label: "Revisar pedidos" },     // ← agregar
      { key: "facturar_pedidos", label: "Facturar pedidos" },   // ← agregar
    ],
  },
  {
    modulo: "Clientes",
    permisos: [
      { key: "ver_clientes", label: "Ver clientes" },
      { key: "crear_clientes", label: "Crear clientes" },
      { key: "editar_clientes", label: "Editar clientes" },
      { key: "ver_perfil_cliente", label: "Ver Perfil Cliente" },
    ],
  },
  {
    modulo: "Cobranzas",
    permisos: [
      { key: "ver_cobranzas", label: "Ver cobranzas" },
      { key: "aprobar_cobranzas", label: "Aprobar cobranzas" },
      { key: "rechazar_cobranzas", label: "Rechazar cobranzas" },
    ],
  },
  {
    modulo: "CXC & Reportes",
    permisos: [
      { key: "ver_cxc", label: "Ver cuentas por cobrar" },
      
    ],
  },
  {
    modulo: "Vendedores",
    permisos: [
      { key: "ver_vendedores", label: "Ver vendedores" },
      { key: "crear_vendedores", label: "Crear vendedores" },
      { key: "editar_vendedores", label: "Editar vendedores" },
      { key: "eliminar_vendedores", label: "Eliminar vendedores" },
    ],
  },
];

interface Rol {
  id_rol: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);
  const [permisosEditando, setPermisosEditando] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [modalNuevoRol, setModalNuevoRol] = useState(false);
  const [nuevoRol, setNuevoRol] = useState({ nombre: "", descripcion: "" });

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/roles");
      setRoles(data);
    } catch (error) {
      toast.error("Error cargando roles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleSeleccionarRol = (rol: Rol) => {
    setRolSeleccionado(rol);
    setPermisosEditando([...rol.permisos]);
  };

  const togglePermiso = (key: string) => {
    setPermisosEditando(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const toggleModulo = (permisos: { key: string }[]) => {
    const keys = permisos.map(p => p.key);
    const todosActivos = keys.every(k => permisosEditando.includes(k));
    if (todosActivos) {
      setPermisosEditando(prev => prev.filter(p => !keys.includes(p)));
    } else {
      setPermisosEditando(prev => [...new Set([...prev, ...keys])]);
    }
  };

  const handleGuardar = async () => {
    if (!rolSeleccionado) return;
    setGuardando(true);
    try {
      await api.patch(`/roles/${rolSeleccionado.id_rol}/permisos`, {
        permisos: permisosEditando,
      });
      toast.success("Permisos actualizados correctamente");
      fetchRoles();
      setRolSeleccionado(prev => prev ? { ...prev, permisos: permisosEditando } : null);
    } catch (error) {
      toast.error("Error guardando permisos");
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearRol = async () => {
    if (!nuevoRol.nombre.trim()) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }
    try {
      await api.post("/roles", { ...nuevoRol, permisos: [] });
      toast.success("Rol creado correctamente");
      setModalNuevoRol(false);
      setNuevoRol({ nombre: "", descripcion: "" });
      fetchRoles();
    } catch (error) {
      toast.error("Error creando rol");
    }
  };

  const handleEliminarRol = async (e: React.MouseEvent, rol: Rol) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(true);
    try {
      await api.delete(`/roles/${rol.id_rol}`);
      toast.success(`Rol "${rol.nombre}" eliminado`);
      if (rolSeleccionado?.id_rol === rol.id_rol) setRolSeleccionado(null);
      fetchRoles();
    } catch (error) {
      toast.error("Error eliminando rol");
    } finally {
      setEliminando(false);
    }
  };

  const totalPermisos = MODULOS_PERMISOS.reduce((acc, m) => acc + m.permisos.length, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm">

      {/* NAVBAR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            Gestión / Roles y Permisos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchRoles}>
            <RefreshCcw className="h-3 w-3" /> Actualizar
          </Button>
          <Button
            size="sm"
            className="h-8 bg-slate-900 hover:bg-slate-800 text-xs gap-1.5 font-bold"
            onClick={() => setModalNuevoRol(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo Rol
          </Button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* PANEL IZQUIERDO — LISTA DE ROLES */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Roles del Sistema</h2>
                <p className="text-xs text-slate-400">{roles.length} roles configurados</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400 text-xs italic">Cargando...</div>
            ) : (
              roles.map((rol) => (
                <div key={rol.id_rol} className="flex items-center gap-1 mb-1">
                  <button
                    onClick={() => handleSeleccionarRol(rol)}
                    className={cn(
                      "flex-1 flex items-center justify-between p-3 rounded-lg text-left transition-all group",
                      rolSeleccionado?.id_rol === rol.id_rol
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div>
                      <div className={cn(
                        "font-bold text-sm",
                        rolSeleccionado?.id_rol === rol.id_rol ? "text-white" : "text-slate-800"
                      )}>
                        {rol.nombre}
                      </div>
                      <div className={cn(
                        "text-[11px] mt-0.5",
                        rolSeleccionado?.id_rol === rol.id_rol ? "text-slate-300" : "text-slate-400"
                      )}>
                        {rol.permisos.length} permisos
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0",
                      rolSeleccionado?.id_rol === rol.id_rol ? "text-slate-300" : "text-slate-300 group-hover:text-slate-500"
                    )} />
                  </button>
                  <button
                    onClick={(e) => handleEliminarRol(e, rol)}
                    disabled={eliminando}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO — EDITOR DE PERMISOS */}
        <div className="flex-1 overflow-y-auto">
          {!rolSeleccionado ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Shield className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-slate-500">Selecciona un rol para editar sus permisos</p>
                <p className="text-xs mt-1">Haz clic en cualquier rol de la lista</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-3xl">

              {/* HEADER DEL ROL */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{rolSeleccionado.nombre}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{rolSeleccionado.descripcion}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {permisosEditando.length} / {totalPermisos} permisos
                  </Badge>
                  <Button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="bg-slate-900 hover:bg-slate-800 h-9 gap-2 font-bold text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {guardando ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </div>

              {/* BARRA DE PROGRESO */}
              <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span className="font-medium">Nivel de acceso</span>
                  <span className="font-bold">{Math.round((permisosEditando.length / totalPermisos) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-300"
                    style={{ width: `${(permisosEditando.length / totalPermisos) * 100}%` }}
                  />
                </div>
              </div>

              {/* PERMISOS POR MÓDULO */}
              <div className="space-y-3">
                {MODULOS_PERMISOS.map((grupo) => {
                  const todosActivos = grupo.permisos.every(p => permisosEditando.includes(p.key));
                  const algunoActivo = grupo.permisos.some(p => permisosEditando.includes(p.key));

                  return (
                    <div key={grupo.modulo} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      {/* HEADER MÓDULO */}
                      <button
                        onClick={() => toggleModulo(grupo.permisos)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                            todosActivos
                              ? "bg-slate-900 border-slate-900"
                              : algunoActivo
                              ? "bg-slate-200 border-slate-400"
                              : "border-slate-300"
                          )}>
                            {todosActivos && <Check className="h-3 w-3 text-white" />}
                            {algunoActivo && !todosActivos && <div className="h-2 w-2 bg-slate-500 rounded-sm" />}
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{grupo.modulo}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {grupo.permisos.filter(p => permisosEditando.includes(p.key)).length}/{grupo.permisos.length}
                        </span>
                      </button>

                      {/* PERMISOS INDIVIDUALES */}
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {grupo.permisos.map((permiso) => {
                          const activo = permisosEditando.includes(permiso.key);
                          return (
                            <button
                              key={permiso.key}
                              onClick={() => togglePermiso(permiso.key)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-4 w-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                  activo ? "bg-slate-900 border-slate-900" : "border-slate-300"
                                )}>
                                  {activo && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <span className={cn(
                                  "text-sm",
                                  activo ? "text-slate-800 font-medium" : "text-slate-500"
                                )}>
                                  {permiso.label}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-300">{permiso.key}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOTÓN GUARDAR INFERIOR */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="bg-slate-900 hover:bg-slate-800 h-10 gap-2 font-bold px-8"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO ROL */}
      <Dialog open={modalNuevoRol} onOpenChange={setModalNuevoRol}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold">Crear Nuevo Rol</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nombre del Rol</label>
              <Input
                placeholder="Ej: SUPERVISOR"
                className="h-9"
                value={nuevoRol.nombre}
                onChange={(e) => setNuevoRol(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Descripción</label>
              <Input
                placeholder="Describe las responsabilidades del rol"
                className="h-9"
                value={nuevoRol.descripcion}
                onChange={(e) => setNuevoRol(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
            <p className="text-xs text-slate-400">El rol se creará sin permisos. Podrás asignarlos desde el editor.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setModalNuevoRol(false)} className="text-xs font-bold">
                Cancelar
              </Button>
              <Button onClick={handleCrearRol} className="bg-slate-900 text-xs font-bold px-6">
                Crear Rol
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
