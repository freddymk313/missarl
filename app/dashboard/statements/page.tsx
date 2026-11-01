import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getClientAccountStatement } from "@/lib/db/statements";
import { StatementsViewer } from "@/components/dashboard/statements-viewer";
import { FileText, ShieldCheck } from "lucide-react";

export default async function RelevesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { clientId, startDate, endDate } = await searchParams;

  const clients = await getClients();
  const selectedClientId = clientId || clients[0]?.id || "";

  const statement = selectedClientId
    ? await getClientAccountStatement(selectedClientId, startDate, endDate)
    : null;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Comptabilité Tiers
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Relevés de Compte Clients
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Extrait chronologique des facturations et encaissements avec calcul du solde progressif et balance de clôture.
            </p>
          </div>
        </div>

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