import { useAuthStore } from "@/store/auth-store"
import type {
  Paso1Response,
  Paso2Response,
  UpdateStagingDto,
  DistribucionDto,
  ConsolidarResponse,
} from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? "Error en la solicitud")
  }
  return res.json()
}

export async function uploadExtracto(file: File, idCuenta: number): Promise<Paso1Response> {
  const form = new FormData()
  form.append("file", file)
  form.append("id_cuenta", String(idCuenta))

  const res = await fetch(`${BASE_URL}/banco/importacion/paso-1`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? "Error al subir archivo")
  }
  return res.json()
}

export async function getPaso2(id: number): Promise<Paso2Response> {
  return apiRequest<Paso2Response>(`/banco/importacion/${id}/paso-2`)
}

export async function updateStagingRow(
  importacionId: number,
  rowId: number,
  dto: UpdateStagingDto
): Promise<void> {
  await apiRequest(`/banco/importacion/${importacionId}/staging/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  })
}

export async function setDistribuciones(
  importacionId: number,
  rowId: number,
  dto: DistribucionDto
): Promise<void> {
  await apiRequest(
    `/banco/importacion/${importacionId}/staging/${rowId}/distribucion`,
    { method: "POST", body: JSON.stringify(dto) }
  )
}

export async function deleteDistribuciones(
  importacionId: number,
  rowId: number
): Promise<void> {
  await apiRequest(
    `/banco/importacion/${importacionId}/staging/${rowId}/distribucion`,
    { method: "DELETE" }
  )
}

export async function consolidar(id: number): Promise<ConsolidarResponse> {
  return apiRequest<ConsolidarResponse>(`/banco/importacion/${id}/consolidar`, {
    method: "POST",
  })
}