"use client"

import { useEffect, useState } from "react"
import { 
  Plus, RefreshCw, Search, Truck, Building2, UserCircle2, 
  Fingerprint, Phone, Mail, Pencil, Trash2 
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { getEmpresaId } from "@/lib/auth-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProveedorForm } from "@/components/proveedores/proveedor-form"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type Proveedor = {
  id_proveedor: string
  nombre_empresa: string
  rif: string
  nombre_vendedor: string
  telefono_contacto: string
  email_pedidos: string
  activo: boolean
}

export default function ProveedoresPage() {
  const [data, setData] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)

  const idEmpresa = getEmpresaId();

  const cargarProveedores = async () => {
    if (!idEmpresa) return;
    try {
      setLoading(true);
      const response = await api.get(`/proveedores?id_empresa=${idEmpresa}`);
      setData(response.data);
    } catch (error) {
      toast.error("Error cargando proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarProveedores(); }, [idEmpresa]);

  const filtered = data.filter(p => 
    p.nombre_empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.rif.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desea desactivar este proveedor?")) return;
    try {
      await api.delete(`/proveedores/${id}`);
      toast.success("Proveedor desactivado");
      cargarProveedores();
    } catch { toast.error("Error al procesar"); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden text-sm">
      
      {/* 🔴 NAVBAR SUPERIOR */}
      <nav className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Compras / Proveedores</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600" onClick={cargarProveedores} disabled={loading}>
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
            <Button size="sm" className="h-8 bg-slate-900 text-xs font-bold uppercase" onClick={() => { setSelectedProveedor(null); setIsOpen(true); }}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Nuevo Proveedor
            </Button>
        </div>
      </nav>

      {/* 🔵 ÁREA DE TRABAJO */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ENCABEZADO DE MÓDULO (Marco Kardex) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-lg">
                    <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Registro de Proveedores</h1>
                    <p className="text-sm text-slate-500">Gestión de suministros y contactos comerciales.</p>
                </div>
            </div>
            
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Filtrar por nombre o RIF..." 
                    className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
        </div>

        {/* TABLA ESTILO KARDEX (Reemplaza al DataTable genérico) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent font-mono">
                        <TableHead className="font-bold text-slate-700 py-4 pl-6 text-[11px] uppercase tracking-wider">Razón Social / Entidad</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Contacto Comercial</TableHead>
                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center">E-mail Pedidos</TableHead>
                        <TableHead className="text-right pr-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-400 italic">Sincronizando proveedores...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-400">No se encontraron registros.</TableCell></TableRow>
                    ) : (
                        filtered.map((p) => (
                            <TableRow key={p.id_proveedor} className="group hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-bold text-slate-800 text-base leading-tight">{p.nombre_empresa}</div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 uppercase font-mono tracking-tighter">
                                        <Fingerprint className="h-2.5 w-2.5" /> {p.rif}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-semibold text-slate-600 uppercase tracking-tighter">{p.nombre_vendedor}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">
                                        <Phone className="h-2.5 w-2.5" /> {p.telefono_contacto}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                        <Mail className="h-3 w-3 text-slate-300" /> {p.email_pedidos || "---"}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => { setSelectedProveedor(p); setIsOpen(true); }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p.id_proveedor)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
                Mostrando {filtered.length} proveedores activos en el sistema
            </div>
        </div>
      </main>

      {/* MODAL DE REGISTRO */}
      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setSelectedProveedor(null); }}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                <UserCircle2 className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold">
                {selectedProveedor ? "Actualizar Proveedor" : "Registrar Proveedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-white">
              <ProveedorForm 
                  initialData={selectedProveedor} 
                  onSuccess={() => { setIsOpen(false); cargarProveedores(); }} 
              />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}