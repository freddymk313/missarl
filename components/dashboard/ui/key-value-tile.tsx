import React from "react";
import { cn } from "@/lib/utils";

interface KeyValueTileProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  subvalue?: string;
}

export function KeyValueTile({
  label,
  value,
  icon: Icon,
  className,
  subvalue,
}: KeyValueTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-secondary/70 p-3.5 border border-border/60 flex flex-col justify-between transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
        <span>{label}</span>
        {Icon && <Icon className="size-3.5 text-muted-foreground/80 shrink-0" />}
      </div>
      <div className="text-sm font-semibold text-foreground tracking-tight tabular-nums break-words">
        {value}
      </div>
      {subvalue && (
        <span className="text-[11px] text-muted-foreground mt-0.5">{subvalue}</span>
      )}
    </div>
  );
}
