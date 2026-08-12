import type { BlockDefinition } from "@training-ml/contracts"
import type { Edge } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"
import { createIrisDemoGraph } from "./iris-demo"
import { createFeatureEngineeringDemoGraph } from "./feature-engineering-demo"
import { createParallelDemoGraph } from "./parallel-demo"
import { createLogisticRegressionDemoGraph } from "./logistic-regression-demo"
import { createSvmDemoGraph } from "./svm-demo"
import { createKmeansDemoGraph } from "./kmeans-demo"
import { createComprehensiveDemoGraph } from "./comprehensive-demo"

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
  {
    id: "iris-logistic-regression",
    name: "Iris Logistic Regression",
    workflowName: "Iris Logistic Regression Demo",
    description: "Linear 6-node pipeline training a Logistic Regression classifier and evaluating accuracy on Iris.",
    create: (blocks, datasetId, idPrefix) => createLogisticRegressionDemoGraph(blocks, datasetId, idPrefix),
  },
  {
    id: "iris-svm",
    name: "Iris SVM",
    workflowName: "Iris SVM Demo",
    description: "Linear 6-node pipeline training an SVM classifier (RBF kernel) and evaluating accuracy on Iris.",
    create: (blocks, datasetId, idPrefix) => createSvmDemoGraph(blocks, datasetId, idPrefix),
  },
  {
    id: "iris-kmeans",
    name: "Iris K-Means Clustering",
    workflowName: "Iris K-Means Clustering Demo",
    description: "Unsupervised 6-node pipeline: normalize features then K-Means (3 clusters) with silhouette & inertia evaluation.",
    create: (blocks, datasetId, idPrefix) => createKmeansDemoGraph(blocks, datasetId, idPrefix),
  },
  {
    id: "comprehensive-3-branch",
    name: "Comprehensive 3-Branch Pipeline (RF + LogReg + SVM)",
    workflowName: "Comprehensive 3-Branch Pipeline Demo",
    description: "16-node pipeline: impute -> custom formula (PetalArea) -> feature union -> normalize -> split, then 3 parallel model branches (Random Forest, Logistic Regression, SVM), each evaluated and saved independently.",
    create: (blocks, datasetId, idPrefix) => createComprehensiveDemoGraph(blocks, datasetId, idPrefix),
  },
] as const

export function getDemo(id: string): DemoDescriptor | undefined {
  return DEMOS.find((demo) => demo.id === id)
}

export function getDefaultDemo(): DemoDescriptor {
  return DEMOS[0]
}
