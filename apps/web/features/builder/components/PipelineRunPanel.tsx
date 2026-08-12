"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Download,
  ListChecks,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  TerminalSquare,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  NodeRunStatus,
  PipelineLogEntry,
  PipelineMetrics,
  PipelineRunState,
  RunArtifact,
  RunStatus,
} from "../runtime/run-types"
import type { Branch } from "../utils/branch-graph"

interface PipelineRunPanelProps {
  state: PipelineRunState
  nodeLabels?: Record<string, string>
  branches?: Branch[]
  onReset: () => void
}

function statusDotClass(status: RunStatus): string {
  if (status === "completed") return "bg-success"
  if (status === "failed") return "bg-destructive"
  if (status === "running") return "bg-info animate-pulse"
  if (status === "pending" || status === "submitting") return "bg-warning"
  return "bg-muted-foreground/40"
}

function logColor(level: PipelineLogEntry["level"]): string {
  if (level === "error") return "text-destructive"
  if (level === "warning") return "text-warning"
  if (level === "debug") return "text-muted-foreground"
  return "text-warning"
}

export function formatArtifactMetadata(artifact: RunArtifact): string {
  const artifactType = artifact.artifactType ?? "unknown type"
  return artifact.mimeType
    ? `${artifactType} \u00b7 ${artifact.mimeType}`
    : artifactType
}

export function filterLogsByNodes(
  logs: PipelineLogEntry[],
  nodeIds: string[]
): PipelineLogEntry[] {
  const nodeSet = new Set(nodeIds)
  return logs.filter((log) => !log.nodeId || nodeSet.has(log.nodeId))
}

export function filterArtifactsByNodes(
  artifacts: RunArtifact[],
  nodeIds: string[]
): RunArtifact[] {
  const nodeSet = new Set(nodeIds)
  return artifacts.filter(
    (artifact) => artifact.nodeId !== undefined && nodeSet.has(artifact.nodeId)
  )
}

export function filterNodeMetrics(
  nodeMetrics: Record<string, PipelineMetrics>,
  nodeIds: string[]
): Record<string, PipelineMetrics> {
  const nodeSet = new Set(nodeIds)
  return Object.fromEntries(
    Object.entries(nodeMetrics).filter(([nodeId]) => nodeSet.has(nodeId))
  )
}

