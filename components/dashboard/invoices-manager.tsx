"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Receipt,
  CreditCard,
  XCircle,
  Eye,
  Building2,
} from "lucide-react";
import { InvoiceRecord } from "@/lib/db/invoices";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cancelInvoiceAction } from "@/actions/invoices";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";
import { formatUSD } from "@/lib/formatters";

interface InvoicesManagerProps {
  initialInvoices: InvoiceRecord[];
}

export function InvoicesManager({ initialInvoices }: InvoicesManagerProps) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.clientName && inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.orderNumber && inv.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((sum, i) => (i.status !== "CANCELLED" ? sum + i.total : sum), 0);
  const totalReceivables = invoices.reduce((sum, i) => (i.status !== "CANCELLED" ? sum + i.balanceDue : sum), 0);
  const unpaidCount = invoices.filter((i) => i.balanceDue > 0 && i.status !== "CANCELLED").length;

  const handleCancelInvoice = async (id: string) => {
    if (!cancellationReason.trim()) {
      alert("Veuillez saisir un motif d'annulation explicite.");
      return;
    }

    const res = await cancelInvoiceAction(id, cancellationReason);
    if (!res.success) {
      alert(res.error || "Erreur d'annulation.");
    } else if (res.invoice) {
      setInvoices((prev) => prev.map((i) => (i.id === id ? res.invoice! : i)));
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(res.invoice);
      }
      setCancellingId(null);
      setCancellationReason("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Total Factures
          </p>
          <p className="text-xl font-black text-primary mt-1">{invoices.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Factures Non Soldées
          </p>
          <p className="text-xl font-black text-warning mt-1">{unpaidCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Volume Total Facturé
          </p>
          <p className="text-xl font-black text-primary font-mono mt-1">
            $ {formatUSD(totalInvoiced)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Créances à Recouvrer
          </p>
          <p className="text-xl font-black text-destructive font-mono mt-1">
            $ {formatUSD(totalReceivables)}
          </p>
        </div>
      </div>

      {/* Top Filter and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par N° facture, client, commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘F
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <option value="ALL">Tous statuts</option>
            <option value="ISSUED">Émise</option>
            <option value="PARTIALLY_PAID">Partiellement payée</option>
            <option value="PAID">Payée intégralement</option>
            <option value="OVERDUE">Échue</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>

        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
        >
          <Receipt className="size-4" /> Facturer depuis une commande
        </Link>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">N° Facture</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Commande (BC)</th>
                <th className="py-3.5 px-4">Émise le</th>
                <th className="py-3.5 px-4">Échéance</th>
                <th className="py-3.5 px-4 text-right">Total TTC</th>
                <th className="py-3.5 px-4 text-right">Payé</th>
                <th className="py-3.5 px-4 text-right">Solde Dû</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-muted-foreground">
                    <Receipt className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">Aucune facture trouvée</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les factures sont émises à partir des bons de commande confirmés.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <RefChip value={inv.invoiceNumber} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{inv.clientName}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{inv.orderNumber || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.issueDate}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={inv.total} className="text-xs font-bold text-foreground" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={inv.paidAmount} className="text-xs font-bold text-success" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={inv.balanceDue} className="text-xs font-black text-destructive" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          title="Aperçu détails"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {inv.balanceDue > 0 && inv.status !== "CANCELLED" && (
                          <Link
                            href={`/dashboard/payments?client=${inv.clientId}&invoice=${inv.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 text-[10px] font-bold text-success hover:bg-success/25 transition-colors border border-success/30"
                            title="Encaisser un paiement"
                          >
                            <CreditCard className="size-3" /> Payer
                          </Link>
                        )}
                        {inv.paidAmount === 0 && inv.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => setCancellingId(inv.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Annuler avec motif"
                          >
                            <XCircle className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sheet for Invoice */}
      <DetailSheet
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice?.invoiceNumber || "Détail de la Facture"}
        statusBadge={selectedInvoice ? <StatusBadge status={selectedInvoice.status} /> : undefined}
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Client facturé</p>
              <h2 className="text-base font-black text-foreground mt-0.5 flex items-center gap-2">
                <Building2 className="size-4 text-accent" />
                {selectedInvoice.clientName}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile label="Date d'émission" value={selectedInvoice.issueDate} />
              <KeyValueTile label="Date d'échéance" value={selectedInvoice.dueDate} />
              <KeyValueTile label="Commande liée" value={selectedInvoice.orderNumber || "Directe"} />
              <KeyValueTile label="Taux TVA" value={`${selectedInvoice.vatRate}%`} />
            </div>

            {/* Financial Balance Card */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total HT :</span>
                <MoneyText amount={selectedInvoice.subtotal} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA ({selectedInvoice.vatRate}%) :</span>
                <MoneyText amount={selectedInvoice.vatAmount} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground border-t border-border/80 pt-2">
                <span>Total Facture TTC :</span>
                <MoneyText amount={selectedInvoice.total} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-success">
                <span>Montant Encaissé :</span>
                <MoneyText amount={selectedInvoice.paidAmount} className="font-mono font-bold text-success" />
              </div>
              <div className="flex justify-between text-sm font-black text-destructive border-t border-border pt-2">
                <span>SOLDE RESTANT DÛ :</span>
                <MoneyText amount={selectedInvoice.balanceDue} className="font-mono text-base text-destructive" />
              </div>
            </div>

            {/* Actions inside sheet */}
            <div className="pt-2 border-t border-border space-y-2">
              {selectedInvoice.balanceDue > 0 && selectedInvoice.status !== "CANCELLED" && (
                <Link
                  href={`/dashboard/payments?client=${selectedInvoice.clientId}&invoice=${selectedInvoice.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <CreditCard className="size-4" /> Enregistrer un encaissement pour cette facture
                </Link>
              )}
            </div>
          </div>
        )}
      </DetailSheet>

      {/* Cancellation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border space-y-4">
            <h3 className="text-sm font-extrabold text-primary">
              Motif d&apos;annulation de la facture
            </h3>
            <p className="text-xs text-muted-foreground">
              Les factures ne peuvent pas être supprimées sans trace. Un motif d&apos;annulation écrit est enregistré dans le journal d&apos;audit légal.
            </p>
            <textarea
              required
              rows={3}
              placeholder="Indiquez la raison (erreur de facturation, litige, annulation de commande...)"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => handleCancelInvoice(cancellingId)}
                className="h-9 px-4 rounded-xl bg-destructive text-white hover:bg-destructive/90 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
