"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { QuotationRecord } from "@/lib/db/quotations";
import { OrderRecord } from "@/lib/db/orders";
import { InvoiceRecord } from "@/lib/db/invoices";
import { PaymentRecord } from "@/lib/db/payments";
import { ClientAccountStatement } from "@/lib/db/statements";
import { StatusBadge } from "@/components/dashboard/status-badge";

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
      {/* Client Identity Header Card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-black text-primary">
                {client.code}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Client Actif
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-primary tracking-tight">
              {client.name}
            </h1>
            {client.taxId && (
              <p className="text-xs text-muted-foreground mt-0.5">
                NIF / Identifiant fiscal: <span className="font-mono font-bold text-slate-700">{client.taxId}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href={`/dashboard/quotations/nouveau?clientId=${client.id}`}
              className="button button-primary text-xs"
            >
              <Plus className="size-4" /> Nouveau Devis pour {client.code}
            </Link>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="mt-5 grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-3">
          <div>
            <p className="font-extrabold text-slate-500 uppercase text-[10px]">Contact Direct</p>
            <p className="mt-1 font-bold text-slate-800">{client.contactPerson || "Non spécifié"}</p>
            <p className="text-muted-foreground">{client.phone || "—"}</p>
            <p className="text-muted-foreground">{client.email || "—"}</p>
          </div>
          <div>
            <p className="font-extrabold text-slate-500 uppercase text-[10px]">Adresse de facturation</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{client.billingAddress || "—"}</p>
          </div>
          <div>
            <p className="font-extrabold text-slate-500 uppercase text-[10px]">Site de livraison usuel</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{client.deliveryAddress || "—"}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-lift p-4 bg-white">
          <p className="text-[11px] font-extrabold uppercase text-bronze">Total Devis Émis</p>
          <p className="mt-1.5 text-xl font-black text-primary">{quotations.length}</p>
          <p className="text-[10px] text-muted-foreground">
            {quotations.filter((q) => q.status === "VALIDATED").length} devis validé(s)
          </p>
        </div>
        <div className="card-lift p-4 bg-white">
          <p className="text-[11px] font-extrabold uppercase text-bronze">Commandes Clients</p>
          <p className="mt-1.5 text-xl font-black text-primary">{orders.length}</p>
          <p className="text-[10px] text-muted-foreground">
            {orders.filter((o) => o.status === "CONFIRMED").length} active(s)
          </p>
        </div>
        <div className="card-lift p-4 bg-white">
          <p className="text-[11px] font-extrabold uppercase text-bronze">Total Facturé</p>
          <p className="mt-1.5 text-xl font-black text-primary">
            ${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">{invoices.length} facture(s)</p>
        </div>
        <div className="card-lift p-4 bg-white">
          <p className="text-[11px] font-extrabold uppercase text-bronze">Solde Restant Dû</p>
          <p className="mt-1.5 text-xl font-black text-rose-700">
            ${totalReceivables.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600 font-bold">
            ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} déjà réglé
          </p>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="border-b border-border bg-white rounded-t-2xl px-4 pt-3 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "overview"
              ? "border-accent text-primary font-black"
              : "border-transparent text-slate-500 hover:text-primary"
          }`}
        >
          Vue Générale
        </button>
        <button
          onClick={() => setActiveTab("quotations")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "quotations"
              ? "border-accent text-primary font-black"
              : "border-transparent text-slate-500 hover:text-primary"
          }`}
        >
          Devis ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "orders"
              ? "border-accent text-primary font-black"
              : "border-transparent text-slate-500 hover:text-primary"
          }`}
        >
          Commandes ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "invoices"
              ? "border-accent text-primary font-black"
              : "border-transparent text-slate-500 hover:text-primary"
          }`}
        >
          Factures ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "payments"
              ? "border-accent text-primary font-black"
              : "border-transparent text-slate-500 hover:text-primary"
          }`}
        >
          Paiements ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab("statement")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "statement"
              ? "border-accent text-primary font-black"
              : "border-transparent text-slate-500 hover:text-primary"
          }`}
        >
          Relevé de Compte
        </button>
      </div>

      {/* Tab Contents */}
      <div className="rounded-b-2xl border border-t-0 border-border bg-white p-6 shadow-2xs">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold text-primary">Dernière activité du compte</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-border rounded-xl p-4">
                <p className="text-xs font-extrabold text-primary mb-3">Devis récents</p>
                {quotations.slice(0, 3).map((q) => (
                  <div key={q.id} className="py-2 flex items-center justify-between text-xs border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-bold text-slate-900">{q.internalReference}</p>
                      <p className="text-[10px] text-muted-foreground">{q.documentDate}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-mono font-bold">${q.total.toFixed(2)}</span>
                      <StatusBadge status={q.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-border rounded-xl p-4">
                <p className="text-xs font-extrabold text-primary mb-3">Factures récentes</p>
                {invoices.slice(0, 3).map((i) => (
                  <div key={i.id} className="py-2 flex items-center justify-between text-xs border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-bold text-slate-900">{i.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{i.issueDate}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-mono font-bold">${i.total.toFixed(2)}</span>
                      <StatusBadge status={i.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QUOTATIONS TAB */}
        {activeTab === "quotations" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Référence interne</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Réf. RFQ Client</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Sous-total</th>
                  <th className="py-3 px-3 text-right">Total TTC ($)</th>
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
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-primary">{q.internalReference}</td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                          {q.docType === "PROFORMA" ? "Proforma" : "Devis"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">{q.clientRfqNumber || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground">{q.documentDate}</td>
                      <td className="py-3 px-3 text-right font-mono">${q.subtotal.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">${q.total.toFixed(2)}</td>
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
              <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">N° Commande (BC)</th>
                  <th className="py-3 px-3">PO N° Client</th>
                  <th className="py-3 px-3">Devis Source</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Total ($)</th>
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
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-primary">{o.orderNumber}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{o.clientPoNumber}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{o.quotationReference}</td>
                      <td className="py-3 px-3 text-muted-foreground">{o.poDate}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">${o.total.toFixed(2)}</td>
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
              <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">N° Facture</th>
                  <th className="py-3 px-3">Commande Liée</th>
                  <th className="py-3 px-3">Date Émission</th>
                  <th className="py-3 px-3">Date Échéance</th>
                  <th className="py-3 px-3 text-right">Total ($)</th>
                  <th className="py-3 px-3 text-right">Solde Dû ($)</th>
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
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-primary">{i.invoiceNumber}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{i.orderNumber || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground">{i.issueDate}</td>
                      <td className="py-3 px-3 text-muted-foreground">{i.dueDate}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">${i.total.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">${i.balanceDue.toFixed(2)}</td>
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
              <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
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
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-primary">{p.paymentNumber}</td>
                      <td className="py-3 px-3 text-muted-foreground">{p.paymentDate}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{p.paymentMethod}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">{p.referenceNumber}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">${p.amount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">${p.unallocatedAmount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* STATEMENT (RELEVÉ DE COMPTE) TAB */}
        {activeTab === "statement" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-border">
              <div>
                <p className="text-xs font-extrabold text-primary">Grand Livre / Relevé Client</p>
                <p className="text-[11px] text-muted-foreground">
                  Calculé dynamiquement sur les factures émises et les paiements reçus.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted-foreground">Solde Clôture Débiteur</p>
                <p className="text-xl font-black text-rose-700">
                  ${statement.closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
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
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-muted-foreground font-mono">{tx.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              tx.type === "INVOICE" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {tx.type === "INVOICE" ? "Facture" : "Règlement"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{tx.reference}</td>
                        <td className="py-3 px-3 text-slate-700">{tx.description}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900">
                          {tx.debit > 0 ? `$${tx.debit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                          {tx.credit > 0 ? `$${tx.credit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          ${tx.runningBalance.toFixed(2)}
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
