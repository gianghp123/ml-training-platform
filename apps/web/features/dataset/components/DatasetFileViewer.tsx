"use client"

import {
  File,
  FileArchive,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Hash,
  Image,
  Table2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  TreeView,
  type TreeDataItem,
  type TreeRenderItemParams,
} from "@/components/tree-view"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

import type { DatasetFileNode } from "@/features/dataset/schema/dataset-files"
import {
  buildFileTree,
  countFiles,
  getFileIcon,
} from "@/features/dataset/schema/dataset-files"
import { fetchDatasetFiles } from "@/features/dataset/services/mock-s3"
import { formatVariant } from "@/features/dataset/utils/dataset.util"
import type { Dataset } from "@training-ml/contracts"
import { formatBytes } from "@/lib/utils/storage.utils"

interface DatasetFileViewerProps {
  dataset: Dataset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TreeItemWithSize = TreeDataItem & { _size: number }

function getFileIconComponent(
  node: DatasetFileNode
): React.ComponentType<{ className?: string }> {
  if (node.isFolder) return Folder
  const type = getFileIcon(node.name)
  switch (type) {
    case "image":
      return Image
    case "archive":
      return FileArchive
    case "code":
      return FileCode
    case "table":
      return Table2
    default:
      return File
  }
}

function nodeToTreeItem(node: DatasetFileNode): TreeItemWithSize {
  return {
    id: node.id,
    name: node.name,
    icon: getFileIconComponent(node),
    openIcon: node.isFolder ? FolderOpen : undefined,
    children: node.children?.map(nodeToTreeItem),
    _size: node.size,
  }
}

function FileTreeItem({ item, isLeaf, level }: TreeRenderItemParams) {
  const size = (item as TreeItemWithSize)._size

  return (
    <div
      className="flex flex-1 items-center justify-between gap-2 min-w-0"
      style={{ paddingLeft: level > 1 ? 0 : undefined }}
    >
      <span className="text-sm truncate">{item.name}</span>
      {isLeaf && size > 0 && (
        <span className="ml-2 shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatBytes(size)}
        </span>
      )}
    </div>
  )
}

const LOADING_ITEM: TreeDataItem = {
  id: "__loading__",
  name: "Loading files...",
  icon: () => <Spinner className="h-4 w-4 shrink-0 mr-2" />,
}

const ERROR_ITEM: TreeDataItem = {
  id: "__error__",
  name: "Failed to load files.",
  icon: FileText,
}

const EMPTY_ITEM: TreeDataItem = {
  id: "__empty__",
  name: "No files found in this dataset.",
  icon: FileText,
}

interface FileStats {
  fileCount: number
  totalSize: number
}

function DatasetFileDrawerBody({ dataset }: { dataset: Dataset }) {
  const [treeData, setTreeData] = useState<TreeDataItem[] | null>(null)
  const [error, setError] = useState(false)
  const [stats, setStats] = useState<FileStats>({ fileCount: 0, totalSize: 0 })

  useEffect(() => {
    let cancelled = false

    fetchDatasetFiles(dataset.storageUri)
      .then((objects) => {
        if (cancelled) return

        if (objects.length === 0) {
          setTreeData([])
          setStats({ fileCount: 0, totalSize: 0 })
          return
        }

        const bucketAndPrefix = dataset.storageUri.replace("s3://", "")
        const slashIndex = bucketAndPrefix.indexOf("/")
        const prefix =
          slashIndex >= 0 ? bucketAndPrefix.slice(slashIndex + 1) : bucketAndPrefix

        const tree = buildFileTree(objects, prefix)
        if (tree.length === 0) {
          setTreeData([])
          setStats({ fileCount: 0, totalSize: 0 })
          return
        }

        setTreeData(tree.map(nodeToTreeItem))
        setStats({
          fileCount: countFiles(tree),
          totalSize: objects.reduce((sum, o) => sum + o.size, 0),
        })
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [dataset])

  const displayData = useMemo(() => {
    if (error) return [ERROR_ITEM]
    if (!treeData) return [LOADING_ITEM]
    if (treeData.length === 0) return [EMPTY_ITEM]
    return treeData
  }, [error, treeData])

  return (
    <>
      <DrawerHeader className="border-b border-white/7 bg-white/[0.018]">
        <div className="studio-eyebrow">Dataset explorer</div>
        <DrawerTitle className="text-base tracking-[-0.02em]">
          {dataset.name}
        </DrawerTitle>
        {dataset.description && (
          <DrawerDescription>{dataset.description}</DrawerDescription>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Badge variant={formatVariant[dataset.format]}>
            {dataset.format.toUpperCase()}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Hash className="size-3" />v{dataset.version}
          </span>
          <span className="text-xs text-muted-foreground">
            {stats.fileCount} {stats.fileCount === 1 ? "file" : "files"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatBytes(stats.totalSize || dataset.size)}
          </span>
        </div>
      </DrawerHeader>
      <Separator className="bg-white/7" />
      <div className="px-4 pt-3">
        <span className="font-mono text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Files
        </span>
      </div>
      <ScrollArea className="flex-1 px-2 pb-4">
        <TreeView
          data={displayData}
          expandAll
          renderItem={(params) => <FileTreeItem {...params} />}
          className="p-0"
        />
      </ScrollArea>
    </>
  )
}

export function DatasetFileViewer({
  dataset,
  open,
  onOpenChange,
}: DatasetFileViewerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="border-white/10 bg-[#10151b] shadow-[-24px_0_64px_rgba(0,0,0,.32)]">
        {dataset && (
          <DatasetFileDrawerBody key={dataset.storageUri} dataset={dataset} />
        )}
      </DrawerContent>
    </Drawer>
  )
}
