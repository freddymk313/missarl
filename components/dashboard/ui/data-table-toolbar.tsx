"use client";

import * as React from "react";
import { Search, SlidersHorizontal, RefreshCw, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filterContent?: React.ReactNode;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  extraActions?: React.ReactNode;
  activeFilterCount?: number;
  className?: string;
}

export function DataTableToolbar({
  searchPlaceholder = "Rechercher...",
  searchValue = "",
  onSearchChange,
  filterContent,
  onRefresh,
  onExportCsv,
  onAddNew,
  addNewLabel = "Ajouter",
  extraActions,
  activeFilterCount = 0,
  className,
}: DataTableToolbarProps) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+F / Cmd+F or /
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 bg-card",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2.5 max-w-md">
        {onSearchChange && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-border/80 bg-background pl-9 pr-12 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground select-none">
              ⌘F
            </kbd>
          </div>
        )}

        {filterContent && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 px-3 text-xs font-medium border-border/80 bg-card hover:bg-muted/60",
                    activeFilterCount > 0 && "border-primary text-primary bg-primary/5"
                  )}
                />
              }
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Filtres</span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-80 p-4 bg-card border-border shadow-lg"
            >
              <div className="space-y-3">{filterContent}</div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {extraActions}

        {onExportCsv && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExportCsv}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Télécharger CSV</span>
          </Button>
        )}

        {onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        )}

        {onAddNew && (
          <Button
            type="button"
            size="sm"
            onClick={onAddNew}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>{addNewLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

