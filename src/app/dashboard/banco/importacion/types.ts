// ─── Paso 1 ───────────────────────────────────────────────────────────────────
export interface Paso1Response {
  id_importacion: number
  banco_detectado: string
  nombre_archivo: string
  numero_cuenta: string
  fecha_extracto: string | null
  resumen: {
    total: number
    nuevos: number
    duplicados: number
    errores_parseo: number
    tasa_bcv_aplicada: number | null
  }
  errores_parseo: string[]
  siguiente_paso: string
}

// ─── Paso 2 ───────────────────────────────────────────────────────────────────
export interface StagingRow {
  id: number
  fila_excel: number
  fecha: string
  concepto: string
  referencia: string
  monto: number
  monto_usd: number | null
  tasa_vigente: number | null
  id_categoria: number | null
  nombre_categoria: string | null
  id_subtipo: number | null        // ← nuevo
  nombre_subtipo: string | null    // ← nuevo
  tipo_destino: string | null
  notas: string | null
}

export interface StagingRowDuplicado {
  id: number
  fila_excel: number
  fecha: string
  concepto: string
  referencia: string
  monto: number
}

export interface ResumenCategoria {
  categoria: string
  cantidad: number
  total_monto: number
  total_usd: number | null
}

export interface Paso2Response {
  importacion: {
    id: number
    banco_key: string
    nombre_archivo: string
    estado: string
    created_at: string
  }
  totales: {
    nuevos: number
    duplicados: number
    ingresos: {
      cantidad: number
      monto_bs: number
      monto_usd: number
    }
    egresos: {
      cantidad: number
      monto_bs: number
      monto_usd: number
    }
    sin_categoria: number
  }
  resumen_categorias: ResumenCategoria[]
  filas_nuevas: StagingRow[]
  filas_duplicadas: StagingRowDuplicado[]
  siguiente_paso: string
}

// ─── Paso 3 ───────────────────────────────────────────────────────────────────
export interface UpdateStagingDto {
  id_categoria?: number
  id_subtipo?: number | null       // ← nuevo
  tipo_destino?: string
  notas?: string
  excluir?: boolean
  tasa_vigente?: number
}

export interface Distribucion {
  id?: number
  id_staging: number
  id_empresa: string
  monto: number
  porcentaje: number
}

export interface DistribucionDto {
  distribuciones: {
    id_empresa: string
    monto: number
    porcentaje?: number
    id_cuenta?: number
  }[]
}

export interface StagingRowConDistribuciones extends StagingRow {
  distribuciones: Distribucion[]
}

// ─── Paso 4 ───────────────────────────────────────────────────────────────────
export interface ConsolidarResponse {
  success: boolean
  id_importacion: number
  consolidados: number
  omitidos: number
  mensaje: string
}

// ─── Wizard State ─────────────────────────────────────────────────────────────
export type WizardStep = 1 | 2 | 3 | 4

export interface WizardState {
  step: WizardStep
  importacionId: string | null
  paso1Data: Paso1Response | null
  paso2Data: Paso2Response | null
  consolidarData: ConsolidarResponse | null
}