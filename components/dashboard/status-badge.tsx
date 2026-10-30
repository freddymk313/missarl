import { cn } from "@/lib/utils";

export interface StatusConfig {
  label: string;
  pillClasses: string;
  dotClasses: string;
  struck?: boolean;
}

export const STATUS_MAP: Record<string, StatusConfig> = {
  // Quotations
  DRAFT: {
    label: "Brouillon",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  },
  SUBMITTED: {
    label: "Soumis",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  VALIDATED: {
    label: "Validé",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },
  EXPIRED: {
    label: "Expiré",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  REJECTED: {
    label: "Rejeté",
    pillClasses: "bg-destructive/15 text-destructive border-destructive/30",
    dotClasses: "bg-destructive",
  },
  CANCELLED: {
    label: "Annulé",
    pillClasses: "bg-muted text-muted-foreground border-border opacity-70",
    dotClasses: "bg-muted-foreground",
    struck: true,
  },

  // Orders
  PENDING: {
    label: "En attente",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  CONFIRMED: {
    label: "Confirmée",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  PARTIALLY_DELIVERED: {
    label: "Livrée partiellement",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  COMPLETED: {
    label: "Terminée",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },

  // Invoices
  ISSUED: {
    label: "Émise",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  PARTIALLY_PAID: {
    label: "Partiellement payée",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  PAID: {
    label: "Payée",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },
  OVERDUE: {
    label: "En retard",
    pillClasses: "bg-destructive/15 text-destructive border-destructive/30",
    dotClasses: "bg-destructive",
  },

  // Delivery notes
  PREPARED: {
    label: "Préparé",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  },
  IN_TRANSIT: {
    label: "En transit",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  DELIVERED: {
    label: "Livré",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },

  // Payments
  RECORDED: {
    label: "Enregistré",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  },
  RECONCILED: {
    label: "Rapproché",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },

  // Document exports
  GENERATED: {
    label: "Généré",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },
  FAILED: {
    label: "Échec",
    pillClasses: "bg-destructive/15 text-destructive border-destructive/30",
    dotClasses: "bg-destructive",
  },
  MODIFIED: {
    label: "Modifié",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = (status || "").toUpperCase();
  const config = STATUS_MAP[normalized] || {
    label: status || "—",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap select-none transition-colors",
        config.pillClasses,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClasses)} aria-hidden="true" />
      <span className={config.struck ? "line-through" : ""}>{config.label}</span>
    </span>
  );
}
