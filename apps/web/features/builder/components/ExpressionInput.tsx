"use client";

import { Input } from "@/components/ui/input";

export interface ExpressionInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = "e.g. Income / (Age + 1)",
  disabled = false,
  error,
}: ExpressionInputProps) {
  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="nodrag nopan h-6 text-xs font-mono"
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
