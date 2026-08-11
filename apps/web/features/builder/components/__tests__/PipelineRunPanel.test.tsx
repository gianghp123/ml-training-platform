/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { createInitialRunState } from "../../runtime/run-reducer"
import {
  formatArtifactMetadata,
  groupPipelineLogs,
  PipelineRunPanel,
} from "../PipelineRunPanel"

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
})
