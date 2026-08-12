import {
  detectBranches,
  type BranchGraphEdge,
  type BranchGraphNode,
} from "../branch-graph"
import { createComprehensiveDemoGraph } from "../comprehensive-demo"
import { COMPREHENSIVE_EXECUTOR_KEYS } from "../comprehensive-demo"
import type { BlockDefinition } from "@training-ml/contracts"

function nodes(ids: string[]): BranchGraphNode[] {
  return ids.map((id) => ({ id }))
}

function edges(pairs: Array<[string, string]>): BranchGraphEdge[] {
  return pairs.map(([source, target]) => ({ source, target }))
}

describe("detectBranches", () => {
  it("detects two branches sharing the prefix nodes of the split", () => {
    const branches = detectBranches(
      nodes(["split", "rf", "eval_rf", "save_rf", "logreg", "eval_logreg", "save_logreg"]),
      edges([
        ["split", "rf"],
        ["split", "logreg"],
        ["rf", "eval_rf"],
        ["eval_rf", "save_rf"],
        ["logreg", "eval_logreg"],
        ["eval_logreg", "save_logreg"],
      ])
    )

    expect(branches).toHaveLength(2)
    expect(new Set(branches[0].nodeIds)).toEqual(
      new Set(["split", "rf", "eval_rf", "save_rf"])
    )
    expect(new Set(branches[1].nodeIds)).toEqual(
      new Set(["split", "logreg", "eval_logreg", "save_logreg"])
    )
  })

  it("orders exclusive node ids topologically", () => {
    const branches = detectBranches(
      nodes(["split", "rf", "eval_rf", "save_rf", "logreg", "eval_logreg", "save_logreg"]),
      edges([
        ["split", "rf"],
        ["split", "logreg"],
        ["rf", "eval_rf"],
        ["eval_rf", "save_rf"],
        ["logreg", "eval_logreg"],
        ["eval_logreg", "save_logreg"],
      ])
    )

    expect(branches[0].orderedExclusiveIds).toEqual([
      "rf",
      "eval_rf",
      "save_rf",
    ])
    expect(branches[1].orderedExclusiveIds).toEqual([
      "logreg",
      "eval_logreg",
      "save_logreg",
    ])
  })

  it("labels branches with an ordered path summary", () => {
    const branches = detectBranches(
      nodes(["split", "rf", "eval_rf", "logreg", "eval_logreg"]),
      edges([
        ["split", "rf"],
        ["split", "logreg"],
        ["rf", "eval_rf"],
        ["logreg", "eval_logreg"],
      ]),
      {
        rf: "Random Forest",
        eval_rf: "Evaluate",
        logreg: "Logistic Regression",
        eval_logreg: "Evaluate",
      }
    )

    expect(branches.map((branch) => branch.label)).toEqual([
      "Random Forest → Evaluate",
      "Logistic Regression → Evaluate",
    ])
  })

  it("falls back to Graph N when no labels are known", () => {
    const branches = detectBranches(
      nodes(["split", "rf", "eval_rf", "logreg", "eval_logreg"]),
      edges([
        ["split", "rf"],
        ["split", "logreg"],
        ["rf", "eval_rf"],
        ["logreg", "eval_logreg"],
      ])
    )

    expect(branches.map((branch) => branch.label)).toEqual([
      "Graph 1",
      "Graph 2",
    ])
  })

  it("excludes nodes downstream of a rejoin from both branches", () => {
    const branches = detectBranches(
      nodes(["a", "b", "c", "d"]),
      edges([
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["c", "d"],
      ])
    )

    expect(branches).toHaveLength(2)
    expect(new Set(branches[0].nodeIds)).toEqual(new Set(["a", "b"]))
    expect(new Set(branches[1].nodeIds)).toEqual(new Set(["a", "c"]))
    expect(branches[0].nodeIds).not.toContain("d")
    expect(branches[1].nodeIds).not.toContain("d")
  })

  it("returns a single branch for a linear graph", () => {
    const branches = detectBranches(
      nodes(["a", "b", "c"]),
      edges([
        ["a", "b"],
        ["b", "c"],
      ])
    )

    expect(branches).toHaveLength(1)
    expect(new Set(branches[0].nodeIds)).toEqual(new Set(["a", "b", "c"]))
    expect(branches[0].label).toBe("Pipeline")
  })

  it("returns a single branch when there are no edges", () => {
    const branches = detectBranches(nodes(["a", "b"]))

    expect(branches).toHaveLength(1)
    expect(branches[0].nodeIds).toEqual(["a", "b"])
    expect(branches[0].label).toBe("Pipeline")
  })

  it("treats fan-out to shared downstream as a single branch", () => {
    const branches = detectBranches(
      nodes(["split", "rf", "eval_rf", "save_rf", "logreg", "eval_logreg", "save_logreg"]),
      edges([
        ["split", "rf"],
        ["split", "logreg"],
        ["split", "eval_rf"],
        ["split", "eval_logreg"],
        ["rf", "eval_rf"],
        ["rf", "save_rf"],
        ["eval_rf", "save_rf"],
        ["logreg", "eval_logreg"],
        ["logreg", "save_logreg"],
        ["eval_logreg", "save_logreg"],
      ])
    )

    expect(branches).toHaveLength(2)
    expect(new Set(branches[0].nodeIds)).toEqual(
      new Set(["split", "rf", "eval_rf", "save_rf"])
    )
    expect(new Set(branches[1].nodeIds)).toEqual(
      new Set(["split", "logreg", "eval_logreg", "save_logreg"])
    )
  })

  it("detects three branches in the comprehensive demo", () => {
    const blocks: BlockDefinition[] = COMPREHENSIVE_EXECUTOR_KEYS.map(
      (key) => ({
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
      })
    )
    const graph = createComprehensiveDemoGraph(blocks, "dataset-id", "test")
    const nodeLabels = Object.fromEntries(
      graph.nodes.map((node) => [
        node.id,
        String((node.data as Record<string, unknown>).blockName ?? node.id),
      ])
    )
    const branches = detectBranches(graph.nodes, graph.edges, nodeLabels)

    expect(branches).toHaveLength(3)
    const branchCounts = branches.map((branch) => branch.nodeIds.length)
    expect(branchCounts).toEqual([10, 10, 8])
    const labels = branches.map((branch) => branch.label)
    expect(labels).toContain("random_forest → evaluate → save_model")
    expect(labels).toContain(
      "logistic_regression → evaluate → save_model"
    )
    expect(labels).toContain("svm → evaluate → save_model")
  })

  it("annotates colliding labels with differing config values", () => {
    const branches = detectBranches(
      nodes([
        "split", "na", "ta", "sa", "ma", "ea", "xa",
        "nb", "tb", "sb", "mb", "eb", "xb",
      ]),
      edges([
        ["split", "na"], ["na", "ta"], ["ta", "sa"], ["sa", "ma"], ["ma", "ea"], ["ea", "xa"],
        ["split", "nb"], ["nb", "tb"], ["tb", "sb"], ["sb", "mb"], ["mb", "eb"], ["eb", "xb"],
      ]),
      {
        na: "Normalize", ta: "Target", sa: "Split", ma: "Random Forest", ea: "Evaluate", xa: "Save Model",
        nb: "Normalize", tb: "Target", sb: "Split", mb: "Random Forest", eb: "Evaluate", xb: "Save Model",
      },
      {
        na: { method: "Standard" },
        nb: { method: "MinMax" },
      }
    )

    expect(branches.map((branch) => branch.label)).toEqual([
      "Normalize (method=Standard) → Target → Split → Random Forest → Evaluate → Save Model",
      "Normalize (method=MinMax) → Target → Split → Random Forest → Evaluate → Save Model",
    ])
  })

  it("numbers branches that are identical in names and configs", () => {
    const branches = detectBranches(
      nodes(["split", "na", "ma", "nb", "mb"]),
      edges([
        ["split", "na"], ["na", "ma"],
        ["split", "nb"], ["nb", "mb"],
      ]),
      {
        na: "Random Forest", ma: "Evaluate",
        nb: "Random Forest", mb: "Evaluate",
      },
      {
        na: { n_estimators: 100 },
        nb: { n_estimators: 100 },
      }
    )

    expect(branches.map((branch) => branch.label)).toEqual([
      "Random Forest → Evaluate",
      "Random Forest → Evaluate (2)",
    ])
  })

  it("does not annotate when labels already differ", () => {
    const branches = detectBranches(
      nodes(["split", "na", "ma", "nb", "mb"]),
      edges([
        ["split", "na"], ["na", "ma"],
        ["split", "nb"], ["nb", "mb"],
      ]),
      {
        na: "Random Forest", ma: "Evaluate",
        nb: "SVM", mb: "Evaluate",
      },
      {
        na: { method: "Standard" },
        nb: { method: "MinMax" },
      }
    )

    expect(branches.map((branch) => branch.label)).toEqual([
      "Random Forest → Evaluate",
      "SVM → Evaluate",
    ])
  })

  it("recursively splits nested branches", () => {
    const branches = detectBranches(
      nodes(["a", "b", "c", "d", "e", "f"]),
      edges([
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["b", "e"],
        ["d", "f"],
      ])
    )

    expect(branches).toHaveLength(3)
    expect(new Set(branches[0].nodeIds)).toEqual(new Set(["a", "b", "d", "f"]))
    expect(new Set(branches[1].nodeIds)).toEqual(new Set(["a", "b", "e"]))
    expect(new Set(branches[2].nodeIds)).toEqual(new Set(["a", "c"]))
  })

  it("does not split a model-style fan-out to terminal nodes", () => {
    const branches = detectBranches(
      nodes(["rf", "eval", "save"]),
      edges([
        ["rf", "eval"],
        ["rf", "save"],
      ])
    )

    expect(branches).toHaveLength(1)
    expect(new Set(branches[0].nodeIds)).toEqual(new Set(["rf", "eval", "save"]))
  })
})
