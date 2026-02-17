"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash, Building2, Phone, Fingerprint } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Proveedor = {
  id_proveedor: string
  nombre_empresa: string
  rif: string
  nombre_vendedor: string
  telefono_contacto: string
  email_pedidos: string
  activo: boolean
}

export const getColumns = (
  onEdit: (proveedor: Proveedor) => void,
  onDelete: (id: string) => void
): ColumnDef<Proveedor>[] => [
  {
    accessorKey: "nombre_empresa",
    header: "RAZÓN SOCIAL / ENTIDAD",
    cell: ({ row }) => (
      <div className="py-2">
        <div className="font-bold text-slate-800 text-base leading-tight">
          {row.getValue("nombre_empresa")}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 uppercase font-mono tracking-tighter">
          <Fingerprint className="h-3 w-3" /> {row.original.rif}
        </div>
      </div>
    )
  },
  {
    accessorKey: "nombre_vendedor",
    header: "CONTACTO COMERCIAL",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-slate-600 uppercase tracking-tighter">
          {row.getValue("nombre_vendedor")}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full w-fit">
          <Phone className="h-2.5 w-2.5" /> {row.original.telefono_contacto}
        </div>
      </div>
    )
  },
  {
    accessorKey: "email_pedidos",
    header: "CORREO ELECTRÓNICO",
    cell: ({ row }) => (
      <span className="text-sm text-slate-500 font-medium">
        {row.getValue("email_pedidos") || "Sin correo"}
      </span>
    )
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-4">ACCIONES</div>,
    cell: ({ row }) => {
      const proveedor = row.original
      return (
        <div className="flex justify-end pr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
                  <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Opciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(proveedor)} className="cursor-pointer text-sm">
                    <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(proveedor.id_proveedor)} 
                  className="text-red-600 cursor-pointer text-sm"
                >
                    <Trash className="mr-2 h-3.5 w-3.5" /> Desactivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]