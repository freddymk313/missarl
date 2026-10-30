import * as React from "react";
import { cn } from "@/lib/utils";

export interface RefChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: "default" | "primary" | "muted";
}

export function RefChip({
  children,
  variant = "default",
  className,
  ...props
}: RefChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums transition-colors",
        variant === "default" && "border-border/80 bg-muted/60 text-foreground",
        variant === "primary" && "border-primary/20 bg-primary/10 text-primary",
        variant === "muted" && "border-border/50 bg-background text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

