export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/layouts/PageContainer";
import { DraftActions } from "@/features/workflow/components/DraftActions";
import { WorkflowTable } from "@/features/workflow/components/WorkflowTable";
import { getWorkflows } from "@/features/workflow/services/workflow.gets";


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;

  const { data, meta } = await getWorkflows(page, pageSize);

  return (
    <PageContainer
      title="Workflows"
      description="Build, validate, and operate production-ready machine learning pipelines."
      actions={<DraftActions />}
    >
      <WorkflowTable data={data} totalItems={meta?.total ?? data.length} />
    </PageContainer>
  )
}
