"use client"

import { useId, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface SaveWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  savedVersion: number | null
  onConfirm: (name: string) => void
}

export function SaveWorkflowDialog({
  open,
  onOpenChange,
  currentName,
  savedVersion,
  onConfirm,
}: SaveWorkflowDialogProps) {
  const inputId = useId()
  const [name, setName] = useState(currentName)
  const nextVersion = (savedVersion ?? 0) + 1

  const handleConfirm = () => {
    const trimmed = name.trim()
    onConfirm(trimmed || "Untitled Workflow")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Workflow</DialogTitle>
          <DialogDescription>
            The pipeline will be saved to the server as a new immutable
            version.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor={inputId}>Workflow name</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Creates version{" "}
            <span className="font-mono">v{nextVersion}</span>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
