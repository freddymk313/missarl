import * as React from "react";
import { cn } from "@/lib/utils";

export interface KeyValueTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export function KeyValueTile({
  label,
  value,
  icon,
  className,
  ...props
}: KeyValueTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-secondary/70 border border-border/70 p-2.5 flex flex-col justify-between gap-1 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-xs font-semibold text-foreground truncate tabular-nums">
        {value ?? "—"}
      </div>
    </div>
  );
}

