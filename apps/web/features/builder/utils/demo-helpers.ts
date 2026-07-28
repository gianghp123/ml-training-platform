import type { BlockDefinition, ConfigField, Port } from "@training-ml/contracts"
import type { Edge, XYPosition } from "@xyflow/react"
import { getCategoryColor } from "../blocks"
import { createDefaultConfig, type PipelineNode } from "./node-factory"

export type ExecutableBlockDefinition = BlockDefinition & { executorKey?: string }

export function makeNode(
  block: ExecutableBlockDefinition,
  executorKey: string,
  idPrefix: string,
  position: XYPosition,
  config: Record<string, unknown>
): PipelineNode {
  const b = block as Record<string, unknown>
  const schema = (b.configSchema ?? b.config_schema) as { fields?: ConfigField[] } | undefined
  const fields = schema?.fields ?? []
  const ports = (b.ports ?? { inputs: [], outputs: [] }) as { inputs: Port[]; outputs: Port[] }

  return {
    id: `${idPrefix}_${executorKey}`,
    type: "block",
    position,
    data: {
      block,
      blockId: String(b.id ?? ""),
      blockName: String(b.name ?? ""),
      categoryId: String(b.categoryId ?? b.category_id ?? ""),
      config: {
        ...createDefaultConfig(fields),
        ...config,
      },
      inputs: ports.inputs ?? [],
      outputs: ports.outputs ?? [],
      status: "idle",
    },
  }
}

export function makeEdge(
  source: PipelineNode,
  sourcePortId: string,
  target: PipelineNode,
  targetPortId: string
): Edge {
  return {
    id: `xy-edge__${source.id}${sourcePortId}-${target.id}${targetPortId}`,
    source: source.id,
    sourceHandle: sourcePortId,
    target: target.id,
    targetHandle: targetPortId,
    type: "pipeline",
    data: {
      edgeStyle: "smoothstep",
      color: getCategoryColor(source.data.categoryId).hex,
    },
  }
}

export function resolveBlocks<T extends string>(
  executorKeys: readonly T[],
  blocks: BlockDefinition[]
): Record<T, ExecutableBlockDefinition> {
  const resolved = {} as Record<T, ExecutableBlockDefinition>
  const missing: string[] = []

  for (const executorKey of executorKeys) {
    const block = blocks.find(
      (candidate) =>
        (candidate as ExecutableBlockDefinition).executorKey === executorKey &&
        candidate.status === "active"
    ) as ExecutableBlockDefinition | undefined
    if (block) resolved[executorKey] = block
    else missing.push(executorKey)
  }

  if (missing.length > 0) {
    throw new Error(
      `The block catalog is missing active executor keys: ${missing.join(", ")}.`
    )
  }
  return resolved
}
