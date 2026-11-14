import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import { getQuotationById, checkQuotationEligibility } from "@/lib/db/quotations";
import { QuotationWizard } from "@/components/dashboard/quotation-wizard";
import { ArrowLeft, AlertCircle, ShieldAlert } from "lucide-react";
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
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs text-center space-y-4">
        <div className="size-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-amber-900 dark:text-amber-200">
            Modification non autorisée
          </h2>
          <p className="text-xs font-mono font-bold text-muted-foreground mt-1">
            {quotation.internalReference} — Statut: {quotation.status}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 max-w-md mx-auto">
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
            Modifier le Devis / Proforma
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modification de <span className="font-mono font-bold text-foreground">{quotation.internalReference}</span> pour {quotation.clientName}. La référence et l&apos;historique restent préservés.
          </p>
        </div>
      </div>

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

