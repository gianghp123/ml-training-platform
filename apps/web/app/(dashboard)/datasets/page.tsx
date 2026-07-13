import { PageContainer } from "@/components/layouts/PageContainer";
import { Button } from "@/components/ui/button";
import { DatasetTable } from "@/features/dataset/components/DatasetTable";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 10;

  return <PageContainer
    title="Datasets"
    description="Manage datasets used for training and evaluation."
    actions={
      <Button>
        Create Dataset
      </Button>
    }
  >
    <DatasetTable page={page} pageSize={pageSize} />
  </PageContainer>
}
