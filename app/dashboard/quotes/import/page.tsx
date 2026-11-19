import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getItems, getUnits } from "@/lib/db/items";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { RFQImporter } from "@/components/dashboard/rfq-importer";
import { Sparkles } from "lucide-react";

export default async function ImportRfqQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { clientId } = await searchParams;

  const [clients, items, units] = await Promise.all([
    getClients(),
    getItems({ activeOnly: true }),
    getUnits(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Importer une RFQ client avec Gemini"
        description="Analysez un PDF ou une image RFQ client, rapprochez les articles sur désignation et description, créez les articles manquants puis préremplissez le devis dans l'ordre d'origine."
        icon={Sparkles}
      />

      <RFQImporter
        clients={clients}
        initialItems={items}
        units={units}
        preselectedClientId={clientId}
      />
    </div>
  );
}
