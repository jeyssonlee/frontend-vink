"use client";

import { useEffect, useState } from "react";
import { 
  Plus, Loader2, FileSpreadsheet, Pencil, Trash2, Search, 
  Package, RefreshCcw, Barcode, Tags, Layers 
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BadgeDollarSign } from "lucide-react";
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

interface Producto {
  id_producto: string;
  nombre: string;
  precio_base: number;
  codigo: string;
  marca?: string;
  categoria?: string;
  codigo_barras?: string;
  imagen?: string;
}

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  codigo: z.string().min(1, "El código es obligatorio"),
  precio: z.coerce.number().min(0, "Precio inválido"),
  codigo_barras: z.string().optional(),
  marca: z.string().optional(),
  categoria: z.string().optional(),
  imagen: z.string().optional(),
});

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const idEmpresa = getEmpresaId();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { 
      nombre: "", codigo: "", precio: 0, codigo_barras: "", marca: "", categoria: "", imagen: "" 
    },
  });

  const fetchProductos = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/productos");
      setProductos(data);
      setFilteredProductos(data);
    } catch (error) {
      toast.error("Error al cargar productos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProductos(); }, []);

  useEffect(() => {
    const results = productos.filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(busqueda.toLowerCase()))
    );
    setFilteredProductos(results);
  }, [busqueda, productos]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const loadingToast = toast.loading("Procesando carga masiva...");
    try {
      const { data } = await api.post("/productos/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.dismiss(loadingToast);
      toast.success(`Importados ${data.procesados_exitosamente} productos.`);
      fetchProductos();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error en la importación");
    } finally {
      e.target.value = "";
    }
  };

  const handlePricesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const loadingToast = toast.loading("Actualizando precios...");

    try {
      // Ajusta la ruta según cómo la hayas definido en tu controlador de NestJS
      const { data } = await api.post("/productos/importar-precios", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.dismiss(loadingToast);
      
      // Usamos las variables que devuelve nuestro nuevo endpoint (creados y actualizados)
      toast.success(
        `¡Listo! ${data.actualizados} actualizados y ${data.creados} creados.`
      );
      
      fetchProductos();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al actualizar los precios");
    } finally {
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await api.delete(`/productos/${id}`); 
      toast.success("Producto eliminado");
      fetchProductos();
    } catch (error) {
      toast.error("No se puede eliminar (posiblemente tiene stock o movimientos).");
    }
  };

  const abrirModalEdicion = (producto: Producto) => {
    setProductoEditar(producto);
    form.reset({
      nombre: producto.nombre,
      codigo: producto.codigo,
      precio: Number(producto.precio_base),
      codigo_barras: producto.codigo_barras || "",
      marca: producto.marca || "",
      categoria: producto.categoria || "",
      imagen: producto.imagen || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setProductoEditar(null); form.reset(); }
  };

  async function onSubmit(values: any) {
    if (!idEmpresa) return toast.error("Error de sesión");
    try {
      const payload = {
        nombre: values.nombre,
        codigo: values.codigo,
        codigo_barras: values.codigo_barras,
        marca: values.marca,
        categoria: values.categoria,
        precio_base: Number(values.precio), 
        id_empresa: idEmpresa,
        imagen: values.imagen
      };

      if (productoEditar) {
        await api.patch(`/productos/${productoEditar.id_producto}`, payload);
        toast.success("Actualizado correctamente");
      } else {
        await api.post("/productos", payload);
        toast.success("Creado correctamente");
      }
      handleOpenChange(false);
      fetchProductos();
    } catch (error) {
      toast.error("Error al guardar");
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm">
      
      {/* 🔴 NAVBAR SUPERIOR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Maestros / Catálogo</span>
        </div>
        <div className="flex gap-2">
            <input type="file" id="xl-up" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={() => document.getElementById('xl-up')?.click()}>
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-green-600" /> Importar Productos
            </Button>
            <input type="file" id="xl-up-precios" className="hidden" accept=".xlsx,.xls" onChange={handlePricesUpload} />
    <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={() => document.getElementById('xl-up-precios')?.click()}>
        <BadgeDollarSign className="mr-2 h-3.5 w-3.5 text-blue-600" /> Cargar Precios
    </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchProductos}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
            </Button>
            <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Nuevo Producto
            </Button>
        </div>
      </nav>

      {/* 🔵 ÁREA DE TRABAJO */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ENCABEZADO DE MÓDULO (Marco con bordes suaves) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Maestro de Productos</h1>
                    <p className="text-sm text-slate-500">Definición de catálogo global, códigos internos y categorías fiscales.</p>
                </div>
            </div>
            
            {/* BUSCADOR INTEGRADO */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Filtrar por SKU, nombre o categoría..." 
                    className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
        </div>

        {/* CONTENEDOR DE TABLA (Estilo Kardex) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">SKU / Identificador</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Nombre del Producto</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Categoría</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Marca</TableHead>
                        <TableHead className="text-right pr-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">Sincronizando inventario...</TableCell></TableRow>
                    ) : filteredProductos.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">No se encontraron registros en el catálogo.</TableCell></TableRow>
                    ) : (
                        filteredProductos.map((p) => (
                            <TableRow key={p.id_producto} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-bold text-slate-500 font-mono text-[11px] uppercase tracking-tighter">{p.codigo}</div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1 uppercase">
                                        <Barcode className="h-2.5 w-2.5" /> {p.codigo_barras || "SIN EAN"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-bold text-slate-800 text-sm leading-tight">{p.nombre}</div>
                                    <div className="text-[10px] text-blue-600 font-bold mt-0.5">Precio Base: ${Number(p.precio_base).toFixed(2)}</div>
                                </TableCell>
                                <TableCell>
                                    {p.categoria ? (
                                        <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                                            <Layers className="h-2.5 w-2.5" /> {p.categoria}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 italic tracking-tighter">Sin categoría</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {p.marca ? (
                                        <div className="inline-flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                                            <Tags className="h-3 w-3 text-slate-300" /> {p.marca}
                                        </div>
                                    ) : (
                                        <span className="text-slate-300">---</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => abrirModalEdicion(p)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p.id_producto, p.nombre)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            
            {/* FOOTER DE TABLA */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6">
                Mostrando {filteredProductos.length} Fichas registradas
            </div>
        </div>
      </main>

      {/* MODAL FICHA DE PRODUCTO */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold">
                {productoEditar ? "Actualizar Ficha Técnica" : "Nueva Ficha de Producto"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="codigo" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Código Interno / SKU</FormLabel><FormControl><Input placeholder="PRD-001" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="codigo_barras" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Código de Barras (EAN)</FormLabel><FormControl><Input placeholder="759..." className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="nombre" render={({ field }: any) => (
                <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Descripción Comercial</FormLabel><FormControl><Input placeholder="Nombre del producto" className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="imagen" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">URL de la Imagen</FormLabel>
                  <FormControl>
                    <Input placeholder="https://mi-servidor.com/foto.jpg" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="marca" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Marca</FormLabel><FormControl><Input className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Categoría</FormLabel><FormControl><Input className="h-9 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="precio" render={({ field }: any) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase font-mono text-blue-600">Precio Base ($)</FormLabel><FormControl><Input type="number" step="0.01" className="h-9 text-sm font-bold border-blue-100" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="text-xs font-bold">Cancelar</Button>
                <Button type="submit" className="bg-slate-900 px-6 text-xs font-bold uppercase tracking-wider shadow-lg">
                    {productoEditar ? "Guardar Cambios" : "Registrar Ficha"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}