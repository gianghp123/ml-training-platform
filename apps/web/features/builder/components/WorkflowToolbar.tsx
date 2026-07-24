"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROUTES } from "@/lib/route"
import {
  ChevronLeft,
  Download,
  FlaskConical,
  Loader2,
  Play,
  Save,
  Settings2,
} from "lucide-react"
import { useValidationContext } from "../contexts/validation.context"
import type { Dataset } from "@training-ml/contracts"

interface WorkflowToolbarProps {
  workflowName: string
  onWorkflowNameChange: (name: string) => void
  onSave: () => void
  onRun: () => void
  hasSavedWorkflow: boolean
  onLoad: () => void
  edgeStyle: string
  onEdgeStyleChange: (style: "smoothstep" | "bezier" | "straight") => void
  isRunning: boolean
  readyCsvDatasets: Dataset[]
  demoDatasetId: string
  onDemoDatasetChange: (datasetId: string) => void
  onLoadIrisDemo: () => void
}

export function WorkflowToolbar({
  workflowName,
  onWorkflowNameChange,
  onSave,
  onRun,
  hasSavedWorkflow,
  onLoad,
  edgeStyle,
  onEdgeStyleChange,
  isRunning,
  readyCsvDatasets,
  demoDatasetId,
  onDemoDatasetChange,
  onLoadIrisDemo,
}: WorkflowToolbarProps) {
  const { isValid } = useValidationContext()

  const handleSave = () => {
    if (!isValid) {
      console.warn("Cannot save: workflow has validation errors")
      return
    }
    onSave()
  }

  return (
    <div className="flex items-center gap-3 border-b bg-background px-4 py-2">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={ROUTES.WORKFLOW.LIST}>
          <ChevronLeft className="size-4" />
        </Link>
      </Button>

      <Input
        value={workflowName}
        onChange={(e) => onWorkflowNameChange(e.target.value)}
        disabled={isRunning}
        className="h-8 w-48 text-sm font-medium"
        placeholder="Workflow name"
      />

      <div className="flex-1" />

      <Select
        value={demoDatasetId}
        onValueChange={onDemoDatasetChange}
        disabled={isRunning || readyCsvDatasets.length === 0}
      >
        <SelectTrigger
          className="h-8 w-44 text-xs"
          title="READY CSV dataset for the Iris demo"
        >
          <SelectValue placeholder="READY CSV dataset" />
        </SelectTrigger>
        <SelectContent>
          {readyCsvDatasets.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id}>
              {dataset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="secondary"
        size="sm"
        onClick={onLoadIrisDemo}
        disabled={isRunning || !demoDatasetId}
        className="gap-1.5"
        title={
          readyCsvDatasets.length === 0
            ? "Upload a CSV dataset and wait until it is READY"
            : "Replace the canvas with the six-node Iris demo"
        }
      >
        <FlaskConical className="size-3.5" />
        Iris Demo
      </Button>

      <Select
        value={edgeStyle}
        onValueChange={(v) =>
          onEdgeStyleChange(v as "smoothstep" | "bezier" | "straight")
        }
        disabled={isRunning}
      >
        <SelectTrigger className="h-8 w-32 text-xs">
          <Settings2 className="mr-1 size-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="smoothstep">Smooth Step</SelectItem>
          <SelectItem value="bezier">Bezier</SelectItem>
          <SelectItem value="straight">Straight</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        {hasSavedWorkflow && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onLoad}
            disabled={isRunning}
            title="Load workflow"
          >
            <Download className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleSave}
          disabled={isRunning}
          title="Save workflow"
        >
          <Save className="size-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onRun}
          disabled={isRunning || !isValid}
          className="gap-1.5"
          title={
            !isValid
              ? "Resolve graph validation errors before running"
              : undefined
          }
        >
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {isRunning ? "Running" : "Run"}
        </Button>
      </div>
    </div>
  )
}
