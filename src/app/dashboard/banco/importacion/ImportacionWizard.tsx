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
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-all",
                  done
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : active
                    ? "bg-white border-emerald-500 text-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-white border-slate-300 text-slate-400"
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : step.n}
                </div>

                <div className="text-center hidden sm:block">
                  <p className={cn(
                    "text-[11px] font-semibold leading-none",
                    active ? "text-emerald-600" : done ? "text-slate-700" : "text-slate-400"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 mt-[-14px] sm:mt-[-24px]">
                  <div className={cn(
                    "h-full transition-all duration-500",
                    done ? "bg-emerald-500" : "bg-slate-200"
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
  const [importacionId, setImportacionId] = useState<number | null>(null)
  const [paso1Data, setPaso1Data] = useState<Paso1Response | null>(null)
  const [paso2Data, setPaso2Data] = useState<Paso2Response | null>(null)
  const [, setConsolidarData] = useState<ConsolidarResponse | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Banco</p>
            <h1 className="text-base font-semibold text-slate-900 leading-tight mt-0.5">
              Importar Extracto
            </h1>
          </div>
          {importacionId && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded px-2 py-1">
              ID: {importacionId}
            </span>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <StepIndicator current={step} />

        <div className={cn(
          "rounded-2xl border border-slate-200 bg-white shadow-sm",
          step === 3 ? "p-0 overflow-hidden" : "p-6 sm:p-8"
        )}>
          {step === 1 && (
            <Paso1Upload
              onSuccess={(data) => {
                setPaso1Data(data)
                setImportacionId(data.id_importacion)
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
              totalFilas={paso2Data.totales.nuevos}
              duplicados={paso2Data.totales.duplicados}
              sinCategoria={paso2Data.totales.sin_categoria}
              onDone={(result) => setConsolidarData(result)}
            />
          )}
        </div>
      </div>
    </div>
  )
}