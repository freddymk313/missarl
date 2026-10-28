import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getItems } from "@/lib/db/items";
import { QuotationWizard } from "@/components/dashboard/quotation-wizard";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { clientId } = await searchParams;

  const [clients, items] = await Promise.all([
    getClients(),
    getItems({ activeOnly: true }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="kicker">Élaboration Commerciale</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Nouveau Devis / Facture Proforma
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          La référence interne unique sera générée de façon transactionnelle par le système pour le client sélectionné.
        </p>
      </div>

      <QuotationWizard
        clients={clients}
        items={items}
        preselectedClientId={clientId}
      />
    </div>
  );
}
