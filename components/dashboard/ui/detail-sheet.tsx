"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

export interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  chips?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  chips,
  children,
  footer,
  className,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-xl p-0 flex flex-col justify-between overflow-hidden bg-card border-border",
          "max-md:bottom-0 max-md:top-auto max-md:max-h-[92dvh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0",
          className
        )}
      >
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <SheetHeader className="space-y-2 pb-3 border-b border-border/80 text-left">
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  {title}
                </SheetTitle>
                {chips}
              </div>
              {badge}
            </div>
            {subtitle && (
              <SheetDescription className="text-xs text-muted-foreground">
                {subtitle}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="space-y-5 text-xs">{children}</div>
        </div>

        {footer && (
          <SheetFooter className="p-4 sm:p-5 border-t border-border/80 bg-secondary/30 shrink-0 flex-row items-center justify-end gap-2.5">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

