import { requireSession } from "@/lib/auth";
import { getInvoices } from "@/lib/db/invoices";
import { InvoicesManager } from "@/components/dashboard/invoices-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { Receipt } from "lucide-react";

export default async function FacturesPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const invoices = await getInvoices();

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Sales Invoices & Delivery Notes"
        description="Track issued invoices, 16% VAT calculations, due dates, and payment statuses."
      />

      <InvoicesManager initialInvoices={invoices} />
    </div>
  );
}
