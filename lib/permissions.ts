// ============================================================================
// Central Authorization Policy for MIS SARL
// Roles: SUPER_ADMIN, ADMIN, PRICE_COLLECTOR
// ============================================================================

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "PRICE_COLLECTOR";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  SUPER_ADMIN: {
    label: "Super Administrator",
    description: "Full system access, management of users, items and prices.",
  },
  ADMIN: {
    label: "Commercial Administrator",
    description: "Management of clients, quotations, orders, invoices, payments, and statements.",
  },
  PRICE_COLLECTOR: {
    label: "Price Collector",
    description: "Consultation and search in item catalog and pricing only.",
  },
};

export const permissions = {
  // Users & Administration
  canManageUsers: (role: UserRole) => role === "SUPER_ADMIN",
  canManageSettings: (role: UserRole) => role === "SUPER_ADMIN",
  canViewAuditLogs: (role: UserRole) => role === "SUPER_ADMIN",

  // Articles & Prices
  canReadArticles: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "PRICE_COLLECTOR",
  canManageArticles: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",

  // Clients & Suppliers
  canReadClients: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canManageClients: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canReadSuppliers: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canManageSuppliers: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",

  // Commercial Workflow
  canManageQuotations: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canManageOrders: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canManageInvoices: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canManageDeliveryNotes: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",

  // Financials
  canManagePayments: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
  canViewStatements: (role: UserRole) => role === "SUPER_ADMIN" || role === "ADMIN",
};

/**
 * Validates if a user role is authorized to view a dashboard sub-route
 */
export function isRouteAllowed(role: UserRole, path: string): boolean {
  if (role === "SUPER_ADMIN") return true;

  if (role === "PRICE_COLLECTOR") {
    // Price collector only allowed on /dashboard and /dashboard/articles
    return path === "/dashboard" || path.startsWith("/dashboard/articles");
  }

  if (role === "ADMIN") {
    // Admin blocked from users, audit logs, and settings
    if (
      path.startsWith("/dashboard/utilisateurs") ||
      path.startsWith("/dashboard/audit-logs") ||
      path.startsWith("/dashboard/parametres")
    ) {
      return false;
    }
    return true;
  }

  return false;
}
