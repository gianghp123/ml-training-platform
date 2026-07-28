"use client";

import { useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ExpressionInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  columns?: string[];
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = "e.g. Income / (Age + 1)",
  disabled = false,
  error,
  columns,
  ref,
}: ExpressionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    },
    [ref]
  );

  const lineCount = value.split("\n").length;

  const schedule =
    typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const next = value.slice(0, start) + "  " + value.slice(end);
        onChange(next);
        schedule(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange, schedule]
  );

  const handleChipClick = useCallback(
    (col: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        onChange(value + " " + col);
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const prefix = start > 0 && value[start - 1] !== " " ? " " : "";
      const suffix = end < value.length && value[end] !== " " ? " " : "";
      const insertion = prefix + col + suffix;
      const next = value.slice(0, start) + insertion + value.slice(end);
      onChange(next);
      schedule(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + insertion.length;
      });
    },
    [value, onChange, schedule]
  );

  return (
    <div className="space-y-1">
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between bg-zinc-900 px-3 py-1">
          <span className="text-xs text-zinc-400 font-mono">expression</span>
          <Badge
            variant="outline"
            className="text-[10px] h-4 px-1.5 border-zinc-700 text-zinc-400"
          >
            DSL
          </Badge>
        </div>
        <div className="flex bg-zinc-950">
          <div
            className="flex flex-col items-end select-none border-r border-zinc-800 px-2 py-2 text-xs leading-relaxed text-zinc-600 font-mono"
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <Textarea
            ref={setRefs}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={cn(
              "min-h-[6rem] resize-y border-0 rounded-none bg-transparent px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed",
              disabled && "opacity-50"
            )}
          />
        </div>
      </div>

      {columns && columns.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <span className="text-xs text-muted-foreground mr-1">Insert:</span>
          {columns.map((col) => (
            <Badge
              key={col}
              variant="outline"
              className="cursor-pointer text-xs h-5 px-2 hover:bg-muted"
              onClick={() => handleChipClick(col)}
            >
              {col}
            </Badge>
          ))}
        </div>
      ) : null}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
