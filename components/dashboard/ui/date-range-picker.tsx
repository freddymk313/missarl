"use client";

import * as React from "react";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "./formatters";

export interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  onApply?: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  defaultValue,
  onChange,
  onApply,
  className,
  placeholder = "Filtrer par date",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(
    defaultValue
  );

  const range = value !== undefined ? value : internalRange;

  const handleSelect = (selected: DateRange | undefined) => {
    setInternalRange(selected);
    onChange?.(selected);
  };

  const handleApply = () => {
    onApply?.(range);
    setOpen(false);
  };

  const handleCancel = () => {
    setInternalRange(value ?? defaultValue);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalRange(undefined);
    onChange?.(undefined);
    onApply?.(undefined);
  };

  const label = React.useMemo(() => {
    if (range?.from) {
      if (range.to) {
        return `${formatDate(range.from)} — ${formatDate(range.to)}`;
      }
      return `Depuis le ${formatDate(range.from)}`;
    }
    return placeholder;
  }, [range, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !range?.from && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">{label}</span>
        {range?.from && (
          <span
            onClick={handleClear}
            className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            role="button"
            tabIndex={0}
            aria-label="Effacer les dates"
          >
            <X className="size-3" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-3 bg-card border-border shadow-lg"
      >
        <Calendar
          mode="range"
          defaultMonth={range?.from || new Date()}
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={1}
          locale={fr}
          className="rounded-md border-0"
        />
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 text-xs font-medium"
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
