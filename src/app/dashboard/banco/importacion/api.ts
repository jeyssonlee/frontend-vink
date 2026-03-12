import type {
    Paso1Response,
    Paso2Response,
    UpdateStagingDto,
    DistribucionDto,
    ConsolidarResponse,
  } from "./types"
  
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
  
  async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message ?? "Error en la solicitud")
    }
    return res.json()
  }
  
  // ─── Paso 1: Upload & Parse ───────────────────────────────────────────────────
  export async function uploadExtracto(file: File): Promise<Paso1Response> {
    const form = new FormData()
    form.append("file", file)
  
    const res = await fetch(`${BASE_URL}/banco/importacion/paso-1`, {
      method: "POST",
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message ?? "Error al subir archivo")
    }
    return res.json()
  }
  
  // ─── Paso 2: Validation Summary ───────────────────────────────────────────────
  export async function getPaso2(id: string): Promise<Paso2Response> {
    return apiRequest<Paso2Response>(`/banco/importacion/${id}/paso-2`)
  }
  
  // ─── Paso 3: Edit Staging Row ─────────────────────────────────────────────────
  export async function updateStagingRow(
    importacionId: string,
    rowId: string,
    dto: UpdateStagingDto
  ): Promise<void> {
    await apiRequest(`/banco/importacion/${importacionId}/staging/${rowId}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    })
  }
  
  // ─── Paso 3: Distributions ────────────────────────────────────────────────────
  export async function setDistribuciones(
    importacionId: string,
    rowId: string,
    dto: DistribucionDto
  ): Promise<void> {
    await apiRequest(
      `/banco/importacion/${importacionId}/staging/${rowId}/distribucion`,
      { method: "POST", body: JSON.stringify(dto) }
    )
  }
  
  export async function deleteDistribuciones(
    importacionId: string,
    rowId: string
  ): Promise<void> {
    await apiRequest(
      `/banco/importacion/${importacionId}/staging/${rowId}/distribucion`,
      { method: "DELETE" }
    )
  }
  
  // ─── Paso 4: Consolidate ──────────────────────────────────────────────────────
  export async function consolidar(id: string): Promise<ConsolidarResponse> {
    return apiRequest<ConsolidarResponse>(`/banco/importacion/${id}/consolidar`, {
      method: "POST",
    })
  }