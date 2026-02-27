"use client";

import React, { useEffect, useState, use } from 'react'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Wallet, Package, FileText, Calendar, CheckCircle, AlertCircle, Clock, Receipt, CreditCard } from 'lucide-react';
import { api } from '@/lib/api'; 

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 1. Nuevos imports de Recharts
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

// 2. Paleta de colores para el gráfico de dona (Top Productos)
const PIE_COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idCliente = resolvedParams.id; 

  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchFicha = async () => {
      try {
        setCargando(true);
        const response = await api.get(`/estadisticas/ficha-cliente/${idCliente}`);
        setData(response.data);
      } catch (error) {
        console.error("Error al cargar la ficha del cliente:", error);
      } finally {
        setCargando(false);
      }
    };

    if (idCliente) fetchFicha();
  }, [idCliente]);

  if (cargando) return <div className="p-8 text-center text-slate-500">Cargando análisis de cliente...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">No se encontró la información del cliente.</div>;

  const { cliente, kpis, graficas, facturas = [], pagos = [] } = data;

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
      
      {/* ================= HEADER: DNI DEL CLIENTE ================= */}
      <div className="flex items-start justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{cliente.razon_social}</h1>
          <p className="text-sm text-slate-500 mt-1">RIF: {cliente.rif} • Tel: {cliente.telefono || 'N/A'}</p>
          <div className="flex gap-2 mt-3">
            <Badge variant={cliente.estatus === 'MOROSO' ? 'destructive' : 'default'}>
              {cliente.estatus}
            </Badge>
            <Badge variant="outline" className="text-slate-600">
              Precio: {cliente.tipo_precio.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Límite de Crédito</p>
          <p className="text-2xl font-bold text-slate-800">${cliente.limite_credito_monto.toFixed(2)}</p>
        </div>
      </div>

      {/* ================= KPIs FINANCIEROS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ... (Las 4 tarjetas de KPIs quedan exactamente igual) ... */}
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-500">Deuda Viva</CardTitle><Wallet className="h-4 w-4 text-rose-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">${kpis.deuda_viva.toFixed(2)}</div><p className="text-xs text-slate-500 mt-1">Saldo pendiente por cobrar</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-500">Ticket Promedio</CardTitle><DollarSign className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">${kpis.ticket_promedio.toFixed(2)}</div><p className="text-xs text-slate-500 mt-1">Gasto medio por factura</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Comprado (LTV)</CardTitle><TrendingUp className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">${kpis.total_comprado.toFixed(2)}</div><p className="text-xs text-slate-500 mt-1">Volumen histórico</p></CardContent></Card>
        <Card className="bg-slate-900 text-white"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-300">Profit Generado</CardTitle><Package className="h-4 w-4 text-slate-300" /></CardHeader><CardContent><div className="text-2xl font-bold">${kpis.total_ganancia.toFixed(2)}</div><p className="text-xs text-slate-400 mt-1">Ganancia neta acumulada</p></CardContent></Card>
      </div>

      {/* ================= TABS Y GRÁFICAS ================= */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl bg-white border border-slate-200">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="pagos">Historial de Pagos</TabsTrigger>
          <TabsTrigger value="cotizaciones">Cotizaciones</TabsTrigger>
          <TabsTrigger value="perfil">Perfil Completo</TabsTrigger>
          
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* GRÁFICA 1: EVOLUCIÓN DE COMPRAS */}
            <Card className="min-h-[350px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Evolución de Compras (6 Meses)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[250px] pb-4">
                {graficas.evolucion_compras && graficas.evolucion_compras.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graficas.evolucion_compras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
                      <ChartTooltip 
                            cursor={{ fill: '#f8fafc' }} 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Comprado']}
                          />
                      {/* Las barras usarán el color oscuro principal */}
                      <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">No hay historial de compras reciente.</div>
                )}
              </CardContent>
            </Card>

            {/* GRÁFICA 2: TOP PRODUCTOS FAVORITOS */}
            <Card className="min-h-[350px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Top Productos (Por Volumen Financiero)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[250px] pb-4">
                {graficas.top_productos && graficas.top_productos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={graficas.top_productos}
                        cx="50%"
                        cy="50%"
                        innerRadius={65} // Esto lo convierte en un gráfico de Dona
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="total_dinero" // Basado en el dinero generado
                      >
                        {graficas.top_productos.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip 
  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
  formatter={(value: any, name: any, props: any) => [
    `$${Number(value || 0).toFixed(2)} (${props.payload.cantidad} unds)`, 
    'Ingreso'
  ]} 
/>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">El cliente aún no tiene productos registrados.</div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="facturas" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
              <CardTitle className="text-lg text-slate-800">Historial de Facturas</CardTitle>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 font-normal">
                Últimos movimientos
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600 pl-6">N° Factura</TableHead>
                    <TableHead className="font-bold text-slate-600">Fecha Emisión</TableHead>
                    <TableHead className="font-bold text-slate-600">Monto Total</TableHead>
                    <TableHead className="font-bold text-slate-600">Saldo Pendiente</TableHead>
                    <TableHead className="font-bold text-slate-600 text-right pr-6">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturas && facturas.length > 0 ? (
                    facturas.map((fac: any) => (
                      <TableRow key={fac.id_factura} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            {fac.numero_factura}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(fac.fecha_emision).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">
                          ${Number(fac.total || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-rose-500">
                          ${Number(fac.saldo_pendiente || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {fac.estado === 'PAGADA' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                              <CheckCircle className="mr-1.5 h-3 w-3" /> Pagada
                            </Badge>
                          ) : fac.estado === 'VENCIDA' ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">
                              <AlertCircle className="mr-1.5 h-3 w-3" /> Vencida
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                              <Clock className="mr-1.5 h-3 w-3" /> Pendiente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                        No hay facturas registradas para este cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pagos" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
              <CardTitle className="text-lg text-slate-800">Historial de Pagos (Recibos)</CardTitle>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 font-normal">
                Últimos abonos
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600 pl-6">N° Recibo</TableHead>
                    <TableHead className="font-bold text-slate-600">Fecha de Pago</TableHead>
                    <TableHead className="font-bold text-slate-600">Monto Abonado</TableHead>
                    <TableHead className="font-bold text-slate-600 text-right pr-6">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos && pagos.length > 0 ? (
                    pagos.map((pago: any) => (
                      <TableRow key={pago.id_cobranza} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-slate-400" />
                            {pago.numero_recibo}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(pago.fecha).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          + ${Number(pago.monto || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {pago.estado === 'APLICADA' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                              <CheckCircle className="mr-1.5 h-3 w-3" /> Aplicado
                            </Badge>
                          ) : pago.estado === 'ANULADA' ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">
                              <AlertCircle className="mr-1.5 h-3 w-3" /> Anulado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                              <Clock className="mr-1.5 h-3 w-3" /> En Proceso
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic">
                        No hay pagos registrados para este cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cotizaciones">
          <Card><CardContent className="p-6 text-slate-500">Aquí irá la tabla de cotizaciones previas...</CardContent></Card>
        </TabsContent>
        <TabsContent value="perfil">
          <Card><CardContent className="p-6 text-slate-500">Aquí irá toda la informacion del cliente...</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}