"use client"

import { useState, useCallback } from "react"
import { Upload, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadExtracto } from "../importacion/api"
import type { Paso1Response } from "../importacion/types"
import { cn } from "@/lib/utils"

interface Props {
  onSuccess: (data: Paso1Response) => void
}

export function Paso1Upload({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setError(null)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await uploadExtracto(file)
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el archivo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100">Subir extracto bancario</h2>
        <p className="text-sm text-zinc-400">
          El sistema detecta automáticamente el banco por el contenido del archivo.
          Compatible con Bancamiga y otros bancos configurados.
        </p>
      </div>

      {/* Drop Zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed",
          "h-56 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-teal-400 bg-teal-950/30 scale-[1.01]"
            : file
            ? "border-teal-600 bg-teal-950/20"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
        )}
      >
        <input
          type="file"
          className="hidden"
          accept=".xls,.xlsx,.csv"
          onChange={handleFileInput}
          disabled={loading}
        />

        {file ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 ring-1 ring-teal-500/30">
              <FileSpreadsheet className="h-7 w-7 text-teal-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-100">{file.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB — click para cambiar
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-all",
              isDragging
                ? "bg-teal-500/20 ring-1 ring-teal-400/50"
                : "bg-zinc-800 ring-1 ring-zinc-700"
            )}>
              <Upload className={cn("h-6 w-6 transition-colors", isDragging ? "text-teal-300" : "text-zinc-400")} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-300">
                Arrastra el archivo aquí o{" "}
                <span className="text-teal-400">selecciona uno</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">.xls · .xlsx · .csv</p>
            </div>
          </>
        )}
      </label>

      {/* Info boxes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Auto-detección", desc: "Banco identificado por contenido" },
          { label: "Sin duplicados", desc: "Hash SHA-256 por fila" },
          { label: "En memoria", desc: "Archivo no se guarda en disco" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
            <p className="text-xs font-semibold text-teal-400">{item.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-800 bg-red-950/40 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium h-11 transition-colors disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando archivo…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Parsear y continuar
          </span>
        )}
      </Button>
    </div>
  )
}