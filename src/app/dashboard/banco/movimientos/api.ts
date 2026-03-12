import type { MovimientoDetalle, MovimientosFilters, MovimientosResponse } from "./types"

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

function buildQuery(filters: MovimientosFilters): string {
  const params = new URLSearchParams()
  if (filters.fecha_desde) params.set("fecha_desde", filters.fecha_desde)
  if (filters.fecha_hasta) params.set("fecha_hasta", filters.fecha_hasta)
  if (filters.categoria_id) params.set("categoria_id", filters.categoria_id)
  if (filters.tipo_destino) params.set("tipo_destino", filters.tipo_destino)
  if (filters.tipo) params.set("tipo", filters.tipo)
  if (filters.search) params.set("search", filters.search)
  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  return params.toString()
}

export async function getMovimientos(filters: MovimientosFilters): Promise<MovimientosResponse> {
  return apiGet<MovimientosResponse>(`/banco/movimientos?${buildQuery(filters)}`)
}

export async function getMovimientoById(id: string): Promise<MovimientoDetalle> {
  return apiGet<MovimientoDetalle>(`/banco/movimientos/${id}`)
}