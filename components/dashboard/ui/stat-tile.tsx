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
  className?: string;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  subvalue,
  subtext,
  className,
}: StatTileProps) {
  const finalSub = subtext || subvalue;

  const content = (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-border/80 hover:shadow-sm",
        href && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground truncate">{label}</span>
        {href && (
          <span
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:bg-primary/10"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-3.5" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </div>
            {finalSub && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{finalSub}</p>
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
