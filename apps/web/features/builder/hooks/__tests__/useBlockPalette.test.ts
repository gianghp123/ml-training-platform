/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react";
import { useBlockPalette } from "../useBlockPalette";
import type { BlockCategory, BlockDefinition } from "@training-ml/contracts";

const categories: BlockCategory[] = [
  { id: "pre", name: "Preprocessing" } as BlockCategory,
];
const blocks: BlockDefinition[] = [
  { id: "f1", executorKey: "filter_rows", version: 1, status: "active", name: "Filter Rows", categoryId: "pre", ports: { inputs: [], outputs: [] }, configSchema: { fields: [] }, constraints: {}, outputTransform: {} } as BlockDefinition,
  { id: "c1", executorKey: "concat_features", version: 1, status: "deprecated", name: "Concat Features", categoryId: "pre", ports: { inputs: [], outputs: [] }, configSchema: { fields: [] }, constraints: {}, outputTransform: {} } as BlockDefinition,
];

describe("useBlockPalette filters deprecated blocks", () => {
  it("excludes deprecated blocks from the palette", () => {
    const { result } = renderHook(() => useBlockPalette({ blocks, categories }));
    expect(result.current.filteredBlocks.map((b) => b.name)).toEqual(["Filter Rows"]);
    expect(result.current.blocksByCategory[0].blocks.map((b) => b.name)).toEqual(["Filter Rows"]);
  });

  it("getBlockById still resolves deprecated blocks (for existing pipelines)", () => {
    const { result } = renderHook(() => useBlockPalette({ blocks, categories }));
    expect(result.current.getBlockById("c1")?.name).toBe("Concat Features");
  });
});
