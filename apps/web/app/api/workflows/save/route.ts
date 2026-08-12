import { NextResponse } from "next/server"
import { apiFetch } from "@/lib/api-fetch"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface SaveWorkflowBody {
  name: string
  workflowId?: string | null
  graph: Record<string, unknown>
}

interface WorkflowResponse {
  id: string
}

interface WorkflowVersionResponse {
  version: number
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as SaveWorkflowBody

    let workflowId = body.workflowId ?? null
    if (!workflowId) {
      const workflowResponse = await apiFetch<WorkflowResponse>("/workflows", {
        method: "POST",
        body: { name: body.name },
      })
      workflowId = workflowResponse.data.id
    }

    const versionResponse = await apiFetch<WorkflowVersionResponse>(
      "/workflow-versions",
      {
        method: "POST",
        body: { workflowId, graphJson: body.graph },
      }
    )

    return NextResponse.json({
      workflowId,
      version: versionResponse.data.version,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
