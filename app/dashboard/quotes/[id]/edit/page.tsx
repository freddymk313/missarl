import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import { getQuotationById, checkQuotationEligibility } from "@/lib/db/quotations";
import { QuotationWizard } from "@/components/dashboard/quotation-wizard";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { ArrowLeft, AlertCircle, ShieldAlert, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { id } = await params;

  const [quotation, clients, items] = await Promise.all([
    getQuotationById(id),
    getClients(),
    getItems({ activeOnly: true }),
  ]);

  if (!quotation) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-border bg-card shadow-xs text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground">Devis introuvable</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Le devis demandé n&apos;existe pas ou a été supprimé.
          </p>
        </div>
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="size-4" /> Retour aux Devis
        </Link>
      </div>
    );
  }

  const eligibility = await checkQuotationEligibility(quotation.id, quotation.status);

  if (!eligibility.eligible) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-warning/30 bg-warning/10 shadow-xs text-center space-y-4">
        <div className="size-12 rounded-full bg-warning/20 text-warning flex items-center justify-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground">
            Modification non autorisée
          </h2>
          <p className="text-xs font-mono font-bold text-muted-foreground mt-1">
            {quotation.internalReference} — Statut: {quotation.status}
          </p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            {eligibility.reason}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="size-4" /> Retour aux Devis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={FileSpreadsheet}
        title="Modifier le Devis / Proforma"
        description={`Modification de ${quotation.internalReference} pour ${quotation.clientName}. La référence et l'historique restent préservés.`}
      />

      <QuotationWizard
        mode="edit"
        initialQuotation={quotation}
        initialLines={quotation.items || []}
        clients={clients}
        items={items}
      />
    </div>
  );
}

