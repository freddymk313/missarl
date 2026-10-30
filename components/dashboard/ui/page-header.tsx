import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  calendarChip?: { month: string; day: string };
  action?: React.ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  calendarChip,
  action,
  tabs,
  activeTab,
  onTabChange,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 pb-2", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {calendarChip && (
            <div className="flex flex-col items-center justify-center size-11 rounded-xl bg-primary text-primary-foreground font-bold shadow-xs shrink-0 select-none">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-primary-foreground/80 leading-none">
                {calendarChip.month}
              </span>
              <span className="text-base font-extrabold leading-tight tabular-nums mt-0.5">
                {calendarChip.day}
              </span>
            </div>
          )}

          {!calendarChip && Icon && (
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary shrink-0 border border-border/80">
              <Icon className="size-5" />
            </div>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                {description}
              </p>
            )}
          </div>
        </div>

        {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-6 border-b border-border text-xs font-semibold overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "relative pb-3 transition-colors whitespace-nowrap outline-none",
                  isActive
                    ? "text-primary font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
