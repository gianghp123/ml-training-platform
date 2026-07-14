# Pipeline Block Redesign Specification

## 1. Goal

Thiết kế lại hệ thống block cho Pipeline Builder theo hướng:

- `workflow_version.graph_json` là nguồn lưu graph chính.
- `block_definition` chỉ mô tả block, port, config, runtime.
- `block_category` đóng vai trò stage/order của pipeline.
- Pipeline Engine chỉ validate ở mức graph, port, artifact type, category order.
- Logic dữ liệu chi tiết như detect column, dtype, missing value, numeric/string column nằm trong runtime của từng block.
- Không lưu column metadata vào DB làm rule chính.
- Adapter dùng để bridge các artifact hoặc behavior đặc biệt.

---

## 2. Core Philosophy

Pipeline Engine không nên biết quá sâu về dữ liệu tabular.

Engine chỉ nên biết:

```txt
Dataset
SplitDataset
Model
Prediction
Metrics
ExportFile
Config
```

Engine không nên biết:

```txt
column Age là integer
column Name là string
column Salary có null
PCA cần numeric columns nào
Normalization chọn cột nào
```

Những thứ đó thuộc trách nhiệm của từng block runtime.

Ví dụ:

```txt
Normalization.execute(dataset)
```

Block tự đọc dataset, tự detect numeric columns, tự validate, tự xử lý hoặc throw error.

---

## 3. Database Design

### 3.1 users

Giữ nguyên.

```txt
users {
  id uuid pk
  username string
  email string
  password_hash string
  created_at timestamp
  updated_at timestamp
}
```

---

### 3.2 workflow

Giữ nguyên.

```txt
workflow {
  id uuid pk
  user_id uuid
  name string
  description text
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}
```

---

### 3.3 workflow_version

Giữ `graph_json`.

```txt
workflow_version {
  id uuid pk
  workflow_id uuid
  version int
  graph_json jsonb
  created_at timestamp
}
```

`graph_json` là DSL chính của pipeline.

Không tách `workflow_node` và `workflow_edge` thành bảng riêng, vì graph cần linh hoạt cho UI và versioning.

---

### 3.4 block_category

Sửa bảng category thành stage/order.

```txt
block_category {
  id uuid pk
  code string unique
  name string
  order_index int
  description text
  created_at timestamp
}
```

Ví dụ dữ liệu:

| code | name | order_index |
|---|---|---|
| SOURCE | Source | 0 |
| PREPROCESS | Preprocess | 10 |
| FEATURE | Feature Engineering | 20 |
| SPLIT | Split Data | 30 |
| CONFIG | Configuration | 35 |
| MODEL | Model | 40 |
| EVALUATE | Evaluate | 50 |
| EXPORT | Export | 60 |

Rule cơ bản:

```txt
sourceBlock.category.order_index <= targetBlock.category.order_index
```

Ngoại lệ: `CONFIG` được nối vào `MODEL` như nhánh phụ.

---

### 3.5 block_definition

Sửa từ:

```txt
config_schema
input_schema
output_schema
```

thành:

```txt
config_schema
port_schema
runtime_info
```

Đề xuất:

```txt
block_definition {
  id uuid pk
  code string unique
  name string
  category_id uuid
  description text

  config_schema jsonb
  port_schema jsonb
  runtime_info jsonb

  docker_image string
  version string
  created_at timestamp
}
```

`input_schema` và `output_schema` không nên tách riêng. Gộp vào `port_schema`.

---

### 3.6 artifact

Nên giữ `artifact_type` dạng string hoặc normalize thành `artifact_type` table đều được.

Bản đơn giản:

```txt
artifact {
  id uuid pk
  workflow_run_id uuid
  node_execution_id uuid
  name string
  artifact_type string
  mime_type string
  storage_uri string
  metadata jsonb
  created_at timestamp
}
```

`metadata` chỉ chứa runtime summary, không dùng làm rule chính.

