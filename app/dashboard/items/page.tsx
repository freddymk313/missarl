import { requireSession } from "@/lib/auth";
import { getItems } from "@/lib/db/items";
import { getSuppliers } from "@/lib/db/suppliers";
import { ArticlesManager } from "@/components/dashboard/articles-manager";

export default async function ItemsPage() {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN", "PRICE_COLLECTOR"]);
  const [items, suppliers] = await Promise.all([
    getItems({ activeOnly: false }),
    getSuppliers(),
  ]);

  return (
    <ArticlesManager
      initialItems={items}
      suppliers={suppliers}
      role={session.role}
    />
  );
}
