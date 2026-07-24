import type { BlockDefinition, Dataset, Port } from "@training-ml/contracts"
import {
  createIrisDemoGraph,
  getReadyCsvDatasets,
  IRIS_EXECUTOR_KEYS,
} from "../iris-demo"

const port = (id: string, artifact: Port["artifact"]): Port => ({
  id,
  artifact,
})

const ports: Record<
  (typeof IRIS_EXECUTOR_KEYS)[number],
  BlockDefinition["ports"]
> = {
  load_csv: { inputs: [], outputs: [port("dataset", "Dataset")] },
  feature_select: {
    inputs: [port("dataset", "Dataset")],
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
  evaluate: {
    inputs: [port("model", "Model"), port("dataset", "Dataset")],
    outputs: [port("metrics", "Metrics")],
  },
}

function block(
  executorKey: (typeof IRIS_EXECUTOR_KEYS)[number]
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

describe("createIrisDemoGraph", () => {
  it("builds the six-node branching graph using executor keys", () => {
    const graph = createIrisDemoGraph(
      IRIS_EXECUTOR_KEYS.map(block),
      "08640a0c-b5c7-449d-9c69-61a8ceee8b3a",
      "demo"
    )

    expect(graph.nodes.map((node) => node.id)).toEqual(
      IRIS_EXECUTOR_KEYS.map((key) => `demo_${key}`)
    )
    expect(graph.edges).toHaveLength(6)
    expect(graph.nodes[0]?.data.config.dataset).toBe(
      "08640a0c-b5c7-449d-9c69-61a8ceee8b3a"
    )
    expect(graph.nodes[1]?.data.config.columns).toContain("Species")
    expect(graph.nodes[2]?.data.config).toMatchObject({
      targetColumn: "Species",
      task: "classification",
    })
    expect(graph.edges[4]).toMatchObject({
      sourceHandle: "model",
      targetHandle: "model",
    })
    expect(graph.edges[5]).toMatchObject({
      sourceHandle: "test",
      targetHandle: "dataset",
    })
  })

  it("fails clearly when the stable catalog key is missing", () => {
    const blocks = IRIS_EXECUTOR_KEYS.filter((key) => key !== "evaluate").map(
      block
    )
    expect(() => createIrisDemoGraph(blocks, "dataset-id", "demo")).toThrow(
      "evaluate"
    )
  })
})

describe("getReadyCsvDatasets", () => {
  const dataset = (
    id: string,
    format: Dataset["format"],
    status: Dataset["status"]
  ): Dataset => ({
    id,
    name: id,
    description: null,
    storageUri: `datasets/${id}`,
    format,
    size: 1,
    status,
    profile: null,
    validationError: null,
    checksum: null,
    version: 1,
    userId: "user-1",
  })

  it("only returns CSV datasets that finished validation", () => {
    const result = getReadyCsvDatasets([
      dataset("ready-csv", "csv", "ready"),
      dataset("queued-csv", "csv", "queued"),
      dataset("ready-json", "json", "ready"),
    ])
    expect(result.map((item) => item.id)).toEqual(["ready-csv"])
  })
})
