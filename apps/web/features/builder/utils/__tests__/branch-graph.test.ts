import {
  detectBranches,
  type BranchGraphEdge,
  type BranchGraphNode,
} from "../branch-graph"

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
      nodes(["split", "rf", "logreg"]),
      edges([
        ["split", "rf"],
        ["split", "logreg"],
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
})
