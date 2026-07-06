"use client"

import { Play } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { DataTable, type Column } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Workflow } from "@/lib/models/workflow.interface"
import { ROUTES } from "@/lib/route"

const MOCK_WORKFLOWS: Workflow[] = Array.from({ length: 42 }, (_, i) => {
  // Deterministic values to prevent SSR/CSR mismatch
  const daysAgo = (i * 7 + 3) % 60
  const baseTime = new Date("2026-07-01T00:00:00Z").getTime()
  const created = new Date(baseTime - daysAgo * 86_400_000)
  const updatedDays = (i * 3 + 1) % (daysAgo || 1)
  const updated = new Date(created.getTime() + updatedDays * 86_400_000)

  return {
    id: `wf_${String(i + 1).padStart(4, "0")}`,
    userId: "user_0001",
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

export function WorkflowTable() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("pageSize")) || 10
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
      cell: (row) => {
        const d = row.createdAt
        return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`
      },
    },
    {
      header: "Updated",
      cell: (row) => {
        const d = row.updatedAt
        return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`
      },
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
