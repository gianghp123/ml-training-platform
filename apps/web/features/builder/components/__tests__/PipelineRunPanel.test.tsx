/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { createInitialRunState } from "../../runtime/run-reducer"
import type { PipelineRunState } from "../../runtime/run-types"
import {
  ArtifactsView,
  filterArtifactsByNodes,
  filterLogsByNodes,
  filterNodeMetrics,
  formatArtifactMetadata,
  groupPipelineLogs,
  PipelineRunPanel,
} from "../PipelineRunPanel"
import type { Branch } from "../../utils/branch-graph"

const logs = [
  {
    id: "run-1",
    timestamp: "2026-08-11T12:00:00.000Z",
    level: "info" as const,
    message: "Run started",
  },
  {
    id: "load-1",
    timestamp: "2026-08-11T12:00:01.000Z",
    level: "info" as const,
    message: "Loading dataset",
    nodeId: "node-load",
  },
  {
    id: "load-2",
    timestamp: "2026-08-11T12:00:02.000Z",
    level: "info" as const,
    message: "Dataset loaded",
    nodeId: "node-load",
  },
  {
    id: "model-1",
    timestamp: "2026-08-11T12:00:03.000Z",
    level: "warning" as const,
    message: "Training model",
    nodeId: "node-model",
  },
]

