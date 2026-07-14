'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { BlockConfigField } from '../blocks/socket-types';

interface BlockConfigFormProps {
  schema: Record<string, BlockConfigField>;
  values: Record<string, string | number | boolean | string[]>;
  onChange: (key: string, value: string | number | boolean | string[]) => void;
}

function buildZodSchema(fields: Record<string, BlockConfigField>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(fields)) {
    const v = field.validation;

    switch (field.type) {
      case 'number': {
        let num = z.coerce.number();
        if (v?.min !== undefined) num = num.min(v.min, `Min ${v.min}`);
        if (v?.max !== undefined) num = num.max(v.max, `Max ${v.max}`);
        shape[key] = z.preprocess(
          (value) => value === '' ? undefined : value,
          v?.required ? num : num.optional(),
        );
        break;
      }
      case 'checkbox':
        shape[key] = z.array(z.string());
        break;
      case 'switch':
        shape[key] = z.boolean();
        break;
      case 'select':
      case 'radio':
        shape[key] = v?.required ? z.string().min(1, 'Required') : z.string();
        break;
      case 'textarea':
      case 'text':
      default: {
        let str = z.string();
        if (v?.minLength !== undefined) str = str.min(v.minLength, `Min ${v.minLength} chars`);
        if (v?.maxLength !== undefined) str = str.max(v.maxLength, `Max ${v.maxLength} chars`);
        if (v?.required) str = str.min(1, 'Required');
        shape[key] = str;
        break;
      }
    }
  }

  return z.object(shape);
}

function buildDefaultValues(
  fields: Record<string, BlockConfigField>,
  values: Record<string, string | number | boolean | string[]>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    const raw = values[key];
    if (field.type === 'number') {
      defaults[key] = raw !== undefined && raw !== '' ? Number(raw) : (field.default ?? '');
    } else if (field.type === 'switch') {
      defaults[key] = Boolean(raw ?? field.default ?? false);
    } else if (field.type === 'checkbox') {
      defaults[key] = Array.isArray(raw)
        ? raw
        : raw ? String(raw).split(',').filter(Boolean) : [];
    } else {
      defaults[key] = raw !== undefined ? String(raw) : String(field.default ?? '');
    }
  }
  return defaults;
}

export function BlockConfigForm({ schema: fields, values, onChange }: BlockConfigFormProps) {
  const zodSchema = useMemo(() => buildZodSchema(fields), [fields]);

  const defaultValues = useMemo(
    () => buildDefaultValues(fields, values),
    [fields, values],
  );

  const form = useForm<z.infer<typeof zodSchema>>({
    resolver: zodResolver(zodSchema),
    defaultValues,
  });

  function onSubmit(data: z.infer<typeof zodSchema>) {
    console.log('Block config submitted:', { key: data, values: form.getValues() });
  }

  if (Object.keys(fields).length === 0) return null;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="border-t pt-2 mt-2 space-y-2"
    >
      {Object.entries(fields).map(([key, field]) => (
        <Controller
          key={key}
          name={key}
          control={form.control}
          render={({ field: controllerField, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation="vertical">
              <FieldLabel className="text-[10px]">{field.label}</FieldLabel>
              {field.type === 'text' && (
                <Input
                  value={String(controllerField.value ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    controllerField.onChange(v);
                    onChange(key, v);
                  }}
                  name={controllerField.name}
                  ref={controllerField.ref}
                  onBlur={controllerField.onBlur}
                  className="h-6 text-xs nodrag"
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === 'textarea' && (
                <Textarea
                  value={String(controllerField.value ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    controllerField.onChange(v);
                    onChange(key, v);
                  }}
                  className="text-xs nodrag"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === 'number' && (
                <Input
                  type="number"
                  value={controllerField.value as string | number ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const v = raw === '' ? '' : raw;
                    controllerField.onChange(v);
                    if (raw === '') {
                      onChange(key, '');
                    } else {
                      const n = Number(raw);
                      if (!isNaN(n)) onChange(key, n);
                    }
                  }}
                  name={controllerField.name}
                  ref={controllerField.ref}
                  onBlur={controllerField.onBlur}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  step={field.validation?.step}
                  className="h-6 text-xs nodrag"
                  aria-invalid={fieldState.invalid}
                />
              )}
              {field.type === 'select' && field.options && (
                <Select
                  value={String(controllerField.value)}
                  onValueChange={(v) => {
                    controllerField.onChange(v);
                    onChange(key, v);
                  }}
                >
                  <SelectTrigger
                    className="h-6 text-xs nodrag"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === 'radio' && field.options && (
                <RadioGroup
                  value={String(controllerField.value)}
                  onValueChange={(v) => {
                    controllerField.onChange(v);
                    onChange(key, v);
                  }}
                  className="gap-1.5"
                >
                  {field.options.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={String(opt.value)} id={`${key}-${opt.value}`} className="nodrag" />
                      <label htmlFor={`${key}-${opt.value}`} className="text-xs cursor-pointer">
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              {field.type === 'checkbox' && field.options && (
                <div className="flex flex-col gap-1.5">
                  {field.options.map((opt) => {
                    const selected = Array.isArray(controllerField.value)
                      ? controllerField.value.includes(String(opt.value))
                      : false;
                    return (
                      <div key={opt.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${key}-${opt.value}`}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const arr = (Array.isArray(controllerField.value)
                              ? [...controllerField.value]
                              : []) as string[];
                            const v = String(opt.value);
                            const next = checked
                              ? [...arr, v]
                              : arr.filter((i) => i !== v);
                            controllerField.onChange(next);
                            onChange(key, next);
                          }}
                          className="nodrag"
                        />
                        <label htmlFor={`${key}-${opt.value}`} className="text-xs cursor-pointer">
                          {opt.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              {field.type === 'switch' && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={Boolean(controllerField.value)}
                    onCheckedChange={(v) => {
                      controllerField.onChange(v);
                      onChange(key, v);
                    }}
                    className="nodrag"
                    aria-invalid={fieldState.invalid}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {Boolean(controllerField.value) ? 'On' : 'Off'}
                  </span>
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
