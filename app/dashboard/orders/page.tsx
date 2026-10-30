import { requireSession } from "@/lib/auth";
import { getOrders } from "@/lib/db/orders";
import { getQuotations } from "@/lib/db/quotations";
import { OrdersManager } from "@/components/dashboard/orders-manager";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ quoteId?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { quoteId } = await searchParams;

  const [orders, quotations] = await Promise.all([
    getOrders(),
    getQuotations({ status: "VALIDATED" }),
  ]);

  return (
    <OrdersManager
      initialOrders={orders}
      validatedQuotations={quotations}
      initialNewOrderQuoteId={quoteId}
    />
  );
}
