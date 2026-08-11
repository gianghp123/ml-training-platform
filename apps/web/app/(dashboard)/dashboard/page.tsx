import Link from "next/link"

import { PageContainer } from "@/components/layouts/PageContainer"
import { Button } from "@/components/ui/button"
import { WorkflowTable } from "@/features/workflow/components/WorkflowTable"
import { ROUTES } from "@/lib/route"
import { Plus } from "lucide-react"


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 10;

  return (
    <PageContainer
      title="Workflows"
      description="Build, validate, and operate production-ready machine learning pipelines."
      actions={
        <Button asChild size="lg" className="h-9 gap-2 px-3.5 text-[13px]">
          <Link href={ROUTES.WORKFLOW.CREATE}>
            <Plus className="size-4" />
            Create Workflow
          </Link>
        </Button>
      }
    >
      <WorkflowTable page={page} pageSize={pageSize} />
    </PageContainer>
  )
}
