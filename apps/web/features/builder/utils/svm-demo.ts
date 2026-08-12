import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const SVM_EXECUTOR_KEYS = [
  "load_csv",
  "feature_select",
  "select_target",
  "train_test_split",
  "svm",
  "evaluate",
] as const

type SvmExecutorKey = (typeof SVM_EXECUTOR_KEYS)[number]

export interface SvmDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_COLUMNS =
  "SepalWidthCm,SepalLengthCm,PetalLengthCm,PetalWidthCm,Species"

const positions: Record<SvmExecutorKey, { x: number; y: number }> = {
  load_csv: { x: 0, y: 160 },
  feature_select: { x: 300, y: 160 },
  select_target: { x: 600, y: 160 },
  train_test_split: { x: 900, y: 160 },
  svm: { x: 1_200, y: 40 },
  evaluate: { x: 1_500, y: 160 },
}

const configs: Record<
  SvmExecutorKey,
  (datasetId: string) => Record<string, unknown>
> = {
  load_csv: (datasetId) => ({ dataset: datasetId, file: datasetId }),
  feature_select: () => ({ columns: IRIS_COLUMNS }),
  select_target: () => ({
    targetColumn: "Species",
    task: "classification",
  }),
  train_test_split: () => ({ testSize: 0.2, stratify: true }),
  svm: () => ({ kernel: "rbf", C: 1.0 }),
  evaluate: () => ({ metrics: "accuracy,f1,confusionMatrix" }),
}

export function createSvmDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `svm_${Date.now()}`
): SvmDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(SVM_EXECUTOR_KEYS, blocks)
  const nodes = Object.fromEntries(
    SVM_EXECUTOR_KEYS.map((executorKey) => [
      executorKey,
      makeNode(
        catalog[executorKey],
        executorKey,
        idPrefix,
        positions[executorKey],
        configs[executorKey](datasetId)
      ),
    ])
  ) as Record<SvmExecutorKey, PipelineNode>

  return {
    nodes: SVM_EXECUTOR_KEYS.map((executorKey) => nodes[executorKey]),
    edges: [
      makeEdge(nodes.load_csv, "dataset", nodes.feature_select, "dataset"),
      makeEdge(nodes.feature_select, "dataset", nodes.select_target, "dataset"),
      makeEdge(
        nodes.select_target,
        "dataset",
        nodes.train_test_split,
        "dataset"
      ),
      makeEdge(nodes.train_test_split, "train", nodes.svm, "dataset"),
      makeEdge(nodes.svm, "model", nodes.evaluate, "model"),
      makeEdge(nodes.train_test_split, "test", nodes.evaluate, "dataset"),
    ],
  }
}