export function ArtifactsView({ artifacts }: { artifacts: RunArtifact[] }) {
  if (artifacts.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        No artifacts have been created.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-lg border">
      {artifacts.map((artifact, index) => {
        const artifactName = artifact.name ?? `Artifact ${index + 1}`

        return (
          <div
            key={artifact.id ?? `${artifactName}-${index}`}
            className="group flex items-center gap-2 px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium" title={artifactName}>
                {artifactName}
              </div>
              <div
                className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
                title={artifact.storageUri}
              >
                {formatArtifactMetadata(artifact)}
                {artifact.storageUri ? ` \u00b7 ${artifact.storageUri}` : ""}
              </div>
            </div>
            {artifact.id && (
              <Button
                asChild
                variant="ghost"
                size="icon-xs"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <a
                  href={`/api/artifacts/${encodeURIComponent(artifact.id)}/download`}
                  download={artifactName}
                  aria-label={`Download ${artifactName}`}
                  title={`Download ${artifactName}`}
                >
                  <Download className="size-3.5" />
                </a>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

function isRateMetric(name: string): boolean {
  return /(accuracy|precision|recall|f1|auc|score|rate|specificity|sensitivity)/i.test(
    name
  )
}

function formatMetricValue(name: string, value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (isRateMetric(name) && value >= 0 && value <= 1) {
    return (value * 100).toFixed(1) + "%"
  }
  return formatMetric(value)
}

function metricLabel(name: string): string {
  return name.replace(/[_-]+/g, " ")
}

function metricProgress(name: string, value: number): number | null {
  if (!isRateMetric(name) || value < 0 || value > 1) return null
  return Math.round(value * 100)
}

function MetricsView({
  metrics,
  nodeMetrics = {},
}: {
  metrics: PipelineMetrics | null
  nodeMetrics?: Record<string, PipelineMetrics>
}) {
  const nodeEntries = Object.entries(nodeMetrics)
  if (nodeEntries.length === 0 && !metrics) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
          <ChartNoAxesCombined className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">No metrics yet</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Run the graph to see model performance and evaluation details.
          </p>
        </div>
      </div>
    )
  }

  const listToRender: Array<[string, PipelineMetrics]> =
    nodeEntries.length > 0 ? nodeEntries : [["Evaluation summary", metrics!]]

  return (
    <div className="h-full space-y-4 overflow-auto p-3">
      {listToRender.map(([nodeId, itemMetrics]) => (
        <section key={nodeId} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h3 className="truncate font-heading text-xs font-semibold">
              {nodeId}
            </h3>
            <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
              {Object.keys(itemMetrics.values).length} metrics
            </span>
          </div>

          <div className="divide-y divide-border rounded-lg border">
            {Object.entries(itemMetrics.values).map(([name, value]) => {
              const progress = metricProgress(name, value)
              const isGood = progress !== null && progress >= 80

              return (
                <div
                  key={name}
                  className="flex items-center gap-3 px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                    {metricLabel(name)}
                  </span>
                  {progress !== null && (
                    <span className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded-full bg-primary transition-all",
                          isGood && "bg-success"
                        )}
                        style={{ width: progress + "%" }}
                      />
                    </span>
                  )}
                  <span
                    className={cn(
                      "w-16 shrink-0 text-right font-mono text-xs font-semibold tabular-nums",
                      isGood ? "text-success" : "text-foreground"
                    )}
                  >
                    {formatMetricValue(name, value)}
                  </span>
                </div>
              )
            })}
          </div>

          {itemMetrics.confusionMatrix && (
            <ConfusionMatrixView result={itemMetrics.confusionMatrix} />
          )}
        </section>
      ))}
    </div>
  )
}

function formatPercent(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : value.toFixed(1) + "%"
}

function ConfusionMatrixView({
  result,
}: {
  result: NonNullable<PipelineMetrics["confusionMatrix"]>
}) {
  const [viewMode, setViewMode] = useState<"count" | "rowPercent">("count")
  const [copied, setCopied] = useState(false)
  const rowTotals = result.matrix.map((row) =>
    row.reduce((sum, value) => sum + value, 0)
  )
  const columnTotals = result.labels.map((_, columnIndex) =>
    result.matrix.reduce((sum, row) => sum + (row[columnIndex] ?? 0), 0)
  )
  const total = rowTotals.reduce((sum, value) => sum + value, 0)
  const correct = result.matrix.reduce(
    (sum, row, index) => sum + (row[index] ?? 0),
    0
  )
  const accuracy = total > 0 ? (correct / total) * 100 : null
  const maxValue = Math.max(1, ...result.matrix.flat())

  const classStats = result.labels.map((label, index) => {
    const truePositive = result.matrix[index]?.[index] ?? 0
    const precision =
      columnTotals[index] > 0
        ? (truePositive / columnTotals[index]) * 100
        : null
    const recall =
      rowTotals[index] > 0 ? (truePositive / rowTotals[index]) * 100 : null
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null

    return { label, precision, recall, f1 }
  })

  const copyMatrix = async () => {
    const csv = [
      ["Actual / Predicted", ...result.labels, "Total"].join(","),
      ...result.matrix.map((row, rowIndex) =>
        [
          result.labels[rowIndex] ?? rowIndex,
          ...row,
          rowTotals[rowIndex] ?? 0,
        ].join(",")
      ),
      ["Total", ...columnTotals, total].join(","),
    ].join("\n")

    try {
      await navigator.clipboard.writeText(csv)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <ChartNoAxesCombined className="size-3.5 text-primary" />
            <h4 className="text-xs font-semibold">Confusion matrix</h4>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Actual classes compared with predicted classes
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
            <span className="text-[11px] text-muted-foreground">accuracy</span>
            <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-success"
                style={{
                  width:
                    accuracy !== null ? Math.round(accuracy) + "%" : "0%",
                }}
              />
            </span>
            <span className="w-14 text-right font-mono text-xs font-semibold tabular-nums text-success">
              {formatPercent(accuracy)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={copyMatrix}
            title="Copy matrix as CSV"
            aria-label="Copy confusion matrix as CSV"
          >
            {copied ? (
              <ClipboardCheck className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
          <Button
            type="button"
            size="xs"
            variant={viewMode === "count" ? "secondary" : "ghost"}
            onClick={() => setViewMode("count")}
            className="h-6 px-2 text-[10px]"
          >
            Count
          </Button>
          <Button
            type="button"
            size="xs"
            variant={viewMode === "rowPercent" ? "secondary" : "ghost"}
            onClick={() => setViewMode("rowPercent")}
            className="h-6 px-2 text-[10px]"
          >
            Row %
          </Button>
        </div>
        <span className="text-[9px] text-muted-foreground">
          {total} samples · diagonal = correct
        </span>
      </div>

      <div className="overflow-auto rounded-lg border bg-muted/15">
        <table className="w-full min-w-[300px] border-collapse text-center font-mono text-[10px]">
          <caption className="sr-only">
            Confusion matrix with actual rows and predicted columns
          </caption>
          <thead>
            <tr>
              <th className="border-r border-b p-2 text-left text-[9px] font-medium text-muted-foreground">
                Actual \ Predicted
              </th>
              {result.labels.map((label, index) => (
                <th
                  key={String(label) + "-" + index}
                  className="border-b p-2 font-semibold text-muted-foreground"
                >
                  {label}
                </th>
              ))}
              <th className="border-b p-2 font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {result.matrix.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th className="border-r p-2 text-left font-semibold text-muted-foreground">
                  {result.labels[rowIndex] ?? rowIndex}
                </th>
                {row.map((value, columnIndex) => {
                  const rowTotal = rowTotals[rowIndex] ?? 0
                  const displayValue =
                    viewMode === "rowPercent"
                      ? rowTotal > 0
                        ? (value / rowTotal) * 100
                        : 0
                      : value
                  const intensity =
                    viewMode === "rowPercent"
                      ? displayValue / 100
                      : displayValue / maxValue
                  const diagonal = rowIndex === columnIndex

                  return (
                    <td
                      key={columnIndex}
                      title={
                        String(result.labels[rowIndex] ?? rowIndex) +
                        " predicted as " +
                        String(result.labels[columnIndex] ?? columnIndex) +
                        ": " +
                        value
                      }
                      className={cn(
                        "border-t border-l p-2 font-semibold tabular-nums",
                        diagonal &&
                          "text-success ring-1 ring-success/25 ring-inset"
                      )}
                      style={{
                        backgroundColor: diagonal
                          ? "rgba(16, 185, 129, " +
                            (0.08 + intensity * 0.38) +
                            ")"
                          : "rgba(37, 99, 235, " +
                            (0.04 + intensity * 0.34) +
                            ")",
                      }}
                    >
                      {viewMode === "rowPercent"
                        ? displayValue.toFixed(1) + "%"
                        : value}
                    </td>
                  )
                })}
                <td className="border-t border-l bg-muted/25 p-2 font-semibold tabular-nums">
                  {viewMode === "rowPercent"
                    ? "100%"
                    : (rowTotals[rowIndex] ?? 0)}
                </td>
              </tr>
            ))}
            <tr>
              <th className="border-t border-r bg-muted/30 p-2 text-left font-semibold text-muted-foreground">
                Total
              </th>
              {columnTotals.map((value, index) => (
                <td
                  key={index}
                  className="border-t border-l bg-muted/25 p-2 font-semibold tabular-nums"
                >
                  {value}
                </td>
              ))}
              <td className="border-t border-l bg-muted/35 p-2 font-semibold tabular-nums">
                {total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-success/45" /> Correct
          predictions
        </span>
        <span>Darker = more samples</span>
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-1.5">
          <ListChecks className="size-3.5 text-primary" />
          <h4 className="text-xs font-semibold">Class quality</h4>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[300px] text-left text-[10px]">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-medium">Class</th>
                <th className="px-2 py-1.5 text-right font-medium">
                  Precision
                </th>
                <th className="px-2 py-1.5 text-right font-medium">Recall</th>
                <th className="px-2 py-1.5 text-right font-medium">F1</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map((item, index) => (
                <tr key={String(item.label) + "-" + index} className="border-t">
                  <th className="px-2 py-1.5 font-medium">{item.label}</th>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {formatPercent(item.precision)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {formatPercent(item.recall)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-mono font-semibold",
                      item.f1 !== null && item.f1 >= 80
                        ? "text-success"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatPercent(item.f1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface PipelineLogGroup {
  id: string
  label: string
  nodeId?: string
  logs: PipelineLogEntry[]
}

const PIPELINE_LOG_GROUP_ID = "__pipeline__"

export function groupPipelineLogs(
  logs: PipelineLogEntry[],
  nodeLabels: Record<string, string> = {}
): PipelineLogGroup[] {
  const groups = new Map<string, PipelineLogGroup>()

  for (const log of logs) {
    const id = log.nodeId ?? PIPELINE_LOG_GROUP_ID
    const existing = groups.get(id)
    if (existing) {
      existing.logs.push(log)
      continue
    }

    groups.set(id, {
      id,
      label: log.nodeId
        ? (nodeLabels[log.nodeId] ?? "Unknown block")
        : "Pipeline",
      nodeId: log.nodeId,
      logs: [log],
    })
  }

  return Array.from(groups.values())
}

function compactNodeId(nodeId: string): string {
  if (nodeId.length <= 28) return nodeId
  return `${nodeId.slice(0, 15)}…${nodeId.slice(-8)}`
}

function LogsView({
  logs,
  nodeLabels,
}: {
  logs: PipelineLogEntry[]
  nodeLabels?: Record<string, string>
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const groups = useMemo(
    () => groupPipelineLogs(logs, nodeLabels),
    [logs, nodeLabels]
  )

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
        <AccordionPrimitive.Root type="multiple" className="space-y-1">
          {groups.map((group) => (
            <AccordionPrimitive.Item
              key={group.id}
              value={group.id}
              className="rounded-lg"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-zinc-100">
                      {group.label}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-[9px] text-zinc-500"
                      title={group.nodeId}
                    >
                      {group.nodeId
                        ? compactNodeId(group.nodeId)
                        : "Run-level events"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-zinc-500 tabular-nums">
                    {group.logs.length}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 text-zinc-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden border-t border-zinc-800/80 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="space-y-1 px-2 py-2">
                  {group.logs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[62px_minmax(0,1fr)] gap-2"
                    >
                      <span className="text-zinc-600 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false,
                        })}
                      </span>
                      <span
                        className={cn(
                          "break-words whitespace-pre-wrap",
                          logColor(log.level)
                        )}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      )}
    </div>
  )
}

function RunOverview({
  state,
  logsCount,
  artifactsCount,
}: {
  state: PipelineRunState
  logsCount?: number
  artifactsCount?: number
}) {
  const nodeStatuses = Object.values(state.nodeStatuses)
  const settledNodes = nodeStatuses.filter((status) =>
    ["success", "error", "skipped"].includes(status)
  ).length
  const activeNodes = nodeStatuses.filter((status) =>
    ["queued", "running"].includes(status)
  ).length
  const progress =
    nodeStatuses.length > 0
      ? Math.round((settledNodes / nodeStatuses.length) * 100)
      : 0

  return (
    <div className="space-y-2 border-b px-3 py-2.5">
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all",
            state.status === "failed" && "bg-destructive",
            state.status === "completed" && "bg-success"
          )}
          style={{ width: progress + "%" }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] text-muted-foreground">
        <span className="min-w-0">
          <span className="font-semibold text-foreground">
            {settledNodes}/{nodeStatuses.length || 0}
          </span>{" "}
          nodes settled
        </span>
        <span className="shrink-0">{activeNodes} active</span>
        <span className="shrink-0 text-right">
          {logsCount ?? state.logs.length} logs ·{" "}
          {artifactsCount ?? state.artifacts.length} artifacts
        </span>
      </div>
    </div>
  )
}

function branchRunStatus(
  nodeStatuses: Record<string, NodeRunStatus>,
  nodeIds: string[]
): RunStatus {
  const statuses = nodeIds
    .map((nodeId) => nodeStatuses[nodeId])
    .filter((status): status is NodeRunStatus => status !== undefined)
  if (statuses.some((status) => status === "error")) return "failed"
  if (statuses.some((status) => status === "running")) return "running"
  if (statuses.some((status) => status === "queued")) return "pending"
  if (statuses.length > 0 && statuses.every((status) => status === "success" || status === "skipped")) {
    return "completed"
  }
  return "pending"
}

function BranchList({
  state,
  branches,
  onSelect,
}: {
  state: PipelineRunState
  branches: Branch[]
  onSelect: (branchId: string) => void
}) {
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
      {branches.map((branch) => {
        const nodeSet = new Set(branch.nodeIds)
        const statuses = branch.nodeIds.map(
          (nodeId) => state.nodeStatuses[nodeId]
        )
        const settled = statuses.filter((status) =>
          ["success", "error", "skipped"].includes(status ?? "")
        ).length
        const artifactCount = state.artifacts.filter(
          (artifact) =>
            artifact.nodeId !== undefined && nodeSet.has(artifact.nodeId)
        ).length
        const status = branchRunStatus(state.nodeStatuses, branch.nodeIds)

        return (
          <button
            key={branch.id}
            type="button"
            onClick={() => onSelect(branch.id)}
            className="block w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {branch.label}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 capitalize text-[10px] text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    statusDotClass(status)
                  )}
                />
                {status}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>
                <span className="text-foreground">
                  {settled}/{branch.nodeIds.length}
                </span>{" "}
                nodes settled
              </span>
              <span>{artifactCount} artifacts</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function PipelineRunPanel({
  state,
  nodeLabels,
  branches = [],
  onReset,
}: PipelineRunPanelProps) {
  const hasFinished = state.status === "completed" || state.status === "failed"
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const [selection, setSelection] = useState<{
    runId: string | null
    branchId: string | null
  }>({ runId: null, branchId: null })

  const selectedBranch =
    selection.runId === state.runId
      ? (branches.find((branch) => branch.id === selection.branchId) ?? null)
      : null
  const effectiveBranch =
    branches.length === 1 ? branches[0] : selectedBranch
  const isEmpty =
    state.status === "idle" &&
    state.logs.length === 0 &&
    state.artifacts.length === 0
  const showList = branches.length > 1 && !effectiveBranch && !isEmpty

  const filteredLogs = effectiveBranch
    ? filterLogsByNodes(state.logs, effectiveBranch.nodeIds)
    : state.logs
  const filteredArtifacts = effectiveBranch
    ? filterArtifactsByNodes(state.artifacts, effectiveBranch.nodeIds)
    : state.artifacts
  const filteredNodeMetrics = effectiveBranch
    ? filterNodeMetrics(state.nodeMetrics ?? {}, effectiveBranch.nodeIds)
    : state.nodeMetrics

  const handleSelectBranch = (branchId: string) => {
    setSelection({ runId: state.runId, branchId })
  }

  const branchError = effectiveBranch
    ? (filteredLogs.find(
        (log) => log.level === "error" && log.nodeId !== undefined
      )?.message ?? null)
    : state.error

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center border-l bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(false)}
          title="Expand execution panel"
          aria-label="Expand execution panel"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-l bg-background",
        isWide ? "w-[560px] max-w-[64vw]" : "w-[390px] max-w-[42vw]"
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {effectiveBranch && showList === false && branches.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelection({ runId: null, branchId: null })}
            title="Back to branch list"
            aria-label="Back to branch list"
          >
            <ArrowLeft className="size-3.5" />
          </Button>
        )}
        <span className="font-heading text-sm font-semibold">Execution</span>
        {effectiveBranch && (
          <span
            className="truncate text-xs text-muted-foreground"
            title={effectiveBranch.label}
          >
            {effectiveBranch.label}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <span
            className={cn("size-1.5 rounded-full", statusDotClass(state.status))}
          />
          <span className="text-xs capitalize text-muted-foreground">
            {state.status.replace("_", " ")}
          </span>
        </span>
        {hasFinished && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onReset}
            title="Clear execution result"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsWide((wide) => !wide)}
          title={isWide ? "Shrink panel" : "Expand panel"}
          aria-label={isWide ? "Shrink panel" : "Expand panel"}
        >
          {isWide ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(true)}
          title="Collapse execution panel"
          aria-label="Collapse execution panel"
        >
          <PanelRightClose className="size-3.5" />
        </Button>
      </div>

      {showList ? (
        <BranchList
          state={state}
          branches={branches}
          onSelect={handleSelectBranch}
        />
      ) : isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
            <TerminalSquare className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">No active execution</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Run the graph to see branch execution results here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <RunOverview
            state={state}
            logsCount={filteredLogs.length}
            artifactsCount={filteredArtifacts.length}
          />

          <div className="flex items-center justify-between border-b px-3 py-1.5 text-[10px] text-muted-foreground">
            <span className="truncate font-mono">
              {state.runId ?? "No active run"}
            </span>
            <span className="ml-2 shrink-0 capitalize">
              stream: {state.connectionStatus}
            </span>
          </div>

          {branchError && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {branchError}
            </div>
          )}

          <Tabs defaultValue="logs" className="min-h-0 flex-1 gap-0">
            <TabsList variant="line" className="mx-3 shrink-0">
              <TabsTrigger value="logs">
                Logs ({filteredLogs.length})
              </TabsTrigger>
              <TabsTrigger value="metrics">
                Metrics (
                {Object.keys(filteredNodeMetrics ?? {}).length ||
                  (state.metrics && !selectedBranch ? 1 : 0)}
                )
              </TabsTrigger>
              <TabsTrigger value="artifacts">
                Artifacts ({filteredArtifacts.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="logs" className="min-h-0">
              <LogsView
                logs={filteredLogs}
                nodeLabels={nodeLabels}
              />
            </TabsContent>
            <TabsContent value="metrics" className="min-h-0 overflow-hidden">
              <MetricsView
                metrics={selectedBranch ? null : state.metrics}
                nodeMetrics={filteredNodeMetrics ?? {}}
              />
            </TabsContent>
            <TabsContent value="artifacts" className="min-h-0 overflow-auto">
              <ArtifactsView artifacts={filteredArtifacts} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </aside>
  )
}
