"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import type { ConfigField, Dataset } from "@training-ml/contracts"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useValidationContext } from "../contexts/validation.context"
import { Plus, X } from "lucide-react"

function DatasetSelectorField({
  datasets,
  format,
  value,
  onChange,
  invalid,
  disabled,
}: {
  datasets: Dataset[]
  format?: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  disabled?: boolean
}) {
  const filtered = datasets.filter(
    (dataset) =>
      dataset.status === "ready" && (!format || dataset.format === format)
  )

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-6 text-xs nodrag nopan" aria-invalid={invalid}>
        <SelectValue placeholder="Select dataset" />
      </SelectTrigger>
      <SelectContent>
        {filtered.length === 0 ? (
          <>
            {value && value !== "__none" && !["demo_iris.csv", "sample_data.csv"].includes(value) && (
              <SelectItem value={value}>{value}</SelectItem>
            )}
            <SelectItem value="demo_iris.csv">iris_demo.csv (Demo)</SelectItem>
            <SelectItem value="sample_data.csv">sample_data.csv (Sample)</SelectItem>
          </>
        ) : (
          filtered.map((ds) => (
            <SelectItem key={ds.id} value={ds.id}>
              {ds.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

function ColumnSelectorField({
  nodeId,
  portId,
  multiple,
  semantic,
  value,
  onChange,
  invalid,
  disabled,
}: {
  nodeId: string
  portId: string
  multiple: boolean
  semantic?: string[]
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  disabled?: boolean
}) {
  const { contracts, inputContracts } = useValidationContext()

  const columns = useMemo(() => {
    const nodeInputContracts = inputContracts[nodeId] ?? {}
    const contract = nodeInputContracts[portId] ?? contracts[nodeId]?.[portId]
    if (!contract || contract.artifact !== "Dataset") return []

    if (contract.schema.columns === "unknown") return []

    if (semantic && semantic.length > 0) {
      return contract.schema.columns.filter(
        (c) => c.semantic && semantic.includes(c.semantic)
      )
    }

    return contract.schema.columns
  }, [nodeId, portId, inputContracts, contracts, semantic])

  if (multiple) {
    const selected = value
      ? value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    return (
      <div className="flex flex-col gap-1.5">
        {columns.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">
            Connect a dataset to see columns
          </span>
        ) : (
          columns.map((col) => {
            const isSelected = selected.includes(col.name)
            return (
              <div key={col.name} className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, col.name]
                      : selected.filter((s) => s !== col.name)
                    onChange(next.join(","))
                  }}
                  className="nodrag nopan"
                />
                <label className="cursor-pointer text-xs">
                  {col.name}
                  {col.semantic && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({col.semantic})
                    </span>
                  )}
                </label>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-6 text-xs nodrag nopan" aria-invalid={invalid}>
        <SelectValue placeholder="Select column" />
      </SelectTrigger>
      <SelectContent>
        {columns.length === 0 ? (
          <SelectItem value="__none" disabled>
            Connect a dataset to see columns
          </SelectItem>
        ) : (
          columns.map((col) => (
            <SelectItem key={col.name} value={col.name}>
              {col.name}
              {col.semantic && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({col.semantic})
                </span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

interface BlockConfigFormProps {
  nodeId: string
  fields: ConfigField[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  datasets: Dataset[]
  disabled?: boolean
}

function normalizeStringMap(value: unknown): Record<string, string> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, String(item ?? "")])
    )
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return normalizeStringMap(JSON.parse(value))
    } catch {
      return {}
    }
  }
  return {}
}

function KeyValueMapField({
  value,
  onChange,
  disabled,
}: {
  value: unknown
  onChange: (value: Record<string, string>) => void
  disabled: boolean
}) {
  const mapping = normalizeStringMap(value)
  const entries = Object.entries(mapping)

  const commit = (nextEntries: Array<[string, string]>) => {
    onChange(Object.fromEntries(nextEntries))
  }

  return (
    <div className="space-y-1.5">
      {entries.map(([key, item], index) => (
        <div key={index} className="flex items-center gap-1">
          <Input
            value={key}
            disabled={disabled}
            onChange={(event) => {
              const next = [...entries] as Array<[string, string]>
              next[index] = [event.target.value, item]
              commit(next)
            }}
            className="nodrag nopan h-6 min-w-0 text-xs"
            placeholder="source"
            aria-label={`Mapping source ${index + 1}`}
          />
          <span className="text-[10px] text-muted-foreground">→</span>
          <Input
            value={item}
            disabled={disabled}
            onChange={(event) => {
              const next = [...entries] as Array<[string, string]>
              next[index] = [key, event.target.value]
              commit(next)
            }}
            className="nodrag nopan h-6 min-w-0 text-xs"
            placeholder="destination"
            aria-label={`Mapping destination ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() =>
              commit(entries.filter((_, itemIndex) => itemIndex !== index))
            }
            aria-label={`Remove mapping ${index + 1}`}
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={disabled}
        onClick={() => {
          let index = entries.length + 1
          let key = `column_${index}`
          while (key in mapping) {
            index += 1
            key = `column_${index}`
          }
          commit([...entries, [key, ""]])
        }}
        className="nodrag nopan w-full"
      >
        <Plus className="size-3" />
        Add mapping
      </Button>
    </div>
  )
}

function buildZodSchema(
  fields: ConfigField[]
): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {}

  for (const field of fields) {
    switch (field.type) {
      case "Number": {
        let num = z.coerce.number()
        if (field.min !== undefined)
          num = num.min(field.min, `Min ${field.min}`)
        if (field.max !== undefined)
          num = num.max(field.max, `Max ${field.max}`)
        shape[field.id] = num
        break
      }
      case "Boolean": {
        shape[field.id] = z.boolean()
        break
      }
      case "MultiSelect": {
        shape[field.id] = z.array(z.string())
        break
      }
      case "KeyValueMap": {
        shape[field.id] = z.record(z.string(), z.string())
        break
      }
      case "Select":
      case "Text":
      case "FileUpload":
      case "ColumnSelector":
      case "DatasetSelector":
      default: {
        shape[field.id] = z.string()
        break
      }
    }
  }

  return z.object(shape)
}

function buildDefaultValues(
  fields: ConfigField[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = values[field.id]
    switch (field.type) {
      case "Number":
        defaults[field.id] =
          raw !== undefined ? Number(raw) : (field.default ?? 0)
        break
      case "Boolean":
        defaults[field.id] = Boolean(raw ?? field.default ?? false)
        break
      case "Select":
        defaults[field.id] =
          raw !== undefined ? String(raw) : String(field.default ?? "")
        break
      case "MultiSelect":
        defaults[field.id] = Array.isArray(raw)
          ? raw.map(String)
          : typeof raw === "string"
            ? raw
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : []
        break
      case "KeyValueMap":
        defaults[field.id] = normalizeStringMap(raw)
        break
      default:
        defaults[field.id] = raw !== undefined ? String(raw) : ""
    }
  }
  return defaults
}

export function BlockConfigForm({
  nodeId,
  fields,
  values,
  onChange,
  datasets,
  disabled = false,
}: BlockConfigFormProps) {
  const zodSchema = useMemo(() => buildZodSchema(fields), [fields])

  const defaultValues = useMemo(
    () => buildDefaultValues(fields, values),
    [fields, values]
  )

  const form = useForm<z.infer<typeof zodSchema>>({
    resolver: zodResolver(zodSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  if (fields.length === 0) return null

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mt-2 space-y-2 border-t pt-2"
    >
      {fields.map((field) => (
        <Controller
          key={field.id}
          name={field.id}
          control={form.control}
          render={({ field: controllerField, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation="vertical">
              <FieldLabel className="text-[10px]">{field.id}</FieldLabel>
              {(field.type === "Text" || field.type === "FileUpload") && (
                <Input
                  disabled={disabled}
                  value={String(controllerField.value ?? "")}
                  onChange={(e) => {
                    const v = e.target.value
                    controllerField.onChange(v)
                    onChange(field.id, v)
                  }}
                  name={controllerField.name}
                  ref={controllerField.ref}
                  onBlur={controllerField.onBlur}
                  className="h-6 text-xs nodrag nopan"
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === "KeyValueMap" && (
                <KeyValueMapField
                  value={controllerField.value}
                  disabled={disabled}
                  onChange={(value) => {
                    controllerField.onChange(value)
                    onChange(field.id, value)
                  }}
                />
              )}
              {field.type === "Number" && (
                <Input
                  type="number"
                  disabled={disabled}
                  value={(controllerField.value as string | number) ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value
                    controllerField.onChange(raw)
                    if (raw !== "") {
                      const n = Number(raw)
                      if (!isNaN(n)) onChange(field.id, n)
                    }
                  }}
                  name={controllerField.name}
                  ref={controllerField.ref}
                  onBlur={controllerField.onBlur}
                  min={field.min}
                  max={field.max}
                  className="h-6 text-xs nodrag nopan"
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === "Boolean" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={Boolean(controllerField.value)}
                    disabled={disabled}
                    onCheckedChange={(v) => {
                      controllerField.onChange(v)
                      onChange(field.id, v)
                    }}
                    className="nodrag nopan"
                    aria-invalid={fieldState.invalid}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {Boolean(controllerField.value) ? "On" : "Off"}
                  </span>
                </div>
              )}
              {field.type === "Select" && (
                <Select
                  value={String(controllerField.value)}
                  disabled={disabled}
                  onValueChange={(v) => {
                    controllerField.onChange(v)
                    onChange(field.id, v)
                  }}
                >
                  <SelectTrigger
                    className="h-6 text-xs nodrag nopan"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === "DatasetSelector" && (
                <DatasetSelectorField
                  datasets={datasets}
                  format={field.format}
                  value={String(controllerField.value ?? "")}
                  onChange={(v) => {
                    controllerField.onChange(v)
                    onChange(field.id, v)
                  }}
                  invalid={fieldState.invalid}
                  disabled={disabled}
                />
              )}
              {field.type === "ColumnSelector" && (
                <ColumnSelectorField
                  nodeId={nodeId}
                  portId="dataset"
                  multiple={field.multiple}
                  semantic={field.semantic}
                  value={String(controllerField.value ?? "")}
                  onChange={(v) => {
                    controllerField.onChange(v)
                    onChange(field.id, v)
                  }}
                  invalid={fieldState.invalid}
                  disabled={disabled}
                />
              )}
              {field.type === "MultiSelect" && (
                <div className="flex flex-col gap-1.5">
                  {field.options ? (
                    field.options.map((opt) => {
                      const selected = Array.isArray(controllerField.value)
                        ? controllerField.value.includes(opt)
                        : false
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox
                            id={`${field.id}-${opt}`}
                            checked={selected}
                            disabled={disabled}
                            onCheckedChange={(checked) => {
                              const arr = (
                                Array.isArray(controllerField.value)
                                  ? [...controllerField.value]
                                  : []
                              ) as string[]
                              const next = checked
                                ? [...arr, opt]
                                : arr.filter((i) => i !== opt)
                              controllerField.onChange(next)
                              onChange(field.id, next.join(","))
                            }}
                            className="nodrag nopan"
                          />
                          <label
                            htmlFor={`${field.id}-${opt}`}
                            className="cursor-pointer text-xs"
                          >
                            {opt}
                          </label>
                        </div>
                      )
                    })
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Options depend on connected block
                    </span>
                  )}
                </div>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      ))}
    </form>
  )
}
