import { requireSession } from "@/lib/auth";
import {
  searchItemsPaginated,
  getItemStats,
  getItemCategories,
  getBrands,
  getUnits,
  getCurrencies,
  getExchangeRates,
  type ItemsSortOption,
} from "@/lib/db/items";
import { getSuppliers } from "@/lib/db/suppliers";
import { getClients } from "@/lib/db/clients";
import { ArticlesManager } from "@/components/dashboard/articles-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
    categoryId?: string;
    supplierId?: string;
    sort?: string;
  }>;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN", "PRICE_COLLECTOR"]);
  const sp = await searchParams;

  const q = (sp.q || "").trim();
  const parsedPage = Number(sp.page || 1);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;
  const parsedSize = Number(sp.pageSize || 25);
  const pageSize =
    parsedSize === 25 || parsedSize === 50 || parsedSize === 100
      ? parsedSize
      : 25;
  const sort: ItemsSortOption =
    sp.sort === "designation" ? "designation" : "recent";
  const categoryId = sp.categoryId || "";
  const supplierId = sp.supplierId || "";

  const [
    initialPageData,
    stats,
    categories,
    brands,
    units,
    suppliers,
    clients,
    currencies,
    exchangeRates,
  ] = await Promise.all([
    searchItemsPaginated(q, {
      categoryId: categoryId || undefined,
      supplierId: supplierId || undefined,
      page,
      pageSize,
      sort,
      activeOnly: true,
    }),
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
        initialPageData={initialPageData}
        initialQuery={q}
        initialCategoryId={categoryId}
        initialSupplierId={supplierId}
        initialSort={sort}
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
