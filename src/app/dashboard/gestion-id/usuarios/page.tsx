"use client";

import { useEffect, useState } from "react";
import {
  Plus, Pencil, Search, ShieldCheck, User, Mail, Lock,
  RefreshCcw, ToggleLeft, ToggleRight, Shield, Users, Building2
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getEmpresaId } from "@/lib/auth-utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  activo: boolean;
  rol?: { id_rol: string; nombre: string };
  sucursal?: { id_sucursal: string; nombre: string };
  empresa?: { id: string; razon_social: string };
}

const formSchema = z.object({
  nombre_completo: z.string().min(3, "Nombre obligatorio"),
  correo: z.string().email("Correo inválido"),
  clave: z.string().optional(),
  rol: z.string().min(1, "Selecciona un rol"),
  id_empresa: z.string().min(1, "Selecciona una empresa"),
  id_sucursal: z.string().optional(),
});

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtered, setFiltered] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editarItem, setEditarItem] = useState<Usuario | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const idEmpresaActual = getEmpresaId();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nombre_completo: "", correo: "", clave: "",
      rol: "VENDEDOR", id_empresa: "", id_sucursal: "",
    },
  });

  const empresaSeleccionada = form.watch("id_empresa");

  // ── Fetchers ──────────────────────────────────────────────

  const fetchUsuarios = async () => {
    if (!idEmpresaActual) return;
    try {
      setIsLoading(true);
      const { data } = await api.get(`/usuarios?id_empresa=${idEmpresaActual}`);
      setUsuarios(data);
      setFiltered(data);
    } catch {
      toast.error("Error cargando usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      // Intenta cargar todas las empresas del holding para el selector
      const { data } = await api.get("/empresas");
      setEmpresas(Array.isArray(data) ? data : data.empresas ?? []);
    } catch {
      console.error("Error cargando empresas");
    }
  };

  const fetchSucursales = async (idEmpresa: string) => {
    if (!idEmpresa) { setSucursales([]); return; }
    try {
      const { data } = await api.get(`/sucursales?id_empresa=${idEmpresa}`);
      setSucursales(Array.isArray(data) ? data : []);
    } catch {
      setSucursales([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get("/roles");
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      console.error("Error cargando roles");
    }
  };

  // ── Effects ───────────────────────────────────────────────

  useEffect(() => {
    fetchUsuarios();
    fetchEmpresas();
    fetchRoles();
  }, [idEmpresaActual]);

  // Cuando cambia la empresa seleccionada en el form, recarga sucursales
  useEffect(() => {
    if (empresaSeleccionada) {
      fetchSucursales(empresaSeleccionada);
      form.setValue("id_sucursal", ""); // limpia sucursal al cambiar empresa
    }
  }, [empresaSeleccionada]);

  useEffect(() => {
    const term = busqueda.toLowerCase();
    setFiltered(
      usuarios.filter(u =>
        u.nombre_completo.toLowerCase().includes(term) ||
        u.correo.toLowerCase().includes(term) ||
        u.rol?.nombre.toLowerCase().includes(term)
      )
    );
  }, [busqueda, usuarios]);

  // ── Submit ────────────────────────────────────────────────

  const onSubmit = async (values: any) => {
    if (!editarItem && (!values.clave || values.clave.length < 6)) {
      form.setError("clave", { message: "Clave obligatoria (mín. 6 caracteres)" });
      return;
    }
    try {
      const payload = { ...values };
      if (!payload.id_sucursal) delete payload.id_sucursal;
      if (editarItem && !payload.clave) delete payload.clave;

      if (editarItem) {
        await api.patch(`/usuarios/${editarItem.id}`, payload);
        toast.success("Usuario actualizado");
      } else {
        await api.post("/usuarios", payload);
        toast.success("Usuario creado correctamente");
      }
      setIsDialogOpen(false);
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al procesar");
    }
  };

  // ── Helpers ───────────────────────────────────────────────

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      await api.patch(`/usuarios/${usuario.id}/toggle-activo`);
      toast.success(`Usuario ${usuario.activo ? "desactivado" : "activado"}`);
      fetchUsuarios();
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const openModal = (usuario?: Usuario) => {
    if (usuario) {
      setEditarItem(usuario);
      const idEmp = usuario.empresa?.id || idEmpresaActual || "";
      form.reset({
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        clave: "",
        rol: usuario.rol?.nombre || "VENDEDOR",
        id_empresa: idEmp,
        id_sucursal: usuario.sucursal?.id_sucursal || "",
      });
      if (idEmp) fetchSucursales(idEmp);
    } else {
      setEditarItem(null);
      form.reset({
        nombre_completo: "", correo: "", clave: "",
        rol: "VENDEDOR", id_empresa: idEmpresaActual || "", id_sucursal: "",
      });
      if (idEmpresaActual) fetchSucursales(idEmpresaActual);
    }
    setIsDialogOpen(true);
  };

  const getRolColor = (rol?: string) => {
    switch (rol) {
      case "ROOT":        return "bg-red-50 text-red-700 border-red-200";
      case "SUPER_ADMIN": return "bg-orange-50 text-orange-700 border-orange-200";
      case "GERENCIA":    return "bg-purple-50 text-purple-700 border-purple-200";
      case "VENTAS":      return "bg-blue-50 text-blue-700 border-blue-200";
      case "ALMACEN":     return "bg-amber-50 text-amber-700 border-amber-200";
      case "VENDEDOR":    return "bg-slate-50 text-slate-700 border-slate-200";
      default:            return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm">

      {/* NAVBAR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            Gestión / Usuarios del Sistema
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchUsuarios}>
            <RefreshCcw className="h-3 w-3" /> Actualizar
          </Button>
          <Button
            size="sm"
            className="h-8 bg-slate-900 hover:bg-slate-800 text-xs gap-1.5 font-bold"
            onClick={() => openModal()}
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo Usuario
          </Button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ENCABEZADO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Usuarios del Sistema</h1>
              <p className="text-sm text-slate-500">Gestión de accesos, roles y credenciales de seguridad.</p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              placeholder="Filtrar por nombre, correo o rol..."
              className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* TABLA */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100 font-mono">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[13px] uppercase tracking-wider">Usuario</TableHead>
                <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Correo</TableHead>
                <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Rol</TableHead>
                <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Empresa</TableHead>
                <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Sucursal</TableHead>
                <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider text-center">Estado</TableHead>
                <TableHead className="text-right pr-6 font-bold text-slate-700 text-[13px] uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-400 italic">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-400 italic">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                          {u.nombre_completo.charAt(0)}
                        </div>
                        <div className="font-bold text-slate-800 text-base leading-tight">
                          {u.nombre_completo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Mail className="h-3 w-3 text-slate-400" /> {u.correo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-bold text-[11px] uppercase tracking-wider ${getRolColor(u.rol?.nombre)}`}>
                        <Shield className="h-2.5 w-2.5 mr-1 inline" />
                        {u.rol?.nombre || "Sin rol"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {u.empresa?.razon_social || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">{u.sucursal?.nombre || "—"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => handleToggleActivo(u)} className="inline-flex items-center gap-1.5 transition-all">
                        {u.activo ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <ToggleRight className="h-3.5 w-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-400 font-bold text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                            <ToggleLeft className="h-3.5 w-3.5" /> Inactivo
                          </span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => openModal(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="bg-slate-50 border-t border-slate-100 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6">
            Total: {filtered.length} usuarios registrados
          </div>
        </div>
      </main>

      {/* MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {editarItem ? "Editar Usuario" : "Crear Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 bg-white">

              {/* Nombre + Correo */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nombre_completo" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</FormLabel>
                    <FormControl><Input placeholder="Nombre y Apellido" className="h-9 text-sm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="correo" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</FormLabel>
                    <FormControl><Input placeholder="correo@empresa.com" className="h-9 text-sm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Rol */}
              <FormField control={form.control} name="rol" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Rol del Sistema</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.length > 0
                        ? roles.map((r: any) => (
                            <SelectItem key={r.id_rol} value={r.nombre}>{r.nombre}</SelectItem>
                          ))
                        : ["SUPER_ADMIN", "VENTAS", "COBRANZAS", "GERENCIA", "ALMACEN", "VENDEDOR", "SUPERVISOR DE VENTAS"].map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Empresa + Sucursal */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="id_empresa" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Empresa</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {empresas.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="id_sucursal" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">
                      Sucursal <span className="text-slate-400 normal-case font-normal">(opcional)</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!empresaSeleccionada || sucursales.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={sucursales.length === 0 ? "Sin sucursales" : "Seleccionar sucursal"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sucursales.map((s: any) => (
                          <SelectItem key={s.id_sucursal ?? s.id} value={s.id_sucursal ?? s.id}>
                            {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Credenciales */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="size-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-tight">Credenciales de Seguridad</h4>
                </div>
                <FormField control={form.control} name="clave" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-slate-400 uppercase">
                      {editarItem ? "Nueva Clave (dejar vacío para no cambiar)" : "Clave de Acceso"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-300" />
                        <Input type="password" placeholder="******" className="h-8 text-xs pl-8 bg-white" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-50 mt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-xs font-bold">
                  Cerrar
                </Button>
                <Button type="submit" className="bg-slate-900 px-6 text-xs font-bold uppercase tracking-wider shadow-lg">
                  {editarItem ? "Guardar Cambios" : "Crear Usuario"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}