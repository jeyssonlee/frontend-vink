import { useAuthStore } from "@/store/auth-store"
import type { Movimiento, MovimientoDetalle, MovimientosFilters, MovimientosResponse } from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
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
  if (filters.fecha_desde)  params.set("fecha_desde",  filters.fecha_desde)
  if (filters.fecha_hasta)  params.set("fecha_hasta",  filters.fecha_hasta)
  if (filters.categoria_id) params.set("id_categoria", filters.categoria_id)  // ya estaba bien el nombre
  if (filters.tipo_destino) params.set("tipo_destino", filters.tipo_destino)
  if (filters.tipo)         params.set("tipo",         filters.tipo.toUpperCase())
  if (filters.search)       params.set("search",       filters.search)
  params.set("limite",  "50")
  params.set("offset",  String(((filters.page ?? 1) - 1) * 50))
  return params.toString()
}

export async function getMovimientos(filters: MovimientosFilters): Promise<MovimientosResponse> {
  const res = await apiGet<any>(`/banco/movimientos?${buildQuery(filters)}`)
    return {
    ...res,
    movimientos: res.movimientos.map((m: any) => ({
      ...m,
      // El backend devuelve "concepto" — mapeamos a "descripcion"
      tipo:          parseFloat(m.monto) >= 0 ? "ingreso" : "egreso",
      descripcion:   m.descripcion  ?? m.concepto ?? "",
      monto:         parseFloat(m.monto),
      monto_usd:     m.monto_usd     != null ? parseFloat(m.monto_usd)     : null,
      tasa_vigente:  m.tasa_vigente  != null ? parseFloat(m.tasa_vigente)  : null,
      // El backend devuelve categoria como objeto o nombre directo
      categoria_nombre: m.categoria_nombre ?? m.nombre_categoria ?? null,
      nombre_subtipo: m.nombre_subtipo ?? null,
      nombre_tipo: m.nombre_tipo ?? null,
    })).sort((a: Movimiento, b: Movimiento) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )
    
  }
}

export async function getMovimientoById(id: string): Promise<MovimientoDetalle> {
  const m = await apiGet<any>(`/banco/movimientos/${id}`)
  return {
      ...m,
      tipo:             parseFloat(m.monto) >= 0 ? "ingreso" : "egreso",
      descripcion:      m.descripcion ?? m.concepto ?? "",
      monto:            parseFloat(m.monto),
      monto_usd:        m.monto_usd    != null ? parseFloat(m.monto_usd)    : null,
      tasa_vigente:     m.tasa_vigente != null ? parseFloat(m.tasa_vigente) : null,
      categoria_nombre: m.categoria_nombre ?? m.nombre_categoria ?? null,
      banco:            m.banco ?? m.banco_key ?? null,           // ← agregar
      cuenta_nombre:    m.cuenta_nombre ?? m.nombre_cuenta ?? null, // ← agregar
      creado_en:        m.creado_en ?? m.created_at ?? null,      // ← agregar
    }
}