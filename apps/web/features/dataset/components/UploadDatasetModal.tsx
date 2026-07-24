"use client"

import { Upload, FileUp, CheckCircle2, Loader2, ChevronRight } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createUploadUrl, completeUpload } from "@/features/dataset/services/dataset.actions"
import { DatasetFormat } from "@training-ml/contracts"

type UploadState = "idle" | "uploading" | "complete" | "error"

const FORMAT_OPTIONS = [
  { value: DatasetFormat.CSV, label: "CSV" },
  { value: DatasetFormat.JSON, label: "JSON" },
  { value: DatasetFormat.XML, label: "XML" },
] as const

const ACCEPT_MAP: Record<string, string> = {
  csv: ".csv",
  json: ".json",
  xml: ".xml",
}

export function UploadDatasetModal() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<UploadState>("idle")
  const [format, setFormat] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const resetForm = useCallback(() => {
    setState("idle")
    setFormat("")
    setFile(null)
    setDragOver(false)
    formRef.current?.reset()
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        resetForm()
      }
    },
    [resetForm],
  )

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) {
        handleFileSelect(dropped)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!file || !format) return

      const formData = new FormData(e.currentTarget)
      const name = formData.get("name") as string
      const description = (formData.get("description") as string) || undefined

      // Build validation options from form
      const validationOptions: Record<string, unknown> = {}
      const sampleSize = formData.get("sampleSize") as string
      const requiredColumns = formData.get("requiredColumns") as string

      if (sampleSize) {
        validationOptions.sampleSize = parseInt(sampleSize, 10)
      }
      if (requiredColumns) {
        validationOptions.requiredColumns = requiredColumns
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      }

      // Format-specific options
      if (format === DatasetFormat.CSV) {
        const delimiter = formData.get("csvDelimiter") as string
        const hasHeader = formData.get("csvHasHeader") === "on"
        const encoding = formData.get("csvEncoding") as string
        const csvOpts: Record<string, unknown> = {}
        if (delimiter) csvOpts.delimiter = delimiter
        if (hasHeader) csvOpts.hasHeader = true
        if (encoding) csvOpts.encoding = encoding
        if (Object.keys(csvOpts).length > 0) validationOptions.csv = csvOpts
      } else if (format === DatasetFormat.JSON) {
        const recordsPath = formData.get("jsonRecordsPath") as string
        if (recordsPath) validationOptions.json = { recordsPath }
      } else if (format === DatasetFormat.XML) {
        const recordElement = formData.get("xmlRecordElement") as string
        if (recordElement) validationOptions.xml = { recordElement }
      }

      setState("uploading")

      try {
        // Step 1: Get presigned URL
        const response = await createUploadUrl({
          name,
          description,
          format: format as "csv" | "json" | "xml",
          size: file.size,
          validationOptions:
            Object.keys(validationOptions).length > 0
              ? validationOptions
              : undefined,
        })
        const { datasetId, url } = response.data!

        // Step 2: Upload file directly to MinIO
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        })

        if (!uploadResponse.ok) {
          throw new Error("File upload failed")
        }

        // Step 3: Mark upload complete
        await completeUpload(datasetId)

        setState("complete")
        toast.success("Upload complete. Dataset queued for validation.")
      } catch (error) {
        setState("error")
        toast.error(
          error instanceof Error ? error.message : "Upload failed. Please try again.",
        )
      }
    },
    [file, format],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create Dataset</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {state === "complete" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <CheckCircle2 className="size-12 text-success" />
            <div className="text-center">
              <DialogTitle>Upload Complete</DialogTitle>
              <DialogDescription className="mt-2">
                Your dataset has been uploaded and queued for validation. You can
                close this dialog and check the status in the dataset list.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Dataset</DialogTitle>
              <DialogDescription>
                Upload a dataset file for training and evaluation.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Dataset"
                  required
                  disabled={state === "uploading"}
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Optional description"
                  disabled={state === "uploading"}
                  rows={2}
                />
              </div>

              {/* Format */}
              <div className="grid gap-2">
                <Label>Format</Label>
                <Select
                  value={format}
                  onValueChange={setFormat}
                  disabled={state === "uploading"}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Format-specific & Validation Options */}
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <span>Validation & Format Options</span>
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-3 grid gap-3 pl-1 border-l-2 border-muted pl-3">
                  {/* CSV options */}
                  {format === DatasetFormat.CSV && (
                    <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
                      <span className="text-xs font-semibold text-foreground">CSV Options</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="csvDelimiter" className="text-xs">Delimiter</Label>
                          <Input
                            id="csvDelimiter"
                            name="csvDelimiter"
                            placeholder=","
                            maxLength={1}
                            className="h-8 text-xs"
                            disabled={state === "uploading"}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="csvEncoding" className="text-xs">Encoding</Label>
                          <Input
                            id="csvEncoding"
                            name="csvEncoding"
                            placeholder="utf-8"
                            className="h-8 text-xs"
                            disabled={state === "uploading"}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="csvHasHeader"
                          name="csvHasHeader"
                          value="on"
                          defaultChecked
                          disabled={state === "uploading"}
                        />
                        <Label htmlFor="csvHasHeader" className="cursor-pointer text-xs">
                          Has header row
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* JSON options */}
                  {format === DatasetFormat.JSON && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="jsonRecordsPath" className="text-xs">Records Path</Label>
                      <Input
                        id="jsonRecordsPath"
                        name="jsonRecordsPath"
                        placeholder="data.items"
                        className="h-8 text-xs"
                        disabled={state === "uploading"}
                      />
                    </div>
                  )}

                  {/* XML options */}
                  {format === DatasetFormat.XML && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="xmlRecordElement" className="text-xs">Record Element</Label>
                      <Input
                        id="xmlRecordElement"
                        name="xmlRecordElement"
                        placeholder="record"
                        className="h-8 text-xs"
                        disabled={state === "uploading"}
                      />
                    </div>
                  )}

                  {/* Common options */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="sampleSize" className="text-xs">Sample Size</Label>
                      <Input
                        id="sampleSize"
                        name="sampleSize"
                        type="number"
                        placeholder="500"
                        min={1}
                        max={10000}
                        className="h-8 text-xs"
                        disabled={state === "uploading"}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="requiredColumns" className="text-xs">Required Columns</Label>
                      <Input
                        id="requiredColumns"
                        name="requiredColumns"
                        placeholder="col1, col2"
                        className="h-8 text-xs"
                        disabled={state === "uploading"}
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* File Drop Zone */}
              <div className="grid gap-2">
                <Label>File</Label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 min-h-[130px] cursor-pointer transition-colors",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50",
                    file && "border-success bg-success/5",
                    state === "uploading" && "pointer-events-none opacity-50",
                  )}
                >
                  {file ? (
                    <>
                      <FileUp className="size-8 text-success" />
                      <span className="text-sm font-medium text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Drop file here or click to browse
                      </span>
                      <span className="text-xs text-muted-foreground">
                        CSV, JSON, or XML
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={format ? ACCEPT_MAP[format] : ".csv,.json,.xml"}
                  onChange={(e) => {
                    const selected = e.target.files?.[0]
                    if (selected) handleFileSelect(selected)
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={state === "uploading"}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!file || !format || state === "uploading"}
              >
                {state === "uploading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
