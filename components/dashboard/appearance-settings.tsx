"use client";

import React from "react";
import { Check, Moon, MoonStar, Palette, Sun } from "lucide-react";
import {
  useDashboardTheme,
  type DashboardTheme,
} from "@/components/dashboard/dashboard-theme-provider";
import { cn } from "@/lib/utils";

interface ThemeOptionMeta {
  id: DashboardTheme;
  label: string;
  shortLabel: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: "light",
    label: "Light Mode",
    shortLabel: "Light",
    subtitle: "Bright neutral interface",
    description: "Existing default appearance with crisp white cards and navy contrast.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark Navy",
    shortLabel: "Navy",
    subtitle: "Balanced navy interface",
    description: "Reduced brightness with deep navy surfaces for comfortable low-light use.",
    icon: Moon,
  },
  {
    id: "midnight",
    label: "Deep Dark",
    shortLabel: "Deep",
    subtitle: "New Quotation palette",
    description: "Ultra-deep primary background matching the New Quotation card tone.",
    icon: MoonStar,
  },
];

function getThemeMeta(theme: DashboardTheme): ThemeOptionMeta {
  return THEME_OPTIONS.find((opt) => opt.id === theme) ?? THEME_OPTIONS[0];
}

export function AppearanceSettings() {
  const { theme, setTheme } = useDashboardTheme();
  const activeMeta = getThemeMeta(theme);
  const ActiveIcon = activeMeta.icon;

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = THEME_OPTIONS[(currentIndex + 1) % THEME_OPTIONS.length];
      setTheme(next.id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev =
        THEME_OPTIONS[
          (currentIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length
        ];
      setTheme(prev.id);
    }
  };

  return (
    <section
      aria-labelledby="appearance-settings-heading"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4 transition-colors duration-150"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3
            id="appearance-settings-heading"
            className="text-sm font-black text-primary flex items-center gap-2"
          >
            <Palette className="size-4 text-accent shrink-0" /> Appearance
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Customize the visual appearance of your MIS SARL workspace.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] font-bold text-foreground">
          <ActiveIcon className="size-3 text-accent" />
          <span>Active: {activeMeta.label}</span>
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Dashboard visual appearance"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {THEME_OPTIONS.map((option, idx) => {
          const Icon = option.icon;
          const isActive = theme === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(option.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "group relative flex flex-col text-left rounded-xl border p-4 transition-all outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                  : "border-border bg-secondary/30 hover:bg-secondary/60 hover:border-border/90"
              )}
            >
              {/* Mini Theme Preview Swatch */}
              <div
                aria-hidden="true"
                className={cn(
                  "mb-3.5 w-full rounded-lg border p-2.5 transition-colors",
                  option.id === "light" && "bg-[#f4f6fa] border-[#dce2ec]",
                  option.id === "dark" && "bg-[#0d1522] border-[#2b3d57]",
                  option.id === "midnight" && "bg-[#060b14] border-[#1f2c40]"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md border flex items-center justify-center shrink-0",
                      option.id === "light" && "bg-white border-[#dce2ec]",
                      option.id === "dark" && "bg-[#131e30] border-[#2b3d57]",
                      option.id === "midnight" && "bg-[#0c1320] border-[#1f2c40]"
                    )}
                  >
                    <span className="size-2.5 rounded-full bg-[#f5c518]" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div
                      className={cn(
                        "h-2 w-2/3 rounded-full",
                        option.id === "light" ? "bg-[#0c3b6e]" : "bg-[#74a9e8]"
                      )}
                    />
                    <div
                      className={cn(
                        "h-1.5 w-1/2 rounded-full",
                        option.id === "light"
                          ? "bg-[#9aa8be]"
                          : option.id === "dark"
                          ? "bg-[#5a6c87]"
                          : "bg-[#4a5b75]"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border group-hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-foreground leading-tight">
                      {option.label}
                    </p>
                    <p className="text-[11px] font-semibold text-primary mt-0.5">
                      {option.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card text-transparent"
                  )}
                  aria-hidden="true"
                >
                  <Check className="size-3" />
                </span>
              </div>

              <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        This preference applies only to the internal dashboard on this browser. The public website always uses its default light appearance.
      </p>
    </section>
  );
}

export function DashboardThemeMenuSwitch({
  onSelect,
}: {
  onSelect?: (theme: DashboardTheme) => void;
}) {
  const { theme, setTheme } = useDashboardTheme();
  const activeMeta = getThemeMeta(theme);

  const handleSelect = (next: DashboardTheme) => {
    setTheme(next);
    onSelect?.(next);
  };

  return (
    <div className="px-2 py-2 border-b border-border/80 space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Appearance
        </span>
        <span className="text-[10px] font-semibold text-primary">
          {activeMeta.label}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Dashboard theme"
        className="grid grid-cols-3 gap-1 rounded-lg bg-secondary/80 p-1 border border-border/70"
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-bold transition-all outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-card text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-3 shrink-0", isActive && "text-accent")} />
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
