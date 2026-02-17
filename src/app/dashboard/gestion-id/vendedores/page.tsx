"use client";

import { useEffect, useState } from "react";
import { 
  Plus, Pencil, Trash2, Search, Briefcase, User, MapPin, Lock, 
  RefreshCcw, UserPlus, Fingerprint, Phone, ShieldCheck
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getEmpresaId } from "@/lib/auth-utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// 1. Interfaz según tu Entity
interface Vendedor {
  id_vendedor: string;
  nombre_apellido: string;
  cedula: string;
  telefono: string;
  ciudad: string;
  usuario: string;
}

// 2. Validaciones
const formSchema = z.object({
  nombre_apellido: z.string().min(3, "Nombre obligatorio"),
  cedula: z.string().min(5, "Cédula requerida"),
  telefono: z.string().min(1, "Teléfono requerido"),
  ciudad: z.string().min(1, "Ciudad requerida"),
  usuario: z.string().min(4, "Usuario min 4 caracteres"),
  contrasena: z.string().optional(),
});

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filtered, setFiltered] = useState<Vendedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editarItem, setEditarItem] = useState<Vendedor | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const idEmpresa = getEmpresaId();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { nombre_apellido: "", cedula: "", telefono: "", ciudad: "", usuario: "", contrasena: "" },
  });

  const fetchVendedores = async () => {
    if (!idEmpresa) return;
    try {
      setIsLoading(true);
      const { data } = await api.get(`/vendedores?id_empresa=${idEmpresa}`);
      setVendedores(data);
      setFiltered(data);
    } catch (error) {
      toast.error("Error cargando vendedores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchVendedores(); }, [idEmpresa]);

  useEffect(() => {
    const term = busqueda.toLowerCase();
    const results = vendedores.filter(v => 
      v.nombre_apellido.toLowerCase().includes(term) ||
      v.cedula.includes(term) ||
      v.usuario.toLowerCase().includes(term)
    );
    setFiltered(results);
  }, [busqueda, vendedores]);

  const onSubmit = async (values: any) => {
    if (!editarItem && (!values.contrasena || values.contrasena.length < 6)) {
      form.setError("contrasena", { message: "Contraseña obligatoria (min 6 car.)" });
      return;
    }

    try {
      const payload = { ...values, id_empresa: idEmpresa };
      if (editarItem && !payload.contrasena) delete payload.contrasena;

      if (editarItem) {
        await api.put(`/vendedores/${editarItem.id_vendedor}`, payload);
        toast.success("Vendedor actualizado");
      } else {
        await api.post("/vendedores", payload);
        toast.success("Vendedor registrado");
      }
      setIsDialogOpen(false);
      fetchVendedores();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al procesar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este vendedor del sistema?")) return;
    try {
      await api.delete(`/vendedores/${id}`);
      toast.success("Vendedor eliminado");
      fetchVendedores();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const openModal = (vendedor?: Vendedor) => {
    if (vendedor) {
      setEditarItem(vendedor);
      form.reset({
        nombre_apellido: vendedor.nombre_apellido,
        cedula: vendedor.cedula,
        telefono: vendedor.telefono,
        ciudad: vendedor.ciudad,
        usuario: vendedor.usuario,
        contrasena: ""
      });
    } else {
      setEditarItem(null);
      form.reset({ nombre_apellido: "", cedula: "", telefono: "", ciudad: "", usuario: "", contrasena: "" });
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm">
      
      {/* 🔴 NAVBAR SUPERIOR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Recursos / Fuerza de Ventas</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchVendedores}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
            </Button>
            <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase shadow-sm" onClick={() => openModal()}>
                <UserPlus className="mr-2 h-3.5 w-3.5" /> Nuevo Ejecutivo
            </Button>
        </div>
      </nav>

      {/* 🔵 ÁREA DE TRABAJO */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ENCABEZADO DE MÓDULO (Marco Kardex) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-lg">
                    <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fuerza de Ventas</h1>
                    <p className="text-sm text-slate-500">Gestión de ejecutivos comerciales, territorios y credenciales de acceso.</p>
                </div>
            </div>
            
            {/* BUSCADOR INTEGRADO */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Filtrar por nombre, cédula o usuario..." 
                    className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
        </div>

        {/* TABLA DE VENDEDORES (Estilo Kardex) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100 font-mono">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[13px] uppercase tracking-wider">Ejecutivo Comercial</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider text-center">Identificación</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Ubicación y Contacto</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Acceso al Sistema</TableHead>
                        <TableHead className="text-right pr-6 font-bold text-slate-700 text-[13px] uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">Sincronizando equipo...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">No se encontraron registros activos.</TableCell></TableRow>
                    ) : (
                        filtered.map((v) => (
                            <TableRow key={v.id_vendedor} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                            {v.nombre_apellido.charAt(0)}
                                        </div>
                                        <div className="font-bold text-slate-800 text-base leading-tight">{v.nombre_apellido}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-mono text-[12px] font-bold text-slate-500 bg-white border-slate-200 px-2 py-0.5">
                                        <Fingerprint className="h-2.5 w-2.5 mr-1 inline" /> {v.cedula}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                                            <MapPin className="h-3 w-3 text-slate-400" /> {v.ciudad}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                                            <Phone className="h-2.5 w-2.5" /> {v.telefono}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[12px] font-bold border border-blue-100 uppercase tracking-tighter">
                                        <ShieldCheck className="h-2.5 w-2.5" /> @{v.usuario}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openModal(v)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(v.id_vendedor)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6">
                Personal activo: {filtered.length} Usuarios
            </div>
        </div>
      </main>

      {/* MODAL FICHA DE VENDEDOR */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold">
                {editarItem ? "Actualizar Perfil" : "Registrar Nuevo Ejecutivo"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cedula" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Identificación (Cédula)</FormLabel><FormControl><Input placeholder="V-00.000.000" className="h-9 text-sm" {...field} disabled={!!editarItem} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nombre_apellido" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</FormLabel><FormControl><Input placeholder="Nombre y Apellido" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="telefono" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Contacto Móvil</FormLabel><FormControl><Input placeholder="04xx-0000000" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ciudad" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Zona / Ciudad</FormLabel><FormControl><Input placeholder="Territorio asignado" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* SECCIÓN DE SEGURIDAD */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                    <ShieldCheck className="size-4 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-tight">Credenciales de Seguridad</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="usuario" render={({ field }: any) => (
                        <FormItem><FormLabel className="text-[10px] font-bold text-slate-400 uppercase">ID Usuario</FormLabel><FormControl><Input className="h-8 text-xs bg-white" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="contrasena" render={({ field }: any) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold text-slate-400 uppercase">{editarItem ? "Clave (Opcional)" : "Clave de Acceso"}</FormLabel>
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
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-50 mt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-xs font-bold">Cerrar</Button>
                <Button type="submit" className="bg-slate-900 px-6 text-xs font-bold uppercase tracking-wider shadow-lg">
                    {editarItem ? "Guardar Cambios" : "Suministrar Acceso"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}