import { requireSession } from "@/lib/auth";
import { getQuotations } from "@/lib/db/quotations";
import { QuotationsList } from "@/components/dashboard/quotations-list";
import { FileSpreadsheet, ShieldCheck } from "lucide-react";

export default async function QuotationsPage() {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const quotations = await getQuotations();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          <div>
           
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Quotations & Proforma Invoices
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track mining and industrial quotations with client-specific sequential numbering and preserved pricing snapshots.
            </p>
          </div>
        </div>
      </div>

      <QuotationsList initialQuotations={quotations} />
    </div>
  );
}