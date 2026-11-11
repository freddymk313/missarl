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
    label: "Draft",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  },
  SUBMITTED: {
    label: "Submitted",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  VALIDATED: {
    label: "Validated",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },
  EXPIRED: {
    label: "Expired",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  REJECTED: {
    label: "Rejected",
    pillClasses: "bg-destructive/15 text-destructive border-destructive/30",
    dotClasses: "bg-destructive",
  },
  CANCELLED: {
    label: "Cancelled",
    pillClasses: "bg-muted text-muted-foreground border-border opacity-70",
    dotClasses: "bg-muted-foreground",
    struck: true,
  },

  // Orders
  PENDING: {
    label: "Pending",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  CONFIRMED: {
    label: "Confirmed",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  PARTIALLY_DELIVERED: {
    label: "Partially Delivered",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  COMPLETED: {
    label: "Completed",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },

  // Invoices
  ISSUED: {
    label: "Issued",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    pillClasses: "bg-accent/20 text-accent-foreground border-accent/40",
    dotClasses: "bg-bronze",
  },
  PAID: {
    label: "Paid",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },
  OVERDUE: {
    label: "Overdue",
    pillClasses: "bg-destructive/15 text-destructive border-destructive/30",
    dotClasses: "bg-destructive",
  },

  // Delivery notes
  PREPARED: {
    label: "Prepared",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  },
  IN_TRANSIT: {
    label: "In Transit",
    pillClasses: "bg-primary/10 text-primary border-primary/20",
    dotClasses: "bg-primary",
  },
  DELIVERED: {
    label: "Delivered",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },

  // Payments
  RECORDED: {
    label: "Recorded",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotClasses: "bg-muted-foreground",
  },
  RECONCILED: {
    label: "Reconciled",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },

  // Document exports
  GENERATED: {
    label: "Generated",
    pillClasses: "bg-success/15 text-success border-success/30",
    dotClasses: "bg-success",
  },
  FAILED: {
    label: "Failed",
    pillClasses: "bg-destructive/15 text-destructive border-destructive/30",
    dotClasses: "bg-destructive",
  },
  MODIFIED: {
    label: "Modified",
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
