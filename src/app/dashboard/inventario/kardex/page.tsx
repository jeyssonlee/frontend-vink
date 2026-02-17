"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ClipboardList, 
  Search, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Filter, 
  RefreshCw, 
  FileText 
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmpresaId } from "@/lib/auth-utils";
import { toast } from "sonner";

// Definimos los tipos para TypeScript
type TipoMovimiento = 
  | 'COMPRA' | 'VENTA' | 'APARTADO' | 'LIBERACION' 
  | 'AJUSTE_POS' | 'AJUSTE_NEG' | 'TRASLADO_OUT' | 'TRASLADO_IN';

interface Movimiento {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_inicial: number;
  stock_final: number;
  referencia?: string;
  observacion?: string;
  producto: { nombre: string; codigo: string };
  almacen: { nombre: string };
  usuario?: { nombre: string };
}

export default function KardexPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProducto, setFiltroProducto] = useState("");
  const idEmpresa = getEmpresaId();

  // 1. Cargar Datos
  const fetchKardex = async (productoId?: string) => {
    setLoading(true);
    try {
      let url = `/kardex/recientes`;
      // Si implementas búsqueda por producto en el backend, usarías: 
      // if (productoId) url = `/kardex/producto/${productoId}`;
      
      const { data } = await api.get(url);
      setMovimientos(data);
    } catch (error) {
      console.error("Error cargando Kardex:", error);
      toast.error("No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idEmpresa) fetchKardex();
  }, [idEmpresa]);

  // 2. Filtrado Local (Para la vista rápida)
  const movimientosFiltrados = movimientos.filter(m => 
    m.producto?.nombre.toLowerCase().includes(filtroProducto.toLowerCase()) ||
    m.producto?.codigo.toLowerCase().includes(filtroProducto.toLowerCase()) ||
    m.referencia?.toLowerCase().includes(filtroProducto.toLowerCase())
  );

  // 3. Helpers Visuales
  const esEntrada = (tipo: TipoMovimiento) => {
    return ['COMPRA', 'AJUSTE_POS', 'TRASLADO_IN', 'LIBERACION'].includes(tipo);
  };

  const getBadgeColor = (tipo: TipoMovimiento) => {
    if (esEntrada(tipo)) return "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
    if (tipo === 'APARTADO') return "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200";
    return "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
  };

  const getNombreTipo = (tipo: TipoMovimiento) => {
    const diccionario: Record<string, string> = {
      COMPRA: "Compra",
      VENTA: "Venta",
      APARTADO: "Reserva",
      LIBERACION: "Liberación",
      AJUSTE_POS: "Ajuste (+)",
      AJUSTE_NEG: "Ajuste (-)",
      TRASLADO_IN: "Traslado (E)",
      TRASLADO_OUT: "Traslado (S)"
    };
    return diccionario[tipo] || tipo;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-slate-700" /> Kardex de Movimientos
          </h1>
          <p className="text-slate-500">Auditoría detallada de entradas y salidas de inventario.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchKardex()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
            </Button>
            <Button variant="outline" disabled>
                <FileText className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
        </div>
      </div>

      {/* FILTROS */}
      <Card>
        <CardContent className="p-4 flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Filtrar por nombre de producto, código o referencia..." 
                    className="pl-10"
                    value={filtroProducto}
                    onChange={(e) => setFiltroProducto(e.target.value)}
                />
            </div>
            <div className="text-sm text-slate-500">
                Mostrando últimos {movimientosFiltrados.length} movimientos
            </div>
        </CardContent>
      </Card>

      {/* TABLA KARDEX */}
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right text-green-600 bg-green-50/50">Entrada</TableHead>
              <TableHead className="text-right text-red-600 bg-red-50/50">Salida</TableHead>
              <TableHead className="text-right font-bold text-slate-900">Saldo</TableHead>
              <TableHead className="text-xs text-slate-400">Almacén</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">Cargando historial...</TableCell></TableRow>
            ) : movimientosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-500">No se encontraron movimientos.</TableCell></TableRow>
            ) : (
                movimientosFiltrados.map((mov) => {
                    const isEntry = esEntrada(mov.tipo);
                    return (
                        <TableRow key={mov.id} className="hover:bg-slate-50">
                            {/* Fecha */}
                            <TableCell className="text-xs font-mono text-slate-500">
                                {format(new Date(mov.fecha), "dd/MM/yyyy")}
                                <div className="text-[10px] opacity-70">{format(new Date(mov.fecha), "HH:mm")}</div>
                            </TableCell>

                            {/* Producto */}
                            <TableCell>
                                <div className="font-medium text-sm text-slate-900">{mov.producto?.nombre || "Producto Eliminado"}</div>
                                <div className="text-xs text-slate-400 font-mono">{mov.producto?.codigo}</div>
                            </TableCell>

                            {/* Tipo */}
                            <TableCell>
                                <Badge variant="outline" className={`whitespace-nowrap ${getBadgeColor(mov.tipo)}`}>
                                    {isEntry ? <ArrowUpCircle className="mr-1 h-3 w-3"/> : <ArrowDownCircle className="mr-1 h-3 w-3"/>}
                                    {getNombreTipo(mov.tipo)}
                                </Badge>
                            </TableCell>

                            {/* Referencia */}
                            <TableCell className="text-xs">
                                {mov.referencia || "-"}
                                {mov.usuario && <div className="text-[10px] text-slate-400 mt-1">Por: {mov.usuario.nombre}</div>}
                            </TableCell>

                            {/* Columnas Contables */}
                            <TableCell className="text-right font-mono text-green-700 bg-green-50/30">
                                {isEntry ? `+${mov.cantidad}` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-700 bg-red-50/30">
                                {!isEntry ? `-${mov.cantidad}` : "-"}
                            </TableCell>

                            {/* Saldo Final (Stock resultante de esa operación) */}
                            <TableCell className="text-right font-bold font-mono text-slate-800">
                                {mov.stock_final}
                            </TableCell>
                            
                            {/* Almacén */}
                            <TableCell className="text-xs text-slate-400">
                                {mov.almacen?.nombre || "Principal"}
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}