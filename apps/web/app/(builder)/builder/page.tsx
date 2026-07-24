export const dynamic = "force-dynamic";

import { BuilderCanvas } from "@/features/builder/components/BuilderCanvas";
import {
  getBlockCategories,
  getBlockDefinitions,
} from "@/features/builder/services/block-definition.get";
import { getDatasets } from "@/features/dataset/services/dataset.actions";

export default async function BuilderPage() {
  const [blocks, categories, datasetsResponse] = await Promise.all([
    getBlockDefinitions(),
    getBlockCategories(),
    getDatasets(1, 100),
  ]);

  const datasets = datasetsResponse.data ?? [];

  return (
    <div className="w-full h-lvh">
      <BuilderCanvas blocks={blocks} categories={categories} datasets={datasets} />
    </div>
  );
}
