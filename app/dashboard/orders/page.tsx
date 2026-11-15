import { requireSession } from "@/lib/auth";
import { getOrders } from "@/lib/db/orders";
import { getQuotations } from "@/lib/db/quotations";
import { OrdersManager } from "@/components/dashboard/orders-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { ShoppingCart } from "lucide-react";

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ newOrderFromQuoteId?: string }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { newOrderFromQuoteId } = await searchParams;

  const [orders, validatedQuotations] = await Promise.all([
    getOrders(),
    getQuotations({ status: "VALIDATED" }),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Customer Purchase Orders (PO)"
        description="Track firm orders received, verify compliance with validated quotations, and trigger delivery notes & invoicing."
      />

      <OrdersManager
        initialOrders={orders}
        validatedQuotations={validatedQuotations}
        initialNewOrderQuoteId={newOrderFromQuoteId}
      />
    </div>
  );
}