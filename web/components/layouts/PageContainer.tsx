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
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {title}
          </h1>

          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div>{children}</div>

      {footer && (
        <div className="border-t pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
