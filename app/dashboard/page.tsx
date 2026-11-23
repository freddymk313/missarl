import Link from "next/link";
import {
  Package,
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileText,
  Clock,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatUSD, getCalendarChipData } from "@/lib/formatters";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { StatTile } from "@/components/dashboard/ui/stat-tile";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { RefChip } from "@/components/dashboard/ui/ref-chip";

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
  const calendarChip = getCalendarChipData();
  const firstName = session?.fullName?.split(" ")[0] || "Collaborator";

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
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center size-13 rounded-xl bg-secondary/80 border border-border shrink-0 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-accent">
                {calendarChip.month}
              </span>
              <span className="text-lg font-black text-primary leading-none mt-0.5">
                {calendarChip.day}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  Hello, {firstName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-foreground border border-accent/40">
                  Price Collector
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse and search all items in the MIS SARL industrial catalog.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/items"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-accent text-accent-foreground text-xs font-bold shadow-xs hover:bg-accent/90 transition-colors"
            >
              <Package className="size-4" /> Browse Catalog
            </Link>
          </div>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile
            label="Active catalog items"
            value={itemStat.total}
            icon={Package}
            href="/dashboard/items"
            subtext="Technical specifications and current pricing"
          />
          <StatTile
            label="Industrial categories"
            value={itemStat.categories}
            icon={CheckCircle2}
            href="/dashboard/items"
            subtext="Valves, pumps, electrical, mining hardware"
          />
        </div>

        {/* Catalogue Info Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3 border-l-4 border-l-accent">
          <h2 className="text-sm font-black text-primary flex items-center gap-2">
            <Layers className="size-4 text-accent" /> Catalog Read-Only Mode
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Your profile gives you read-only access to the Lubumbashi item
            database: full designations, SKU codes, approved brands, and current
            public pricing. For any modification or addition of a reference,
            please contact Commercial Management.
          </p>
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
      LIMIT 6
    `,
    sql`
      SELECT 
        i.id, i.invoice_number, c.name as client_name, i.total::float, i.balance_due::float, i.status, i.issue_date::text
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.balance_due > 0 AND i.status != 'CANCELLED'
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

  // Compute collection rate percentage
  const collectionRate =
    invoiceStat.total_invoiced > 0
      ? Math.min(
          100,
          Math.round(
            (paymentStat.total_collected / invoiceStat.total_invoiced) * 100,
          ),
        )
      : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Overview Header Banner avec touche d'or/jaune discrète */}
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-xs border-l-4 border-l-accent">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Calendar Chip */}
            <div className="flex flex-col items-center justify-center size-12 sm:size-13 rounded-xl bg-secondary/80 border border-border shrink-0 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-accent">
                {calendarChip.month}
              </span>
              <span className="text-base sm:text-lg font-black text-primary leading-none mt-0.5">
                {calendarChip.day}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  Hello, {firstName}
                </h1>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Track commercial operations, mining quotes, purchase orders, and
                accounts receivable.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Link
              href="/dashboard/quotes/new"
              className="inline-flex items-center justify-center gap-2 h-9 flex-1 sm:flex-initial px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
            >
              <FileSpreadsheet className="size-3.5" /> New Quote
            </Link>
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center justify-center gap-2 h-9 flex-1 sm:flex-initial px-3.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary/60 transition-colors"
            >
              <Building2 className="size-3.5 text-primary" /> Clients
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPI StatTiles */}
      <div className="flex lg:grid lg:grid-cols-4 overflow-x-auto gap-3 sm:gap-4 pb-2 no-scrollbar">
        <div className="min-w-65 sm:min-w-0 flex-1">
          <StatTile
            label="Quotes Issued"
            value={quoteStat.total}
            icon={FileSpreadsheet}
            href="/dashboard/quotes"
            subtext={`${quoteStat.validated} validated · ${formatUSD(quoteStat.total_amount)}`}
          />
        </div>
        <div className="min-w-65 sm:min-w-0 flex-1">
          <StatTile
            label="Purchase Orders"
            value={orderStat.total}
            icon={ShoppingCart}
            href="/dashboard/orders"
            subtext={`${orderStat.active} active · ${formatUSD(orderStat.total_amount)}`}
          />
        </div>
        <div className="min-w-65 sm:min-w-0 flex-1">
          <StatTile
            label="Outstanding Receivables"
            value={` ${formatUSD(invoiceStat.total_receivables)}`}
            icon={Receipt}
            href="/dashboard/invoices"
            trend="down"
            subtext={`${invoiceStat.unpaid_count} unpaid invoice(s)`}
          />
        </div>
        <div className="min-w-65 sm:min-w-0 flex-1">
          <StatTile
            label="Collected Payments"
            value={`${formatUSD(paymentStat.total_collected)}`}
            icon={CreditCard}
            href="/dashboard/payments"
            trend="up"
            subtext={`${paymentStat.total} payment(s) received`}
          />
        </div>
      </div>

      {/* Main Grid: Activity & Budget Summary */}
      <div className="grid gap-6 lg:grid-cols-12 min-w-0">
        {/* Left Column: Recent Tasks / Quotes (8 cols) */}
        <div className="lg:col-span-8 min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="min-w-0">
              <h2 className="text-sm font-black text-primary flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-accent shrink-0" />
                <span className="truncate">Recent Quotes</span>
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">
                Latest industrial quotations issued to mining customers
              </p>
            </div>
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-accent transition-colors shrink-0 whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowRight className="size-3 text-accent shrink-0" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentQuotes.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No quotes created yet.
              </p>
            ) : (
              recentQuotes.map((q) => (
                <div
                  key={q.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs hover:bg-secondary/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="shrink-0">
                      <RefChip value={q.internal_reference} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-foreground truncate">
                        {q.client_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-accent shrink-0" />
                        <span className="truncate">{q.document_date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <MoneyText
                      amount={q.total}
                      className="text-xs font-black text-foreground whitespace-nowrap"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={q.status} />
                      <Link
                        href="/dashboard/quotes"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-secondary transition-colors shrink-0"
                        title="Open quotes list"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Financial Balance & Invoices to Watch (4 cols) */}
        <div className="lg:col-span-4 min-w-0 space-y-6">
          {/* Treasury Summary Card */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                Treasury Overview
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-md whitespace-nowrap">
                <TrendingUp className="size-3 shrink-0" /> {collectionRate}%
                collected
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium">
                Total Invoiced
              </p>
              <p className="text-xl font-black text-primary font-mono break-all sm:break-normal">
                {formatUSD(invoiceStat.total_invoiced)}
              </p>
            </div>

            {/* Progress bar with subtle accent accent color */}
            <div className="space-y-1.5 pt-1">
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
                <span>Collected: {formatUSD(paymentStat.total_collected)}</span>
                <span>Remaining: {formatUSD(invoiceStat.total_receivables)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
              <div className="rounded-xl bg-secondary/50 p-2.5 min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold truncate">
                  Collected
                </p>
                <p className="text-xs font-mono font-bold text-success mt-0.5 truncate">
                  {formatUSD(paymentStat.total_collected)}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-2.5 min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold truncate">
                  Outstanding Balance
                </p>
                <p className="text-xs font-mono font-bold text-destructive mt-0.5 truncate">
                  {formatUSD(invoiceStat.total_receivables)}
                </p>
              </div>
            </div>
          </div>

          {/* Invoices to Watch */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h3 className="text-xs font-black text-primary flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="size-3.5 text-accent shrink-0" />
                <span className="truncate">Invoices to Watch</span>
              </h3>
              <Link
                href="/dashboard/invoices"
                className="text-[11px] font-bold text-muted-foreground hover:text-accent transition-colors shrink-0 whitespace-nowrap"
              >
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentInvoices.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No overdue invoices.
                </p>
              ) : (
                recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-border/80 bg-secondary/20 flex items-center justify-between gap-2.5 text-xs min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-extrabold text-primary text-[11px] truncate">
                        {inv.invoice_number}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {inv.client_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-destructive text-xs whitespace-nowrap">
                        {formatUSD(inv.balance_due)}
                      </p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