describe("PipelineRunPanel block log groups", () => {
  it("groups logs by node and keeps run-level events separate", () => {
    const groups = groupPipelineLogs(logs, {
      "node-load": "Load CSV",
      "node-model": "Random Forest",
    })

    expect(groups.map((group) => group.label)).toEqual([
      "Pipeline",
      "Load CSV",
      "Random Forest",
    ])
    expect(groups.map((group) => group.logs.length)).toEqual([1, 2, 1])
  })

  it("expands an individual block group when its header is clicked", () => {
    const state = { ...createInitialRunState(), logs }

    render(
      <PipelineRunPanel
        state={state}
        nodeLabels={{
          "node-load": "Load CSV",
          "node-model": "Random Forest",
        }}
        onReset={jest.fn()}
      />
    )

    const loadCsvTrigger = screen.getByRole("button", { name: /Load CSV/i })
    expect(loadCsvTrigger).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(loadCsvTrigger)

    expect(loadCsvTrigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Loading dataset")).toBeVisible()
    expect(screen.getByText("Dataset loaded")).toBeVisible()
    expect(
      screen.getByRole("button", { name: /Random Forest/i })
    ).toHaveAttribute("aria-expanded", "false")
  })

  it("formats artifact metadata with a correctly encoded separator", () => {
    expect(
      formatArtifactMetadata({
        artifactType: "model",
        mimeType: "application/octet-stream",
      })
    ).toBe("model \u00b7 application/octet-stream")
  })

  it("renders an artifact download link through the authenticated BFF", () => {
    const artifactId = "9b19531e-8656-463d-97a7-0bc438c22ca0"

    render(
      <ArtifactsView
        artifacts={[
          {
            id: artifactId,
            name: "model.joblib",
            artifactType: "model",
            mimeType: "application/octet-stream",
            storageUri: "runs/run-1/artifacts/model.joblib",
          },
        ]}
      />
    )

    expect(
      screen.getByRole("link", { name: "Download model.joblib" })
    ).toHaveAttribute("href", `/api/artifacts/${artifactId}/download`)
  })
})

describe("PipelineRunPanel branch filters", () => {
  const logs = [
    {
      id: "run-1",
      timestamp: "2026-08-11T12:00:00.000Z",
      level: "info" as const,
      message: "Run started",
    },
    {
      id: "shared-1",
      timestamp: "2026-08-11T12:00:01.000Z",
      level: "info" as const,
      message: "Loading dataset",
      nodeId: "node-load",
    },
    {
      id: "rf-1",
      timestamp: "2026-08-11T12:00:02.000Z",
      level: "info" as const,
      message: "Training RF",
      nodeId: "node-rf",
    },
    {
      id: "lg-1",
      timestamp: "2026-08-11T12:00:03.000Z",
      level: "info" as const,
      message: "Training LogReg",
      nodeId: "node-logreg",
    },
  ]

  it("keeps branch node logs and run-level events, drops other nodes", () => {
    const filtered = filterLogsByNodes(logs, ["node-load", "node-rf"])

    expect(filtered.map((log) => log.message)).toEqual([
      "Run started",
      "Loading dataset",
      "Training RF",
    ])
  })

  it("keeps only artifacts attributed to branch nodes", () => {
    const artifacts = [
      { id: "a1", name: "rf-model.joblib", nodeId: "node-rf" },
      { id: "a2", name: "lg-model.joblib", nodeId: "node-logreg" },
      { id: "a3", name: "unattributed.bin" },
    ]

    const filtered = filterArtifactsByNodes(artifacts, ["node-rf"])

    expect(filtered.map((artifact) => artifact.id)).toEqual(["a1"])
  })

  it("keeps only metrics of branch nodes", () => {
    const nodeMetrics = {
      "node-rf": { values: { accuracy: 0.9 } },
      "node-logreg": { values: { accuracy: 0.8 } },
    }

    const filtered = filterNodeMetrics(nodeMetrics, ["node-logreg"])

    expect(Object.keys(filtered)).toEqual(["node-logreg"])
  })
})

describe("PipelineRunPanel branch navigation", () => {
  const state: PipelineRunState = {
    ...createInitialRunState(),
    runId: "run-123",
    status: "running",
    nodeStatuses: {
      "node-load": "success",
      "node-rf": "running",
      "node-logreg": "success",
    },
    logs: [
      {
        id: "run-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        level: "info" as const,
        message: "Run started",
      },
      {
        id: "rf-1",
        timestamp: "2026-08-11T12:00:02.000Z",
        level: "info" as const,
        message: "Training RF",
        nodeId: "node-rf",
      },
      {
        id: "lg-1",
        timestamp: "2026-08-11T12:00:03.000Z",
        level: "info" as const,
        message: "Training LogReg",
        nodeId: "node-logreg",
      },
    ],
    artifacts: [
      { id: "a1", name: "rf-model.joblib", nodeId: "node-rf" },
      { id: "a2", name: "lg-model.joblib", nodeId: "node-logreg" },
    ],
  }

  const branches: Branch[] = [
    {
      id: "split:rf",
      label: "Random Forest",
      nodeIds: ["node-load", "node-rf"],
      orderedExclusiveIds: ["node-rf"],
    },
    {
      id: "split:logreg",
      label: "Logistic Regression",
      nodeIds: ["node-load", "node-logreg"],
      orderedExclusiveIds: ["node-logreg"],
    },
  ]

  it("renders the branch list when the run has multiple branches", () => {
    render(
      <PipelineRunPanel
        state={state}
        branches={branches}
        onReset={jest.fn()}
      />
    )

    expect(
      screen.getByRole("button", { name: /Random Forest/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Logistic Regression/i })
    ).toBeInTheDocument()
  })

  it("shows only the selected branch logs and artifacts", () => {
    render(
      <PipelineRunPanel
        state={state}
        branches={branches}
        nodeLabels={{
          "node-rf": "Random Forest",
          "node-logreg": "Logistic Regression",
          "node-load": "Load CSV",
        }}
        onReset={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Random Forest/i }))

    expect(screen.getByRole("button", { name: /Pipeline/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Random Forest/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Logistic Regression/i })
    ).not.toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Artifacts/i }))

    expect(screen.getByText("rf-model.joblib")).toBeVisible()
    expect(screen.queryByText("lg-model.joblib")).not.toBeInTheDocument()
  })

  it("navigates back to the branch list from a branch detail", () => {
    render(
      <PipelineRunPanel
        state={state}
        branches={branches}
        onReset={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Random Forest/i }))
    fireEvent.click(screen.getByRole("button", { name: /Back/i }))

    expect(
      screen.getByRole("button", { name: /Logistic Regression/i })
    ).toBeInTheDocument()
  })

  it("shows the detail view directly for a single branch", () => {
    render(
      <PipelineRunPanel
        state={state}
        branches={[branches[0]]}
        nodeLabels={{
          "node-rf": "Random Forest",
          "node-logreg": "Logistic Regression",
          "node-load": "Load CSV",
        }}
        onReset={jest.fn()}
      />
    )

    expect(
      screen.queryByRole("button", { name: /Back/i })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Random Forest/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Logistic Regression/i })
    ).not.toBeInTheDocument()
  })

  it("shows an empty state before the graph has run", () => {
    render(
      <PipelineRunPanel
        state={createInitialRunState()}
        branches={branches}
        onReset={jest.fn()}
      />
    )

    expect(screen.getByText("No active execution")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: /Random Forest/i })
    ).not.toBeInTheDocument()
  })
})
