"use client";

import { useEffect, useState, use } from 'react'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Wallet, Package, FileText, Calendar, CheckCircle, AlertCircle, Clock, Receipt,
  MapPin, User, Building, Image as ImageIcon, Upload, Link as LinkIcon, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePermisos } from "@/hooks/usePermisos";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const PIE_COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idCliente = resolvedParams.id;
  
  const router = useRouter();
  const { tienePermiso, cargando: cargandoPermisos } = usePermisos();
  const [listaClientes, setListaClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!cargandoPermisos && !tienePermiso('ver_perfil_cliente')) {
      router.replace('/dashboard/clientes');
    }
  }, [cargandoPermisos, tienePermiso]);

  // Cargar lista de clientes solo una vez para el buscador rápido
  useEffect(() => {
    api.get(`/clientes`).then(res => setListaClientes(res.data)).catch(console.error);
  }, []);

  const clientesFiltrados = listaClientes.filter(c => 
    busqueda && (c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) || c.rif.toLowerCase().includes(busqueda.toLowerCase()))
  ).slice(0, 5); // Limitamos a 5 resultados para no tapar la pantalla

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

      {/* ================= HEADER Y BUSCADOR ================= */}
      {(() => {
        // Formateador de moneda formato LATAM
        const formatoMoneda = (valor: number) => {
          return "$" + Number(valor).toLocaleString("es-VE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        };

        const limite = Number(cliente.limite_credito_monto) || 0;
        const creditoUsado = Number(cliente.deuda_total) || 0;
        const creditoDisponible = Math.max(0, limite - creditoUsado);
        const porcentajeUsado = limite > 0 ? Math.min(100, (creditoUsado / limite) * 100) : 0;

        return (
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            
            {/* IZQUIERDA: TARJETA DE INFORMACIÓN DEL CLIENTE (Altura reducida, padding ajustado) */}
            <Card className="flex-1 p-3 shadow-sm border-slate-200 flex flex-col justify-center">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                
                {/* Bloque 1: Identificación y Contacto (4/12 para empujar lo demás a la izquierda) */}
                <div className="md:col-span-4 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-3">
                  <h2 className="text-xl font-bold text-slate-800 line-clamp-1 truncate">{cliente.razon_social}</h2>
                  <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    <p>RIF: {cliente.rif}</p>
                    {/* 🚀 CORRECCIÓN: Ahora lee 'cliente.telefono' como dicta tu DTO */}
                    <p>Tel: {cliente.telefono || 'No registrado'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className="bg-slate-900 text-[10px] px-2 py-0 h-5 flex items-center">ACTIVO</Badge>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 flex items-center">Precio: {cliente.tipo_precio}</Badge>
                  </div>
                </div>

                {/* Bloque 2: Direcciones (5/12 - Pegadas a la izquierda) */}
                <div className="md:col-span-5 flex flex-col justify-center text-xs space-y-2 md:pl-2">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block mb-0.5 text-[9px]">Dirección Fiscal</span>
                    <span className="text-slate-700 leading-tight line-clamp-2">
                      {cliente.direccion_fiscal || 'No registrada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block mb-0.5 text-[9px]">Dirección de Entrega</span>
                    <span className="text-slate-700 leading-tight line-clamp-2">
                      {cliente.direccion_entrega || 'Misma que fiscal'}
                    </span>
                  </div>
                </div>

                {/* Bloque 3: Vendedor (3/12 - Aislado a la derecha) */}
                <div className="md:col-span-3 flex flex-col justify-center md:items-end text-xs mt-2 md:mt-0">
                  <div className="text-left md:text-right w-full">
                    <span className="text-slate-400 font-bold uppercase block mb-1 text-[9px]">Vendedor Asignado</span>
                    <span className="text-slate-800 font-medium bg-slate-50 border border-slate-100 px-2 py-1.5 rounded inline-block text-center min-w-[120px]">
                      {cliente.vendedor?.nombre_apellido || 'S/N'}
                    </span>
                  </div>
                </div>

              </div>
            </Card>

            {/* DERECHA: COLUMNA DE BUSCADOR Y LÍMITE DE CRÉDITO */}
            <div className="w-full lg:w-72 flex flex-col gap-3">
              
              {/* Buscador Rápido Integrado (Más compacto) */}
              <div className="relative w-full z-50">
                <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar otro cliente..." 
                  className="pl-9 h-8 text-sm bg-white shadow-sm border-slate-200 focus:ring-blue-500"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map(c => (
                        <button
                          key={c.id_cliente}
                          onClick={() => { setBusqueda(""); router.push(`/dashboard/clientes/${c.id_cliente}`); }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                        >
                          <p className="font-bold text-sm text-slate-800 truncate">{c.razon_social}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{c.rif}</p>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-xs text-slate-500 text-center">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta de Límite de Crédito (Padding reducido para hacerla más delgada) */}
              <Card className="p-3 shadow-sm border-slate-200 flex flex-col justify-center flex-1">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Límite de Crédito</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatoMoneda(limite)}
                  </span>
                </div>
                
                {/* Barra de uso (Más delgada) */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${porcentajeUsado > 90 ? 'bg-red-500' : porcentajeUsado > 75 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                    style={{ width: `${porcentajeUsado}%` }}
                  ></div>
                </div>
                
                {/* Leyenda */}
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-500">Usado: {formatoMoneda(creditoUsado)}</span>
                  <span className={creditoDisponible <= 0 ? "text-red-500" : "text-emerald-600"}>
                    Disp: {formatoMoneda(creditoDisponible)}
                  </span>
                </div>
              </Card>

            </div>
          </div>
        );
      })()}

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
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-white border border-slate-200">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="pagos">Historial de Pagos</TabsTrigger>
          <TabsTrigger value="informacion">+Información</TabsTrigger>
          
          
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
        <TabsContent value="informacion" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* TARJETA 1: UBICACIÓN GEOGRÁFICA (MAPA) - Ocupa 1 columna */}
            <Card className="lg:col-span-1">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-rose-500" />
                  Ubicación en Mapa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase">Enlace Manual (Maps)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input placeholder="Pega el enlace..." className="pl-9 h-9 text-sm" />
                    </div>
                    <Button size="sm" variant="outline" className="h-9">Guardar</Button>
                  </div>
                </div>
                
                <div className="w-full h-48 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <MapPin className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Mapa no configurado</span>
                </div>
              </CardContent>
            </Card>

            {/* TARJETA 2: FOTOS DEL LOCAL - Ocupa 2 columnas */}
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-emerald-500" />
                  Fotografías del Local
                </CardTitle>
                <Badge variant="secondary" className="font-normal">Máximo 3 fotos</Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Fachada', 'Interior', 'Almacén'].map((tipo, idx) => (
                    <div key={idx} className="relative group rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors h-48 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                      <Upload className="h-6 w-6 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                      <span className="text-sm font-medium text-slate-600">Subir Foto {idx + 1}</span>
                      <span className="text-xs text-slate-400">({tipo})</span>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}