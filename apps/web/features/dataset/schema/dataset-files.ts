export interface S3Object {
  key: string
  size: number
  lastModified: string
  etag?: string
}

export interface DatasetFileNode {
  id: string
  name: string
  key: string
  size: number
  lastModified: string
  isFolder: boolean
  children?: DatasetFileNode[]
}

export function buildFileTree(objects: S3Object[], prefix: string): DatasetFileNode[] {
  const rootNodes = new Map<string, DatasetFileNode>()

  for (const obj of objects) {
    const relativeKey = obj.key.startsWith(prefix)
      ? obj.key.slice(prefix.length).replace(/^\//, "")
      : obj.key

    if (!relativeKey) continue

    const parts = relativeKey.split("/")
    let currentParentKey = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const nodeKey = currentParentKey ? `${currentParentKey}/${part}` : part

      if (isLast) {
        const node: DatasetFileNode = {
          id: obj.key,
          name: part,
          key: obj.key,
          size: obj.size,
          lastModified: obj.lastModified,
          isFolder: false,
        }
        addToParent(rootNodes, currentParentKey, node)
      } else {
        if (!rootNodes.has(nodeKey)) {
          const node: DatasetFileNode = {
            id: nodeKey,
            name: part,
            key: nodeKey,
            size: 0,
            lastModified: "",
            isFolder: true,
            children: [],
          }
          rootNodes.set(nodeKey, node)
          addToParent(rootNodes, currentParentKey, node)
        }
        currentParentKey = nodeKey
      }
    }
  }

  return Array.from(rootNodes.values()).filter(
    (n) => !n.key.includes("/") || rootNodes.get(n.key.split("/")[0]) === n
  )
}

function addToParent(
  rootNodes: Map<string, DatasetFileNode>,
  parentKey: string,
  node: DatasetFileNode
) {
  if (parentKey && rootNodes.has(parentKey)) {
    const parent = rootNodes.get(parentKey)!
    if (!parent.children) {
      parent.children = []
    }
    const existingIndex = parent.children.findIndex((c) => c.name === node.name)
    if (existingIndex >= 0) {
      parent.children[existingIndex] = node
    } else {
      parent.children.push(node)
    }
  }
}

export function getFileIcon(fileName: string): "file" | "image" | "archive" | "code" | "table" {
  const ext = fileName.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return "image"
    case "zip":
    case "tar":
    case "gz":
    case "bz2":
    case "7z":
      return "archive"
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "rs":
    case "go":
    case "java":
    case "yaml":
    case "yml":
    case "json":
    case "toml":
      return "code"
    case "csv":
    case "tsv":
    case "parquet":
    case "avro":
      return "table"
    default:
      return "file"
  }
}

export function countFiles(nodes: DatasetFileNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.isFolder) {
      count += node.children ? countFiles(node.children) : 0
    } else {
      count++
    }
  }
  return count
}


