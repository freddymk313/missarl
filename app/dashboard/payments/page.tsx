import { requireSession } from "@/lib/auth";
import { getPayments } from "@/lib/db/payments";
import { getClients } from "@/lib/db/clients";
import { getInvoices } from "@/lib/db/invoices";
import { PaymentsManager } from "@/components/dashboard/payments-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { CreditCard } from "lucide-react";

export default async function PaymentsPage({
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
      <PageHeader
        title="Settlements & Payments Received"
        description="Record bank transfers, justify with payment slips, and allocate across multiple invoices."
      />

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
