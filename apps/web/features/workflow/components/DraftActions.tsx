"use client"

import { FilePlus2, Play } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { WORKFLOW_DRAFT_KEY } from "@/features/builder/hooks/useWorkflowPersistence"
import { ROUTES } from "@/lib/route"

function hasDraft(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(WORKFLOW_DRAFT_KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as { graph?: { nodes?: unknown[] } }
    return (data.graph?.nodes?.length ?? 0) > 0
  } catch {
    return false
  }
}

const emptySubscribe = () => () => {}

export function DraftActions() {
  const showResume = useSyncExternalStore(
    emptySubscribe,
    hasDraft,
    () => false
  )
  const router = useRouter()

  const handleCreateBlank = () => {
    localStorage.removeItem(WORKFLOW_DRAFT_KEY)
    router.push(ROUTES.WORKFLOW.CREATE)
  }

  return (
    <div className="flex items-center gap-2">
      {showResume && (
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-9 gap-2 px-3.5 text-[13px]"
        >
          <Link href={ROUTES.WORKFLOW.CREATE}>
            <Play className="size-4" />
            Resume draft
          </Link>
        </Button>
      )}
      <Button
        size="lg"
        className="h-9 gap-2 px-3.5 text-[13px]"
        onClick={handleCreateBlank}
      >
        <FilePlus2 className="size-4" />
        Create blank
      </Button>
    </div>
  )
}
