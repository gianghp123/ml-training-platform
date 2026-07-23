"use server"

import { apiFetch } from "@/lib/api-fetch"
import type { Dataset, UploadUrlResponse } from "@training-ml/contracts"

export async function getDatasets(page: number, limit: number) {
  return apiFetch<Dataset[]>("/datasets", {
    query: { page, limit },
    withCredentials: true,
  })
}

export async function createUploadUrl(dto: {
  name: string
  description?: string
  format: "csv" | "json" | "xml"
  size: number
  validationOptions?: Record<string, unknown>
}) {
  return apiFetch<UploadUrlResponse>("/datasets", {
    method: "POST",
    body: dto,
    withCredentials: true,
  })
}

export async function completeUpload(id: string) {
  return apiFetch(`/datasets/${id}/complete`, {
    method: "POST",
    withCredentials: true,
  })
}
