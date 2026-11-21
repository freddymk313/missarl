import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { getItems, getUnits } from "@/lib/db/items";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { RFQImporter } from "@/components/dashboard/rfq-importer";

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
        title="Import a Customer RFQ with Gemini"
        description="Analyze a PDF or image of a customer RFQ, match items by designation and description, create any missing items, and then pre-fill the quote in the original order."
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
