"use client";

import { useEffect, useState } from "react";
import { 
  Plus, Pencil, Trash2, Search, Users, MapPin, 
  Phone, Briefcase, UserPlus, RefreshCcw, Building2, Fingerprint,
  Eye // <-- 1. Nuevo ícono para "Ver Perfil"
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation"; // <-- 2. Importamos el router de Next.js

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEmpresaId } from "@/lib/auth-utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  razon_social: z.string().min(3, "Nombre obligatorio"),
  rif: z.string().min(5, "RIF/CI obligatorio"),
  telefono: z.string().optional(),
  direccion_fiscal: z.string().optional(),
  id_vendedor: z.string().min(1, "Debe asignar un vendedor"),
});

interface Cliente {
  id_cliente: string;
  razon_social: string;
  rif: string;
  numero_telefonico: string;
  direccion_fiscal: string;
  vendedor?: { id_vendedor: string; nombre_apellido: string };
}

export default function ClientesPage() {
  const router = useRouter(); // <-- 3. Inicializamos el router
  const idEmpresa = getEmpresaId();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editarItem, setEditarItem] = useState<Cliente | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { razon_social: "", rif: "", telefono: "", direccion_fiscal: "", id_vendedor: "" },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClientes, resVendedores] = await Promise.all([
        api.get("/clientes"),
        api.get(`/vendedores?id_empresa=${idEmpresa}`)
      ]);
      setClientes(resClientes.data);
      setVendedores(resVendedores.data);
    } catch (error) {
      toast.error("Error al sincronizar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [idEmpresa]);

  const filtered = clientes.filter(c => 
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rif.toLowerCase().includes(busqueda.toLowerCase())
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = { ...values, id_empresa: idEmpresa };
      if (editarItem) {
        await api.patch(`/clientes/${editarItem.id_cliente}`, payload);
        toast.success("Cliente actualizado");
      } else {
        await api.post("/clientes", payload);
        toast.success("Cliente registrado");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Error en la operación");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar cliente?")) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast.success("Cliente eliminado");
      fetchData();
    } catch (error) {
      toast.error("No se puede eliminar (tiene ventas asociadas)");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plataforma / Clientes</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchData}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
            </Button>
            <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase" onClick={() => { setEditarItem(null); form.reset(); setIsDialogOpen(true); }}>
                <UserPlus className="mr-2 h-3.5 w-3.5" /> Nuevo Cliente
            </Button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Directorio de Clientes</h1>
                    <p className="text-sm text-slate-500">Auditoría detallada de la cartera de clientes y entidades fiscales.</p>
                </div>
            </div>
            
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Filtrar por nombre, identificación o referencia..." 
                    className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">Razón Social / Entidad</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Contacto Telefónico</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Dirección Fiscal / Sede</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center">Vendedor</TableHead>
                        <TableHead className="text-right pr-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">Sincronizando...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400">Sin resultados.</TableCell></TableRow>
                    ) : (
                        filtered.map((c) => (
                            <TableRow key={c.id_cliente} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-bold text-slate-800 text-sm leading-tight">{c.razon_social}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 uppercase font-mono tracking-tighter">
                                        <Fingerprint className="h-2.5 w-2.5 text-slate-400" /> {c.rif}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white text-blue-600 border-blue-100 px-2 py-0.5">
                                        <Phone className="h-2.5 w-2.5 mr-1 inline" /> {c.numero_telefonico || "SIN NÚMERO"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-w-[300px]">
                                    <div className="flex items-start gap-2 text-xs text-slate-500">
                                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                                        <span className="line-clamp-2">{c.direccion_fiscal || "Sin dirección"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {c.vendedor ? (
                                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-100">
                                            <Briefcase className="h-2.5 w-2.5" /> {c.vendedor.nombre_apellido}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 italic">No asignado</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        {/* 4. Nuevo botón de Perfil Analítico */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            title="Ver Perfil 360"
                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                                            onClick={() => router.push(`/dashboard/clientes/${c.id_cliente}`)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => { setEditarItem(c); form.reset({ ...c, telefono: c.numero_telefonico, id_vendedor: c.vendedor?.id_vendedor || "" }); setIsDialogOpen(true); }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(c.id_cliente)} 
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* Tu modal de formulario sigue idéntico aquí... */}
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold">
                {editarItem ? "Actualizar Cliente" : "Nuevo Registro"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="rif" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">RIF / Identificación</FormLabel><FormControl><Input placeholder="J-0000000-0" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telefono" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Teléfono</FormLabel><FormControl><Input placeholder="0412-0000000" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="razon_social" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Razón Social</FormLabel><FormControl><Input placeholder="Nombre de la empresa" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="direccion_fiscal" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Dirección Fiscal</FormLabel><FormControl><Input className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="id_vendedor" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Vendedor Asignado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Seleccionar vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id_vendedor} value={v.id_vendedor}>
                          {v.nombre_apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-xs font-bold">Cancelar</Button>
                <Button type="submit" className="bg-slate-900 px-6 text-xs font-bold uppercase tracking-wider">Guardar Cambios</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}