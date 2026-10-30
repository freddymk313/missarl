"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

export interface Column<T extends Record<string, unknown> = Record<string, unknown>> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFilter?: (row: T, search: string) => boolean;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  primaryAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  mobileCardRenderer?: (row: T, index: number) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  className?: string;
}

export function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = "Rechercher...",
  searchFilter,
  onRefresh,
  onExportCsv,
  primaryAction,
  onRowClick,
  mobileCardRenderer,
  emptyTitle = "Aucun élément trouvé",
  emptyDescription = "Aucun enregistrement ne correspond aux critères actuels.",
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageIndex, setPageIndex] = useState(0);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    if (searchFilter) {
      return data.filter((row) => searchFilter(row, searchTerm.toLowerCase()));
    }
    return data.filter((row) => {
      const stringified = JSON.stringify(row).toLowerCase();
      return stringified.includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, searchFilter]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aVal = a[sortKey] as string | number | undefined | null;
      const bVal = b[sortKey] as string | number | undefined | null;
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return sortOrder === "asc" ? -1 : 1;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const rowCount = sortedData.length;
  const pageCount = Math.ceil(rowCount / pageSize);
  const paginatedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pageIndex, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Table Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPageIndex(0);
            }}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-xs font-medium placeholder:text-muted-foreground outline-hidden focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors shadow-2xs"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/80">
            ⌘F
          </kbd>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
              title="Actualiser les données"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
              title="Télécharger l'extrait CSV"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Télécharger CSV</span>
            </button>
          )}

          {primaryAction}
        </div>
      </div>

      {/* Desktop / Tablet Table View (>= md) */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50 border-b border-border">
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "h-10 text-xs font-bold text-muted-foreground px-4 py-2 uppercase tracking-wider",
                      col.className
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1.5 select-none",
                        col.sortable && "cursor-pointer hover:text-foreground"
                      )}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      {col.header}
                      {col.sortable && (
                        <ArrowUpDown className="size-3 text-muted-foreground/60 shrink-0" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {paginatedData.length ? (
                paginatedData.map((row, rowIdx) => (
                  <TableRow
                    key={rowIdx}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn("px-4 py-3 text-xs", col.className)}>
                        {col.cell(row, rowIdx)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-44 text-center">
                    <EmptyState
                      icon={FolderOpen}
                      title={emptyTitle}
                      description={emptyDescription}
                      className="border-none bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Desktop Pagination */}
        {rowCount > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card text-xs text-muted-foreground">
            <div className="tabular-nums">
              Affichage de{" "}
              <span className="font-semibold text-foreground">
                {pageIndex * pageSize + 1}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-foreground">
                {Math.min((pageIndex + 1) * pageSize, rowCount)}
              </span>{" "}
              sur <span className="font-semibold text-foreground">{rowCount}</span> entrées
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="size-7 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Page précédente"
              >
                <ChevronLeft className="size-3.5" />
              </button>

              <span className="px-2 text-xs font-semibold text-foreground tabular-nums">
                Page {pageIndex + 1} / {Math.max(1, pageCount)}
              </span>

              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                disabled={pageIndex >= pageCount - 1}
                className="size-7 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Page suivante"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {paginatedData.length ? (
          paginatedData.map((row, idx) => {
            if (mobileCardRenderer) {
              return (
                <div
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {mobileCardRenderer(row, idx)}
                </div>
              );
            }
            return (
              <div
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5",
                  onRowClick && "cursor-pointer active:scale-[0.99] transition-transform"
                )}
              >
                {columns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">{col.header}</span>
                    <div className="text-right">{col.cell(row, idx)}</div>
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={FolderOpen}
            title={emptyTitle}
            description={emptyDescription}
          />
        )}
      </div>
    </div>
  );
}
