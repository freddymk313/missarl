"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  renderMobileCard?: (row: TData, index: number) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  toolbar?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  renderMobileCard,
  onRowClick,
  emptyTitle = "Aucune donnée disponible",
  emptyDescription = "Aucun élément ne correspond à ces critères.",
  className,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const rows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const totalRows = table.getFilteredRowModel().rows.length;
  const startItem = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs",
        className
      )}
    >
      {toolbar}

      {/* Desktop view: Table */}
      <div className={cn("hidden md:block overflow-x-auto")}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border/80 bg-secondary/50 hover:bg-secondary/50"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className="py-3 px-4 text-xs font-semibold text-muted-foreground select-none"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 hover:text-foreground font-semibold"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {isSorted === "asc" ? (
                            <ArrowUp className="size-3 text-primary" />
                          ) : isSorted === "desc" ? (
                            <ArrowDown className="size-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "border-b border-border/60 transition-colors hover:bg-secondary/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-3.5 px-4 text-xs font-normal"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-44 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="size-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                    <p className="text-xs text-muted-foreground">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view (< md): Cards */}
      <div className="block md:hidden divide-y divide-border/60">
        {rows.length > 0 ? (
          rows.map((row, idx) => (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                "p-4 transition-colors hover:bg-secondary/40",
                onRowClick && "cursor-pointer"
              )}
            >
              {renderMobileCard ? (
                renderMobileCard(row.original, idx)
              ) : (
                <div className="space-y-2 text-xs">
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-muted-foreground text-[11px]">
                        {typeof cell.column.columnDef.header === "string"
                          ? cell.column.columnDef.header
                          : cell.column.id}
                      </span>
                      <div className="font-medium text-foreground">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Inbox className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="text-xs text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalRows > 0 && (
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/70 bg-card text-xs text-muted-foreground">
          <div className="tabular-nums">
            Affichage de <span className="font-medium text-foreground">{startItem}</span> à{" "}
            <span className="font-medium text-foreground">{endItem}</span> sur{" "}
            <span className="font-medium text-foreground">{totalRows}</span> élément{totalRows > 1 ? "s" : ""}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 gap-1 px-2.5 text-xs border-border/80"
            >
              <ChevronLeft className="size-3.5" />
              <span>Précédent</span>
            </Button>
            <span className="px-2 font-medium text-foreground tabular-nums">
              Page {pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 gap-1 px-2.5 text-xs border-border/80"
            >
              <span>Suivant</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

