import { PageContainer } from "@/components/layouts/PageContainer";
import { DatasetTable } from "@/features/dataset/components/DatasetTable";
import { UploadDatasetModal } from "@/features/dataset/components/UploadDatasetModal";
import { getDatasets } from "@/features/dataset/services/dataset.actions";

export default async function Page({
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

  const { data, meta } = await getDatasets(page, pageSize);

  return <PageContainer
    title="Datasets"
    description="Manage datasets used for training and evaluation."
    actions={<UploadDatasetModal />}
  >
    <DatasetTable data={data} totalItems={meta?.total ?? data.length} />
  </PageContainer>
}
