import Link from "next/link"

import { PageContainer } from "@/components/layouts/PageContainer"
import { Button } from "@/components/ui/button"
import { WorkflowTable } from "@/features/workflow/components/WorkflowTable"
import { ROUTES } from "@/lib/route"


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
      description="Create and manage your ML training workflows."
      actions={
        <Button asChild>
          <Link href={ROUTES.WORKFLOW.CREATE}>
            Create Workflow
          </Link>
        </Button>
      }
    >
      <WorkflowTable page={page} pageSize={pageSize} />
    </PageContainer>
  )
}
