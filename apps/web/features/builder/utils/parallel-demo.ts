import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const PARALLEL_EXECUTOR_KEYS = [
  "load_csv",
  "feature_select",
  "select_target",
  "train_test_split",
  "random_forest",
  "logistic_regression",
  "save_model",
  "evaluate",
] as const

type ParallelExecutorKey = (typeof PARALLEL_EXECUTOR_KEYS)[number]

export interface ParallelDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_COLUMNS = "SepalLengthCm,SepalWidthCm,PetalLengthCm,PetalWidthCm,Species"

export function createParallelDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `parallel_${Date.now()}`
): ParallelDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(PARALLEL_EXECUTOR_KEYS, blocks)

  const nLoad = makeNode(catalog.load_csv, "load_csv", `${idPrefix}_load`, { x: 0, y: 240 }, { dataset: datasetId, file: datasetId })
  const nSelect = makeNode(catalog.feature_select, "feature_select", `${idPrefix}_select`, { x: 300, y: 240 }, { columns: IRIS_COLUMNS })
  const nTarget = makeNode(catalog.select_target, "select_target", `${idPrefix}_target`, { x: 600, y: 240 }, { targetColumn: "Species", task: "classification" })
  const nSplit = makeNode(catalog.train_test_split, "train_test_split", `${idPrefix}_split`, { x: 900, y: 240 }, { testSize: 0.2, stratify: true })

  // Branch 1: Random Forest Pipeline
  const nRf = makeNode(catalog.random_forest, "random_forest", `${idPrefix}_rf`, { x: 1250, y: 80 }, { n_estimators: 100, max_depth: 10 })
  const nEvalRf = makeNode(catalog.evaluate, "evaluate", `${idPrefix}_eval_rf`, { x: 1600, y: 80 }, { metrics: "accuracy" })
  const nSaveRf = makeNode(catalog.save_model, "save_model", `${idPrefix}_save_rf`, { x: 1950, y: 80 }, { format: "joblib", name: "iris-random-forest-model" })

  // Branch 2: Logistic Regression Pipeline (Parallel)
  const nLogReg = makeNode(catalog.logistic_regression, "logistic_regression", `${idPrefix}_logreg`, { x: 1250, y: 400 }, { penalty: "l2", C: 1.0 })
  const nEvalLogReg = makeNode(catalog.evaluate, "evaluate", `${idPrefix}_eval_logreg`, { x: 1600, y: 400 }, { metrics: "accuracy" })
  const nSaveLogReg = makeNode(catalog.save_model, "save_model", `${idPrefix}_save_logreg`, { x: 1950, y: 400 }, { format: "joblib", name: "iris-logistic-regression-model" })

  const nodes = [
    nLoad,
    nSelect,
    nTarget,
    nSplit,
    nRf,
    nEvalRf,
    nSaveRf,
    nLogReg,
    nEvalLogReg,
    nSaveLogReg,
  ]

  const edges = [
    makeEdge(nLoad, "dataset", nSelect, "dataset"),
    makeEdge(nSelect, "dataset", nTarget, "dataset"),
    makeEdge(nTarget, "dataset", nSplit, "dataset"),

    // Branch 1 Edges (Random Forest)
    makeEdge(nSplit, "train", nRf, "dataset"),
    makeEdge(nSplit, "test", nEvalRf, "dataset"),
    makeEdge(nRf, "model", nEvalRf, "model"),
    makeEdge(nRf, "model", nSaveRf, "model"),

    // Branch 2 Edges (Logistic Regression - Parallel)
    makeEdge(nSplit, "train", nLogReg, "dataset"),
    makeEdge(nSplit, "test", nEvalLogReg, "dataset"),
    makeEdge(nLogReg, "model", nEvalLogReg, "model"),
    makeEdge(nLogReg, "model", nSaveLogReg, "model"),
  ]

  return { nodes, edges }
}
