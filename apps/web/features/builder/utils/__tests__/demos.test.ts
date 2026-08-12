import type { BlockDefinition } from "@training-ml/contracts"
import { DEMOS, getDemo, getDefaultDemo } from "../demos"
import { IRIS_EXECUTOR_KEYS } from "../iris-demo"
import { FEATURE_ENGINEERING_EXECUTOR_KEYS } from "../feature-engineering-demo"
import { PARALLEL_EXECUTOR_KEYS } from "../parallel-demo"
import { LOGISTIC_REGRESSION_EXECUTOR_KEYS } from "../logistic-regression-demo"
import { createLogisticRegressionDemoGraph } from "../logistic-regression-demo"
import { SVM_EXECUTOR_KEYS } from "../svm-demo"
import { createSvmDemoGraph } from "../svm-demo"
import { KMEANS_EXECUTOR_KEYS } from "../kmeans-demo"
import { createKmeansDemoGraph } from "../kmeans-demo"
import { COMPREHENSIVE_EXECUTOR_KEYS } from "../comprehensive-demo"
import { createComprehensiveDemoGraph } from "../comprehensive-demo"

describe("DEMOS registry", () => {
  it("contains all seven demos in order", () => {
    expect(DEMOS).toHaveLength(7)
    expect(DEMOS.map((demo) => demo.id)).toEqual([
      "parallel-execution",
      "iris",
      "feature-engineering",
      "iris-logistic-regression",
      "iris-svm",
      "iris-kmeans",
      "comprehensive-3-branch",
    ])
  })

  it("getDemo returns the correct demo", () => {
    expect(getDemo("parallel-execution")?.name).toContain("Song Luồng Model Comparison")
    expect(getDemo("iris")?.name).toBe("Iris Random Forest")
    expect(getDemo("feature-engineering")?.name).toBe("Feature Engineering")
    expect(getDemo("iris-logistic-regression")?.name).toContain(
      "Logistic Regression"
    )
    expect(getDemo("iris-svm")?.name).toContain("SVM")
    expect(getDemo("iris-kmeans")?.name).toContain("K-Means")
    expect(getDemo("comprehensive-3-branch")?.name).toContain("Comprehensive")
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
      ...LOGISTIC_REGRESSION_EXECUTOR_KEYS,
      ...SVM_EXECUTOR_KEYS,
      ...KMEANS_EXECUTOR_KEYS,
      ...COMPREHENSIVE_EXECUTOR_KEYS,
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

  it("selects at least one metric on every evaluate block", () => {
    const allKeys = new Set([
      ...IRIS_EXECUTOR_KEYS,
      ...FEATURE_ENGINEERING_EXECUTOR_KEYS,
      ...PARALLEL_EXECUTOR_KEYS,
      ...LOGISTIC_REGRESSION_EXECUTOR_KEYS,
      ...SVM_EXECUTOR_KEYS,
      ...KMEANS_EXECUTOR_KEYS,
      ...COMPREHENSIVE_EXECUTOR_KEYS,
    ])
    const blocks = Array.from(allKeys).map((key) => ({
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
    })) as BlockDefinition[]

    for (const demo of DEMOS) {
      const result = demo.create(blocks, "dataset-id", "test")
      const evaluateNodes = result.nodes.filter((node) => {
        const block = (node.data as Record<string, unknown>).block as
          | Record<string, unknown>
          | undefined
        return block?.executorKey === "evaluate"
      })
      expect(evaluateNodes.length).toBeGreaterThan(0)
      for (const node of evaluateNodes) {
        const config = (node.data as Record<string, unknown>).config as Record<
          string,
          unknown
        >
        expect(
          typeof config.metrics === "string" && config.metrics.length > 0
        ).toBe(true)
      }
    }
  })

  it("builds the new model demos with the expected shape", () => {
    const allKeys = new Set([
      ...LOGISTIC_REGRESSION_EXECUTOR_KEYS,
      ...SVM_EXECUTOR_KEYS,
      ...KMEANS_EXECUTOR_KEYS,
      ...COMPREHENSIVE_EXECUTOR_KEYS,
    ])
    const blocks = Array.from(allKeys).map((key) => ({
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
    })) as BlockDefinition[]

    const logreg = createLogisticRegressionDemoGraph(blocks, "ds", "x")
    expect(logreg.nodes).toHaveLength(6)
    expect(logreg.nodes.some((n) => n.id === "x_logistic_regression")).toBe(true)

    const svm = createSvmDemoGraph(blocks, "ds", "x")
    expect(svm.nodes).toHaveLength(6)
    expect(svm.nodes.some((n) => n.id === "x_svm")).toBe(true)

    const kmeans = createKmeansDemoGraph(blocks, "ds", "x")
    expect(kmeans.nodes).toHaveLength(6)
    expect(
      kmeans.edges.some(
        (e) => e.source === "x_normalize" && e.target === "x_kmeans"
      )
    ).toBe(true)
    expect(
      kmeans.edges.some((e) => e.target === "x_select_target")
    ).toBe(false)

    const comprehensive = createComprehensiveDemoGraph(blocks, "ds", "x")
    expect(comprehensive.nodes).toHaveLength(22)
    const imputeId = "x_impute_impute_missing"
    const formulaId = "x_formula_custom_feature_formula"
    const unionId = "x_union_feature_union"
    expect(
      comprehensive.edges.some((e) => e.source === imputeId && e.target === formulaId)
    ).toBe(true)
    expect(
      comprehensive.edges.some(
        (e) => e.source === formulaId && e.target === unionId
      )
    ).toBe(true)
    expect(
      comprehensive.edges.some(
        (e) => e.source === imputeId && e.target === "x_norm_svm_normalize"
      )
    ).toBe(true)
    expect(
      comprehensive.edges.some(
        (e) => e.source === unionId && e.target === "x_norm_rf_normalize"
      )
    ).toBe(true)
    expect(
      comprehensive.edges.some(
        (e) => e.source === unionId && e.target === "x_norm_logreg_normalize"
      )
    ).toBe(true)

    const branches = [
      {
        norm: "x_norm_rf_normalize",
        target: "x_target_rf_select_target",
        split: "x_split_rf_train_test_split",
        model: "x_rf_random_forest",
        eval: "x_eval_rf_evaluate",
      },
      {
        norm: "x_norm_logreg_normalize",
        target: "x_target_logreg_select_target",
        split: "x_split_logreg_train_test_split",
        model: "x_logreg_logistic_regression",
        eval: "x_eval_logreg_evaluate",
      },
      {
        norm: "x_norm_svm_normalize",
        target: "x_target_svm_select_target",
        split: "x_split_svm_train_test_split",
        model: "x_svm_svm",
        eval: "x_eval_svm_evaluate",
      },
    ]
    for (const { norm, target, split, model, eval: evalNode } of branches) {
      expect(
        comprehensive.edges.some((e) => e.source === norm && e.target === target)
      ).toBe(true)
      expect(
        comprehensive.edges.some((e) => e.source === target && e.target === split)
      ).toBe(true)
      expect(
        comprehensive.edges.some((e) => e.source === split && e.target === model)
      ).toBe(true)
      expect(
        comprehensive.edges.some((e) => e.source === split && e.target === evalNode)
      ).toBe(true)
      expect(
        comprehensive.edges.some((e) => e.source === model && e.target === evalNode)
      ).toBe(true)
    }
  })

  it("only normalizes columns that exist on each branch", () => {
    const allKeys = new Set([...COMPREHENSIVE_EXECUTOR_KEYS])
    const blocks = Array.from(allKeys).map((key) => ({
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
    })) as BlockDefinition[]
    const comprehensive = createComprehensiveDemoGraph(blocks, "ds", "x")

    const normalizeColumns = (nodeId: string): string => {
      const node = comprehensive.nodes.find((n) => n.id === nodeId)
      const config = (node?.data as Record<string, unknown>).config as Record<
        string,
        unknown
      >
      return String(config.columns ?? "")
    }

    expect(normalizeColumns("x_norm_svm_normalize")).not.toContain("PetalArea")
    expect(normalizeColumns("x_norm_rf_normalize")).toContain("PetalArea")
    expect(normalizeColumns("x_norm_logreg_normalize")).toContain("PetalArea")
  })
})
