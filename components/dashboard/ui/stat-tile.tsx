import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
}

export function StatTile({
  label,
  value,
  subtitle,
  icon,
  href,
  className,
  ...props
}: StatTileProps) {
  const content = (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-border hover:shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
        {href && (
          <span className="size-6 rounded-full border border-border/80 bg-secondary/50 text-muted-foreground flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:border-primary/30">
            <ArrowUpRight className="size-3.5" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums truncate">
          {value}
        </div>
        {icon && (
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

