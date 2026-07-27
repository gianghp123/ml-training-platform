"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterCondition } from "@training-ml/contracts";

const NO_VALUE_OPS = new Set(["isNull", "isNotNull"]);

export interface ConditionListEditorProps {
  value: FilterCondition[];
  onChange: (next: FilterCondition[]) => void;
  ops: string[];
  columns: string[];
  disabled?: boolean;
}

export function ConditionListEditor({
  value,
  onChange,
  ops,
  columns,
  disabled = false,
}: ConditionListEditorProps) {
  const add = () => {
    const first = columns[0] ?? "";
    onChange([...value, { column: first, op: "eq" as const, value: "" }]);
  };

  const update = (index: number, patch: Partial<FilterCondition>) => {
    const next = value.map((cond, i) => (i === index ? { ...cond, ...patch } : cond));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      {value.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No conditions yet.</p>
      ) : (
        value.map((cond, index) => {
          const op = String(cond.op ?? "");
          const needsValue = !NO_VALUE_OPS.has(op);
          return (
            <div key={index} className="flex items-center gap-1">
              <Select
                value={String(cond.column ?? "")}
                onValueChange={(v) => update(index, { column: v })}
                disabled={disabled}
              >
                <SelectTrigger className="h-6 w-32 text-xs nodrag nopan" aria-label={`Column ${index + 1}`}>
                  <SelectValue placeholder="column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={op} onValueChange={(v) => update(index, { op: v })} disabled={disabled}>
                <SelectTrigger className="h-6 w-24 text-xs nodrag nopan" aria-label={`Operator ${index + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsValue && (
                <Input
                  className="nodrag nopan h-6 min-w-0 flex-1 text-xs"
                  value={cond.value === undefined || cond.value === null ? "" : String(cond.value)}
                  disabled={disabled}
                  onChange={(e) => update(index, { value: e.target.value })}
                  placeholder="value"
                  aria-label={`Value ${index + 1}`}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                onClick={() => remove(index)}
                aria-label={`Remove condition ${index + 1}`}
              >
                <X className="size-3" />
              </Button>
            </div>
          );
        })
      )}
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={disabled}
        onClick={add}
        className="nodrag nopan w-full"
      >
        <Plus className="size-3" />
        Add condition
      </Button>
    </div>
  );
}
