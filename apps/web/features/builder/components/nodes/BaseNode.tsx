"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ConfigField } from "@training-ml/contracts"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import { memo, useCallback, useMemo, type CSSProperties } from "react"
import { getCategoryColor } from "../../blocks"
import { useBuilderContext } from "../../contexts/builder.context"
import { useValidationContext } from "../../contexts/validation.context"
import type { PipelineNode } from "../../utils/node-factory"
import { BlockConfigForm } from "../BlockConfigForm"

function getStatusVariant(status: PipelineNode["data"]["status"]) {
  switch (status) {
    case "success":
      return "default" as const
    case "running":
      return "default" as const
    case "queued":
      return "secondary" as const
    case "error":
      return "destructive" as const
    case "skipped":
      return "warning" as const
    default:
      return "outline" as const
  }
}

function BaseNode({ id, data, selected, parentId }: NodeProps<PipelineNode>) {
  const dotColor = getCategoryColor(data.categoryId).tw
  const accentColor = getCategoryColor(data.categoryId).hex
  const builder = useBuilderContext()
  const rf = useReactFlow()

  const isParentSuspended = useMemo(() => {
    if (!parentId) return false
    const parentNode = rf.getNode(parentId)
    if (!parentNode) return false
    const pd = parentNode.data as Record<string, unknown>
    if (pd._group !== true) return false
    return pd.suspended === true
  }, [parentId, rf])

  const { getNodeErrors } = useValidationContext()
  const errors = getNodeErrors(id)
  const hasErrors = errors.length > 0

  const configFields = useMemo(() => {
    const b = (data.block || {}) as Record<string, unknown>
    let schema = (b.configSchema ?? b.config_schema) as { fields?: ConfigField[] } | undefined

    if (!schema?.fields || schema.fields.length === 0) {
      const catalogBlock = builder.blocks?.find(
        (cb) => cb.id === data.blockId || cb.id === (b.id as string) || cb.name === data.blockName
      )
      if (catalogBlock) {
        const cbObj = catalogBlock as Record<string, unknown>
        schema = (cbObj.configSchema ?? cbObj.config_schema) as { fields?: ConfigField[] } | undefined
      }
    }

    let fields = (schema?.fields ?? []) as ConfigField[]

    // Ensure Load CSV block has the dataset field
    if (
      data.blockName === "Load CSV" ||
      data.blockId === "load_csv" ||
      (data.block as Record<string, unknown>)?.executorKey === "load_csv"
    ) {
      const hasDataset = fields.some((f) => f.id === "dataset")
      if (!hasDataset) {
        fields = [{ id: "dataset", type: "DatasetSelector", format: "csv" }]
      } else {
        fields = fields.filter((f) => f.id === "dataset")
      }
    }

    return fields
  }, [data.block, data.blockId, data.blockName, builder.blocks])

  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      builder.onConfigChange(id, key, value)
      if (key === "dataset" || key === "file") {
        builder.onConfigChange(id, "dataset", value)
        builder.onConfigChange(id, "file", value)
      }
    },
    [id, builder]
  )

  const handleStyle = {
    "--node-accent": accentColor,
    top: "auto",
    bottom: "auto",
    left: -5,
    position: "absolute",
    transform: "none",
  } as CSSProperties

  return (
    <div
      className={`min-w-50 rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${hasErrors
        ? "ring-2 ring-destructive"
        : selected
          ? "ring-2 ring-ring"
          : "ring-1 ring-foreground/10"
        } ${isParentSuspended ? "opacity-50 grayscale" : ""}`}
    >
      <div
        className={`flex items-center gap-2 rounded-t-lg px-3 py-2 ${dotColor} text-white`}
      >
        <span className="text-sm font-medium truncate flex-1">
          {data.blockName}
        </span>
        {data.status !== "idle" && (
          <Badge
            variant={getStatusVariant(data.status)}
            className="h-4 text-[10px]"
          >
            {data.status}
          </Badge>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            {data.inputs.map((input) => (
              <div key={input.id} className="relative flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={input.id}
                      style={handleStyle}
                      className={`static! pipeline-handle ${
                        input.optional ? "ring-1 ring-dashed ring-foreground/40" : ""
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {input.id} ({input.artifact})
                    {input.optional ? " · optional" : ""}
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">
                  {input.id}
                  {input.optional ? " (optional)" : ""}
                </span>
              </div>
            ))}
          </div>
          <div>
            {data.outputs.map((output) => (
              <div
                key={output.id}
                className="relative flex items-center justify-end gap-2"
              >
                <span className="text-xs text-muted-foreground">
                  {output.id}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={output.id}
                      style={{
                        ...handleStyle,
                        left: "auto",
                        right: -5,
                      }}
                      className={`static! pipeline-handle`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {output.id} ({output.artifact})
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        <BlockConfigForm
          nodeId={id}
          fields={configFields}
          values={data.config}
          onChange={handleConfigChange}
          datasets={builder.datasets}
          disabled={builder.isLocked}
        />

        {hasErrors && (
          <div className="space-y-1 mt-2">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive">
                {err.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(BaseNode)
