"use client"

import { GitBranch, Play } from "lucide-react"
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
    {
      header: "Workflow",
      cell: (row) => (
        <div className="flex min-w-64 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/14 bg-primary/8 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
            <GitBranch className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {row.name}
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-[0.05em] text-muted-foreground/65">
              {row.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Description",
      cell: (row) => (
        <span className="block max-w-md truncate text-xs text-muted-foreground">
          {row.description}
        </span>
      ),
    },
    {
      header: "Created",
      cell: (row) => (
        <span
          className="font-mono text-[11px] text-muted-foreground tabular-nums"
          suppressHydrationWarning
        >
          {row.createdAt.toLocaleDateString("en-US")}
        </span>
      ),
    },
    {
      header: "Updated",
      cell: (row) => (
        <span
          className="font-mono text-[11px] text-secondary-foreground tabular-nums"
          suppressHydrationWarning
        >
          {row.updatedAt.toLocaleDateString("en-US")}
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
          asChild
          className="opacity-70 transition-opacity group-hover/row:opacity-100"
        >
          <Link
            href={ROUTES.WORKFLOW.DETAIL(row.id)}
            aria-label={`Open ${row.name}`}
            title={`Open ${row.name}`}
          >
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
