"use client";

import { useEffect, useState } from "react";
import { 
  RefreshCcw, Wallet, DollarSign, Calendar, 
  CreditCard, FileText, CheckCircle2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { api } from "@/lib/api"; // Tu instancia de axios
import { getEmpresaId } from "@/lib/auth-utils"; // Tu utilidad de auth

// UI Components (Los mismos que usas en Clientes)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  DialogDescription,
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

// --- TIPOS ---
interface FacturaCXC {
  id_factura: string;
  numero_control: string;
  numero_consecutivo: number;
  serie: string;
  cliente: { id_cliente: string; razon_social: string; rif: string };
  total_pagar: string;     // Viene string del backend (decimal)
  monto_pagado: string;
  saldo_pendiente: string;
  fecha_emision: string;
  estado: string;
}

// --- SCHEMA DEL FORMULARIO DE PAGO ---
const pagoSchema = z.object({
  monto: z.string().min(1, "Monto obligatorio"), // Manejamos como string para evitar NaN en inputs vacíos
  metodo: z.enum(["EFECTIVO_USD", "ZELLE", "PAGO_MOVIL", "TRANSFERENCIA", "PUNTO_VENTA"]),
  referencia: z.string().optional(),
  nota: z.string().optional(),
}).refine((data) => {
  // Validación condicional: Si no es Efectivo, la referencia es obligatoria
  if (data.metodo !== "EFECTIVO_USD" && (!data.referencia || data.referencia.length < 4)) {
    return false;
  }
  return true;
}, {
  message: "Referencia requerida para este método",
  path: ["referencia"],
});

export default function CobranzasPage() {
  const idEmpresa = getEmpresaId();
  const [facturas, setFacturas] = useState<FacturaCXC[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaCXC | null>(null);

  // Hook Form
  const form = useForm<z.infer<typeof pagoSchema>>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      monto: "",
      metodo: "EFECTIVO_USD",
      referencia: "",
      nota: "",
    },
  });

  // --- CARGAR DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Pedimos todas las facturas
      // OJO: Idealmente crearías un endpoint `/facturas/pendientes` en backend para no filtrar en cliente
      const res = await api.get(`/facturas?id_empresa=${idEmpresa}`);
      
      // 2. Filtramos solo las que deben dinero (Saldo > 0)
      const pendientes = res.data.filter((f: any) => Number(f.saldo_pendiente) > 0.01);
      
      setFacturas(pendientes);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando cuentas por cobrar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idEmpresa) fetchData();
  }, [idEmpresa]);

  // --- ABRIR MODAL ---
  const handleOpenPay = (factura: FacturaCXC) => {
    setFacturaSeleccionada(factura);
    form.reset({
      monto: factura.saldo_pendiente, // Sugerimos pagar el total restante
      metodo: "EFECTIVO_USD",
      referencia: "",
      nota: `Pago a factura ${factura.serie}-${factura.numero_consecutivo}`
    });
    setIsDialogOpen(true);
  };

  // --- ENVIAR PAGO (EL JSON COMPLEX) ---
  const onSubmit = async (values: z.infer<typeof pagoSchema>) => {
    if (!facturaSeleccionada) return;

    const montoPagar = parseFloat(values.monto);
    const saldoActual = parseFloat(facturaSeleccionada.saldo_pendiente);

    // Validación de seguridad frontend
    if (montoPagar > saldoActual + 0.01) { // Pequeña tolerancia
      toast.error("El monto excede la deuda pendiente");
      return;
    }

    try {
      // CONSTRUIMOS EL PAYLOAD QUE PIDE EL BACKEND (DTO)
      const payload = {
        fecha_reporte: new Date().toISOString().split('T')[0], // Hoy
        monto_total: montoPagar,
        nota_vendedor: values.nota,
        id_empresa: idEmpresa,
        // Array de Métodos
        metodos: [
          {
            metodo: values.metodo,
            monto: montoPagar,
            referencia: values.referencia || undefined,
            banco: values.referencia ? "BANCO REFERENCIAL" : undefined // Puedes agregar un select de bancos luego
          }
        ],
        // Array de Facturas a imputar
        facturas: [
          {
            id_factura: facturaSeleccionada.id_factura,
            monto_aplicado: montoPagar
          }
        ]
      };

      await api.post("/cobranzas", payload);
      
      toast.success("Pago registrado correctamente (Pendiente de Aprobación)");
      setIsDialogOpen(false);
      fetchData(); // Recargamos la tabla

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Error al procesar el pago";
      toast.error(msg);
    }
  };

  // --- CÁLCULOS DE RESUMEN ---
  const totalPorCobrar = facturas.reduce((acc, f) => acc + Number(f.saldo_pendiente), 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
      
      {/* NAVBAR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finanzas / Cuentas por Cobrar</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={fetchData}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Actualizar
            </Button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* HEADER CARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* TARJETA TOTAL */}
           <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 col-span-2">
              <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                  <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    ${totalPorCobrar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total Pendiente por Cobrar</p>
              </div>
           </div>
           
           {/* TARJETA CONTADOR */}
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between text-white">
              <div>
                  <h2 className="text-3xl font-bold">{facturas.length}</h2>
                  <p className="text-xs text-slate-400 font-medium uppercase">Facturas Abiertas</p>
              </div>
              <FileText className="h-8 w-8 text-slate-700" />
           </div>
        </div>

        {/* TABLA DE FACTURAS */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">Factura</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Cliente</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Emisión</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 text-[11px] uppercase tracking-wider">Total</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 text-[11px] uppercase tracking-wider">Abonado</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 text-[11px] uppercase tracking-wider">Saldo</TableHead>
                        <TableHead className="text-center pr-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={7} className="h-40 text-center text-slate-400 italic">Consultando deudas...</TableCell></TableRow>
                    ) : facturas.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="h-40 text-center text-slate-400">Todo al día. No hay deudas pendientes.</TableCell></TableRow>
                    ) : (
                        facturas.map((f) => (
                            <TableRow key={f.id_factura} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-bold text-slate-800 text-sm font-mono">
                                        {f.serie}-{String(f.numero_consecutivo).padStart(6, '0')}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 uppercase">
                                       Control: {f.numero_control || 'N/A'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-bold text-slate-700 text-xs">{f.cliente?.razon_social}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{f.cliente?.rif}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(f.fecha_emision).toLocaleDateString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-600">
                                    ${Number(f.total_pagar).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-emerald-600 font-bold">
                                    ${Number(f.monto_pagado).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-red-600 font-bold bg-red-50/50">
                                    ${Number(f.saldo_pendiente).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center pr-6">
                                    <Button 
                                        size="sm" 
                                        className="h-7 text-[10px] font-bold uppercase bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                                        onClick={() => handleOpenPay(f)}
                                    >
                                        <DollarSign className="mr-1 h-3 w-3" /> Registrar Pago
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </main>

      {/* --- MODAL DE PAGO --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <DialogTitle className="text-lg font-bold">Registrar Cobranza</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs">
                        {facturaSeleccionada ? 
                            `Factura: ${facturaSeleccionada.serie}-${facturaSeleccionada.numero_consecutivo} • Cliente: ${facturaSeleccionada.cliente.razon_social}` 
                            : 'Seleccione una factura'}
                    </DialogDescription>
                </div>
            </div>
            {facturaSeleccionada && (
                <div className="mt-4 p-3 bg-white/5 rounded border border-white/10 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-300 uppercase">Deuda Pendiente:</span>
                    <span className="text-xl font-mono font-bold text-emerald-400">${Number(facturaSeleccionada.saldo_pendiente).toFixed(2)}</span>
                </div>
            )}
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4 bg-white">
              
              <div className="grid grid-cols-2 gap-4">
                  {/* MONTO */}
                  <FormField control={form.control} name="monto" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase">Monto a Abonar ($)</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input type="number" step="0.01" className="pl-9 h-10 font-mono text-lg font-bold" {...field} />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />

                  {/* MÉTODO */}
                  <FormField control={form.control} name="metodo" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-500 uppercase">Método de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Seleccione" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="EFECTIVO_USD">Efectivo USD</SelectItem>
                                <SelectItem value="ZELLE">Zelle</SelectItem>
                                <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                <SelectItem value="PUNTO_VENTA">Punto de Venta</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                  )} />
              </div>

              {/* REFERENCIA (Condicional visualmente, aunque Zod valida igual) */}
              <FormField control={form.control} name="referencia" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                        Referencia / Comprobante
                        {form.watch("metodo") !== "EFECTIVO_USD" && <span className="text-red-500 text-[10px]">* Requerido</span>}
                    </FormLabel>
                    <FormControl>
                        <Input 
                            placeholder={form.watch("metodo") === "EFECTIVO_USD" ? "Opcional para efectivo" : "Últimos dígitos..."} 
                            disabled={form.watch("metodo") === "EFECTIVO_USD"}
                            className="h-10"
                            {...field} 
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )} />

              {/* NOTA */}
              <FormField control={form.control} name="nota" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase">Nota Interna</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Pago parcial acordado..." className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )} />

              <div className="pt-4 flex items-center justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-xs font-bold text-slate-500">
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 uppercase text-xs tracking-wider">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Procesar Pago
                  </Button>
              </div>

            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}