import type { DashboardFilters, DashboardIndividual, DashboardConsolidado } from "../consolidado/types"

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

function buildQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams()
  if (filters.desde) params.set("desde", filters.desde)
  if (filters.hasta) params.set("hasta", filters.hasta)
  if (filters.cuenta_id) params.set("cuenta_id", filters.cuenta_id)
  if (filters.empresas?.length) {
    filters.empresas.forEach((e) => params.append("empresas[]", e))
  }
  return params.toString()
}

export async function getDashboardIndividual(
  filters: DashboardFilters
): Promise<DashboardIndividual> {
  return apiGet<DashboardIndividual>(`/banco/dashboard/individual?${buildQuery(filters)}`)
}

export async function getDashboardConsolidado(
  filters: DashboardFilters
): Promise<DashboardConsolidado> {
  return apiGet<DashboardConsolidado>(`/banco/dashboard/consolidado?${buildQuery(filters)}`)
}