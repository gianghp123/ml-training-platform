import type { BlockDefinition } from "@training-ml/contracts"
import { DEMOS, getDemo, getDefaultDemo } from "../demos"
import { IRIS_EXECUTOR_KEYS } from "../iris-demo"
import { FEATURE_ENGINEERING_EXECUTOR_KEYS } from "../feature-engineering-demo"
import { PARALLEL_EXECUTOR_KEYS } from "../parallel-demo"

describe("DEMOS registry", () => {
  it("contains parallel-execution, iris, and feature-engineering", () => {
    expect(DEMOS).toHaveLength(3)
    expect(DEMOS[0]?.id).toBe("parallel-execution")
    expect(DEMOS[1]?.id).toBe("iris")
    expect(DEMOS[2]?.id).toBe("feature-engineering")
  })

  it("getDemo returns the correct demo", () => {
    expect(getDemo("parallel-execution")?.name).toContain("Song Luồng Model Comparison")
    expect(getDemo("iris")?.name).toBe("Iris Random Forest")
    expect(getDemo("feature-engineering")?.name).toBe("Feature Engineering")
  })

  it("getDemo returns undefined for nonexistent demos", () => {
    expect(getDemo("nonexistent")).toBeUndefined()
  })

  it("getDefaultDemo returns the first demo", () => {
    expect(getDefaultDemo().id).toBe("parallel-execution")
  })

  it("each demo's create function works with mocked blocks", () => {
    const allKeys = new Set([
      ...IRIS_EXECUTOR_KEYS,
      ...FEATURE_ENGINEERING_EXECUTOR_KEYS,
      ...PARALLEL_EXECUTOR_KEYS,
    ])
    const blocks = Array.from(allKeys).map((key) => {
      const b: BlockDefinition = {
        id: key,
        version: 1,
        status: "active",
        executorKey: key,
        name: key,
        categoryId: "cat",
        ports: { inputs: [], outputs: [] },
        configSchema: { fields: [] },
        constraints: { rules: [] },
        outputTransform: {},
      }
      return b
    })

    for (const demo of DEMOS) {
      const result = demo.create(blocks, "dataset-id", "test")
      expect(result.nodes.length).toBeGreaterThan(0)
      expect(result.edges.length).toBeGreaterThan(0)
    }
  })
})
