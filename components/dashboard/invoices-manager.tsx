"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Receipt, CreditCard, XCircle } from "lucide-react";
import { InvoiceRecord } from "@/lib/db/invoices";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cancelInvoiceAction } from "@/actions/invoices";

interface InvoicesManagerProps {
  initialInvoices: InvoiceRecord[];
}

export function InvoicesManager({ initialInvoices }: InvoicesManagerProps) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.clientName && inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.orderNumber && inv.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      setCancellingId(null);
      setCancellationReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par N° facture, client, commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-field pl-10 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-field text-xs font-semibold shrink-0"
          >
            <option value="ALL">Tous statuts</option>
            <option value="ISSUED">Émise</option>
            <option value="PARTIALLY_PAID">Partiellement payée</option>
            <option value="PAID">Payée intégralement</option>
            <option value="OVERDUE">Échue</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>

        <Link href="/dashboard/commandes" className="button button-primary text-xs shrink-0">
          <Receipt className="size-4" /> Facturer depuis une commande
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">N° Facture</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Commande (BC)</th>
                <th className="py-3.5 px-4">Émise le</th>
                <th className="py-3.5 px-4">Échéance</th>
                <th className="py-3.5 px-4 text-right">Total TTC ($)</th>
                <th className="py-3.5 px-4 text-right">Payé ($)</th>
                <th className="py-3.5 px-4 text-right">Solde Dû ($)</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <Receipt className="mx-auto size-8 text-slate-300 mb-2" />
                    Aucune facture trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.clientName}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{inv.orderNumber || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.issueDate}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                      ${inv.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      ${inv.balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {inv.balanceDue > 0 && inv.status !== "CANCELLED" && (
                          <Link
                            href={`/dashboard/paiements?client=${inv.clientId}&invoice=${inv.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                            title="Encaisser un paiement"
                          >
                            <CreditCard className="size-3" /> Payer
                          </Link>
                        )}
                        {inv.paidAmount === 0 && inv.status !== "CANCELLED" && (
                          <button
                            onClick={() => setCancellingId(inv.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                            title="Annuler avec motif"
                          >
                            <XCircle className="size-3" /> Annuler
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

      {/* Cancellation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border space-y-4">
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
              className="form-field text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="button button-outline text-xs"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => handleCancelInvoice(cancellingId)}
                className="button bg-rose-600 text-white hover:bg-rose-700 text-xs"
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
