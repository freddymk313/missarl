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
    const itemStat = (itemStatsRows as unknown as ItemStatsRow[])[0] || { total: 0, categories: 0 };

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
                  Bonjour, {firstName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-foreground border border-accent/40">
                  Collecteur de Prix
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Consultez et recherchez l&apos;ensemble des articles du catalogue industriel MIS SARL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/items"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-accent text-accent-foreground text-xs font-bold shadow-xs hover:bg-accent/90 transition-colors"
            >
              <Package className="size-4" /> Consulter le Catalogue
            </Link>
          </div>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile
            label="Articles actifs au catalogue"
            value={itemStat.total}
            icon={Package}
            href="/dashboard/items"
            subtext="Spécifications techniques et prix en vigueur"
          />
          <StatTile
            label="Catégories industrielles"
            value={itemStat.categories}
            icon={CheckCircle2}
            href="/dashboard/items"
            subtext="Robinetterie, pompage, électricité, quincaillerie minière"
          />
        </div>

        {/* Catalogue Info Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3 border-l-4 border-l-accent">
          <h2 className="text-sm font-black text-primary flex items-center gap-2">
            <Layers className="size-4 text-accent" /> Mode Consultation Catalogue
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Votre profil vous permet d&apos;accéder en lecture seule à la base articles de Lubumbashi : désignations complètes, codes SKU, marques agréées et tarifs publics en vigueur. Pour toute modification ou ajout de référence, veuillez vous rapprocher de la Direction Commerciale.
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

  const quoteStat = (quoteStats as unknown as QuoteStatsRow[])[0] || { total: 0, validated: 0, total_amount: 0 };
  const orderStat = (orderStats as unknown as OrderStatsRow[])[0] || { total: 0, active: 0, total_amount: 0 };
  const invoiceStat = (invoiceStats as unknown as InvoiceStatsRow[])[0] || { total: 0, total_invoiced: 0, total_receivables: 0, unpaid_count: 0 };
  const paymentStat = (paymentStats as unknown as PaymentStatsRow[])[0] || { total: 0, total_collected: 0 };

  const recentQuotes = recentQuotesRows as unknown as RecentQuoteRow[];
  const recentInvoices = recentInvoicesRows as unknown as RecentInvoiceRow[];

  // Compute collection rate percentage
  const collectionRate = invoiceStat.total_invoiced > 0
    ? Math.min(100, Math.round((paymentStat.total_collected / invoiceStat.total_invoiced) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Overview Header Banner avec touche d'or/jaune discrète */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-xs border-l-4 border-l-accent">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Calendar Chip */}
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
                  Bonjour, {firstName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-primary border border-accent/30">
                  Lubumbashi, RDC
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Suivi des opérations commerciales, devis miniers, commandes et créances clients.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/quotes/new"
              className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold shadow-xs hover:bg-accent/90 transition-colors"
            >
              <FileSpreadsheet className="size-3.5" /> Nouveau Devis
            </Link>
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary/60 transition-colors"
            >
              <Building2 className="size-3.5 text-accent" /> Clients
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPI StatTiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Devis Émis"
          value={quoteStat.total}
          icon={FileSpreadsheet}
          href="/dashboard/quotes"
          subtext={`${quoteStat.validated} validés · $ ${formatUSD(quoteStat.total_amount)}`}
        />
        <StatTile
          label="Bons de Commande"
          value={orderStat.total}
          icon={ShoppingCart}
          href="/dashboard/orders"
          subtext={`${orderStat.active} en cours · $ ${formatUSD(orderStat.total_amount)}`}
        />
        <StatTile
          label="Créances à recouvrer"
          value={`$ ${formatUSD(invoiceStat.total_receivables)}`}
          icon={Receipt}
          href="/dashboard/invoices"
          trend="down"
          subtext={`${invoiceStat.unpaid_count} facture(s) en attente`}
        />
        <StatTile
          label="Paiements Encaissés"
          value={`$ ${formatUSD(paymentStat.total_collected)}`}
          icon={CreditCard}
          href="/dashboard/payments"
          trend="up"
          subtext={`${paymentStat.total} versement(s) reçu(s)`}
        />
      </div>

      {/* Main Grid: Activity & Budget Summary */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Tasks / Quotes (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-black text-primary flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-accent" /> Devis & Propositions Récentes
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Dernières cotations industrielles émises aux clients miniers
              </p>
            </div>
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-accent transition-colors"
            >
              Consulter tout <ArrowRight className="size-3 text-accent" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentQuotes.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucun devis créé pour le moment.
              </p>
            ) : (
              recentQuotes.map((q) => (
                <div
                  key={q.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-secondary/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <RefChip value={q.internal_reference} />
                    <div>
                      <p className="font-extrabold text-foreground">{q.client_name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-accent" /> {q.document_date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5">
                    <MoneyText amount={q.total} className="text-xs font-black text-foreground" />
                    <StatusBadge status={q.status} />
                    <Link
                      href="/dashboard/quotes"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-secondary transition-colors"
                      title="Ouvrir la liste des devis"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Financial Balance & Invoices to Watch (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Treasury Summary Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Suivi Trésorerie</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-md">
                <TrendingUp className="size-3" /> {collectionRate}% recouvré
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium">Total Facturé</p>
              <p className="text-xl font-black text-primary font-mono">
                $ {formatUSD(invoiceStat.total_invoiced)}
              </p>
            </div>

            {/* Progress bar avec touche jaune/or */}
            <div className="space-y-1.5 pt-1">
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Encaissé: ${formatUSD(paymentStat.total_collected)}</span>
                <span>Reste: ${formatUSD(invoiceStat.total_receivables)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
              <div className="rounded-xl bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground font-semibold">Encaissé</p>
                <p className="text-xs font-mono font-bold text-success mt-0.5">
                  ${formatUSD(paymentStat.total_collected)}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground font-semibold">Créances Dues</p>
                <p className="text-xs font-mono font-bold text-destructive mt-0.5">
                  ${formatUSD(invoiceStat.total_receivables)}
                </p>
              </div>
            </div>
          </div>

          {/* Factures à surveiller */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-black text-primary flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-accent" /> Factures à Surveiller
              </h3>
              <Link
                href="/dashboard/invoices"
                className="text-[11px] font-bold text-muted-foreground hover:text-accent transition-colors"
              >
                Tout voir
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentInvoices.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Aucune facture en retard.
                </p>
              ) : (
                recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-border/80 bg-secondary/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-extrabold text-primary text-[11px]">
                        {inv.invoice_number}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                        {inv.client_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-destructive text-xs">
                        ${formatUSD(inv.balance_due)}
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