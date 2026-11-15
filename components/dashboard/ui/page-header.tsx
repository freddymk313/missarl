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
  eyebrow?: string;
  icon?: React.ComponentType<{ className?: string }>;
  calendarChip?: { month: string; day: string };
  badge?: React.ReactNode;
  action?: React.ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  calendarChip,
  badge,
  action,
  tabs,
  activeTab,
  onTabChange,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-xs border-l-4 border-l-accent",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          {calendarChip && (
            <div className="flex flex-col items-center justify-center size-12 sm:size-13 rounded-xl bg-secondary/80 border border-border shrink-0 shadow-2xs select-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-accent leading-none">
                {calendarChip.month}
              </span>
              <span className="text-base sm:text-lg font-black text-primary leading-none mt-1 tabular-nums">
                {calendarChip.day}
              </span>
            </div>
          )}

          {!calendarChip && Icon && (
            <div className="flex size-11 sm:size-12 items-center justify-center rounded-xl bg-secondary/80 border border-border text-primary shrink-0 shadow-2xs">
              <Icon className="size-5" />
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">
                {eyebrow}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {action && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
            {action}
          </div>
        )}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-6 text-xs font-semibold overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "relative pb-2.5 transition-colors whitespace-nowrap outline-none cursor-pointer",
                  isActive
                    ? "text-primary font-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
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