Ví dụ:

```json
{
  "rows": 10000,
  "columns": 18,
  "state": "normalized",
  "format": "parquet"
}
```

Không bắt buộc lưu column-level schema.

---

### 3.7 workflow_run

Giữ nguyên.

```txt
workflow_run {
  id uuid pk
  workflow_version_id uuid
  dataset_id uuid
  status string
  started_at timestamp
  finished_at timestamp
  user_id uuid
}
```

---

### 3.8 node_execution

Nên giữ `node_id string` vì node id nằm trong `graph_json`.

```txt
node_execution {
  id uuid pk
  workflow_run_id uuid
  node_id string
  node_type string
  status string
  worker_id uuid
  retry_count int
  started_at timestamp
  finished_at timestamp
}
```

`node_id` map với:

```json
{
  "nodes": [
    {
      "id": "normalize_1"
    }
  ]
}
```

---

### 3.9 worker

Giữ capability.

```txt
worker {
  id uuid pk
  hostname string
  status string
  last_heartbeat timestamp
  capability jsonb
}
```

Ví dụ:

```json
{
  "python": true,
  "sklearn": true,
  "tensorflow": false,
  "gpu": false
}
```

---

## 4. Graph JSON Design

`graph_json` nên là format chính cho UI và Engine.

Ví dụ:

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "load_1",
      "block": "load_csv",
      "config": {
        "delimiter": ",",
        "header": true
      },
      "position": {
        "x": 100,
        "y": 200
      }
    },
    {
      "id": "missing_1",
      "block": "handle_missing_values",
      "config": {
        "strategy": "mean"
      },
      "position": {
        "x": 350,
        "y": 200
      }
    },
    {
      "id": "split_1",
      "block": "train_test_split",
      "config": {
        "target_column": "label",
        "test_size": 0.2,
        "shuffle": true,
        "random_state": 42
      },
      "position": {
        "x": 600,
        "y": 200
      }
    },
    {
      "id": "rf_1",
      "block": "random_forest",
      "config": {
        "n_estimators": 100,
        "max_depth": 10
      },
      "position": {
        "x": 850,
        "y": 200
      }
    },
    {
      "id": "metrics_1",
      "block": "classification_metrics",
      "config": {
        "average": "weighted"
      },
      "position": {
        "x": 1100,
        "y": 200
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": {
        "node": "load_1",
        "port": "dataset"
      },
      "to": {
        "node": "missing_1",
        "port": "dataset"
      }
    },
    {
      "id": "e2",
      "from": {
        "node": "missing_1",
        "port": "dataset"
      },
      "to": {
        "node": "split_1",
        "port": "dataset"
      }
    },
    {
      "id": "e3",
      "from": {
        "node": "split_1",
        "port": "split_dataset"
      },
      "to": {
        "node": "rf_1",
        "port": "train_data"
      }
    },
    {
      "id": "e4",
      "from": {
        "node": "rf_1",
        "port": "prediction"
      },
      "to": {
        "node": "metrics_1",
        "port": "prediction"
      }
    }
  ],
  "ui": {
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1
    }
  }
}
```

---

## 5. Port Schema Design

Mỗi block có `port_schema`.

Format đề xuất:

```json
{
  "ports": [
    {
      "id": "dataset",
      "label": "Dataset",
      "direction": "output",
      "artifact": "dataset",
      "required": true,
      "multiple": false
    }
  ]
}
```

Field:

| field | ý nghĩa |
|---|---|
| id | tên port dùng trong graph_json edge |
| label | tên hiển thị UI |
| direction | input hoặc output |
| artifact | artifact type |
| required | port bắt buộc hay optional |
| multiple | cho phép nhiều edge connect vào port này không |

---

## 6. Artifact Types

Artifact type là contract giữa các block.

Danh sách core:

```txt
dataset
split_dataset
model
prediction
metrics
config
export_file
report
```

Không nên encode quá nhiều subtype vào engine.

Ví dụ không nên tạo quá nhiều type như:

```txt
numeric_dataset
clean_dataset
encoded_dataset
normalized_dataset
```

Thay vào đó dùng artifact `dataset` và state nằm trong metadata hoặc runtime.

---

## 7. Block Examples

### 7.1 Load CSV

```json
{
  "code": "load_csv",
  "name": "Load CSV",
  "category": "SOURCE",
  "config_schema": {
    "type": "object",
    "properties": {
      "file_uri": { "type": "string" },
      "delimiter": { "type": "string", "default": "," },
      "header": { "type": "boolean", "default": true },
      "encoding": { "type": "string", "default": "utf-8" }
    },
    "required": ["file_uri"]
  },
  "port_schema": {
    "ports": [
      {
        "id": "dataset",
        "label": "Dataset",
        "direction": "output",
        "artifact": "dataset",
        "required": true,
        "multiple": false
      }
    ]
  },
  "runtime_info": {
    "executor": "python",
    "runtime_class": "blocks.source.LoadCsvBlock",
    "required_capability": {
      "python": true,
      "pandas": true
    }
  }
}
```

---

### 7.2 Handle Missing Values

```json
{
  "code": "handle_missing_values",
  "name": "Handle Missing Values",
  "category": "PREPROCESS",
  "config_schema": {
    "type": "object",
    "properties": {
      "strategy": {
        "type": "string",
        "enum": ["drop_rows", "drop_columns", "mean", "median", "mode", "constant"]
      },
      "columns": {
        "type": "array",
        "items": { "type": "string" }
      },
      "fill_value": {}
    },
    "required": ["strategy"]
  },
  "port_schema": {
    "ports": [
      {
        "id": "dataset",
        "label": "Dataset",
        "direction": "input",
        "artifact": "dataset",
        "required": true
      },
      {
        "id": "dataset",
        "label": "Dataset",
        "direction": "output",
        "artifact": "dataset",
        "required": true
      }
    ]
  },
  "runtime_info": {
    "executor": "python",
    "runtime_class": "blocks.preprocess.HandleMissingValuesBlock",
    "required_capability": {
      "python": true,
      "pandas": true
    }
  }
}
```

---

### 7.3 Train/Test Split

```json
{
  "code": "train_test_split",
  "name": "Train/Test Split",
  "category": "SPLIT",
  "config_schema": {
    "type": "object",
    "properties": {
      "target_column": { "type": "string" },
      "test_size": { "type": "number", "default": 0.2 },
      "shuffle": { "type": "boolean", "default": true },
      "random_state": { "type": "integer", "default": 42 }
    },
    "required": ["target_column"]
  },
  "port_schema": {
    "ports": [
      {
        "id": "dataset",
        "label": "Dataset",
        "direction": "input",
        "artifact": "dataset",
        "required": true
      },
      {
        "id": "split_dataset",
        "label": "Split Dataset",
        "direction": "output",
        "artifact": "split_dataset",
        "required": true
      }
    ]
  },
  "runtime_info": {
    "executor": "python",
    "runtime_class": "blocks.split.TrainTestSplitBlock",
    "required_capability": {
      "python": true,
      "sklearn": true
    }
  }
}
```

---

### 7.4 Random Forest

```json
{
  "code": "random_forest",
  "name": "Random Forest",
  "category": "MODEL",
  "config_schema": {
    "type": "object",
    "properties": {
      "task_type": {
        "type": "string",
        "enum": ["classification", "regression"]
      },
      "n_estimators": {
        "type": "integer",
        "default": 100
      },
      "max_depth": {
        "type": ["integer", "null"],
        "default": null
      }
    },
    "required": ["task_type"]
  },
  "port_schema": {
    "ports": [
      {
        "id": "train_data",
        "label": "Train Data",
        "direction": "input",
        "artifact": "split_dataset",
        "required": true
      },
      {
        "id": "config",
        "label": "Config",
        "direction": "input",
        "artifact": "config",
        "required": false
      },
      {
        "id": "model",
        "label": "Model",
        "direction": "output",
        "artifact": "model",
        "required": true
      },
      {
        "id": "prediction",
        "label": "Prediction",
        "direction": "output",
        "artifact": "prediction",
        "required": true
      }
    ]
  },
  "runtime_info": {
    "executor": "python",
    "runtime_class": "blocks.model.RandomForestBlock",
    "required_capability": {
      "python": true,
      "sklearn": true
    }
  }
}
```

---

### 7.5 Classification Metrics

```json
{
  "code": "classification_metrics",
  "name": "Classification Metrics",
  "category": "EVALUATE",
  "config_schema": {
    "type": "object",
    "properties": {
      "average": {
        "type": "string",
        "enum": ["binary", "macro", "micro", "weighted"],
        "default": "weighted"
      }
    }
  },
  "port_schema": {
    "ports": [
      {
        "id": "prediction",
        "label": "Prediction",
        "direction": "input",
        "artifact": "prediction",
        "required": true
      },
      {
        "id": "metrics",
        "label": "Metrics",
        "direction": "output",
        "artifact": "metrics",
        "required": true
      }
    ]
  },
  "runtime_info": {
    "executor": "python",
    "runtime_class": "blocks.evaluate.ClassificationMetricsBlock",
    "required_capability": {
      "python": true,
      "sklearn": true
    }
  }
}
```

---

### 7.6 Save Model

```json
{
  "code": "save_model",
  "name": "Save Model",
  "category": "EXPORT",
  "config_schema": {
    "type": "object",
    "properties": {
      "format": {
        "type": "string",
        "enum": ["pickle", "onnx", "keras"]
      },
      "name": {
        "type": "string"
      }
    },
    "required": ["format", "name"]
  },
  "port_schema": {
    "ports": [
      {
        "id": "model",
        "label": "Model",
        "direction": "input",
        "artifact": "model",
        "required": true
      },
      {
        "id": "file",
        "label": "File",
        "direction": "output",
        "artifact": "export_file",
        "required": false
      }
    ]
  },
  "runtime_info": {
    "executor": "python",
    "runtime_class": "blocks.export.SaveModelBlock",
    "required_capability": {
      "python": true
    }
  }
}
```

---

## 8. Validation Rules

### 8.1 Validate Node Block Exists

Mỗi node trong `graph_json.nodes` phải có `block` tồn tại trong `block_definition.code`.

Sai:

```json
{
  "id": "abc",
  "block": "unknown_block"
}
```

Lỗi:

```txt
Block "unknown_block" does not exist.
```

---

### 8.2 Validate Edge Node Exists

Mỗi edge phải trỏ đến node tồn tại.

Sai:

```json
{
  "from": {
    "node": "not_exist",
    "port": "dataset"
  },
  "to": {
    "node": "model_1",
    "port": "dataset"
  }
}
```

---

### 8.3 Validate Port Exists

Port trong edge phải tồn tại trong `port_schema`.

Sai:

```json
{
  "from": {
    "node": "load_1",
    "port": "wrong_port"
  }
}
```

---

### 8.4 Validate Direction

`from.port` phải là output.

`to.port` phải là input.

Sai:

```txt
input -> input
output -> output
```

---

### 8.5 Validate Artifact Type

Artifact của output port phải match artifact của input port.

Hợp lệ:

```txt
dataset -> dataset
prediction -> prediction
model -> model
metrics -> metrics
```

Không hợp lệ:

```txt
dataset -> prediction
model -> metrics
prediction -> model
```

---

### 8.6 Validate Category Order

Mặc định:

```txt
from.category.order_index <= to.category.order_index
```

Không hợp lệ:

```txt
EVALUATE -> PREPROCESS
MODEL -> SPLIT
EXPORT -> MODEL
```

---

### 8.7 Validate Required Inputs

Trước khi run, mỗi node phải có đầy đủ required input ports.

Ví dụ Random Forest thiếu `train_data`:

```txt
Node random_forest requires input port train_data.
```

---

### 8.8 Validate Cycle

Pipeline không nên có cycle, trừ khi sau này hỗ trợ loop block rõ ràng.

Mặc định:

```txt
Graph must be DAG.
```

---

## 9. Runtime Responsibility

Runtime block chịu trách nhiệm validate dữ liệu sâu.

Ví dụ `NormalizationBlock`:

```txt
Input: dataset artifact

