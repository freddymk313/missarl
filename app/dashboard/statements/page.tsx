import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getClientAccountStatement } from "@/lib/db/statements";
import { StatementsViewer } from "@/components/dashboard/statements-viewer";

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
    <StatementsViewer
      clients={clients}
      statement={statement}
      selectedClientId={selectedClientId}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
