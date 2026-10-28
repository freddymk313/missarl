import { requireSession } from "@/lib/auth";
import { getItems } from "@/lib/db/items";
import { getSuppliers } from "@/lib/db/suppliers";
import { ArticlesManager } from "@/components/dashboard/articles-manager";

export default async function ArticlesPage() {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN", "PRICE_COLLECTOR"]);
  const [items, suppliers] = await Promise.all([
    getItems({ activeOnly: false }),
    getSuppliers(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Catalogue Industriel</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Articles & Tarifs en Vigueur
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Consultation des équipements, pièces d&apos;usure minière, fournitures et gestion des prix de vente.
        </p>
      </div>

      <ArticlesManager
        initialItems={items}
        suppliers={suppliers}
        role={session.role}
      />
    </div>
  );
}
