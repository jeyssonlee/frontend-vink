"use client"

import { Loader2, AlertCircle, Download, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Props {
  loading: boolean
  error: string | null
  onExportExcel?: () => void
  onExportPDF?: () => void
  children: React.ReactNode
}

export function ReporteWrapper({ loading, error, onExportExcel, onExportPDF, children }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Generando reporte…</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-800 bg-red-950/30 text-red-300">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-5">
      {/* Export bar */}
      {(onExportExcel || onExportPDF) && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-zinc-100">
              {onExportExcel && (
                <DropdownMenuItem
                  onClick={onExportExcel}
                  className="text-xs gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  Exportar a Excel
                </DropdownMenuItem>
              )}
              {onExportPDF && (
                <DropdownMenuItem
                  onClick={onExportPDF}
                  className="text-xs gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <Download className="h-3.5 w-3.5 text-red-400" />
                  Exportar a PDF
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {children}
    </div>
  )
}