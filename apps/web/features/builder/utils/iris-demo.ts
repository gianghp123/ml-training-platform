import type { BlockDefinition, Dataset } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const IRIS_EXECUTOR_KEYS = [
  "load_csv",
  "feature_select",
  "select_target",
  "train_test_split",
  "random_forest",
  "evaluate",
] as const

type IrisExecutorKey = (typeof IRIS_EXECUTOR_KEYS)[number]

export interface IrisDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_COLUMNS =
  "SepalWidthCm,SepalLengthCm,PetalLengthCm,PetalWidthCm,Species"

const positions: Record<IrisExecutorKey, { x: number; y: number }> = {
  load_csv: { x: 0, y: 160 },
  feature_select: { x: 300, y: 160 },
  select_target: { x: 600, y: 160 },
  train_test_split: { x: 900, y: 160 },
  random_forest: { x: 1_200, y: 40 },
  evaluate: { x: 1_500, y: 160 },
}

const configs: Record<
  IrisExecutorKey,
  (datasetId: string) => Record<string, unknown>
> = {
  load_csv: (datasetId) => ({ dataset: datasetId, file: datasetId }),
  feature_select: () => ({ columns: IRIS_COLUMNS }),
  select_target: () => ({
    targetColumn: "Species",
    task: "classification",
  }),
  train_test_split: () => ({ testSize: 0.2, stratify: true }),
  random_forest: () => ({ n_estimators: 100, max_depth: 10 }),
  evaluate: () => ({ metrics: "" }),
}

export function createIrisDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `iris_${Date.now()}`
): IrisDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(IRIS_EXECUTOR_KEYS, blocks)
  const nodes = Object.fromEntries(
    IRIS_EXECUTOR_KEYS.map((executorKey) => [
      executorKey,
      makeNode(catalog[executorKey], executorKey, idPrefix, positions[executorKey], configs[executorKey](datasetId)),
    ])
  ) as Record<IrisExecutorKey, PipelineNode>

  return {
    nodes: IRIS_EXECUTOR_KEYS.map((executorKey) => nodes[executorKey]),
    edges: [
      makeEdge(nodes.load_csv, "dataset", nodes.feature_select, "dataset"),
      makeEdge(nodes.feature_select, "dataset", nodes.select_target, "dataset"),
      makeEdge(
        nodes.select_target,
        "dataset",
        nodes.train_test_split,
        "dataset"
      ),
      makeEdge(nodes.train_test_split, "train", nodes.random_forest, "dataset"),
      makeEdge(nodes.random_forest, "model", nodes.evaluate, "model"),
      makeEdge(nodes.train_test_split, "test", nodes.evaluate, "dataset"),
    ],
  }
}

export function getReadyCsvDatasets(datasets: Dataset[]): Dataset[] {
  return datasets.filter(
    (dataset) => dataset.format === "csv" && dataset.status === "ready"
  )
}
