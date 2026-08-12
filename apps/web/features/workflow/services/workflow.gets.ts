"server-only"

import { apiFetch } from "@/lib/api-fetch"
import type { Workflow } from "@training-ml/contracts"

export async function getWorkflows(page: number, limit: number) {
  return apiFetch<Workflow[]>("/workflows", {
    query: { page, limit },
    withCredentials: true,
  })
}