Runtime:
1. Load dataset from storage_uri
2. Detect numeric columns
3. If user selected columns, validate columns exist
4. If no numeric columns found, throw runtime error
5. Normalize
6. Save new dataset artifact
```

Engine không cần biết numeric column là gì.

---

## 10. Dataset Metadata Policy

Không lưu column metadata làm rule chính.

Có thể lưu summary nhẹ để hiển thị UI:

```json
{
  "rows": 10000,
  "columns": 18,
  "state": "encoded",
  "format": "parquet",
  "preview_available": true
}
```

Nếu UI cần preview schema, tạo artifact profile hoặc cache riêng:

```txt
dataset_profile {
  id uuid pk
  artifact_id uuid
  profile_json jsonb
  created_at timestamp
}
```

Ví dụ `profile_json`:

```json
{
  "columns": [
    {
      "name": "age",
      "detected_type": "numeric"
    },
    {
      "name": "gender",
      "detected_type": "categorical"
    }
  ],
  "sample_rows": []
}
```

Lưu ý: profile chỉ phục vụ UI, không phải source of truth cho engine.

---

## 11. Adapter Design

Adapter dùng khi 2 block không connect trực tiếp được nhưng có thể chuyển đổi hợp lý.

Ví dụ:

```txt
prediction -> metrics
```

cần qua block `classification_metrics`.

Không nên để `log_metrics` nhận prediction trực tiếp.

Luồng đúng:

```txt
Random Forest.prediction
  -> Classification Metrics.prediction
  -> Log Metrics.metrics
