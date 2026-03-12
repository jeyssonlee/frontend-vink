export interface Distribucion {
    empresa_id: string
    empresa_nombre: string
    monto: number
    porcentaje: number
  }
  
  export interface Movimiento {
    id: string
    fecha: string
    referencia: string
    descripcion: string
    monto: number
    tipo: "ingreso" | "egreso"
    categoria_id: string | null
    categoria_nombre: string | null
    tipo_destino: string | null
    cuenta_id: string
    cuenta_nombre: string
    banco: string
    distribuciones: Distribucion[]
    es_transferencia_interna: boolean
  }
  
  export interface MovimientoDetalle extends Movimiento {
    importacion_id: string
    hash: string
    creado_en: string
  }
  
  // ─── Query Params ─────────────────────────────────────────────────────────────
  export interface MovimientosFilters {
    fecha_desde?: string
    fecha_hasta?: string
    categoria_id?: string
    tipo_destino?: string
    tipo?: "ingreso" | "egreso" | ""
    search?: string
    page: number
    limit: number
  }
  
  export interface MovimientosResponse {
    data: Movimiento[]
    total: number
    page: number
    limit: number
    pages: number
  }