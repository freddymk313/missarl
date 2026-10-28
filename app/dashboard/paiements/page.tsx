import { requireSession } from "@/lib/auth";
import { getPayments } from "@/lib/db/payments";
import { getClients } from "@/lib/db/clients";
import { getInvoices } from "@/lib/db/invoices";
import { PaymentsManager } from "@/components/dashboard/payments-manager";

export default async function PaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; invoice?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { client, invoice } = await searchParams;

  const [payments, clients, allInvoices] = await Promise.all([
    getPayments(),
    getClients(),
    getInvoices(),
  ]);

  const unpaidInvoices = allInvoices.filter(
    (i) => i.status !== "CANCELLED" && i.balanceDue > 0
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Trésorerie & Encaissements</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Règlements & Paiements Reçus
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enregistrement des versements bancaires, justification par bordereau et affectation multi-factures.
        </p>
      </div>

      <PaymentsManager
        initialPayments={payments}
        clients={clients}
        unpaidInvoices={unpaidInvoices}
        preselectedClientId={client}
        preselectedInvoiceId={invoice}
      />
    </div>
  );
}
