"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { QuotationRecord } from "@/lib/db/quotations";
import { OrderRecord } from "@/lib/db/orders";
import { InvoiceRecord } from "@/lib/db/invoices";
import { PaymentRecord } from "@/lib/db/payments";
import { ClientAccountStatement } from "@/lib/db/statements";
import { formatUSD } from "@/lib/formatters";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { StatTile } from "@/components/dashboard/ui/stat-tile";

interface ClientWorkspaceProps {
  client: ClientRecord;
  quotations: QuotationRecord[];
  orders: OrderRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  statement: ClientAccountStatement;
}

export function ClientWorkspace({
  client,
  quotations,
  orders,
  invoices,
  payments,
  statement,
}: ClientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "quotations" | "orders" | "invoices" | "payments" | "statement"
  >("overview");

  const totalInvoiced = invoices.reduce((sum, i) => (i.status !== "CANCELLED" ? sum + i.total : sum), 0);
  const totalReceivables = invoices.reduce((sum, i) => (i.status !== "CANCELLED" ? sum + i.balanceDue : sum), 0);
  const totalPaid = payments.reduce((sum, p) => (p.status !== "CANCELLED" ? sum + p.amount : sum), 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Retour à la liste des clients
        </Link>
      </div>

      {/* Client Identity Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <RefChip value={client.code} />
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold text-success border border-success/30">
                <ShieldCheck className="size-3" /> Client Actif
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-primary tracking-tight">
              {client.name}
            </h1>
            {client.taxId && (
              <p className="text-xs text-muted-foreground mt-0.5">
                NIF / Identifiant fiscal: <span className="font-mono font-bold text-foreground">{client.taxId}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href={`/dashboard/quotes/new?clientId=${client.id}`}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus className="size-4" /> Nouveau Devis pour {client.code}
            </Link>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="mt-5 grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-3">
          <div className="space-y-1">
            <p className="font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider">Contact Direct</p>
            <p className="font-bold text-foreground">{client.contactPerson || "Non spécifié"}</p>
            {client.phone && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3 text-accent" /> {client.phone}
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <Mail className="size-3 text-accent" /> {client.email}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider">Adresse de facturation</p>
            <p className="text-foreground leading-relaxed flex items-start gap-1">
              <MapPin className="size-3 text-accent shrink-0 mt-0.5" />
              <span>{client.billingAddress || "—"}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider">Site de livraison usuel</p>
            <p className="text-foreground leading-relaxed flex items-start gap-1">
              <Building2 className="size-3 text-accent shrink-0 mt-0.5" />
              <span>{client.deliveryAddress || "—"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile
          label="Total Devis Émis"
          value={quotations.length}
          icon={FileSpreadsheet}
          subtext={`${quotations.filter((q) => q.status === "VALIDATED").length} validé(s)`}
        />
        <StatTile
          label="Commandes Clients"
          value={orders.length}
          icon={ShoppingCart}
          subtext={`${orders.filter((o) => o.status === "CONFIRMED").length} active(s)`}
        />
        <StatTile
          label="Total Facturé"
          value={`$ ${formatUSD(totalInvoiced)}`}
          icon={Receipt}
          subtext={`${invoices.length} facture(s)`}
        />
        <StatTile
          label="Solde Restant Dû"
          value={`$ ${formatUSD(totalReceivables)}`}
          icon={CreditCard}
          trend={totalReceivables > 0 ? "down" : "neutral"}
          subtext={`$ ${formatUSD(totalPaid)} déjà réglé`}
        />
      </div>

      {/* Workspace Underlined Tabs Navigation */}
      <div className="border-b border-border bg-card rounded-t-2xl px-6 pt-4 flex gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
            activeTab === "overview"
              ? "border-accent text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Vue Générale
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quotations")}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
            activeTab === "quotations"
              ? "border-accent text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Devis ({quotations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
            activeTab === "orders"
              ? "border-accent text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Commandes ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
            activeTab === "invoices"
              ? "border-accent text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Factures ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
            activeTab === "payments"
              ? "border-accent text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Paiements ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("statement")}
          className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
            activeTab === "statement"
              ? "border-accent text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Relevé de Compte
        </button>
      </div>

      {/* Tab Contents */}
      <div className="rounded-b-2xl border border-t-0 border-border bg-card p-6 shadow-2xs">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-primary">Dernière activité du compte</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-border rounded-xl p-4 bg-secondary/20">
                <p className="text-xs font-extrabold text-primary mb-3 flex items-center gap-1.5">
                  <FileSpreadsheet className="size-3.5 text-accent" /> Devis récents
                </p>
                {quotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Aucun devis.</p>
                ) : (
                  quotations.slice(0, 3).map((q) => (
                    <div key={q.id} className="py-2.5 flex items-center justify-between text-xs border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-bold text-foreground">{q.internalReference}</p>
                        <p className="text-[10px] text-muted-foreground">{q.documentDate}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <MoneyText amount={q.total} className="text-xs font-black text-foreground" />
                        <StatusBadge status={q.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border border-border rounded-xl p-4 bg-secondary/20">
                <p className="text-xs font-extrabold text-primary mb-3 flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-accent" /> Factures récentes
                </p>
                {invoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Aucune facture.</p>
                ) : (
                  invoices.slice(0, 3).map((i) => (
                    <div key={i.id} className="py-2.5 flex items-center justify-between text-xs border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-bold text-foreground">{i.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{i.issueDate}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <MoneyText amount={i.total} className="text-xs font-black text-foreground" />
                        <StatusBadge status={i.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* QUOTATIONS TAB */}
        {activeTab === "quotations" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Référence interne</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Réf. RFQ Client</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Sous-total</th>
                  <th className="py-3 px-3 text-right">Total TTC</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Aucun devis créé pour ce client.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3">
                        <RefChip value={q.internalReference} />
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                          {q.docType === "PROFORMA" ? "Proforma" : "Devis"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">{q.clientRfqNumber || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground">{q.documentDate}</td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={q.subtotal} className="text-xs text-muted-foreground" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={q.total} className="text-xs font-black text-primary" />
                      </td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={q.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">N° Commande (BC)</th>
                  <th className="py-3 px-3">PO N° Client</th>
                  <th className="py-3 px-3">Devis Source</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aucune commande enregistrée pour ce client.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3">
                        <RefChip value={o.orderNumber} />
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">{o.clientPoNumber}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{o.quotationReference}</td>
                      <td className="py-3 px-3 text-muted-foreground">{o.poDate}</td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={o.total} className="text-xs font-black text-primary" />
                      </td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">N° Facture</th>
                  <th className="py-3 px-3">Commande Liée</th>
                  <th className="py-3 px-3">Date Émission</th>
                  <th className="py-3 px-3">Date Échéance</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-right">Solde Dû</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Aucune facture émise pour ce client.
                    </td>
                  </tr>
                ) : (
                  invoices.map((i) => (
                    <tr key={i.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3">
                        <RefChip value={i.invoiceNumber} />
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{i.orderNumber || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground">{i.issueDate}</td>
                      <td className="py-3 px-3 text-muted-foreground">{i.dueDate}</td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={i.total} className="text-xs font-bold text-foreground" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={i.balanceDue} className="text-xs font-black text-destructive" />
                      </td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={i.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">N° Reçu</th>
                  <th className="py-3 px-3">Date Paiement</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3">Réf. Bordereau</th>
                  <th className="py-3 px-3 text-right">Montant Encaissé</th>
                  <th className="py-3 px-3 text-right">Non Alloué</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Aucun paiement enregistré pour ce client.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3">
                        <RefChip value={p.paymentNumber} />
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{p.paymentDate}</td>
                      <td className="py-3 px-3 font-semibold text-foreground">{p.paymentMethod}</td>
                      <td className="py-3 px-3 font-mono text-foreground">{p.referenceNumber}</td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={p.amount} className="text-xs font-black text-success" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <MoneyText amount={p.unallocatedAmount} className="text-xs text-muted-foreground" />
                      </td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* STATEMENT TAB */}
        {activeTab === "statement" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-4 border border-border">
              <div>
                <p className="text-xs font-black text-primary">Grand Livre / Relevé Client</p>
                <p className="text-[11px] text-muted-foreground">
                  Calculé dynamiquement sur les factures émises et les paiements reçus.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted-foreground">Solde Clôture Débiteur</p>
                <p className="text-xl font-black text-destructive font-mono">
                  $ {formatUSD(statement.closingBalance)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Réf. Document</th>
                    <th className="py-3 px-3">Libellé de l&apos;opération</th>
                    <th className="py-3 px-3 text-right">Débit (Facture)</th>
                    <th className="py-3 px-3 text-right">Crédit (Règlement)</th>
                    <th className="py-3 px-3 text-right">Solde Cumulé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {statement.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucune transaction financière sur ce compte client.
                      </td>
                    </tr>
                  ) : (
                    statement.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3 text-muted-foreground font-mono">{tx.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              tx.type === "INVOICE"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-success/15 text-success border border-success/30"
                            }`}
                          >
                            {tx.type === "INVOICE" ? "Facture" : "Règlement"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">{tx.reference}</td>
                        <td className="py-3 px-3 text-foreground">{tx.description}</td>
                        <td className="py-3 px-3 text-right font-mono text-foreground">
                          {tx.debit > 0 ? `$ ${formatUSD(tx.debit)}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-success font-bold">
                          {tx.credit > 0 ? `$ ${formatUSD(tx.credit)}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-foreground">
                          $ {formatUSD(tx.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
