export const DASHBOARD_THEME_STORAGE_KEY = "missarl-dashboard-theme";

export type DashboardTheme = "light" | "dark" | "midnight";

export function normalizeDashboardTheme(value: unknown): DashboardTheme {
  if (value === "dark" || value === "midnight") {
    return value;
  }
  return "light";
}
