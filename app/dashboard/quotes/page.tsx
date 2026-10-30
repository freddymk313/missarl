import { requireSession } from "@/lib/auth";
import { getQuotations } from "@/lib/db/quotations";
import { QuotationsList } from "@/components/dashboard/quotations-list";

export default async function QuotationsPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const quotations = await getQuotations();

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Chiffrages & Propositions</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Devis & Factures Proformas
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Suivi des devis miniers et industriels avec numérotation indépendante par client et préservation des prix d&apos;émission.
        </p>
      </div>

      <QuotationsList initialQuotations={quotations} />
    </div>
  );
}
