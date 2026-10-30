import Link from "next/link";
import {
  Package,
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  ArrowRight,
  Search,
  ExternalLink,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  PageHeader,
  StatTile,
  StatusPill,
  MoneyText,
  RefChip,
  formatDate,
} from "@/components/dashboard/ui";

interface ItemStatsRow {
  total: number;
  categories: number;
}

interface QuoteStatsRow {
  total: number;
  validated: number;
  total_amount: number;
}

interface OrderStatsRow {
  total: number;
  active: number;
  total_amount: number;
}

interface InvoiceStatsRow {
  total: number;
  total_invoiced: number;
  total_receivables: number;
  unpaid_count: number;
}

interface PaymentStatsRow {
  total: number;
  total_collected: number;
}

interface RecentQuoteRow {
  id: string;
  internal_reference: string;
  client_name: string;
  total: number;
  status: string;
  document_date: string;
}

interface RecentInvoiceRow {
  id: string;
  invoice_number: string;
  client_name: string;
  total: number;
  balance_due: number;
  status: string;
  issue_date: string;
}

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const firstName = session?.fullName?.split(" ")[0] || "Collaborateur";

  // Price collector restricted view
  if (session?.role === "PRICE_COLLECTOR") {
    const itemStatsRows = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(DISTINCT category)::int as categories
      FROM items
      WHERE is_active = TRUE
    `;
    const itemStat = (itemStatsRows as unknown as ItemStatsRow[])[0] || {
      total: 0,
      categories: 0,
    };

    return (
      <div className="space-y-6 max-w-7xl">
        <PageHeader
          greetingDate={new Date()}
          title={`Bonjour, ${firstName}`}
          description="Espace de consultation du catalogue d'articles industriels et tarifs en vigueur."
        />

        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Articles au catalogue"
            value={itemStat.total}
            subtitle="Références actives avec tarifs"
            icon={<Package className="size-4" />}
            href="/dashboard/items"
          />
          <StatTile
            label="Catégories techniques"
            value={itemStat.categories}
            subtitle="Spécialités industrielles et minières"
            icon={<Layers className="size-4" />}
            href="/dashboard/items"
          />
        </div>

        {/* Quick Search & Explore Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Recherche dans le catalogue d&apos;articles
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consultez les prix de vente en USD, spécifications techniques et marques.
              </p>
            </div>
            <Link
              href="/dashboard/items"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
            >
              <Package className="size-3.5" />
              <span>Ouvrir le catalogue</span>
            </Link>
          </div>

          <div className="mt-5 max-w-md">
            <form action="/dashboard/items" method="GET" className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                placeholder="Désignation, marque ou référence SKU..."
                className="h-10 w-full rounded-xl border border-border/80 bg-secondary/30 pl-9 pr-24 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 items-center rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Rechercher
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin & Super Admin comprehensive metrics
  const [
    quoteStats,
    orderStats,
    invoiceStats,
    paymentStats,
    recentQuotesRows,
    recentInvoicesRows,
  ] = await Promise.all([
    sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'VALIDATED' THEN 1 END)::int as validated,
        COALESCE(SUM(total), 0)::float as total_amount
      FROM quotations
      WHERE status != 'CANCELLED'
    `,
    sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END)::int as active,
        COALESCE(SUM(total), 0)::float as total_amount
      FROM orders
      WHERE status != 'CANCELLED'
    `,
    sql`
      SELECT 
        COUNT(*)::int as total,
        COALESCE(SUM(total), 0)::float as total_invoiced,
        COALESCE(SUM(balance_due), 0)::float as total_receivables,
        COUNT(CASE WHEN balance_due > 0 THEN 1 END)::int as unpaid_count
      FROM invoices
      WHERE status != 'CANCELLED'
    `,
    sql`
      SELECT 
        COUNT(*)::int as total,
        COALESCE(SUM(amount), 0)::float as total_collected
      FROM payments
      WHERE status != 'CANCELLED'
    `,
    sql`
      SELECT 
        q.id, q.internal_reference, c.name as client_name, q.total::float, q.status, q.document_date::text
      FROM quotations q
      JOIN clients c ON q.client_id = c.id
      ORDER BY q.created_at DESC
      LIMIT 5
    `,
    sql`
      SELECT 
        i.id, i.invoice_number, c.name as client_name, i.total::float, i.balance_due::float, i.status, i.issue_date::text
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `,
  ]);

  const quoteStat = (quoteStats as unknown as QuoteStatsRow[])[0] || {
    total: 0,
    validated: 0,
    total_amount: 0,
  };
  const orderStat = (orderStats as unknown as OrderStatsRow[])[0] || {
    total: 0,
    active: 0,
    total_amount: 0,
  };
  const invoiceStat = (invoiceStats as unknown as InvoiceStatsRow[])[0] || {
    total: 0,
    total_invoiced: 0,
    total_receivables: 0,
    unpaid_count: 0,
  };
  const paymentStat = (paymentStats as unknown as PaymentStatsRow[])[0] || {
    total: 0,
    total_collected: 0,
  };

  const recentQuotes = recentQuotesRows as unknown as RecentQuoteRow[];
  const recentInvoices = recentInvoicesRows as unknown as RecentInvoiceRow[];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Overview Greeting Header */}
      <PageHeader
        greetingDate={new Date()}
        title={`Bonjour, ${firstName}`}
        description="Vue globale sur le portefeuille commercial, devis miniers et flux de trésorerie."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/quotes/new"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
            >
              <FileSpreadsheet className="size-3.5" />
              <span>Nouveau devis</span>
            </Link>
            <Link
              href="/dashboard/clients"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Building2 className="size-3.5" />
              <span>Clients</span>
            </Link>
          </div>
        }
      />

      {/* 4 KPI Tiles Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Devis émis"
          value={quoteStat.total}
          subtitle={
            <span className="flex items-center gap-1">
              <span className="font-semibold text-success">{quoteStat.validated} validés</span>
              <span>·</span>
              <MoneyText value={quoteStat.total_amount} className="text-muted-foreground" />
            </span>
          }
          icon={<FileSpreadsheet className="size-4" />}
          href="/dashboard/quotes"
        />

        <StatTile
          label="Bons de commande (PO)"
          value={orderStat.total}
          subtitle={
            <span className="flex items-center gap-1">
              <span className="font-semibold text-primary">{orderStat.active} en cours</span>
              <span>·</span>
              <MoneyText value={orderStat.total_amount} className="text-muted-foreground" />
            </span>
          }
          icon={<ShoppingCart className="size-4" />}
          href="/dashboard/orders"
        />

        <StatTile
          label="Créances à recouvrer"
          value={<MoneyText value={invoiceStat.total_receivables} />}
          subtitle={
            <span className="text-warning-foreground font-semibold">
              {invoiceStat.unpaid_count} facture(s) en attente
            </span>
          }
          icon={<Receipt className="size-4" />}
          href="/dashboard/invoices"
        />

        <StatTile
          label="Paiements encaissés"
          value={<MoneyText value={paymentStat.total_collected} />}
          subtitle={
            <span>
              {paymentStat.total} règlement(s) enregistré(s)
            </span>
          }
          icon={<CreditCard className="size-4" />}
          href="/dashboard/payments"
        />
      </div>

      {/* Main Overview Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Activity (Devis & Proformas) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  Derniers Devis & Proformas
                </h2>
              </div>
              <Link
                href="/dashboard/quotes"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Tout afficher</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-border/60">
              {recentQuotes.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Aucun devis créé pour le moment.
                </div>
              ) : (
                recentQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-secondary/30 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary shrink-0">
                        <FileSpreadsheet className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <RefChip>{q.internal_reference}</RefChip>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(q.document_date)}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground truncate mt-0.5">
                          {q.client_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <MoneyText value={q.total} className="text-foreground font-bold" />
                      <StatusPill status={q.status} />
                      <Link
                        href={`/dashboard/quotes`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        title="Voir le devis"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/70 text-right">
            <Link
              href="/dashboard/quotes/new"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Créer une nouvelle offre <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Right Column: Factures à surveiller & Créances */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning-foreground" />
                <h2 className="text-sm font-bold text-foreground">
                  Factures à surveiller
                </h2>
              </div>
              <Link
                href="/dashboard/invoices"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Factures</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-border/60">
              {recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Aucune facture en attente.
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-secondary/30 rounded-lg px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <RefChip>{inv.invoice_number}</RefChip>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(inv.issue_date)}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground truncate mt-0.5">
                        {inv.client_name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <MoneyText value={inv.total} className="text-foreground block" />
                      {inv.balance_due > 0 ? (
                        <span className="text-[10px] font-semibold text-destructive">
                          Solde: <MoneyText value={inv.balance_due} />
                        </span>
                      ) : (
                        <StatusPill status={inv.status} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground" />
              <span>Délai standard: 30 jours</span>
            </span>
            <Link
              href="/dashboard/invoices"
              className="font-semibold text-primary hover:underline"
            >
              Gérer les créances
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
