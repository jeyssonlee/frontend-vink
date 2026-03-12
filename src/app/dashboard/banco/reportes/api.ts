import type {
    ReporteFilters,
    FlujoCaja,
    TopGastos,
    SinClasificar,
    ComparativaEmpresas,
    ImportacionesHistorial,
  } from "./types"
  
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
  
  async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message ?? "Error en la solicitud")
    }
    return res.json()
  }
  
  function buildQuery(filters: ReporteFilters): string {
    const params = new URLSearchParams()
    if (filters.desde) params.set("desde", filters.desde)
    if (filters.hasta) params.set("hasta", filters.hasta)
    filters.empresas?.forEach((e) => params.append("empresas[]", e))
    return params.toString()
  }
  
  export const getFlujoCaja = (f: ReporteFilters) =>
    apiGet<FlujoCaja>(`/banco/reportes/flujo-caja?${buildQuery(f)}`)
  
  export const getTopGastos = (f: ReporteFilters) =>
    apiGet<TopGastos>(`/banco/reportes/top-gastos?${buildQuery(f)}`)
  
  export const getSinClasificar = (f: ReporteFilters) =>
    apiGet<SinClasificar>(`/banco/reportes/sin-clasificar?${buildQuery(f)}`)
  
  export const getComparativaEmpresas = (f: ReporteFilters) =>
    apiGet<ComparativaEmpresas>(`/banco/reportes/comparativa-empresas?${buildQuery(f)}`)
  
  export const getImportaciones = (f: ReporteFilters) =>
    apiGet<ImportacionesHistorial>(`/banco/reportes/importaciones?${buildQuery(f)}`)