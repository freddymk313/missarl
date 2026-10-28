"use client";

import { useState } from "react";
import { Plus, Search, ShoppingCart, Receipt, X } from "lucide-react";
import { OrderRecord } from "@/lib/db/orders";
import { QuotationRecord } from "@/lib/db/quotations";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { createOrderAction } from "@/actions/orders";
import { createInvoiceAction } from "@/actions/invoices";

interface OrdersManagerProps {
  initialOrders: OrderRecord[];
  validatedQuotations: QuotationRecord[];
  initialNewOrderQuoteId?: string;
}

export function OrdersManager({
  initialOrders,
  validatedQuotations,
  initialNewOrderQuoteId,
}: OrdersManagerProps) {
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(!!initialNewOrderQuoteId);
  const [selectedQuoteId, setSelectedQuoteId] = useState(initialNewOrderQuoteId || "");
  const [clientPoNumber, setClientPoNumber] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = orders.filter((o) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clientPoNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const res = await createOrderAction({
        quotationId: selectedQuoteId,
        clientPoNumber,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes,
      });

      if (!res.success) {
        setFormError(res.error || "Erreur de création de la commande.");
      } else if (res.order) {
        setOrders((prev) => [res.order!, ...prev]);
        setIsModalOpen(false);
        setClientPoNumber("");
        setSelectedQuoteId("");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvoice = async (orderId: string) => {
    if (!confirm("Voulez-vous générer la facture de vente pour cette commande ?")) return;
    const res = await createInvoiceAction({ orderId });
    if (!res.success) {
      alert(res.error || "Erreur lors de la génération de la facture.");
    } else {
      alert(`Facture ${res.invoice?.invoiceNumber} générée avec succès !`);
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
              placeholder="Rechercher par N° commande MIS, PO client, société..."
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
            <option value="CONFIRMED">Confirmé</option>
            <option value="PARTIALLY_DELIVERED">Livré partiel</option>
            <option value="COMPLETED">Clôturé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="button button-primary text-xs shrink-0">
          <Plus className="size-4" /> Enregistrer un Bon de Commande (PO)
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">N° Commande (BC)</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">PO N° Client</th>
                <th className="py-3.5 px-4">Devis Validé Associé</th>
                <th className="py-3.5 px-4">Date PO</th>
                <th className="py-3.5 px-4 text-right">Montant Total ($)</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Facturation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto size-8 text-slate-300 mb-2" />
                    Aucune commande client enregistrée.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{order.orderNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{order.clientName}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{order.clientPoNumber}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{order.quotationReference}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.poDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {order.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleCreateInvoice(order.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Générer la facture correspondante"
                        >
                          <Receipt className="size-3" /> Facturer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                Enregistrer un Bon de Commande (Customer PO)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Devis validé de référence *
                </label>
                <select
                  required
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  className="form-field mt-1 text-xs font-bold text-primary"
                >
                  <option value="">Sélectionner un devis validé...</option>
                  {validatedQuotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.internalReference} — {q.clientName} (${q.total.toFixed(2)})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Seuls les devis préalablement passés au statut &ldquo;Validé&rdquo; peuvent être convertis en commande.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Numéro de PO du client (ex: PO/2026/KCC/045) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="PO/..."
                  value={clientPoNumber}
                  onChange={(e) => setClientPoNumber(e.target.value)}
                  className="form-field mt-1 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Date de livraison convenue
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Instructions de livraison / Remarques
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions spécifiques pour le transport ou le déchargement..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="button button-outline text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button button-primary text-xs"
                >
                  {isSubmitting ? "Validation..." : "Créer le Bon de Commande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
