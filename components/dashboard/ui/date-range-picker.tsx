"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { formatFrenchShortDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  initialRange?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
  align?: "left" | "right";
}

function getDefaultRange(): DateRange {
  const d = new Date();
  const end = d.toISOString().split("T")[0];
  d.setDate(d.getDate() - 30);
  const start = d.toISOString().split("T")[0];
  return { startDate: start, endDate: end };
}

export function DateRangePicker({
  initialRange,
  onChange,
  className,
  align = "right",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(() => initialRange || getDefaultRange());

  const [tempStart, setTempStart] = useState<string>(() => range.startDate);
  const [tempEnd, setTempEnd] = useState<string>(() => range.endDate);

  // Month navigation for internal calendar
  const [viewDate, setViewDate] = useState(() => new Date());

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  // Adjust Monday = 0
  const adjustedFirstDay = (firstDayIndex + 6) % 7;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const totalDays = daysInMonth(currentYear, currentMonth);

  const handleDayClick = (day: number) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(formatted);
      setTempEnd("");
    } else {
      if (new Date(formatted) < new Date(tempStart)) {
        setTempEnd(tempStart);
        setTempStart(formatted);
      } else {
        setTempEnd(formatted);
      }
    }
  };

  const handleApply = () => {
    const finalStart = tempStart || range.startDate;
    const finalEnd = tempEnd || tempStart || range.endDate;
    const newRange = { startDate: finalStart, endDate: finalEnd };
    setRange(newRange);
    onChange?.(newRange);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempStart(range.startDate);
    setTempEnd(range.endDate);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        <span className="tabular-nums">
          {formatFrenchShortDate(range.startDate)} - {formatFrenchShortDate(range.endDate)}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "absolute z-50 mt-2 w-72 rounded-2xl border border-border bg-popover p-4 shadow-lg text-popover-foreground transition-all",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-3 text-xs font-semibold capitalize">
              <span>{monthName}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground mb-1">
              <span>Lu</span>
              <span>Ma</span>
              <span>Me</span>
              <span>Je</span>
              <span>Ve</span>
              <span>Sa</span>
              <span>Di</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isStart = tempStart === formatted;
                const isEnd = tempEnd === formatted;
                const isInRange =
                  tempStart &&
                  tempEnd &&
                  new Date(formatted) > new Date(tempStart) &&
                  new Date(formatted) < new Date(tempEnd);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors tabular-nums",
                      (isStart || isEnd) && "bg-primary text-primary-foreground font-bold shadow-xs",
                      isInRange && "bg-primary/10 text-primary rounded-none",
                      !isStart && !isEnd && !isInRange && "hover:bg-muted text-foreground"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={handleCancel}
                className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="h-8 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
              >
                Appliquer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
