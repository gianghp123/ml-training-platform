import { Suspense } from "react"
import Link from "next/link"

import { PageContainer } from "@/components/layouts/PageContainer"
import { Button } from "@/components/ui/button"
import { WorkflowTable } from "@/features/workflow/components/WorkflowTable"
import { ROUTES } from "@/lib/route"

export default function Home() {
  return (
    <PageContainer
      title="Workflows"
      description="Create and manage your ML training workflows."
      actions={
        <Button asChild>
          <Link href={ROUTES.WORKFLOW.CREATE}>
            Create Workflow
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<div>Loading workflows...</div>}>
        <WorkflowTable />
      </Suspense>
    </PageContainer>
  )
}
