"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { RotateCcw, TerminalSquare } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type {
  PipelineLogEntry,
  PipelineMetrics,
  PipelineRunState,
  RunStatus,
} from "../runtime/run-types"

interface PipelineRunPanelProps {
  state: PipelineRunState
  onReset: () => void
}

function statusVariant(status: RunStatus) {
  if (status === "completed") return "success" as const
  if (status === "failed") return "destructive" as const
  if (status === "running") return "info" as const
  if (status === "pending" || status === "submitting") return "warning" as const
  return "outline" as const
}

function logColor(level: PipelineLogEntry["level"]): string {
  if (level === "error") return "text-destructive"
  if (level === "warning") return "text-warning"
  if (level === "debug") return "text-muted-foreground"
  return "text-foreground"
}

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

function MetricsView({ metrics }: { metrics: PipelineMetrics | null }) {
  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
        Evaluation metrics will appear when the Evaluation block completes.
      </div>
    )
  }

  return (
    <div className="space-y-5 overflow-auto p-4">
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(metrics.values).map(([name, value]) => (
          <div key={name} className="rounded-md border bg-muted/30 p-3">
            <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {name}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold">
              {formatMetric(value)}
            </div>
          </div>
        ))}
      </div>

      {metrics.confusionMatrix && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium">Confusion matrix</h3>
          <div className="overflow-auto rounded-md border">
            <table className="w-full border-collapse text-center font-mono text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border-r border-b p-2 text-left text-[10px] text-muted-foreground">
                    actual \ predicted
                  </th>
                  {metrics.confusionMatrix.labels.map((label, index) => (
                    <th key={`${label}-${index}`} className="border-b p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.confusionMatrix.matrix.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th className="border-r bg-muted/30 p-2 text-left">
                      {metrics.confusionMatrix?.labels[rowIndex] ?? rowIndex}
                    </th>
                    {row.map((value, columnIndex) => (
                      <td
                        key={columnIndex}
                        className={cn(
                          "p-2",
                          rowIndex === columnIndex &&
                            "bg-success/10 font-semibold"
                        )}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LogsView({ logs }: { logs: PipelineLogEntry[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)

  useEffect(() => {
    if (!stickToBottom) return
    const viewport = viewportRef.current
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [logs, stickToBottom])

  return (
    <div
      ref={viewportRef}
      className="h-full overflow-auto bg-zinc-950 p-3 font-mono text-[11px]"
      onScroll={(event) => {
        const target = event.currentTarget
        const remaining =
          target.scrollHeight - target.scrollTop - target.clientHeight
        setStickToBottom(remaining < 24)
      }}
    >
      {logs.length === 0 ? (
        <div className="text-zinc-500">
          Run the graph to stream worker logs here.
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="mb-1 grid grid-cols-[68px_1fr] gap-2">
            <span className="text-zinc-500">
              {new Date(log.timestamp).toLocaleTimeString([], {
                hour12: false,
              })}
            </span>
            <span className={logColor(log.level)}>
              {log.nodeId && (
                <span className="mr-1 text-info">[{log.nodeId}]</span>
              )}
              {log.message}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

export function PipelineRunPanel({ state, onReset }: PipelineRunPanelProps) {
  const hasFinished = state.status === "completed" || state.status === "failed"

  return (
    <aside className="flex h-full w-[390px] max-w-[42vw] shrink-0 flex-col border-l bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <TerminalSquare className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Execution</span>
        <Badge
          variant={statusVariant(state.status)}
          className="ml-auto capitalize"
        >
          {state.status.replace("_", " ")}
        </Badge>
        {hasFinished && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onReset}
            title="Clear execution result"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between border-b px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="truncate font-mono">
          {state.runId ?? "No active run"}
        </span>
        <span className="ml-2 shrink-0 capitalize">
          stream: {state.connectionStatus}
        </span>
      </div>

      {state.error && (
        <div className="border-b border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </div>
      )}

      <Tabs defaultValue="logs" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="mx-3 shrink-0">
          <TabsTrigger value="logs">Logs ({state.logs.length})</TabsTrigger>
          <TabsTrigger value="metrics">
            Metrics ({Object.keys(state.metrics?.values ?? {}).length})
          </TabsTrigger>
          <TabsTrigger value="artifacts">
            Artifacts ({state.artifacts.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="min-h-0">
          <LogsView logs={state.logs} />
        </TabsContent>
        <TabsContent value="metrics" className="min-h-0 overflow-hidden">
          <MetricsView metrics={state.metrics} />
        </TabsContent>
        <TabsContent value="artifacts" className="min-h-0 overflow-auto p-3">
          {state.artifacts.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No artifacts have been created.
            </div>
          ) : (
            <div className="space-y-2">
              {state.artifacts.map((artifact, index) => (
                <div
                  key={artifact.id ?? `${artifact.name}-${index}`}
                  className="rounded-md border p-3 text-xs"
                >
                  <div className="font-medium">
                    {artifact.name ?? `Artifact ${index + 1}`}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {artifact.artifactType ?? "unknown type"}
                    {artifact.mimeType ? ` · ${artifact.mimeType}` : ""}
                  </div>
                  {artifact.storageUri && (
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                      {artifact.storageUri}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
