// ─── Paso 1 ───────────────────────────────────────────────────────────────────
export interface Paso1Response {
    id: string
    banco_detectado: string
    total_filas: number
    duplicados_encontrados: number
    fecha_inicio: string
    fecha_fin: string
    message: string
  }
  
  // ─── Paso 2 ───────────────────────────────────────────────────────────────────
  export interface StagingRow {
    id: string
    fecha: string
    referencia: string
    descripcion: string
    monto: number
    tipo: "ingreso" | "egreso"
    categoria_id: string | null
    categoria_nombre: string | null
    tipo_destino: string | null
    cuenta_destino_id: string | null
    es_duplicado: boolean
    distribuciones: Distribucion[]
  }
  
  export interface Paso2Response {
    id: string
    banco: string
    cuenta: string
    total_filas: number
    ingresos: number
    egresos: number
    duplicados: number
    sin_categoria: number
    filas: StagingRow[]
  }
  
  // ─── Paso 3 ───────────────────────────────────────────────────────────────────
  export interface UpdateStagingDto {
    fecha?: string
    referencia?: string
    descripcion?: string
    monto?: number
    categoria_id?: string
    tipo_destino?: string
    cuenta_destino_id?: string
  }
  
  export interface Distribucion {
    id?: string
    empresa_id: string
    empresa_nombre: string
    monto: number
    porcentaje: number
  }
  
  export interface DistribucionDto {
    distribuciones: {
      empresa_id: string
      monto: number
    }[]
  }
  
  // ─── Paso 4 ───────────────────────────────────────────────────────────────────
  export interface ConsolidarResponse {
    importados: number
    duplicados_ignorados: number
    total_procesados: number
    message: string
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