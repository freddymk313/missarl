import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getClientAccountStatement } from "@/lib/db/statements";
import { StatementsViewer } from "@/components/dashboard/statements-viewer";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { FileText } from "lucide-react";

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; startDate?: string; endDate?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { clientId, startDate, endDate } = await searchParams;

  const clients = await getClients();
  const selectedClientId = clientId || clients[0]?.id || "";

  const statement = selectedClientId
    ? await getClientAccountStatement(selectedClientId, startDate, endDate)
    : null;

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        eyebrow="Accounts Receivable"
        title="Client Account Statements"
        description="Chronological extract of invoices and receipts with running balance and closing balance."
      />

      <StatementsViewer
        clients={clients}
        statement={statement}
        selectedClientId={selectedClientId}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
