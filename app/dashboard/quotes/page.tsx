import { requireSession } from "@/lib/auth";
import { getQuotations } from "@/lib/db/quotations";
import { QuotationsList } from "@/components/dashboard/quotations-list";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { FileSpreadsheet } from "lucide-react";

export default async function QuotationsPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const quotations = await getQuotations();

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Quotations & Proforma Invoices"
        description="Track mining and industrial quotations with client-specific sequential numbering and preserved pricing snapshots."
      />

      <QuotationsList initialQuotations={quotations} />
    </div>
  );
}