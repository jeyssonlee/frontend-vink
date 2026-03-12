// ─── Individual ───────────────────────────────────────────────────────────────
export interface EvolucionMes {
    mes: string        // "2025-01"
    ingresos: number
    egresos: number
    neto: number
  }
  
  export interface DesgloseCat {
    categoria_id: string | null
    categoria_nombre: string | null
    total: number
    porcentaje: number
    cantidad: number
  }
  
  export interface DashboardIndividual {
    cuenta_id: string
    cuenta_nombre: string
    banco: string
    periodo: { desde: string; hasta: string }
    kpis: {
      total_ingresos: number
      total_egresos: number
      neto: number
      promedio_mensual_ingresos: number
      promedio_mensual_egresos: number
      movimientos_sin_categoria: number
    }
    evolucion_mensual: EvolucionMes[]
    desglose_categorias: DesgloseCat[]
  }
  
  // ─── Consolidado ──────────────────────────────────────────────────────────────
  export interface EmpresaKPI {
    empresa_id: string
    empresa_nombre: string
    total_ingresos: number
    total_egresos: number
    egresos_reales: number   // excluye transferencias internas
    neto: number
    movimientos: number
  }
  
  export interface DashboardConsolidado {
    periodo: { desde: string; hasta: string }
    empresas_incluidas: string[]
    totales: {
      ingresos: number
      egresos_reales: number
      neto: number
    }
    evolucion_mensual: EvolucionMes[]
    por_empresa: EmpresaKPI[]
  }
  
  // ─── Filters ──────────────────────────────────────────────────────────────────
  export interface DashboardFilters {
    desde?: string
    hasta?: string
    cuenta_id?: string        // individual
    empresas?: string[]       // consolidado
  }