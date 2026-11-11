import { requireSession } from "@/lib/auth";
import { getOrders } from "@/lib/db/orders";
import { getQuotations } from "@/lib/db/quotations";
import { OrdersManager } from "@/components/dashboard/orders-manager";
import { ShoppingCart, ShieldCheck } from "lucide-react";

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ newOrderFromQuoteId?: string }>;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const { newOrderFromQuoteId } = await searchParams;

  const [orders, validatedQuotations] = await Promise.all([
    getOrders(),
    getQuotations({ status: "VALIDATED" }),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Customer Purchase Orders (PO)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track firm orders received, verify compliance with validated quotations, and trigger delivery notes & invoicing.
            </p>
          </div>
        </div>

      </div>

      <OrdersManager
        initialOrders={orders}
        validatedQuotations={validatedQuotations}
        initialNewOrderQuoteId={newOrderFromQuoteId}
      />
    </div>
  );
}