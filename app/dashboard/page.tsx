import Link from "next/link";
import {
  Package,
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

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
import { getCurrentSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default async function DashboardPage() {
  const session = await getCurrentSession();

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
      <div className="space-y-6 max-w-6xl">
        <div className="rounded-2xl bg-white p-7 border border-border shadow-xs">
          <p className="kicker">Espace Collecteur de Prix</p>
          <h1 className="text-2xl font-black text-primary mt-2">
            Bienvenue, {session.fullName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Votre profil vous permet de consulter et rechercher l&apos;ensemble des articles du catalogue industriel MIS SARL, leurs spécifications techniques, marques et prix en vigueur.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/dashboard/articles" className="button button-primary">
              <Package className="size-4" /> Accéder au catalogue ({itemStat.total} articles)
            </Link>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="card-lift p-6">
            <span className="icon-badge">
              <Package className="size-5" />
            </span>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-bronze">
              Articles actifs au catalogue
            </p>
            <p className="mt-2 text-3xl font-black text-primary">{itemStat.total}</p>
          </div>
          <div className="card-lift p-6">
            <span className="icon-badge">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-bronze">
              Catégories industrielles
            </p>
            <p className="mt-2 text-3xl font-black text-primary">{itemStat.categories}</p>
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

  const quoteStat = (quoteStats as unknown as QuoteStatsRow[])[0] || { total: 0, validated: 0, total_amount: 0 };
  const orderStat = (orderStats as unknown as OrderStatsRow[])[0] || { total: 0, active: 0, total_amount: 0 };
  const invoiceStat = (invoiceStats as unknown as InvoiceStatsRow[])[0] || { total: 0, total_invoiced: 0, total_receivables: 0, unpaid_count: 0 };
  const paymentStat = (paymentStats as unknown as PaymentStatsRow[])[0] || { total: 0, total_collected: 0 };

  const recentQuotes = recentQuotesRows as unknown as RecentQuoteRow[];
  const recentInvoices = recentInvoicesRows as unknown as RecentInvoiceRow[];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-xs">
        <div>
          <p className="kicker">Direction Commerciale</p>
          <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
            Tableau de bord MIS SARL
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Suivi des opérations commerciales, devis miniers, commandes et créances clients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/dashboard/quotations" className="button button-primary text-xs">
            <FileSpreadsheet className="size-4" /> Devis & Proformas
          </Link>
          <Link href="/dashboard/clients" className="button button-outline text-xs">
            <Building2 className="size-4" /> Clients
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Devis */}
        <div className="card-lift p-5 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
              Devis Émis
            </p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <FileSpreadsheet className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-primary">{quoteStat.total}</p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <span className="font-bold text-emerald-600">{quoteStat.validated} validés</span> · Total ${quoteStat.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Commandes */}
        <div className="card-lift p-5 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
              Bons de commande
            </p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ShoppingCart className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-primary">{orderStat.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-bold text-primary">{orderStat.active} en cours</span> · Total ${orderStat.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Factures & Créances */}
        <div className="card-lift p-5 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
              Créances à recouvrer
            </p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <Receipt className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-rose-700">
            ${invoiceStat.total_receivables.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {invoiceStat.unpaid_count} facture(s) en attente de paiement
          </p>
        </div>

        {/* Encaissements */}
        <div className="card-lift p-5 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
              Paiements Encaissés
            </p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CreditCard className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-700">
            ${paymentStat.total_collected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {paymentStat.total} règlement(s) enregistré(s)
          </p>
        </div>
      </div>

      {/* Tables Preview Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Derniers Devis */}
        <div className="border border-border bg-white rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-accent" /> Derniers Devis & Proformas
            </h3>
            <Link
              href="/dashboard/quotations"
              className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1"
            >
              Tout voir <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {recentQuotes.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Aucun devis créé pour le moment.
              </p>
            ) : (
              recentQuotes.map((q) => (
                <div key={q.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-extrabold text-primary">{q.internal_reference}</p>
                    <p className="text-[11px] text-muted-foreground">{q.client_name}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-bold text-slate-800">
                      ${q.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dernières Factures */}
        <div className="border border-border bg-white rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
              <Receipt className="size-4 text-accent" /> Factures Récentes
            </h3>
            <Link
              href="/dashboard/factures"
              className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1"
            >
              Tout voir <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {recentInvoices.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Aucune facture émise pour le moment.
              </p>
            ) : (
              recentInvoices.map((i) => (
                <div key={i.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-extrabold text-primary">{i.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground">{i.client_name}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-bold text-slate-800">
                        ${i.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      {i.balance_due > 0 && (
                        <p className="text-[10px] text-rose-600 font-semibold">
                          Solde: ${i.balance_due.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
