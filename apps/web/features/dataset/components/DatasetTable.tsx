"use client"

import { FolderTree } from "lucide-react"
import { useState } from "react"

import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatVariant } from "@/features/dataset/utils/dataset.util"
import { DatasetFormat } from "@/lib/enums"
import { Dataset } from "@training-ml/contracts"
import { formatBytes } from "@/lib/utils/storage.utils"

import { DatasetFileViewer } from "@/features/dataset/components/DatasetFileViewer"

const MOCK_DATASETS: Dataset[] = Array.from({ length: 42 }, (_, i) => ({
  id: `ds_${String(i + 1).padStart(4, "0")}`,
  name: [
    "Customer Churn Prediction",
    "Fraud Detection Training",
    "ImageNet Subset v2",
    "Sentiment Analysis Corpus",
    "Medical Records Anonymized",
    "Stock Market Historical",
    "Weather Forecast Data",
    "E-Commerce Reviews",
    "Real Estate Listings",
    "Social Media Posts",
    "Traffic Flow Analysis",
    "Loan Default Prediction",
  ][i % 12] + (i >= 12 ? ` (${Math.floor(i / 12) + 1})` : ""),
  description: "Sample dataset for model training and evaluation purposes.",
  storageUri: `s3://datasets/ds_${String(i + 1).padStart(4, "0")}`,
  format: [DatasetFormat.CSV, DatasetFormat.JSON, DatasetFormat.PARQUET, DatasetFormat.AVRO][i % 4],
  size: Math.round(Math.random() * 10_000_000_000) + 100_000,
  checksum: `sha256:${Math.random().toString(36).slice(2, 34)}`,
  version: Math.ceil(Math.random() * 10),
  userId: "user_0001",
}))

export function DatasetTable({ page, pageSize }: { page: number; pageSize: number }) {
  const start = (page - 1) * pageSize
  const pagedData = MOCK_DATASETS.slice(start, start + pageSize)

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
        <Badge variant={formatVariant[row.format]}>{row.format.toUpperCase()}</Badge>
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
        data={pagedData}
        totalItems={MOCK_DATASETS.length}
      />
      <DatasetFileViewer
        dataset={selectedDataset}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  )
}
