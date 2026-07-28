import type { BlockDefinition, Port } from "@training-ml/contracts"
import {
  createFeatureEngineeringDemoGraph,
  FEATURE_ENGINEERING_EXECUTOR_KEYS,
} from "../feature-engineering-demo"

const port = (id: string, artifact: Port["artifact"]): Port => ({
  id,
  artifact,
})

const ports: Record<
  (typeof FEATURE_ENGINEERING_EXECUTOR_KEYS)[number],
  BlockDefinition["ports"]
> = {
  load_csv: { inputs: [], outputs: [port("dataset", "Dataset")] },
  custom_feature_formula: {
    inputs: [port("dataset", "Dataset")],
    outputs: [port("dataset", "Dataset")],
  },
  feature_union: {
    inputs: [port("datasetA", "Dataset"), port("datasetB", "Dataset")],
    outputs: [port("dataset", "Dataset")],
  },
  select_target: {
    inputs: [port("dataset", "Dataset")],
    outputs: [port("dataset", "Dataset")],
  },
  train_test_split: {
    inputs: [port("dataset", "Dataset")],
    outputs: [port("train", "Dataset"), port("test", "Dataset")],
  },
  random_forest: {
    inputs: [port("dataset", "Dataset")],
    outputs: [port("model", "Model")],
  },
  save_model: {
    inputs: [port("model", "Model")],
    outputs: [],
  },
  evaluate: {
    inputs: [port("model", "Model"), port("dataset", "Dataset")],
    outputs: [port("metrics", "Metrics")],
  },
}

function block(
  executorKey: (typeof FEATURE_ENGINEERING_EXECUTOR_KEYS)[number]
): BlockDefinition {
  return {
    id: `${executorKey}-id`,
    version: 1,
    status: "active",
    executorKey,
    name: executorKey,
    categoryId: "category",
    ports: ports[executorKey],
    configSchema: { fields: [] },
    constraints: { rules: [] },
    outputTransform: {},
  }
}

describe("createFeatureEngineeringDemoGraph", () => {
  it("builds the eight-node branching graph using executor keys", () => {
    const graph = createFeatureEngineeringDemoGraph(
      FEATURE_ENGINEERING_EXECUTOR_KEYS.map(block),
      "08640a0c-b5c7-449d-9c69-61a8ceee8b3a",
      "demo"
    )

    expect(graph.nodes.map((node) => node.id)).toEqual(
      FEATURE_ENGINEERING_EXECUTOR_KEYS.map((key) => `demo_${key}`)
    )
    expect(graph.edges).toHaveLength(9)
    expect(graph.nodes[0]?.data.config.dataset).toBe(
      "08640a0c-b5c7-449d-9c69-61a8ceee8b3a"
    )
    expect(graph.nodes[1]?.data.config).toMatchObject({
      outputColumn: "PetalArea",
      outputType: "float",
      expression: "PetalLengthCm * PetalWidthCm",
      columns: "SepalLengthCm,SepalWidthCm,PetalLengthCm,PetalWidthCm,Species",
    })
  })

  it("fails clearly when a required executor key is missing", () => {
    const blocks = FEATURE_ENGINEERING_EXECUTOR_KEYS.filter(
      (key) => key !== "evaluate"
    ).map(block)
    expect(() =>
      createFeatureEngineeringDemoGraph(blocks, "dataset-id", "demo")
    ).toThrow("evaluate")
  })
})
