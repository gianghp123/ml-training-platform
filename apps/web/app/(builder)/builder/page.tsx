import { BuilderCanvas } from "@/features/builder/components/BuilderCanvas";
import {
  getBlockCategories,
  getBlockDefinitions,
} from "@/features/builder/services/block-definition.get";

export default async function BuilderPage() {
  const [blocks, categories] = await Promise.all([
    getBlockDefinitions(),
    getBlockCategories(),
  ]);

  return (
    <div className="w-full h-lvh">
      <BuilderCanvas blocks={blocks} categories={categories} />
    </div>
  );
}
