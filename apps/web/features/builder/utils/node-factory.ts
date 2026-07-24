import type { BlockDefinition, ConfigField, Port } from "@training-ml/contracts"
import type { Node, XYPosition } from "@xyflow/react"

export interface PipelineNodeData extends Record<string, unknown> {
  block: BlockDefinition
  blockId: string
  blockName: string
  categoryId: string
  config: Record<string, unknown>
  inputs: Port[]
  outputs: Port[]
  status: "idle" | "queued" | "running" | "success" | "error" | "skipped"
}

export type PipelineNodeType = "block"
export type PipelineNode = Node<PipelineNodeData, PipelineNodeType>

export function createNodeId(): string {
  return `node_${Date.now()}`
}

function getConfigDefault(field: ConfigField): unknown {
  switch (field.type) {
    case "ColumnSelector":
      return field.multiple ? "" : ""
    case "Select":
      return field.default
    case "Number":
      return field.default
    case "Boolean":
      return field.default ?? false
    case "Text":
      return ""
    case "FileUpload":
      return ""
    case "MultiSelect":
      return ""
    case "KeyValueMap":
      return {}
    case "DatasetSelector":
      return ""
    default:
      return undefined
  }
}

export function createDefaultConfig(
  fields: ConfigField[] | undefined
): Record<string, unknown> {
  if (!fields) return {}
  const config: Record<string, unknown> = {}
  for (const field of fields) {
    const defaultValue = getConfigDefault(field)
    if (defaultValue !== undefined) {
      config[field.id] = defaultValue
    }
  }
  return config
}

export function createPipelineNode(
  block: BlockDefinition,
  position: XYPosition
): PipelineNode {
  const b = block as Record<string, unknown>
  const schema = (b.configSchema ?? b.config_schema) as { fields?: ConfigField[] } | undefined
  const fields = schema?.fields ?? []
  const ports = (b.ports ?? { inputs: [], outputs: [] }) as { inputs: Port[]; outputs: Port[] }

  return {
    id: createNodeId(),
    type: "block",
    position,
    data: {
      block,
      blockId: String(b.id ?? ""),
      blockName: String(b.name ?? ""),
      categoryId: String(b.categoryId ?? b.category_id ?? ""),
      config: createDefaultConfig(fields),
      inputs: ports.inputs ?? [],
      outputs: ports.outputs ?? [],
      status: "idle",
    },
  }
}

export function findBlockById(
  blockId: string,
  blocks: BlockDefinition[]
): BlockDefinition | undefined {
  return blocks.find((b) => b.id === blockId)
}
