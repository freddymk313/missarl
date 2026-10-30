"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DetailSheetProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  badge?: React.ReactNode;
  statusBadge?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "default" | "lg" | "xl";
}

export function DetailSheet({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  badge,
  statusBadge,
  tabs,
  children,
  footer,
  className,
  size = "lg",
}: DetailSheetProps) {
  const isSheetOpen = open ?? isOpen ?? false;

  const sizeClasses = {
    default: "sm:max-w-md",
    lg: "sm:max-w-xl",
    xl: "sm:max-w-2xl",
  };

  const handleOpenChange = (newVal: boolean) => {
    if (onOpenChange) {
      onOpenChange(newVal);
    }
    if (!newVal && onClose) {
      onClose();
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        className={cn(
          "w-full flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border",
          sizeClasses[size],
          "data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-2xl sm:data-[side=bottom]:rounded-none",
          className
        )}
      >
        {/* Header with Title + ID chip + Status badge */}
        <div className="border-b border-border p-5 bg-card/80 backdrop-blur-xs shrink-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg font-bold tracking-tight text-foreground">
                  {title}
                </SheetTitle>
                {badge}
              </div>
              <SheetDescription className="sr-only">
                Détails complets de l&apos;élément sélectionné
              </SheetDescription>
            </div>
            {statusBadge && <div className="shrink-0">{statusBadge}</div>}
          </div>

          {tabs && <div className="mt-3.5 -mb-5">{tabs}</div>}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {children}
        </div>

        {/* Sticky Action Footer */}
        {footer && (
          <div className="border-t border-border bg-card p-4 shrink-0 shadow-xs flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
