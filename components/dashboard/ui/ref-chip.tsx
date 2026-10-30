import React from "react";
import { cn } from "@/lib/utils";

export interface RefChipProps {
  label?: string;
  reference?: string | null | undefined;
  value?: string | null | undefined;
  children?: React.ReactNode;
  className?: string;
}

export function RefChip({ label, reference, value, children, className }: RefChipProps) {
  const displayVal = reference ?? value ?? children;
  if (!displayVal) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-foreground text-xs font-semibold tabular-nums whitespace-nowrap border border-border/80 tracking-tight",
        className
      )}
    >
      {label && <span className="text-muted-foreground font-normal">{label}:</span>}
      <span>{displayVal}</span>
    </span>
  );
}
