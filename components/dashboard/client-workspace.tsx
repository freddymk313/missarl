"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  FileText,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { QuotationRecord } from "@/lib/db/quotations";
import { OrderRecord } from "@/lib/db/orders";
import { InvoiceRecord } from "@/lib/db/invoices";
import { PaymentRecord } from "@/lib/db/payments";
import { ClientAccountStatement } from "@/lib/db/statements";
import {
  PageHeader,
  StatTile,
  StatusPill,
  MoneyText,
  RefChip,
  KeyValueTile,
  formatDate,
} from "@/components/dashboard/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface ClientWorkspaceProps {
  client: ClientRecord;
  quotations: QuotationRecord[];
  orders: OrderRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  statement: ClientAccountStatement | null;
}

export function ClientWorkspace({
  client,
  quotations,
  orders,
  invoices,
  payments,
  statement,
}: ClientWorkspaceProps) {
  const [activeTab, setActiveTab] = React.useState("quotes");

  const totalInvoiced = invoices.reduce(
    (sum, i) => (i.status !== "CANCELLED" ? sum + i.total : sum),
    0
  );
  const totalReceivables = invoices.reduce(
    (sum, i) => (i.status !== "CANCELLED" ? sum + i.balanceDue : sum),
    0
  );
  const totalPaid = payments.reduce(
    (sum, p) => (p.status !== "CANCELLED" ? sum + p.amount : sum),
    0
  );

  const openQuotesCount = quotations.filter((q) => q.status === "SUBMITTED" || q.status === "DRAFT").length;
  const activeOrdersCount = orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED").length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title={client.name}
        description={`Dossier client ${client.code} · ${client.taxId ? `NIF: ${client.taxId}` : "Compte commercial"}`}
        icon={<Building2 className="size-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/quotes/new?clientId=${client.id}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Nouveau devis</span>
            </Link>
            <Link
              href="/dashboard/clients"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
            >
              <span>Tous les clients</span>
            </Link>
          </div>
        }
      />

      {/* Identity & Coordinates Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
              {client.code.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{client.name}</h2>
                <RefChip variant="primary">{client.code}</RefChip>
                <StatusPill status={client.isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
              {client.taxId && (
                <span className="text-xs text-muted-foreground">
                  Identifiant fiscal: <span className="font-semibold text-foreground">{client.taxId}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
          <KeyValueTile
            label="Contact principal"
            value={
              <div className="space-y-0.5">
                <span className="font-semibold block">{client.contactPerson || "Non spécifié"}</span>
                {client.phone && <span className="text-muted-foreground block">{client.phone}</span>}
                {client.email && <span className="text-muted-foreground block">{client.email}</span>}
              </div>
            }
          />
          <KeyValueTile
            label="Adresse de facturation"
            value={client.billingAddress || "—"}
          />
          <KeyValueTile
            label="Site de livraison habituel"
            value={client.deliveryAddress || "—"}
          />
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Devis en cours"
          value={openQuotesCount}
          subtitle={`${quotations.length} devis créés au total`}
          icon={<FileSpreadsheet className="size-4" />}
        />
        <StatTile
          label="Commandes actives"
          value={activeOrdersCount}
          subtitle={`${orders.length} bons de commande émis`}
          icon={<ShoppingCart className="size-4" />}
        />
        <StatTile
          label="Créances à recouvrer"
          value={<MoneyText value={totalReceivables} />}
          subtitle={<MoneyText value={totalInvoiced} className="text-muted-foreground" />}
          icon={<Receipt className="size-4" />}
        />
        <StatTile
          label="Paiements enregistrés"
          value={<MoneyText value={totalPaid} />}
          subtitle={`${payments.length} encaissement(s)`}
          icon={<CreditCard className="size-4" />}
        />
      </div>

      {/* Tabs Hub: Devis, Commandes, Factures, Relevé */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border/80 pb-3">
            <TabsList variant="line" className="h-9">
              <TabsTrigger value="quotes" className="text-xs gap-1.5 font-semibold">
                <FileSpreadsheet className="size-3.5" />
                <span>Devis ({quotations.length})</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs gap-1.5 font-semibold">
                <ShoppingCart className="size-3.5" />
                <span>Commandes ({orders.length})</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs gap-1.5 font-semibold">
                <Receipt className="size-3.5" />
                <span>Factures ({invoices.length})</span>
              </TabsTrigger>
              <TabsTrigger value="statement" className="text-xs gap-1.5 font-semibold">
                <FileText className="size-3.5" />
                <span>Relevé de compte</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Quotations Tab */}
          <TabsContent value="quotes" className="pt-4">
            {quotations.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucun devis créé pour ce client.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4">Réf. Devis</th>
                      <th className="py-3 px-4">RFQ Client</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Montant ($ USD)</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <RefChip>{q.internalReference}</RefChip>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {q.clientRfqNumber || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(q.documentDate)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <MoneyText value={q.total} className="font-bold text-foreground" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusPill status={q.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="pt-4">
            {orders.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucun bon de commande enregistré.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4">N° Commande (PO)</th>
                      <th className="py-3 px-4">PO Client</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Montant ($ USD)</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <RefChip>{o.orderNumber}</RefChip>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {o.clientPoNumber}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(o.orderDate)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <MoneyText value={o.total} className="font-bold text-foreground" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusPill status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="pt-4">
            {invoices.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucune facture émise pour ce client.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4">N° Facture</th>
                      <th className="py-3 px-4">Date d&apos;émission</th>
                      <th className="py-3 px-4 text-right">Total ($ USD)</th>
                      <th className="py-3 px-4 text-right">Solde dû</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoices.map((i) => (
                      <tr key={i.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <RefChip>{i.invoiceNumber}</RefChip>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(i.issueDate)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <MoneyText value={i.total} className="font-bold text-foreground" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {i.balanceDue > 0 ? (
                            <MoneyText value={i.balanceDue} className="text-destructive font-bold" />
                          ) : (
                            <span className="text-success font-medium">Réglé</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusPill status={i.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Statement Tab */}
          <TabsContent value="statement" className="pt-4">
            {statement && statement.entries && statement.entries.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Extrait Chronologique du Compte
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Solde de clôture: <MoneyText value={statement.closingBalance} className="font-bold text-foreground" />
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/statements?clientId=${client.id}`}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Ouvrir dans l&apos;éditeur de relevés</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold text-[11px] uppercase">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Référence</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Débit (+)</th>
                        <th className="py-3 px-4 text-right">Crédit (-)</th>
                        <th className="py-3 px-4 text-right">Solde progressif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {statement.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-4 text-muted-foreground">
                            {formatDate(entry.date)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <RefChip>{entry.referenceNumber}</RefChip>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {entry.description}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {entry.debit > 0 ? <MoneyText value={entry.debit} /> : "—"}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {entry.credit > 0 ? <MoneyText value={entry.credit} className="text-success" /> : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                            <MoneyText value={entry.runningBalance} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucune transaction enregistrée pour établir un relevé.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
