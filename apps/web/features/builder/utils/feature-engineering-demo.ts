import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const FEATURE_ENGINEERING_EXECUTOR_KEYS = [
  "load_csv",
  "custom_feature_formula",
  "feature_union",
  "select_target",
  "train_test_split",
  "random_forest",
  "save_model",
  "evaluate",
] as const

type FeatureEngineeringExecutorKey = (typeof FEATURE_ENGINEERING_EXECUTOR_KEYS)[number]

export interface FeatureEngineeringDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_COLUMNS = "SepalLengthCm,SepalWidthCm,PetalLengthCm,PetalWidthCm,Species"

const positions: Record<FeatureEngineeringExecutorKey, { x: number; y: number }> = {
  load_csv: { x: 0, y: 200 },
  custom_feature_formula: { x: 300, y: 20 },
  feature_union: { x: 600, y: 200 },
  select_target: { x: 900, y: 200 },
  train_test_split: { x: 1200, y: 200 },
  random_forest: { x: 1500, y: 80 },
  save_model: { x: 1800, y: 20 },
  evaluate: { x: 1500, y: 200 },
}

const configs: Record<
  FeatureEngineeringExecutorKey,
  (datasetId: string) => Record<string, unknown>
> = {
  load_csv: (datasetId) => ({ dataset: datasetId, file: datasetId }),
  custom_feature_formula: () => ({
    outputColumn: "PetalArea",
    outputType: "float",
    expression: "PetalLengthCm * PetalWidthCm",
    columns: IRIS_COLUMNS,
  }),
  feature_union: () => ({}),
  select_target: () => ({
    targetColumn: "Species",
    task: "classification",
  }),
  train_test_split: () => ({ testSize: 0.2, stratify: true }),
  random_forest: () => ({ n_estimators: 50, max_depth: 5 }),
  save_model: () => ({ format: "joblib", name: "feature-engineering-demo" }),
  evaluate: () => ({ metrics: "accuracy" }),
}

export function createFeatureEngineeringDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `fe_${Date.now()}`
): FeatureEngineeringDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(FEATURE_ENGINEERING_EXECUTOR_KEYS, blocks)
  const nodes = Object.fromEntries(
    FEATURE_ENGINEERING_EXECUTOR_KEYS.map((executorKey) => [
      executorKey,
      makeNode(catalog[executorKey], executorKey, idPrefix, positions[executorKey], configs[executorKey](datasetId)),
    ])
  ) as Record<FeatureEngineeringExecutorKey, PipelineNode>

  return {
    nodes: FEATURE_ENGINEERING_EXECUTOR_KEYS.map((executorKey) => nodes[executorKey]),
    edges: [
      makeEdge(nodes.load_csv, "dataset", nodes.feature_union, "datasetA"),
      makeEdge(nodes.load_csv, "dataset", nodes.custom_feature_formula, "dataset"),
      makeEdge(nodes.custom_feature_formula, "dataset", nodes.feature_union, "datasetB"),
      makeEdge(nodes.feature_union, "dataset", nodes.select_target, "dataset"),
      makeEdge(nodes.select_target, "dataset", nodes.train_test_split, "dataset"),
      makeEdge(nodes.train_test_split, "train", nodes.random_forest, "dataset"),
      makeEdge(nodes.random_forest, "model", nodes.save_model, "model"),
      makeEdge(nodes.train_test_split, "test", nodes.evaluate, "dataset"),
      makeEdge(nodes.random_forest, "model", nodes.evaluate, "model"),
    ],
  }
}
