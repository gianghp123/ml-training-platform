import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { makeNode, makeEdge, resolveBlocks } from "./demo-helpers"

export const COMPREHENSIVE_EXECUTOR_KEYS = [
  "load_csv",
  "impute_missing",
  "custom_feature_formula",
  "feature_union",
  "normalize",
  "select_target",
  "train_test_split",
  "random_forest",
  "logistic_regression",
  "svm",
  "save_model",
  "evaluate",
] as const

type ComprehensiveExecutorKey = (typeof COMPREHENSIVE_EXECUTOR_KEYS)[number]

export interface ComprehensiveDemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

const IRIS_COLUMNS =
  "SepalWidthCm,SepalLengthCm,PetalLengthCm,PetalWidthCm,Species"
const IRIS_FEATURES = "SepalWidthCm,SepalLengthCm,PetalLengthCm,PetalWidthCm"

const positions = {
  load_csv: { x: 0, y: 240 },
  impute_missing: { x: 300, y: 240 },
  custom_feature_formula: { x: 600, y: 20 },
  feature_union: { x: 900, y: 240 },
  rf: {
    norm: { x: 1_200, y: 20 },
    target: { x: 1_500, y: 20 },
    split: { x: 1_800, y: 20 },
    model: { x: 2_100, y: 20 },
    eval: { x: 2_400, y: 20 },
    save: { x: 2_700, y: 20 },
  },
  logreg: {
    norm: { x: 1_200, y: 240 },
    target: { x: 1_500, y: 240 },
    split: { x: 1_800, y: 240 },
    model: { x: 2_100, y: 240 },
    eval: { x: 2_400, y: 240 },
    save: { x: 2_700, y: 240 },
  },
  svm: {
    norm: { x: 1_200, y: 460 },
    target: { x: 1_500, y: 460 },
    split: { x: 1_800, y: 460 },
    model: { x: 2_100, y: 460 },
    eval: { x: 2_400, y: 460 },
    save: { x: 2_700, y: 460 },
  },
}

interface BranchSpec {
  key: "rf" | "logreg" | "svm"
  modelKey: "random_forest" | "logistic_regression" | "svm"
  normalizeMethod: "Standard" | "MinMax" | "Robust"
  normalizeColumns: string
  modelConfig: Record<string, unknown>
  modelName: string
}

const branchSpecs: BranchSpec[] = [
  {
    key: "rf",
    modelKey: "random_forest",
    normalizeMethod: "Standard",
    normalizeColumns: `${IRIS_FEATURES},PetalArea`,
    modelConfig: { n_estimators: 100, max_depth: 10 },
    modelName: "iris-comprehensive-random-forest",
  },
  {
    key: "logreg",
    modelKey: "logistic_regression",
    normalizeMethod: "MinMax",
    normalizeColumns: `${IRIS_FEATURES},PetalArea`,
    modelConfig: { penalty: "l2", C: 1.0 },
    modelName: "iris-comprehensive-logistic-regression",
  },
  {
    key: "svm",
    modelKey: "svm",
    normalizeMethod: "Robust",
    normalizeColumns: IRIS_FEATURES,
    modelConfig: { kernel: "rbf", C: 1.0 },
    modelName: "iris-comprehensive-svm",
  },
]

export function createComprehensiveDemoGraph(
  blocks: BlockDefinition[],
  datasetId: string,
  idPrefix = `comp_${Date.now()}`
): ComprehensiveDemoGraph {
  if (!datasetId) throw new Error("Select a READY CSV dataset first.")
  const catalog = resolveBlocks(COMPREHENSIVE_EXECUTOR_KEYS, blocks)

  const make = (
    executorKey: ComprehensiveExecutorKey,
    nodeIdSuffix: string,
    position: { x: number; y: number },
    config: Record<string, unknown>
  ): PipelineNode =>
    makeNode(
      catalog[executorKey],
      executorKey,
      `${idPrefix}_${nodeIdSuffix}`,
      position,
      config
    )

  const nLoad = make("load_csv", "load", positions.load_csv, {
    dataset: datasetId,
    file: datasetId,
  })
  const nImpute = make(
    "impute_missing",
    "impute",
    positions.impute_missing,
    { columns: IRIS_FEATURES, strategy: "Median" }
  )
  const nFormula = make(
    "custom_feature_formula",
    "formula",
    positions.custom_feature_formula,
    {
      outputColumn: "PetalArea",
      outputType: "float",
      expression: "PetalLengthCm * PetalWidthCm",
      columns: IRIS_COLUMNS,
    }
  )
  const nUnion = make("feature_union", "union", positions.feature_union, {})

  const branchNodes = branchSpecs.map((spec) => {
    const pos = positions[spec.key]
    const norm = make("normalize", `norm_${spec.key}`, pos.norm, {
      columns: spec.normalizeColumns,
      method: spec.normalizeMethod,
    })
    const target = make(
      "select_target",
      `target_${spec.key}`,
      pos.target,
      { targetColumn: "Species", task: "classification" }
    )
    const split = make(
      "train_test_split",
      `split_${spec.key}`,
      pos.split,
      { testSize: 0.2, stratify: true }
    )
    const model = make(
      spec.modelKey,
      spec.key,
      pos.model,
      spec.modelConfig
    )
    const evalNode = make("evaluate", `eval_${spec.key}`, pos.eval, {
      metrics: "accuracy,f1,confusionMatrix",
    })
    const saveNode = make("save_model", `save_${spec.key}`, pos.save, {
      format: "joblib",
      name: spec.modelName,
    })
    return { spec, norm, target, split, model, evalNode, saveNode }
  })

  const svm = branchNodes.find(({ spec }) => spec.key === "svm")
  if (!svm) throw new Error("SVM branch is missing from the comprehensive demo.")

  return {
    nodes: [
      nLoad,
      nImpute,
      nFormula,
      nUnion,
      ...branchNodes.flatMap(({ norm, target, split, model, evalNode, saveNode }) => [
        norm,
        target,
        split,
        model,
        evalNode,
        saveNode,
      ]),
    ],
    edges: [
      makeEdge(nLoad, "dataset", nImpute, "dataset"),
      makeEdge(nImpute, "dataset", nFormula, "dataset"),
      makeEdge(nImpute, "dataset", svm.norm, "dataset"),
      makeEdge(nFormula, "dataset", nUnion, "datasetB"),
      makeEdge(nImpute, "dataset", nUnion, "datasetA"),
      ...branchNodes.flatMap(
        ({ spec, norm, target, split, model, evalNode, saveNode }) => [
          ...(spec.key === "svm"
            ? []
            : [makeEdge(nUnion, "dataset", norm, "dataset")]),
          makeEdge(norm, "dataset", target, "dataset"),
          makeEdge(target, "dataset", split, "dataset"),
          makeEdge(split, "train", model, "dataset"),
          makeEdge(split, "test", evalNode, "dataset"),
          makeEdge(model, "model", evalNode, "model"),
          makeEdge(model, "model", saveNode, "model"),
        ]
      ),
    ],
  }
}
