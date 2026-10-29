import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getClientById } from "@/lib/db/clients";
import { getQuotations } from "@/lib/db/quotations";
import { getOrders } from "@/lib/db/orders";
import { getInvoices } from "@/lib/db/invoices";
import { getPayments } from "@/lib/db/payments";
import { getClientAccountStatement } from "@/lib/db/statements";
import { ClientWorkspace } from "@/components/dashboard/client-workspace";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { clientId } = await params;

  const client = await getClientById(clientId);
  if (!client) {
    notFound();
  }

  const [quotations, orders, invoices, payments, statement] = await Promise.all([
    getQuotations({ clientId }),
    getOrders({ clientId }),
    getInvoices({ clientId }),
    getPayments({ clientId }),
    getClientAccountStatement(clientId),
  ]);

  return (
    <div className="max-w-7xl">
      <ClientWorkspace
        client={client}
        quotations={quotations}
        orders={orders}
        invoices={invoices}
        payments={payments}
        statement={statement}
      />
    </div>
  );
}
