"use client"

import { FolderTree } from "lucide-react"
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
    { header: "Name", accessorKey: "name" },
    {
      header: "Format",
      cell: (row) => (
        <Badge variant={formatVariant[row.format as DatasetFormat]}>{row.format.toUpperCase()}</Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant[row.status]}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    { header: "Size", cell: (row) => formatBytes(row.size) },
    { header: "Version", cell: (row) => <>v{row.version}</> },
    {
      header: "Actions",
      className: "w-0",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleViewFiles(row)}
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
