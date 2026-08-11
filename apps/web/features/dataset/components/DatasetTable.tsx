"use client"

import {
  Braces,
  CircleCheck,
  Clock3,
  CodeXml,
  DatabaseZap,
  FileSpreadsheet,
  FolderTree,
  LoaderCircle,
  TriangleAlert,
  UploadCloud,
} from "lucide-react"
import { useState } from "react"

import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatVariant, statusVariant } from "@/features/dataset/utils/dataset.util"
import type { Dataset } from "@training-ml/contracts"
import { DatasetFormat, DatasetStatus } from "@training-ml/contracts"
import { formatBytes } from "@/lib/utils/storage.utils"

import { DatasetFileViewer } from "@/features/dataset/components/DatasetFileViewer"

const STATUS_LABELS: Record<DatasetStatus, string> = {
  uploading: "Uploading",
  queued: "Queued",
  validating: "Validating",
  ready: "Ready",
  failed: "Failed",
}

function FormatIcon({ format }: { format: DatasetFormat }) {
  if (format === DatasetFormat.CSV) return <FileSpreadsheet />
  if (format === DatasetFormat.JSON) return <Braces />
  return <CodeXml />
}

function StatusIcon({ status }: { status: DatasetStatus }) {
  if (status === DatasetStatus.READY) return <CircleCheck />
  if (status === DatasetStatus.FAILED) return <TriangleAlert />
  if (status === DatasetStatus.UPLOADING) return <UploadCloud />
  if (status === DatasetStatus.VALIDATING) {
    return <LoaderCircle className="animate-spin" />
  }
  return <Clock3 />
}

interface DatasetTableProps {
  data: Dataset[]
  totalItems: number
}

export function DatasetTable({ data, totalItems }: DatasetTableProps) {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleViewFiles = (dataset: Dataset) => {
    setSelectedDataset(dataset)
    setDrawerOpen(true)
  }

  const columns: Column<Dataset>[] = [
    {
      header: "Dataset",
      cell: (row) => (
        <div className="flex min-w-60 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-info/15 bg-info/8 text-info shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
            <DatabaseZap className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {row.name}
            </div>
            <div className="mt-0.5 max-w-64 truncate text-[10px] text-muted-foreground/65">
              {row.description || "Dataset asset"}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Format",
      cell: (row) => (
        <Badge
          variant={formatVariant[row.format as DatasetFormat]}
          className="border-white/8 bg-white/4 text-secondary-foreground"
        >
          <FormatIcon format={row.format as DatasetFormat} />
          {row.format.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant[row.status]}>
          <StatusIcon status={row.status} />
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      header: "Size",
      cell: (row) => (
        <span className="font-mono text-[11px] text-secondary-foreground tabular-nums">
          {formatBytes(row.size)}
        </span>
      ),
    },
    {
      header: "Version",
      cell: (row) => (
        <span className="rounded-md border border-white/7 bg-white/3 px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
          v{row.version}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "w-0",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleViewFiles(row)}
          className="opacity-70 transition-opacity group-hover/row:opacity-100"
          aria-label={`View files for ${row.name}`}
          title={`View files for ${row.name}`}
        >
          <FolderTree className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        totalItems={totalItems}
      />
      <DatasetFileViewer
        dataset={selectedDataset}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  )
}
