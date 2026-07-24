import { createInitialRunState, pipelineRunReducer } from "../run-reducer"
import {
  isTerminalRunEvent,
  type PipelineRunEvent,
  type RunEventType,
} from "../run-types"

const timestamp = "2026-07-24T00:00:00.000Z"

function event(
  type: RunEventType,
  overrides: Partial<PipelineRunEvent> = {}
): PipelineRunEvent {
  return {
    type,
    runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
    timestamp,
    ...overrides,
  } as PipelineRunEvent
}

describe("pipelineRunReducer", () => {
  it("tracks node lifecycle, metrics, artifacts and completion", () => {
    let state = pipelineRunReducer(createInitialRunState(), {
      type: "accepted",
      runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
      nodeIds: ["load", "evaluate"],
    })

    state = pipelineRunReducer(state, {
      type: "event",
      event: event("run.started", { eventId: "1-0" }),
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("node.started", {
        eventId: "2-0",
        nodeId: "evaluate",
      }),
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("node.completed", {
        eventId: "3-0",
        nodeId: "evaluate",
        payload: {
          executorKey: "evaluate",
          durationMs: 11,
          summary: {
            type: "metrics",
            metrics: { accuracy: 0.9667, f1: 0.9659 },
            confusionMatrix: {
              labels: ["setosa", "versicolor", "virginica"],
              matrix: [
                [10, 0, 0],
                [0, 9, 1],
                [0, 0, 10],
              ],
            },
          },
        },
      }),
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("artifact.created", {
        eventId: "4-0",
        payload: {
          artifact: {
            id: "artifact-1",
            name: "metrics.json",
            artifactType: "metric",
          },
        },
      }),
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("run.completed", {
        eventId: "5-0",
        payload: { durationMs: 50, nodeCount: 2 },
      }),
    })

    expect(state.status).toBe("completed")
    expect(state.nodeStatuses).toEqual({
      load: "success",
      evaluate: "success",
    })
    expect(state.metrics?.values.accuracy).toBeCloseTo(0.9667)
    expect(state.metrics?.confusionMatrix?.matrix).toHaveLength(3)
    expect(state.artifacts[0]?.name).toBe("metrics.json")
    expect(state.lastEventId).toBe("5-0")
  })

  it("deduplicates replayed events and skips pending nodes after failure", () => {
    let state = pipelineRunReducer(createInitialRunState(), {
      type: "accepted",
      runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
      nodeIds: ["train", "evaluate"],
    })
    const failed = event("node.failed", {
      eventId: "10-0",
      nodeId: "train",
      payload: { error: "bad training data" },
    })
    state = pipelineRunReducer(state, { type: "event", event: failed })
    state = pipelineRunReducer(state, { type: "event", event: failed })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("run.failed", {
        eventId: "11-0",
        payload: { failedNodeId: "train", error: "bad training data" },
      }),
    })

    expect(state.logs.filter((log) => log.id === "10-0")).toHaveLength(1)
    expect(state.nodeStatuses).toEqual({
      train: "error",
      evaluate: "skipped",
    })
    expect(state.error).toBe("bad training data")
  })

  it("synchronizes run and node statuses from a snapshot", () => {
    const state = pipelineRunReducer(
      pipelineRunReducer(createInitialRunState(), {
        type: "restore",
        runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
        nodeIds: ["load", "train"],
      }),
      {
        type: "event",
        event: event("run.snapshot", {
          eventId: "20-0",
          payload: {
            status: "running",
            nodeExecutions: [
              { nodeId: "load", status: "completed" },
              {
                nodeId: "train",
                status: "running",
                outputSummary: {
                  type: "metrics",
                  metrics: { accuracy: 0.95 },
                },
              },
            ],
            artifacts: [],
          },
        }),
      }
    )

    expect(state.status).toBe("running")
    expect(state.nodeStatuses).toEqual({
      load: "success",
      train: "running",
    })
    expect(state.metrics?.values.accuracy).toBe(0.95)
  })

  it("upserts an artifact replayed after it was included in the snapshot", () => {
    let state = pipelineRunReducer(createInitialRunState(), {
      type: "accepted",
      runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
      nodeIds: ["evaluate"],
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("run.snapshot", {
        payload: {
          status: "running",
          nodeExecutions: [],
          artifacts: [
            {
              id: "artifact-1",
              name: "metrics.json",
              artifactType: "metric",
            },
          ],
        },
      }),
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("artifact.created", {
        eventId: "30-0",
        payload: {
          artifact: {
            id: "artifact-1",
            name: "metrics.json",
            artifactType: "metric",
            storageUri: "runs/run-1/metrics.json",
          },
        },
      }),
    })

    expect(state.artifacts).toHaveLength(1)
    expect(state.artifacts[0]).toMatchObject({
      id: "artifact-1",
      storageUri: "runs/run-1/metrics.json",
    })
  })

  it("does not let a replayed queued event downgrade a running run", () => {
    let state = pipelineRunReducer(createInitialRunState(), {
      type: "accepted",
      runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
      nodeIds: ["train"],
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("run.started", { eventId: "41-0" }),
    })
    state = pipelineRunReducer(state, {
      type: "event",
      event: event("run.queued", { eventId: "40-0" }),
    })

    expect(state.status).toBe("running")
  })

  it.each([
    ["completed", "completed"],
    ["failed", "failed"],
    ["cancelled", "failed"],
  ] as const)(
    "does not let lifecycle replay downgrade a %s snapshot",
    (snapshotStatus, expectedStatus) => {
      let state = pipelineRunReducer(createInitialRunState(), {
        type: "restore",
        runId: "02b4cc08-2bf7-4d17-b154-0d8ecead3914",
        nodeIds: ["train"],
      })
      state = pipelineRunReducer(state, {
        type: "event",
        event: event("run.snapshot", {
          payload: {
            status: snapshotStatus,
            nodeExecutions: [],
            artifacts: [],
          },
        }),
      })
      state = pipelineRunReducer(state, {
        type: "event",
        event: event("run.queued", { eventId: "50-0" }),
      })
      state = pipelineRunReducer(state, {
        type: "event",
        event: event("run.started", { eventId: "51-0" }),
      })

      expect(state.status).toBe(expectedStatus)
    }
  )
})

describe("isTerminalRunEvent", () => {
  it.each(["completed", "failed", "cancelled"])(
    "treats a %s snapshot as terminal",
    (status) => {
      expect(
        isTerminalRunEvent(
          event("run.snapshot", {
            payload: { status },
          })
        )
      ).toBe(true)
    }
  )

  it("does not stop following a running snapshot", () => {
    expect(
      isTerminalRunEvent(
        event("run.snapshot", {
          payload: { status: "running" },
        })
      )
    ).toBe(false)
  })

  it("still recognizes explicit terminal events", () => {
    expect(isTerminalRunEvent(event("run.completed"))).toBe(true)
    expect(isTerminalRunEvent(event("run.failed"))).toBe(true)
  })
})
