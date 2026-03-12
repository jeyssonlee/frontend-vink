"use client"

import { useState } from "react"
import {
  CheckCircle2, Loader2, AlertCircle, TriangleAlert,
  FileCheck, Copy, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { consolidar } from "../importacion/api"
import type { ConsolidarResponse } from "../importacion/types"
import { cn } from "@/lib/utils"

interface Props {
  importacionId: string
  totalFilas: number
  duplicados: number
  sinCategoria: number
  onDone: (result: ConsolidarResponse) => void
}

export function Paso4Consolidar({
  importacionId,
  totalFilas,
  duplicados,
  sinCategoria,
  onDone,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConsolidarResponse | null>(null)

  const handleConsolidar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await consolidar(importacionId)
      setResult(res)
      onDone(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consolidar. El proceso fue revertido.")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        {/* Success header */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-teal-500/10 ring-1 ring-teal-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-teal-400" />
            </div>
            <div className="absolute inset-0 rounded-full bg-teal-500/5 animate-ping" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-zinc-100">Importación completada</h2>
            <p className="text-sm text-zinc-400 mt-1">{result.message}</p>
          </div>
        </div>

        {/* Result stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Importados", value: result.importados, color: "text-teal-400" },
            { label: "Duplicados ignorados", value: result.duplicados_ignorados, color: "text-amber-400" },
            { label: "Total procesados", value: result.total_procesados, color: "text-zinc-300" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", item.color)}>{item.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <Button
          asChild
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium h-11"
        >
          <a href="/dashboard/banco/movimientos">
            <span className="flex items-center gap-2">
              Ver movimientos importados
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100">Consolidar importación</h2>
        <p className="text-sm text-zinc-400">
          Los movimientos del staging pasarán a las tablas reales. Esta operación es atómica.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {[
          {
            icon: FileCheck,
            label: "Movimientos a importar",
            value: totalFilas - duplicados,
            sub: "Filas que se crearán en la tabla real",
            color: "text-teal-400",
          },
          {
            icon: Copy,
            label: "Duplicados a ignorar",
            value: duplicados,
            sub: "ON CONFLICT DO NOTHING — segunda línea de defensa",
            color: duplicados > 0 ? "text-amber-400" : "text-zinc-500",
          },
          {
            icon: AlertCircle,
            label: "Sin categoría",
            value: sinCategoria,
            sub: sinCategoria > 0 ? "Se importarán sin categoría asignada" : "Todos categorizados ✓",
            color: sinCategoria > 0 ? "text-orange-400" : "text-zinc-500",
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="flex items-center gap-4 px-4 py-3.5">
            <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
            </div>
            <span className={cn("text-xl font-bold tabular-nums", color)}>{value}</span>
          </div>
        ))}
      </div>

      {sinCategoria > 0 && (
        <Alert className="border-orange-800 bg-orange-950/30 text-orange-300 py-2.5">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Hay <strong>{sinCategoria} movimientos</strong> sin categoría. Puedes clasificarlos después desde la lista de movimientos.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500 space-y-1">
        <p>• El proceso aplica un <strong className="text-zinc-400">rollback atómico</strong> completo si ocurre cualquier error.</p>
        <p>• El hash SHA-256 actúa como segunda línea de defensa contra duplicados.</p>
        <p>• El saldo inicial del extracto no se guarda ni se usa en ningún flujo.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-800 bg-red-950/40 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleConsolidar}
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium h-11 disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consolidando…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Confirmar y consolidar
          </span>
        )}
      </Button>
    </div>
  )
}