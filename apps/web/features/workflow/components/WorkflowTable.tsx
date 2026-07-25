"use client"

import { Play } from "lucide-react"
import Link from "next/link"

import { DataTable, type Column } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Workflow } from "@training-ml/contracts"
import { ROUTES } from "@/lib/route"

const BASE_TIMESTAMP = 1775000000000;

const MOCK_WORKFLOWS: Workflow[] = Array.from({ length: 42 }, (_, i) => {
  const daysAgo = ((i * 7 + 3) % 50) + 1
  const created = new Date(BASE_TIMESTAMP - daysAgo * 86_400_000)
  const updated = new Date(created.getTime() + (((i * 3) % daysAgo) + 1) * 86_400_000)

  return {
    id: `wf_${String(i + 1).padStart(4, "0")}`,
    name: [
      "Customer Churn Classifier",
      "Fraud Detection Pipeline",
      "Image Classification v2",
      "Sentiment Analysis Workflow",
      "Medical Diagnosis Model",
      "Stock Price Predictor",
      "Weather Forecasting",
      "E-Commerce Recommender",
      "Real Estate Valuation",
      "Social Media Analyzer",
      "Traffic Pattern Detection",
      "Loan Risk Assessment",
    ][i % 12] + (i >= 12 ? ` (${Math.floor(i / 12) + 1})` : ""),
    description: "End-to-end ML workflow for training and evaluation.",
    createdAt: created,
    updatedAt: updated,
  }
})

export function WorkflowTable({ page, pageSize }: { page: number; pageSize: number }) {
  const start = (page - 1) * pageSize
  const pagedData = MOCK_WORKFLOWS.slice(start, start + pageSize)

  const columns: Column<Workflow>[] = [
    { header: "Name", accessorKey: "name" },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Created",
      cell: (row) => row.createdAt.toLocaleDateString("en-US"),
    },
    {
      header: "Updated",
      cell: (row) => row.updatedAt.toLocaleDateString("en-US"),
    },
    {
      header: "Actions",
      className: "w-0",
      cell: (row) => (
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={ROUTES.WORKFLOW.DETAIL(row.id)}>
            <Play className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={pagedData}
      totalItems={MOCK_WORKFLOWS.length}
    />
  )
}
