import { requireSession } from "@/lib/auth";
import { getQuotations } from "@/lib/db/quotations";
import { QuotationsList } from "@/components/dashboard/quotations-list";

export default async function QuotesPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const quotations = await getQuotations();

  return <QuotationsList initialQuotations={quotations} />;
}
