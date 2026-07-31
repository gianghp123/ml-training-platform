import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { createIrisDemoGraph } from "./iris-demo"
import { createFeatureEngineeringDemoGraph } from "./feature-engineering-demo"
import { createParallelDemoGraph } from "./parallel-demo"

export interface DemoGraph {
  nodes: PipelineNode[]
  edges: Edge[]
}

export interface DemoDescriptor {
  id: string
  name: string
  workflowName: string
  description: string
  create: (blocks: BlockDefinition[], datasetId: string, idPrefix?: string) => DemoGraph
}

export const DEMOS: readonly DemoDescriptor[] = [
  {
    id: "parallel-execution",
    name: "⚡ Song Luồng Model Comparison (RF vs LogReg)",
    workflowName: "Parallel Multi-Model Pipeline Demo",
    description: "Pipeline 10-node chia làm 2 nhánh huấn luyện 2 Model (Random Forest & Logistic Regression) chạy song song cùng lúc, tạo ra 2 kết quả Đánh Giá & Model riêng biệt.",
    create: (blocks, datasetId, idPrefix) => createParallelDemoGraph(blocks, datasetId, idPrefix),
  },
  {
    id: "iris",
    name: "Iris Random Forest",
    workflowName: "Iris Random Forest Demo",
    description: "6-node linear pipeline: load -> feature select -> select target -> split -> train -> evaluate.",
    create: (blocks, datasetId, idPrefix) => createIrisDemoGraph(blocks, datasetId, idPrefix),
  },
  {
    id: "feature-engineering",
    name: "Feature Engineering",
    workflowName: "Feature Engineering Demo",
    description: "8-node pipeline demonstrating Custom Feature Formula + Feature Union first-occurrence-wins merge.",
    create: (blocks, datasetId, idPrefix) => createFeatureEngineeringDemoGraph(blocks, datasetId, idPrefix),
  },
] as const

export function getDemo(id: string): DemoDescriptor | undefined {
  return DEMOS.find((demo) => demo.id === id)
}

export function getDefaultDemo(): DemoDescriptor {
  return DEMOS[0]
}
