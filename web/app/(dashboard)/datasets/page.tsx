import { PageContainer } from "@/components/layouts/PageContainer";
import { Button } from "@/components/ui/button";
import { DatasetTable } from "@/features/dataset/components/DatasetTable";

export default function Page() {
  return <PageContainer
    title="Datasets"
    description="Manage datasets used for training and evaluation."
    actions={
      <Button>
        Create Dataset
      </Button>
    }
  >
    <DatasetTable />
  </PageContainer>
}
