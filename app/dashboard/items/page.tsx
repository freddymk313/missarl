import { requireSession } from "@/lib/auth";
import { getItems } from "@/lib/db/items";
import { getSuppliers } from "@/lib/db/suppliers";
import { ArticlesManager } from "@/components/dashboard/articles-manager";
import { Package, ShieldCheck } from "lucide-react";

export default async function ItemsPage() {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN", "PRICE_COLLECTOR"]);
  const [items, suppliers] = await Promise.all([
    getItems({ activeOnly: false }),
    getSuppliers(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Articles & Tarifs en Vigueur
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultation des équipements, pièces d&apos;usure minière, fournitures et gestion des prix de vente.
            </p>
          </div>
        </div>
      </div>

      <ArticlesManager
        initialItems={items}
        suppliers={suppliers}
        role={session.role}
      />
    </div>
  );
}