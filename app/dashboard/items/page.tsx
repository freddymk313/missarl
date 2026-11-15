import { requireSession } from "@/lib/auth";
import {
  searchItems,
  getItemStats,
  getItemCategories,
  getBrands,
  getUnits,
  getCurrencies,
  getExchangeRates,
} from "@/lib/db/items";
import { getSuppliers } from "@/lib/db/suppliers";
import { getClients } from "@/lib/db/clients";
import { Package } from "lucide-react";
import { ArticlesManager } from "@/components/dashboard/articles-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";

export default async function ItemsPage() {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN", "PRICE_COLLECTOR"]);

  const [
    items,
    stats,
    categories,
    brands,
    units,
    suppliers,
    clients,
    currencies,
    exchangeRates,
  ] = await Promise.all([
    searchItems(""),
    getItemStats(),
    getItemCategories(),
    getBrands(),
    getUnits(),
    getSuppliers(),
    getClients(),
    getCurrencies(),
    getExchangeRates(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Items & Sourcing Catalog"
        description="Multi-code product database (client codes, MPN, supplier codes) with buy-on-demand supplier pricing."
      />

      <ArticlesManager
        initialItems={items}
        stats={stats}
        categories={categories}
        brands={brands}
        units={units}
        suppliers={suppliers}
        clients={clients}
        currencies={currencies}
        exchangeRates={exchangeRates}
        role={session.role}
      />
    </div>
  );
}
