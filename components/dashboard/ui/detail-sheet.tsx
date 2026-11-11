"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  /** Pass true when a child dialog/modal is open to prevent the Sheet from closing on outside clicks */
  hasChildDialog?: boolean;
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
  hasChildDialog = false,
}: DetailSheetProps) {
  const isSheetOpen = open ?? isOpen ?? false;
  const isMobile = useIsMobile(640);

  /**
   * On mobile (< 640 px):  bottom sheet — full width, 94dvh max height, rounded top corners
   * On tablet (640-1023):  right drawer — sm:max-w-sm
   * On desktop (≥ 1024 px): right drawer — wider per size prop
   */
  const desktopSizeClasses: Record<string, string> = {
    default: "sm:max-w-md",
    lg: "sm:max-w-xl lg:max-w-2xl",
    xl: "sm:max-w-2xl lg:max-w-3xl",
  };

  const handleOpenChange = (newVal: boolean) => {
    // Block closing the sheet while a child dialog is open
    if (!newVal && hasChildDialog) return;
    if (onOpenChange) {
      onOpenChange(newVal);
    }
    if (!newVal && onClose) {
      onClose();
    }
  };

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            // Full width, rounded top, max 94dvh, flex column
            "w-full max-h-[94dvh] flex flex-col p-0 gap-0 overflow-hidden",
            "bg-card border-t border-border rounded-t-2xl",
            // Safe-area padding at the bottom for iOS notch / home bar
            "pb-safe",
            className,
          )}
        >
          {/* Drag handle pill for visual affordance */}
          <div className="shrink-0 flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
          </div>

          {/* Header */}
          <div className="border-b border-border px-5 pb-4 pt-2 bg-card/80 backdrop-blur-xs shrink-0">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-base font-bold tracking-tight text-foreground break-all">
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
            {tabs && <div className="mt-3.5 -mb-4">{tabs}</div>}
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
            {children}
          </div>

          {/* Sticky Action Footer */}
          {footer && (
            <div className="border-t border-border bg-card px-4 py-3 shrink-0 shadow-xs flex flex-wrap items-center justify-end gap-2.5 pb-safe">
              {footer}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop / Tablet: right-side drawer (original behaviour)
  return (
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        className={cn(
          "w-full flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border",
          desktopSizeClasses[size],
          className,
        )}
      >
        {/* Header with Title + ID chip + Status badge */}
        <div className="border-b border-border p-5 bg-card/80 backdrop-blur-xs shrink-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg font-bold tracking-tight text-foreground break-words">
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6">{children}</div>

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
