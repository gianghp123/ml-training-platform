import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const KMEANS_EXECUTOR_KEYS = [
  "load_csv",
  "feature_select",
  "normalize",
  "kmeans",
  "save_model",
  "evaluate",
] as const

type KmeansExecutorKey = (typeof KMEANS_EXECUTOR_KEYS)[number]

export interface KmeansDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_FEATURES = "SepalWidthCm,SepalLengthCm,PetalLengthCm,PetalWidthCm"

const positions: Record<KmeansExecutorKey, { x: number; y: number }> = {
  load_csv: { x: 0, y: 160 },
  feature_select: { x: 300, y: 160 },
  normalize: { x: 600, y: 160 },
  kmeans: { x: 900, y: 40 },
  save_model: { x: 1_200, y: 160 },
  evaluate: { x: 1_500, y: 160 },
}

const configs: Record<
  KmeansExecutorKey,
  (datasetId: string) => Record<string, unknown>
> = {
  load_csv: (datasetId) => ({ dataset: datasetId, file: datasetId }),
  feature_select: () => ({ columns: IRIS_FEATURES }),
  normalize: () => ({ columns: IRIS_FEATURES, method: "Standard" }),
  kmeans: () => ({ n_clusters: 3 }),
  save_model: () => ({ format: "joblib", name: "iris-kmeans-model" }),
  evaluate: () => ({ metrics: "silhouette,inertia" }),
}

export function createKmeansDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `kmeans_${Date.now()}`
): KmeansDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(KMEANS_EXECUTOR_KEYS, blocks)
  const nodes = Object.fromEntries(
    KMEANS_EXECUTOR_KEYS.map((executorKey) => [
      executorKey,
      makeNode(
        catalog[executorKey],
        executorKey,
        idPrefix,
        positions[executorKey],
        configs[executorKey](datasetId)
      ),
    ])
  ) as Record<KmeansExecutorKey, PipelineNode>

  return {
    nodes: KMEANS_EXECUTOR_KEYS.map((executorKey) => nodes[executorKey]),
    edges: [
      makeEdge(nodes.load_csv, "dataset", nodes.feature_select, "dataset"),
      makeEdge(nodes.feature_select, "dataset", nodes.normalize, "dataset"),
      makeEdge(nodes.normalize, "dataset", nodes.kmeans, "dataset"),
      makeEdge(nodes.normalize, "dataset", nodes.evaluate, "dataset"),
      makeEdge(nodes.kmeans, "model", nodes.evaluate, "model"),
      makeEdge(nodes.kmeans, "model", nodes.save_model, "model"),
    ],
  }
}
