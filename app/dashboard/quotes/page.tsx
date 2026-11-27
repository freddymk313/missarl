import { requireSession } from "@/lib/auth";
import {
  getQuotationsPaginated,
  getQuotationStats,
  normalizeQuotationsPaginationParams,
} from "@/lib/db/quotations";
import { QuotationsList } from "@/components/dashboard/quotations-list";
import { PageHeader } from "@/components/dashboard/ui/page-header";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    docType?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const sp = await searchParams;

  const normalized = normalizeQuotationsPaginationParams({
    search: sp.q,
    status: sp.status,
    docType: sp.docType,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: sp.pageSize ? Number(sp.pageSize) : 25,
  });

  const [initialPageData, initialStats] = await Promise.all([
    getQuotationsPaginated(normalized),
    getQuotationStats(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Quotations & Proforma Invoices"
        description="Track mining and industrial quotations with client-specific sequential numbering and preserved pricing snapshots."
      />

      <QuotationsList
        initialQuotations={initialPageData.quotations}
        initialTotalCount={initialPageData.totalCount}
        initialPage={initialPageData.page}
        initialPageSize={initialPageData.pageSize}
        initialTotalPages={initialPageData.totalPages}
        initialStats={initialStats}
        initialSearch={normalized.search}
        initialStatus={normalized.status}
        initialDocType={normalized.docType}
      />
    </div>
  );
}
