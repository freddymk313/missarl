"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  Receipt,
  X,
  Truck,
  Eye,
} from "lucide-react";
import { OrderRecord } from "@/lib/db/orders";
import { QuotationRecord } from "@/lib/db/quotations";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { createOrderAction } from "@/actions/orders";
import { createInvoiceAction } from "@/actions/invoices";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";
import { formatUSD } from "@/lib/formatters";

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
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clientPoNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeOrders = orders.filter((o) => o.status === "CONFIRMED" || o.status === "PARTIALLY_DELIVERED");
  const totalAmount = orders.reduce((sum, o) => (o.status !== "CANCELLED" ? sum + o.total : sum), 0);

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
      {/* Top Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Total Commandes (BC)
          </p>
          <p className="text-xl font-black text-primary mt-1">{orders.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            En Cours de Livraison
          </p>
          <p className="text-xl font-black text-primary mt-1">{activeOrders.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Clôturées
          </p>
          <p className="text-xl font-black text-success mt-1">
            {orders.filter((o) => o.status === "COMPLETED").length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Volume Commandé
          </p>
          <p className="text-xl font-black text-primary font-mono mt-1">
            $ {formatUSD(totalAmount)}
          </p>
        </div>
      </div>

      {/* Ongoing Delivery Cards (matching reference screenshot 3) */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Truck className="size-3.5 text-accent" /> Commandes actives & En cours d&apos;exécution
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.slice(0, 3).map((ord) => (
              <div
                key={ord.id}
                onClick={() => setSelectedOrder(ord)}
                className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <RefChip value={ord.orderNumber} />
                    <StatusBadge status={ord.status} />
                  </div>

                  <h3 className="mt-3 text-sm font-extrabold text-foreground line-clamp-1">
                    {ord.clientName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PO Client: <span className="font-mono font-bold text-foreground">{ord.clientPoNumber}</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Montant Total</p>
                    <MoneyText amount={ord.total} className="font-mono font-black text-primary text-sm" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateInvoice(ord.id);
                    }}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Receipt className="size-3" /> Facturer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Track Orders Filter & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par N° commande MIS, PO client, société..."
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
            <option value="CONFIRMED">Confirmé</option>
            <option value="PARTIALLY_DELIVERED">Livré partiel</option>
            <option value="COMPLETED">Clôturé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Enregistrer un Bon de Commande (PO)
        </button>
      </div>

      {/* Orders Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">N° Commande (BC)</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">PO N° Client</th>
                <th className="py-3.5 px-4">Devis Validé Associé</th>
                <th className="py-3.5 px-4">Date PO</th>
                <th className="py-3.5 px-4 text-right">Montant Total</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Facturation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">Aucune commande trouvée</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Convertissez un devis validé en bon de commande pour commencer.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <RefChip value={order.orderNumber} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{order.clientName}</td>
                    <td className="py-3 px-4 font-bold text-foreground">{order.clientPoNumber}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{order.quotationReference}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.poDate}</td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={order.total} className="text-xs font-black text-primary" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {order.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => handleCreateInvoice(order.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success hover:bg-success/25 transition-colors cursor-pointer border border-success/30"
                            title="Générer la facture correspondante"
                          >
                            <Receipt className="size-3" /> Facturer
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

      {/* Detail Sheet for Order */}
      <DetailSheet
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.orderNumber || "Détail du Bon de Commande"}
        statusBadge={selectedOrder ? <StatusBadge status={selectedOrder.status} /> : undefined}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Client donneur d&apos;ordre</p>
              <h2 className="text-base font-black text-foreground mt-0.5">
                {selectedOrder.clientName}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile label="PO Client" value={selectedOrder.clientPoNumber} />
              <KeyValueTile label="Devis d'origine" value={selectedOrder.quotationReference || "—"} />
              <KeyValueTile label="Date du PO" value={selectedOrder.poDate} />
              <KeyValueTile label="Livraison prévue" value={selectedOrder.expectedDeliveryDate || "Convenue"} />
            </div>

            {selectedOrder.notes && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Instructions de livraison</span>
                <p className="text-foreground mt-0.5">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Financial Overview */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total HT :</span>
                <MoneyText amount={selectedOrder.subtotal} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA ({selectedOrder.vatRate}%) :</span>
                <MoneyText amount={selectedOrder.vatAmount} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-sm font-black text-primary border-t border-border pt-2">
                <span>TOTAL COMMANDE TTC :</span>
                <MoneyText amount={selectedOrder.total} className="font-mono text-base text-primary" />
              </div>
            </div>

            {/* Invoicing action */}
            {selectedOrder.status !== "CANCELLED" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCreateInvoice(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                >
                  <Receipt className="size-4" /> Émettre la facture de vente
                </button>
              </div>
            )}
          </div>
        )}
      </DetailSheet>

      {/* Modal Create Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                Enregistrer un Bon de Commande (Customer PO)
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Devis validé de référence *
                </label>
                <select
                  required
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
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
                <label className="block text-xs font-bold text-foreground">
                  Numéro de PO du client (ex: PO/2026/KCC/045) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="PO/..."
                  value={clientPoNumber}
                  onChange={(e) => setClientPoNumber(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">
                  Date de livraison convenue
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">
                  Instructions de livraison / Remarques
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions spécifiques pour le transport ou le déchargement..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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
