import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMonthShort } from "./formatters";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  kicker?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  greetingDate?: Date | string;
}

export function PageHeader({
  kicker,
  title,
  description,
  icon,
  actions,
  greetingDate,
  className,
  children,
  ...props
}: PageHeaderProps) {
  const d = greetingDate
    ? typeof greetingDate === "string"
      ? new Date(greetingDate)
      : greetingDate
    : null;

  return (
    <div
      className={cn("flex flex-col gap-4 border-b border-border/80 pb-5", className)}
      {...props}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {d ? (
            <div className="flex size-11 flex-col items-center justify-center rounded-xl border border-border/80 bg-card shadow-2xs shrink-0 select-none">
              <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
                {formatMonthShort(d)}
              </span>
              <span className="text-base font-extrabold text-foreground leading-none tabular-nums">
                {d.getDate()}
              </span>
            </div>
          ) : icon ? (
            <div className="flex size-11 items-center justify-center rounded-xl border border-border/80 bg-secondary text-primary shadow-2xs shrink-0">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            {kicker && (
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-0.5">
                {kicker}
              </p>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

