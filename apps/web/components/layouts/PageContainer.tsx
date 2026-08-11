import { cn } from "@/lib/utils";
import * as React from "react";

interface PageContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-5 py-6 lg:px-8 lg:py-8", className)}>
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/6 pb-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="studio-eyebrow">ML workspace</div>
          <h1 className="text-[26px] leading-none font-semibold tracking-[-0.035em] text-foreground">
            {title}
          </h1>

          {description && (
            <p className="max-w-2xl text-[13px] leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div>{children}</div>

      {footer && (
        <div className="border-t border-white/7 pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