```

Adapter có thể là block bình thường hoặc runtime adapter.

Đề xuất đơn giản: coi adapter là block bình thường với category riêng hoặc category phù hợp.

Ví dụ:

```json
{
  "code": "prediction_to_classification_metrics",
  "name": "Prediction to Classification Metrics",
  "category": "EVALUATE",
  "port_schema": {
    "ports": [
      {
        "id": "prediction",
        "direction": "input",
        "artifact": "prediction",
        "required": true
      },
      {
        "id": "metrics",
        "direction": "output",
        "artifact": "metrics",
        "required": true
      }
    ]
  }
}
```

---

## 12. Concrete Valid Flow

```txt
Load CSV
  dataset ->

Handle Missing Values
  dataset ->

Encoding
  dataset ->

Normalization
  dataset ->

Train/Test Split
  split_dataset ->

Random Forest
  prediction -> Classification Metrics
  model -> Save Model

Classification Metrics
  metrics -> Log Metrics
```

Graph edges:

```json
[
  {
    "from": { "node": "load_1", "port": "dataset" },
    "to": { "node": "missing_1", "port": "dataset" }
  },
  {
    "from": { "node": "missing_1", "port": "dataset" },
    "to": { "node": "encoding_1", "port": "dataset" }
  },
  {
    "from": { "node": "encoding_1", "port": "dataset" },
    "to": { "node": "normalize_1", "port": "dataset" }
  },
  {
    "from": { "node": "normalize_1", "port": "dataset" },
    "to": { "node": "split_1", "port": "dataset" }
  },
  {
    "from": { "node": "split_1", "port": "split_dataset" },
    "to": { "node": "rf_1", "port": "train_data" }
  },
  {
    "from": { "node": "rf_1", "port": "prediction" },
    "to": { "node": "metrics_1", "port": "prediction" }
  },
  {
    "from": { "node": "rf_1", "port": "model" },
    "to": { "node": "save_model_1", "port": "model" }
  },
  {
    "from": { "node": "metrics_1", "port": "metrics" },
    "to": { "node": "log_metrics_1", "port": "metrics" }
  }
]
```

---

## 13. Concrete Invalid Flow

### Invalid 1

```txt
Load CSV -> Classification Metrics
```

Lý do:

```txt
Load CSV output = dataset
Classification Metrics input = prediction
```

Error:

```txt
Cannot connect load_1.dataset to metrics_1.prediction.
Artifact mismatch: dataset cannot connect to prediction.
```

---

### Invalid 2

```txt
Random Forest.prediction -> Save Model.model
```

Lý do:

```txt
prediction != model
```

Error:

```txt
Cannot connect rf_1.prediction to save_model_1.model.
Artifact mismatch: prediction cannot connect to model.
Use rf_1.model instead.
```

---

### Invalid 3

```txt
Classification Metrics -> Normalization
```

Lý do:

```txt
EVALUATE order 50 > PREPROCESS order 10
```

Error:

```txt
Cannot connect EVALUATE block to PREPROCESS block.
Pipeline cannot move backward in category order.
```

---

## 14. Engine Pseudocode

```ts
function validateGraph(graph, blockDefinitions, categories) {
  const nodesById = mapNodes(graph.nodes)

  for (const node of graph.nodes) {
    const block = blockDefinitions[node.block]
    if (!block) throw new Error(`Block ${node.block} does not exist`)

    validateConfig(node.config, block.config_schema)
  }

  for (const edge of graph.edges) {
    const fromNode = nodesById[edge.from.node]
    const toNode = nodesById[edge.to.node]

    if (!fromNode || !toNode) {
      throw new Error("Edge references missing node")
    }

    const fromBlock = blockDefinitions[fromNode.block]
    const toBlock = blockDefinitions[toNode.block]

    const fromPort = findPort(fromBlock.port_schema, edge.from.port)
    const toPort = findPort(toBlock.port_schema, edge.to.port)

    if (!fromPort || !toPort) {
      throw new Error("Edge references missing port")
    }

    if (fromPort.direction !== "output") {
      throw new Error("Source port must be output")
    }

    if (toPort.direction !== "input") {
      throw new Error("Target port must be input")
    }

    if (fromPort.artifact !== toPort.artifact) {
      throw new Error(`Artifact mismatch: ${fromPort.artifact} -> ${toPort.artifact}`)
    }

    const fromCategory = categories[fromBlock.category_id]
    const toCategory = categories[toBlock.category_id]

    if (!isAllowedCategoryFlow(fromCategory, toCategory)) {
      throw new Error(`Invalid category order: ${fromCategory.code} -> ${toCategory.code}`)
    }
  }

  ensureRequiredInputsConnected(graph, blockDefinitions)
  ensureDAG(graph)

  return true
}
```

---

## 15. Recommended DB Changes Summary

Current:

```txt
block_definition {
  config_schema json
  input_schema json
  output_schema json
}
```

Change to:

```txt
block_definition {
  config_schema jsonb
  port_schema jsonb
  runtime_info jsonb
}
```

Current:

```txt
block_category {
  name string
}
```

Change to:

```txt
block_category {
  code string unique
  name string
  order_index int
  description text
}
```

Keep:

```txt
workflow_version.graph_json
```

Do not split graph into relational node/edge tables.

---

## 16. Final Rule

Architecture should follow this separation:

```txt
graph_json
  = how blocks are connected

block_definition.port_schema
  = what each block can receive and produce

block_category.order_index
  = coarse pipeline order

artifact.type
  = runtime contract between blocks

block runtime
  = detailed data validation and transformation

adapter block
  = bridge special cases
```

This keeps the system flexible, easy to extend, and suitable for a no-code/low-code ML pipeline builder.
