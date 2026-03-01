"use client";

import { useEffect, useState } from "react";
import { Search, Package, AlertTriangle, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";
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
import { getEmpresaId } from "@/lib/auth-utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface ProductoConsulta {
  id_producto: string;
  codigo: string;
  nombre: string;
  categoria?: string;
  marca?: string;
  stock: number;
  stock_minimo: number;
  precio_venta: number;
}

export default function ConsultaInventarioPage() {
  const [productos, setProductos] = useState<ProductoConsulta[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<ProductoConsulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const idEmpresa = getEmpresaId();

  const fetchInventario = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/productos/inventario-consulta?id_empresa=${idEmpresa}`)
      
      const dataMapeada = data.map((p: any) => ({
          id_producto: p.id_producto,
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          marca: p.marca,
          stock: Number(p.stock || 0),
          stock_minimo: Number(p.stock_minimo || 5),
          precio_venta: Number(p.precio_base || 0)
      }));

      setProductos(dataMapeada);
      setFilteredProductos(dataMapeada);
    } catch (error) {
      console.error("Error cargando inventario", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idEmpresa) fetchInventario();
  }, [idEmpresa]);

  useEffect(() => {
    const termino = busqueda.toLowerCase();
    const resultados = productos.filter(p => 
      p.nombre.toLowerCase().includes(termino) ||
      p.codigo.toLowerCase().includes(termino) ||
      (p.marca && p.marca.toLowerCase().includes(termino))
    );
    setFilteredProductos(resultados);
  }, [busqueda, productos]);

  const totalItems = productos.length;
  const stockCritico = productos.filter(p => p.stock <= p.stock_minimo && p.stock > 0).length;
  const sinStock = productos.filter(p => p.stock === 0).length;

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm">
      
      {/* 🔴 NAVBAR SUPERIOR INTEGRADA */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Inventario / Consulta</span>
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-4 mr-4">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Agotados:</span>
                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 h-5 px-1.5 font-bold">{sinStock}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bajo Stock:</span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 h-5 px-1.5 font-bold">{stockCritico}</Badge>
                </div>
            </div>
            <button 
                onClick={fetchInventario}
                className="flex items-center gap-2 px-3 h-8 text-xs font-bold text-slate-600 border rounded-md hover:bg-slate-50 transition-colors"
            >
                <RefreshCcw className="h-3.5 w-3.5" /> Actualizar
            </button>
        </div>
      </nav>

      {/* 🔵 ÁREA DE TRABAJO */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ENCABEZADO DE MÓDULO (Marco con bordes suaves) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-700 shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Existencias en Almacén</h1>
                    <p className="text-sm text-slate-500">Consulta rápida de disponibilidad, precios y estados críticos.</p>
                </div>
            </div>
            
            {/* BUSCADOR INTEGRADO */}
            <div className="relative w-full md:w-[450px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Buscar por descripción, código o marca..." 
                    className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all shadow-inner"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
        </div>

        {/* TABLA DE CONSULTA (Estilo Kardex) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[120px] font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">Disponibilidad</TableHead>
                        <TableHead className="w-[150px] font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center">SKU / Código</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider pl-4">Descripción del Producto</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Marca / Categoría</TableHead>
                        <TableHead className="text-right pr-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Precio Venta ($)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">Consultando base de datos...</TableCell></TableRow>
                    ) : filteredProductos.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">No se encontraron productos con el filtro aplicado.</TableCell></TableRow>
                    ) : (
                        filteredProductos.map((producto) => (
                            <TableRow key={producto.id_producto} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                
                                <TableCell className="pl-6 py-4">
                                    {producto.stock === 0 ? (
                                        <div className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase">
                                            <XCircle className="h-3.5 w-3.5"/> Agotado
                                        </div>
                                    ) : producto.stock <= producto.stock_minimo ? (
                                        <div className="flex items-center gap-1.5 text-orange-600 font-bold text-[10px] uppercase">
                                            <AlertTriangle className="h-3.5 w-3.5"/> Bajo Stock
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase">
                                            <CheckCircle2 className="h-3.5 w-3.5"/> Disponible
                                        </div>
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-mono text-[11px] font-bold text-slate-500 bg-slate-50 border-slate-200 px-2">
                                        {producto.codigo}
                                    </Badge>
                                </TableCell>
                                
                                <TableCell className="pl-4">
                                    <div className="font-bold text-slate-800 text-sm leading-tight">{producto.nombre}</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Existencia Real: <span className={producto.stock === 0 ? "text-red-500" : "text-slate-600"}>{producto.stock} Unidades</span></div>
                                </TableCell>

                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {producto.marca && (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase border border-slate-200">
                                                {producto.marca}
                                            </span>
                                        )}
                                        {producto.categoria && (
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase border border-blue-100">
                                                {producto.categoria}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="text-right pr-6">
                                    <div className="text-lg font-bold text-slate-900 tracking-tighter">
                                        ${producto.precio_venta.toFixed(2)}
                                    </div>
                                </TableCell>

                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            
            {/* FOOTER DE TABLA */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6">
                Mostrando {filteredProductos.length} de {totalItems} ítems registrados
            </div>
        </div>
      </main>
    </div>
  );
}