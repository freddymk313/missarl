"use client";

/**
 * ResponsiveModal
 *
 * A standardised wrapper that replaces the ad-hoc
 * `fixed inset-0 z-50 flex items-center justify-center` pattern used
 * throughout the dashboard.
 *
 * Behaviour:
 *   • Mobile (< 640 px)   — slides up from the bottom as a full-width sheet
 *   • Desktop (≥ 640 px)  — centred dialog, constrained to `maxWidth`
 *
 * Usage:
 *   <ResponsiveModal open={isOpen} onClose={() => setIsOpen(false)} title="…">
 *     <form …>…</form>
 *   </ResponsiveModal>
 */

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";

export interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Optional icon or badge beside the title */
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  /** Desktop max-width class. Defaults to "max-w-lg" */
  maxWidthClass?: string;
  /** Pass "danger" to colour the header red (delete confirmations, etc.) */
  variant?: "default" | "danger";
  className?: string;
}

export function ResponsiveModal({
  open,
  onClose,
  title,
  titleIcon,
  children,
  maxWidthClass = "max-w-lg",
  variant = "default",
  className,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile(640);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  if (!open) return null;

  const headerColour =
    variant === "danger" ? "text-destructive" : "text-primary";

  if (isMobile) {
    // ── Mobile bottom-sheet layout ──────────────────────────────────────────
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-foreground/40 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sheet Panel */}
        <div
          className={cn(
            "relative w-full rounded-t-2xl bg-card border-t border-border shadow-xl",
            "max-h-[94dvh] flex flex-col",
            "animate-in slide-in-from-bottom duration-200",
            className,
          )}
        >
          {/* Drag handle */}
          <div className="shrink-0 flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-2 border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {titleIcon}
              <h3 className={cn("text-base font-extrabold truncate", headerColour)}>
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-safe">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop / Tablet centered dialog ───────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div
        className={cn(
          "relative w-full rounded-2xl bg-card border border-border shadow-xl",
          "max-h-[90dvh] flex flex-col",
          maxWidthClass,
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {titleIcon}
            <h3 className={cn("text-base font-extrabold truncate", headerColour)}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

