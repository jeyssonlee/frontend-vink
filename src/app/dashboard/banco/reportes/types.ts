// ─── Flujo de Caja ────────────────────────────────────────────────────────────
export interface FlujoCajaMes {
    mes: string
    ingresos: number
    egresos: number
    neto: number
    acumulado: number
  }
  
  export interface FlujoCajaSemana {
    semana: string
    ingresos: number
    egresos: number
    neto: number
  }
  
  export interface FlujoCaja {
    periodo: { desde: string; hasta: string }
    resumen: {
      total_ingresos: number
      total_egresos: number
      neto: number
      mejor_mes: string
      peor_mes: string
    }
    mensual: FlujoCajaMes[]
    semanal: FlujoCajaSemana[]
  }
  
  // ─── Top Gastos ───────────────────────────────────────────────────────────────
  export interface TopGastoCategoria {
    categoria_id: string | null
    categoria_nombre: string | null
    total: number
    porcentaje: number
    cantidad: number
  }
  
  export interface TopGastoDestino {
    tipo_destino: string | null
    total: number
    porcentaje: number
    cantidad: number
  }
  
  export interface TopMovimiento {
    id: string
    fecha: string
    descripcion: string
    referencia: string
    monto: number
    categoria_nombre: string | null
    tipo_destino: string | null
  }
  
  export interface TopGastos {
    periodo: { desde: string; hasta: string }
    por_categoria: TopGastoCategoria[]
    por_tipo_destino: TopGastoDestino[]
    top_movimientos: TopMovimiento[]
  }
  
  // ─── Sin Clasificar ───────────────────────────────────────────────────────────
  export interface MovimientoSinClasificar {
    id: string
    fecha: string
    descripcion: string
    referencia: string
    monto: number
    tipo: "ingreso" | "egreso"
    banco: string
    cuenta_nombre: string
  }
  
  export interface SinClasificar {
    total: number
    monto_total: number
    movimientos: MovimientoSinClasificar[]
  }
  
  // ─── Comparativa Empresas ─────────────────────────────────────────────────────
  export interface EmpresaComparativa {
    empresa_id: string
    empresa_nombre: string
    total_ingresos: number
    total_egresos: number
    egresos_reales: number
    neto: number
    movimientos: number
    promedio_por_movimiento: number
  }
  
  export interface ComparativaEmpresas {
    periodo: { desde: string; hasta: string }
    empresas: EmpresaComparativa[]
  }
  
  // ─── Importaciones ────────────────────────────────────────────────────────────
  export interface ImportacionHistorial {
    id: string
    fecha_importacion: string
    banco: string
    cuenta_nombre: string
    total_filas: number
    importados: number
    duplicados: number
    estado: "completado" | "parcial" | "error"
    usuario: string
  }
  
  export interface ImportacionesHistorial {
    total: number
    importaciones: ImportacionHistorial[]
  }
  
  // ─── Shared ───────────────────────────────────────────────────────────────────
  export interface ReporteFilters {
    desde?: string
    hasta?: string
    empresas?: string[]
  }
  
  export type ReporteKey =
    | "flujo-caja"
    | "top-gastos"
    | "sin-clasificar"
    | "comparativa-empresas"
    | "importaciones"