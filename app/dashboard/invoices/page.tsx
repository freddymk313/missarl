import { requireSession } from "@/lib/auth";
import { getInvoices } from "@/lib/db/invoices";
import { InvoicesManager } from "@/components/dashboard/invoices-manager";

export default async function InvoicesPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const invoices = await getInvoices();

  return <InvoicesManager initialInvoices={invoices} />;
}
