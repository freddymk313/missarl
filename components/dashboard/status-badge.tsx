import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusCategory =
  | "quotation"
  | "order"
  | "invoice"
  | "delivery"
  | "payment"
  | "export"
  | "general";

interface StatusConfig {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
  struck?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Quotations
  DRAFT: {
    label: "Brouillon",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground border-border",
    textClass: "text-muted-foreground",
  },
  SUBMITTED: {
    label: "Soumis",
    dotClass: "bg-primary",
    bgClass: "bg-primary/10 text-primary border-primary/20",
    textClass: "text-primary",
  },
  VALIDATED: {
    label: "Validé",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },
  EXPIRED: {
    label: "Expiré",
    dotClass: "bg-warning",
    bgClass: "bg-warning/10 text-warning-foreground border-warning/25",
    textClass: "text-warning-foreground",
  },
  REJECTED: {
    label: "Rejeté",
    dotClass: "bg-destructive",
    bgClass: "bg-destructive/10 text-destructive border-destructive/20",
    textClass: "text-destructive",
  },
  CANCELLED: {
    label: "Annulé",
    dotClass: "bg-muted-foreground/60",
    bgClass: "bg-muted/70 text-muted-foreground/70 border-border",
    textClass: "text-muted-foreground line-through",
    struck: true,
  },

  // Orders
  PENDING: {
    label: "En attente",
    dotClass: "bg-warning",
    bgClass: "bg-warning/10 text-warning-foreground border-warning/25",
    textClass: "text-warning-foreground",
  },
  CONFIRMED: {
    label: "Confirmée",
    dotClass: "bg-primary",
    bgClass: "bg-primary/10 text-primary border-primary/20",
    textClass: "text-primary",
  },
  PARTIALLY_DELIVERED: {
    label: "Livrée partiellement",
    dotClass: "bg-warning",
    bgClass: "bg-warning/10 text-warning-foreground border-warning/25",
    textClass: "text-warning-foreground",
  },
  COMPLETED: {
    label: "Terminée",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },

  // Invoices
  ISSUED: {
    label: "Émise",
    dotClass: "bg-primary",
    bgClass: "bg-primary/10 text-primary border-primary/20",
    textClass: "text-primary",
  },
  PARTIALLY_PAID: {
    label: "Partiellement payée",
    dotClass: "bg-warning",
    bgClass: "bg-warning/10 text-warning-foreground border-warning/25",
    textClass: "text-warning-foreground",
  },
  PAID: {
    label: "Payée",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },
  OVERDUE: {
    label: "En retard",
    dotClass: "bg-destructive",
    bgClass: "bg-destructive/10 text-destructive border-destructive/20",
    textClass: "text-destructive",
  },

  // Delivery Notes
  PREPARED: {
    label: "Préparé",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground border-border",
    textClass: "text-muted-foreground",
  },
  IN_TRANSIT: {
    label: "En transit",
    dotClass: "bg-primary",
    bgClass: "bg-primary/10 text-primary border-primary/20",
    textClass: "text-primary",
  },
  DELIVERED: {
    label: "Livré",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },

  // Payments
  RECORDED: {
    label: "Enregistré",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground border-border",
    textClass: "text-muted-foreground",
  },
  RECONCILED: {
    label: "Rapproché",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },

  // Document Exports
  GENERATED: {
    label: "Généré",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },
  FAILED: {
    label: "Échec",
    dotClass: "bg-destructive",
    bgClass: "bg-destructive/10 text-destructive border-destructive/20",
    textClass: "text-destructive",
  },
  MODIFIED: {
    label: "Modifié",
    dotClass: "bg-warning",
    bgClass: "bg-warning/10 text-warning-foreground border-warning/25",
    textClass: "text-warning-foreground",
  },

  // General active / inactive
  ACTIVE: {
    label: "Actif",
    dotClass: "bg-success",
    bgClass: "bg-success/10 text-success border-success/20",
    textClass: "text-success",
  },
  INACTIVE: {
    label: "Inactif",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground border-border",
    textClass: "text-muted-foreground",
  },
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();
  const config = STATUS_MAP[normalized] || {
    label: status,
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground border-border",
    textClass: "text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none whitespace-nowrap",
        config.bgClass,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("size-1.5 rounded-full shrink-0", config.dotClass)}
          aria-hidden="true"
        />
      )}
      <span className={cn(config.struck && "line-through")}>{config.label}</span>
    </span>
  );
}

export const StatusPill = StatusBadge;
