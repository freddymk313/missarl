import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  DASHBOARD_THEME_STORAGE_KEY,
  normalizeDashboardTheme,
  type DashboardTheme,
} from "@/lib/dashboard-theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const rawTheme = cookieStore.get(DASHBOARD_THEME_STORAGE_KEY)?.value;
  const initialTheme: DashboardTheme = normalizeDashboardTheme(rawTheme);

  return (
    <DashboardShell user={session} initialTheme={initialTheme}>
      {children}
    </DashboardShell>
  );
}
