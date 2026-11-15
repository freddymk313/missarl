import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  subvalue?: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral" | string;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const TONE_CLASSES: Record<
  NonNullable<StatTileProps["tone"]>,
  { icon: string; value: string }
> = {
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground",
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    value: "text-primary",
  },
  success: {
    icon: "bg-success/15 text-success",
    value: "text-success",
  },
  warning: {
    icon: "bg-warning/15 text-warning",
    value: "text-warning",
  },
  destructive: {
    icon: "bg-destructive/15 text-destructive",
    value: "text-destructive",
  },
};

export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  subvalue,
  subtext,
  tone = "default",
  className,
}: StatTileProps) {
  const finalSub = subtext || subvalue;
  const toneStyle = TONE_CLASSES[tone];

  const content = (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-border/80 hover:shadow-sm",
        href && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground truncate">{label}</span>
        {href && (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:bg-primary/10"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-3.5" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              toneStyle.icon
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight tabular-nums truncate",
                toneStyle.value
              )}
            >
              {value}
            </div>
            {finalSub && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{finalSub}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}

