import { requireSession } from "@/lib/auth";
import { getPayments } from "@/lib/db/payments";
import { getClients } from "@/lib/db/clients";
import { getInvoices } from "@/lib/db/invoices";
import { PaymentsManager } from "@/components/dashboard/payments-manager";
import { CreditCard, ShieldCheck } from "lucide-react";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; invoice?: string }>;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          
          <div>
            
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Règlements & Paiements Reçus
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enregistrement des versements bancaires, justification par bordereau et affectation multi-factures.
            </p>
          </div>
        </div>
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