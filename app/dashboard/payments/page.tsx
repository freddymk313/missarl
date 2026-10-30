import { requireSession } from "@/lib/auth";
import { getPayments } from "@/lib/db/payments";
import { getClients } from "@/lib/db/clients";
import { getInvoices } from "@/lib/db/invoices";
import { PaymentsManager } from "@/components/dashboard/payments-manager";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; invoiceId?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { clientId, invoiceId } = await searchParams;

  const [payments, clients, unpaidInvoices] = await Promise.all([
    getPayments(),
    getClients(),
    getInvoices({ status: "ISSUED" }),
  ]);

  return (
    <PaymentsManager
      initialPayments={payments}
      clients={clients}
      unpaidInvoices={unpaidInvoices}
      preselectedClientId={clientId}
      preselectedInvoiceId={invoiceId}
    />
  );
}
