"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Paso1Upload } from "./components/Paso1Upload"
import { Paso2Validacion } from "./components/Paso2Validacion"
import { Paso3Revision } from "./components/Paso3Revision"
import { Paso4Consolidar } from "./components/Paso4Consolidar"
import type {
  WizardStep,
  Paso1Response,
  Paso2Response,
  ConsolidarResponse,
} from "./types"
import { cn } from "@/lib/utils"

const STEPS = [
  { n: 1 as WizardStep, label: "Subir archivo", desc: "Upload y parseo" },
  { n: 2 as WizardStep, label: "Validación", desc: "Resumen y duplicados" },
  { n: 3 as WizardStep, label: "Revisión", desc: "Editar y distribuir" },
  { n: 4 as WizardStep, label: "Consolidar", desc: "Importar movimientos" },
]

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <nav aria-label="Progreso de importación" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = step.n < current
          const active = step.n === current

          return (
            <li key={step.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                {/* Circle */}
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-all",
                  done
                    ? "bg-teal-600 border-teal-600 text-white"
                    : active
                    ? "bg-transparent border-teal-400 text-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.25)]"
                    : "bg-transparent border-zinc-700 text-zinc-600"
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : step.n}
                </div>

                {/* Label */}
                <div className="text-center hidden sm:block">
                  <p className={cn(
                    "text-[11px] font-semibold leading-none",
                    active ? "text-teal-400" : done ? "text-zinc-300" : "text-zinc-600"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{step.desc}</p>
                </div>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 mt-[-14px] sm:mt-[-24px]">
                  <div className={cn(
                    "h-full transition-all duration-500",
                    done ? "bg-teal-600" : "bg-zinc-800"
                  )} />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function ImportacionWizard() {
  const [step, setStep] = useState<WizardStep>(1)
  const [importacionId, setImportacionId] = useState<string | null>(null)
  const [paso1Data, setPaso1Data] = useState<Paso1Response | null>(null)
  const [paso2Data, setPaso2Data] = useState<Paso2Response | null>(null)
  const [, setConsolidarData] = useState<ConsolidarResponse | null>(null)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-zinc-100 leading-tight mt-0.5">
              Importar Extracto
            </h1>
          </div>
          {importacionId && (
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
              ID: {importacionId.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <StepIndicator current={step} />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/20 p-6 sm:p-8">
          {step === 1 && (
            <Paso1Upload
              onSuccess={(data) => {
                setPaso1Data(data)
                setImportacionId(data.id)
                setStep(2)
              }}
            />
          )}

          {step === 2 && importacionId && paso1Data && (
            <Paso2Validacion
              importacionId={importacionId}
              paso1Data={paso1Data}
              onContinue={(data) => {
                setPaso2Data(data)
                setStep(3)
              }}
            />
          )}

          {step === 3 && importacionId && paso2Data && (
            <Paso3Revision
              importacionId={importacionId}
              paso2Data={paso2Data}
              onContinue={() => setStep(4)}
            />
          )}

          {step === 4 && importacionId && paso2Data && (
            <Paso4Consolidar
              importacionId={importacionId}
              totalFilas={paso2Data.total_filas}
              duplicados={paso2Data.duplicados}
              sinCategoria={paso2Data.sin_categoria}
              onDone={(result) => setConsolidarData(result)}
            />
          )}
        </div>
      </div>
    </div>
  )
}