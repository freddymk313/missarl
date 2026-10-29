import { requireSession } from "@/lib/auth";
import { getOrders } from "@/lib/db/orders";
import { getQuotations } from "@/lib/db/quotations";
import { OrdersManager } from "@/components/dashboard/orders-manager";

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
      <div>
        <p className="kicker">Exécution Commerciale</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Bons de Commande Clients (PO)
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Suivi des commandes fermes reçues, conformité avec les devis validés et déclenchement de la facturation.
        </p>
      </div>

      <OrdersManager
        initialOrders={orders}
        validatedQuotations={validatedQuotations}
        initialNewOrderQuoteId={newOrderFromQuoteId}
      />
    </div>
  );
}
