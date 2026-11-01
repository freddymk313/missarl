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
import { ArticlesManager } from "@/components/dashboard/articles-manager";

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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Items & Sourcing Catalog
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-code product database (client codes, MPN, supplier codes) with buy-on-demand supplier pricing.
            </p>
          </div>
        </div>
      </div>

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
