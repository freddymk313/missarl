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
    <QuotationWizard
      clients={clients}
      items={items}
      preselectedClientId={clientId}
    />
  );
}
