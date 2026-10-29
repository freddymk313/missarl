import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell user={session}>{children}</DashboardShell>;
}
