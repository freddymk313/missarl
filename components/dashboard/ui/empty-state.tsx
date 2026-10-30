import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground border border-border/60">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

