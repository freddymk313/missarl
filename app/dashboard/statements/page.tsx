import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getClientAccountStatement } from "@/lib/db/statements";
import { StatementsViewer } from "@/components/dashboard/statements-viewer";

export default async function RelevesPage({
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
      <div>
        <p className="kicker">Comptabilité Tiers</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Relevés de Compte Clients
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Extrait chronologique des facturations et encaissements avec calcul du solde progressif et balance de clôture.
        </p>
      </div>

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
