import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const PARALLEL_EXECUTOR_KEYS = [
  "load_csv",
  "custom_feature_formula",
  "filter_rows",
  "normalize",
  "feature_union",
  "select_target",
  "train_test_split",
  "random_forest",
  "save_model",
  "evaluate",
] as const

type ParallelExecutorKey = (typeof PARALLEL_EXECUTOR_KEYS)[number]

export interface ParallelDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_COLUMNS = "SepalLengthCm,SepalWidthCm,PetalLengthCm,PetalWidthCm,Species"

const positions: Record<ParallelExecutorKey, { x: number; y: number }> = {
  load_csv: { x: 0, y: 240 },
  custom_feature_formula: { x: 320, y: 60 },
  filter_rows: { x: 320, y: 240 },
  normalize: { x: 320, y: 420 },
  feature_union: { x: 680, y: 240 },
  select_target: { x: 1000, y: 240 },
  train_test_split: { x: 1300, y: 240 },
  random_forest: { x: 1600, y: 100 },
  save_model: { x: 1900, y: 60 },
  evaluate: { x: 1900, y: 240 },
}

const configs: Record<
  ParallelExecutorKey,
  (datasetId: string) => Record<string, unknown>
> = {
  load_csv: (datasetId) => ({ dataset: datasetId, file: datasetId }),
  custom_feature_formula: () => ({
    outputColumn: "PetalArea",
    outputType: "float",
    expression: "PetalLengthCm * PetalWidthCm",
    columns: IRIS_COLUMNS,
  }),
  filter_rows: () => ({
    conditions: [{ column: "PetalLengthCm", op: "gt", value: 0.5 }],
    combinator: "AND",
    invert: false,
  }),
  normalize: () => ({
    columns: "SepalLengthCm,SepalWidthCm",
    strategy: "minmax",
  }),
  feature_union: () => ({}),
  select_target: () => ({
    targetColumn: "Species",
    task: "classification",
  }),
  train_test_split: () => ({ testSize: 0.2, stratify: true }),
  random_forest: () => ({ n_estimators: 100, max_depth: 10 }),
  save_model: () => ({ format: "joblib", name: "parallel-iris-model" }),
  evaluate: () => ({ metrics: "accuracy" }),
}

export function createParallelDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `parallel_${Date.now()}`
): ParallelDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(PARALLEL_EXECUTOR_KEYS, blocks)
  const nodes = Object.fromEntries(
    PARALLEL_EXECUTOR_KEYS.map((executorKey) => [
      executorKey,
      makeNode(
        catalog[executorKey],
        executorKey,
        idPrefix,
        positions[executorKey],
        configs[executorKey](datasetId)
      ),
    ])
  ) as Record<ParallelExecutorKey, PipelineNode>

  return {
    nodes: PARALLEL_EXECUTOR_KEYS.map((executorKey) => nodes[executorKey]),
    edges: [
      // Branch 1: load_csv -> custom_feature_formula -> feature_union (datasetA)
      makeEdge(nodes.load_csv, "dataset", nodes.custom_feature_formula, "dataset"),
      makeEdge(nodes.custom_feature_formula, "dataset", nodes.feature_union, "datasetA"),

      // Branch 2: load_csv -> filter_rows -> feature_union (datasetB)
      makeEdge(nodes.load_csv, "dataset", nodes.filter_rows, "dataset"),
      makeEdge(nodes.filter_rows, "dataset", nodes.feature_union, "datasetB"),

      // Branch 3: load_csv -> normalize -> feature_union (datasetC)
      makeEdge(nodes.load_csv, "dataset", nodes.normalize, "dataset"),
      makeEdge(nodes.normalize, "dataset", nodes.feature_union, "datasetC"),

      // Downstream: feature_union -> select_target -> train_test_split -> random_forest -> evaluate & save_model
      makeEdge(nodes.feature_union, "dataset", nodes.select_target, "dataset"),
      makeEdge(nodes.select_target, "dataset", nodes.train_test_split, "dataset"),
      makeEdge(nodes.train_test_split, "train", nodes.random_forest, "dataset"),
      makeEdge(nodes.random_forest, "model", nodes.save_model, "model"),
      makeEdge(nodes.train_test_split, "test", nodes.evaluate, "dataset"),
      makeEdge(nodes.random_forest, "model", nodes.evaluate, "model"),
    ],
  }
}
