'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import type { ConfigField } from '@training-ml/contracts';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BlockConfigFormProps {
  fields: ConfigField[];
  values: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}

function buildZodSchema(fields: ConfigField[]): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {};

  for (const field of fields) {
    switch (field.type) {
      case 'Number': {
        let num = z.coerce.number();
        if (field.min !== undefined) num = num.min(field.min, `Min ${field.min}`);
        if (field.max !== undefined) num = num.max(field.max, `Max ${field.max}`);
        shape[field.id] = num;
        break;
      }
      case 'Boolean': {
        shape[field.id] = z.boolean();
        break;
      }
      case 'Select':
      case 'Text':
      case 'FileUpload':
      case 'ColumnSelector':
      case 'KeyValueMap':
      default: {
        shape[field.id] = z.string();
        break;
      }
    }
  }

  return z.object(shape);
}

function buildDefaultValues(
  fields: ConfigField[],
  values: Record<string, string | number | boolean>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.id];
    switch (field.type) {
      case 'Number':
        defaults[field.id] = raw !== undefined ? Number(raw) : (field.default ?? 0);
        break;
      case 'Boolean':
        defaults[field.id] = Boolean(raw ?? field.default ?? false);
        break;
      case 'Select':
        defaults[field.id] = raw !== undefined ? String(raw) : String(field.default ?? '');
        break;
      default:
        defaults[field.id] = raw !== undefined ? String(raw) : '';
    }
  }
  return defaults;
}

export function BlockConfigForm({ fields, values, onChange }: BlockConfigFormProps) {
  const zodSchema = useMemo(() => buildZodSchema(fields), [fields]);

  const defaultValues = useMemo(
    () => buildDefaultValues(fields, values),
    [fields, values],
  );

  const form = useForm<z.infer<typeof zodSchema>>({
    resolver: zodResolver(zodSchema),
    defaultValues,
  });

  if (fields.length === 0) return null;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="border-t pt-2 mt-2 space-y-2"
    >
      {fields.map((field) => (
        <Controller
          key={field.id}
          name={field.id}
          control={form.control}
          render={({ field: controllerField, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation="vertical">
              <FieldLabel className="text-[10px]">{field.id}</FieldLabel>
              {(field.type === 'Text' || field.type === 'FileUpload' || field.type === 'ColumnSelector' || field.type === 'KeyValueMap') && (
                <Input
                  value={String(controllerField.value ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    controllerField.onChange(v);
                    onChange(field.id, v);
                  }}
                  name={controllerField.name}
                  ref={controllerField.ref}
                  onBlur={controllerField.onBlur}
                  className="h-6 text-xs nodrag"
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === 'Number' && (
                <Input
                  type="number"
                  value={controllerField.value as string | number ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    controllerField.onChange(raw);
                    if (raw !== '') {
                      const n = Number(raw);
                      if (!isNaN(n)) onChange(field.id, n);
                    }
                  }}
                  name={controllerField.name}
                  ref={controllerField.ref}
                  onBlur={controllerField.onBlur}
                  min={field.min}
                  max={field.max}
                  className="h-6 text-xs nodrag"
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === 'Boolean' && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={Boolean(controllerField.value)}
                    onCheckedChange={(v) => {
                      controllerField.onChange(v);
                      onChange(field.id, v);
                    }}
                    className="nodrag"
                    aria-invalid={fieldState.invalid}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {Boolean(controllerField.value) ? 'On' : 'Off'}
                  </span>
                </div>
              )}
              {field.type === 'Select' && (
                <Select
                  value={String(controllerField.value)}
                  onValueChange={(v) => {
                    controllerField.onChange(v);
                    onChange(field.id, v);
                  }}
                >
                  <SelectTrigger className="h-6 text-xs nodrag" aria-invalid={fieldState.invalid}>
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
              {field.type === 'MultiSelect' && (
                <div className="flex flex-col gap-1.5">
                  {field.options ? (
                    field.options.map((opt) => {
                      const selected = Array.isArray(controllerField.value)
                        ? controllerField.value.includes(opt)
                        : false;
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox
                            id={`${field.id}-${opt}`}
                            checked={selected}
                            onCheckedChange={(checked) => {
                              const arr = (Array.isArray(controllerField.value)
                                ? [...controllerField.value]
                                : []) as string[];
                              const next = checked
                                ? [...arr, opt]
                                : arr.filter((i) => i !== opt);
                              controllerField.onChange(next);
                              onChange(field.id, next.join(','));
                            }}
                            className="nodrag"
                          />
                          <label htmlFor={`${field.id}-${opt}`} className="text-xs cursor-pointer">
                            {opt}
                          </label>
                        </div>
                      );
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
  );
}
