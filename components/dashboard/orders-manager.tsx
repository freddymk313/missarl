"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  ShoppingCart,
  Receipt,
  Eye,
  CheckCircle2,
  Calendar as CalendarIcon,
  Truck,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { OrderRecord } from "@/lib/db/orders";
import { QuotationRecord } from "@/lib/db/quotations";
import { createOrderAction } from "@/actions/orders";
import { createInvoiceAction } from "@/actions/invoices";
import {
  PageHeader,
  StatTile,
  DataTable,
  DataTableToolbar,
  DateRangePicker,
  RefChip,
  StatusPill,
  MoneyText,
  KeyValueTile,
  ProgressRing,
  DetailSheet,
  formatDate,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

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
  const [orders, setOrders] = React.useState<OrderRecord[]>(initialOrders);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Create Modal Sheet
  const [isModalOpen, setIsModalOpen] = React.useState(!!initialNewOrderQuoteId);
  const [selectedQuoteId, setSelectedQuoteId] = React.useState(
    initialNewOrderQuoteId || ""
  );
  const [clientPoNumber, setClientPoNumber] = React.useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Detail Sheet
  const [selectedOrder, setSelectedOrder] = React.useState<OrderRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = React.useState(false);

  // Compute stats
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const activeCount = orders.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PARTIALLY_DELIVERED"
  ).length;
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const totalAmount = orders.reduce(
    (sum, o) => (o.status !== "CANCELLED" ? sum + o.total : sum),
    0
  );

  const activeOrders = React.useMemo(() => {
    return orders
      .filter((o) => o.status !== "CANCELLED" && o.status !== "COMPLETED")
      .slice(0, 3);
  }, [orders]);

  const filtered = React.useMemo(() => {
    return orders.filter((o) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.clientPoNumber.toLowerCase().includes(q) ||
        (o.clientName && o.clientName.toLowerCase().includes(q)) ||
        (o.quotationReference && o.quotationReference.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleOpenDetail = (order: OrderRecord) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

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
    setIsGeneratingInvoice(true);
    try {
      const res = await createInvoiceAction({ orderId });
      if (!res.success) {
        alert(res.error || "Erreur lors de la génération de la facture.");
      } else {
        alert(`Facture ${res.invoice?.invoiceNumber} générée avec succès !`);
        setIsDetailOpen(false);
      }
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const getOrderProgress = (order: OrderRecord) => {
    if (order.status === "COMPLETED") return 100;
    if (order.items && order.items.length > 0) {
      const ordered = order.items.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
      const delivered = order.items.reduce((s, i) => s + (i.quantityDelivered || 0), 0);
      if (ordered > 0) return Math.round((delivered / ordered) * 100);
    }
    if (order.status === "PARTIALLY_DELIVERED") return 50;
    if (order.status === "CONFIRMED") return 25;
    return 0;
  };

  const columns = React.useMemo<ColumnDef<OrderRecord>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "N° Commande (BC)",
        cell: ({ row }) => (
          <RefChip variant="primary">{row.original.orderNumber}</RefChip>
        ),
      },
      {
        accessorKey: "clientPoNumber",
        header: "N° Bon Client (PO)",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            {row.original.clientPoNumber}
          </span>
        ),
      },
      {
        accessorKey: "clientName",
        header: "Client & Devis Lié",
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block truncate">
              {row.original.clientName}
            </span>
            {row.original.quotationReference && (
              <span className="text-[11px] text-muted-foreground">
                Réf: {row.original.quotationReference}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "poDate",
        header: "Date commande",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDate(row.original.poDate)}
          </span>
        ),
      },
      {
        id: "progress",
        header: "Progression",
        cell: ({ row }) => {
          const progress = getOrderProgress(row.original);
          return (
            <div className="flex items-center gap-2">
              <ProgressRing value={progress} size={32} strokeWidth={3} />
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {progress}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "total",
        header: "Montant ($ USD)",
        cell: ({ row }) => (
          <MoneyText
            value={row.original.total}
            className="font-bold text-foreground text-sm"
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row.original);
              }}
              className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-auto"
              title="Consulter"
            >
              <Eye className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Bons de Commande (Purchase Orders)"
        description="Enregistrement des ordres d'achat clients (PO) à partir de devis validés et suivi des réceptions."
        icon={<ShoppingCart className="size-5" />}
        actions={
          <Button
            onClick={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Enregistrer un bon (PO)</span>
          </Button>
        }
      />

      {/* KPI Tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total commandes"
          value={totalCount}
          subtitle={<MoneyText value={totalAmount} className="text-muted-foreground" />}
          icon={<ShoppingCart className="size-4" />}
        />
        <StatTile
          label="En attente"
          value={pendingCount}
          subtitle="En attente de traitement"
        />
        <StatTile
          label="En cours de livraison"
          value={activeCount}
          subtitle="Livraison partielle ou totale"
          icon={<Truck className="size-4" />}
        />
        <StatTile
          label="Clôturées"
          value={completedCount}
          subtitle="Entièrement livrées"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      {/* Ongoing Orders Card with Circular Progress Ring (Screenshot 2 / 3 pattern) */}
      {activeOrders.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/70 mb-4">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Commandes en cours d&apos;exécution
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {activeOrders.length} commande{activeOrders.length > 1 ? "s" : ""} active{activeOrders.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map((o) => {
              const progress = getOrderProgress(o);
              return (
                <div
                  key={o.id}
                  onClick={() => handleOpenDetail(o)}
                  className="group flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/30 p-4 hover:border-primary/40 hover:bg-card transition-all cursor-pointer shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <RefChip variant="primary">{o.orderNumber}</RefChip>
                        <h4 className="mt-2 font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {o.clientName}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          PO Client: <span className="font-semibold text-foreground">{o.clientPoNumber}</span>
                        </p>
                      </div>

                      <ProgressRing
                        value={progress}
                        size={46}
                        strokeWidth={4}
                        colorClass="text-primary"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between">
                    <StatusPill status={o.status} />
                    <MoneyText
                      value={o.total}
                      className="font-bold text-foreground text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Orders Table */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={handleOpenDetail}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par N° commande, PO client, société..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilterCount={statusFilter !== "ALL" ? 1 : 0}
            filterContent={
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Statut de la commande
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground outline-none"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="PENDING">En attente</option>
                  <option value="CONFIRMED">Confirmée</option>
                  <option value="PARTIALLY_DELIVERED">Livrée partiellement</option>
                  <option value="COMPLETED">Terminée</option>
                  <option value="CANCELLED">Annulée</option>
                </select>
                <div className="pt-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter("ALL")}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            }
            extraActions={
              <DateRangePicker placeholder="Période de commande" />
            }
          />
        }
        renderMobileCard={(o) => {
          const progress = getOrderProgress(o);
          return (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RefChip variant="primary">{o.orderNumber}</RefChip>
                  <StatusPill status={o.status} />
                </div>
                <div className="flex items-center gap-1.5">
                  <ProgressRing value={progress} size={28} strokeWidth={3} />
                  <span className="text-xs font-bold tabular-nums">{progress}%</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{o.clientName}</p>
                <p className="text-xs text-muted-foreground">PO: {o.clientPoNumber}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                <span className="text-muted-foreground">{formatDate(o.poDate)}</span>
                <MoneyText value={o.total} className="font-bold text-foreground" />
              </div>
            </div>
          );
        }}
      />

      {/* Detail Sheet */}
      {selectedOrder && (
        <DetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedOrder.orderNumber}
          subtitle={`Client: ${selectedOrder.clientName}`}
          badge={<StatusPill status={selectedOrder.status} />}
          footer={
            <div className="flex items-center gap-2 justify-end w-full">
              {selectedOrder.status !== "CANCELLED" && (
                <Button
                  type="button"
                  disabled={isGeneratingInvoice}
                  onClick={() => handleCreateInvoice(selectedOrder.id)}
                  className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                >
                  {isGeneratingInvoice ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Receipt className="size-3.5" />
                  )}
                  <span>Générer la facture de vente</span>
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="N° Bon de commande client (PO)"
                value={selectedOrder.clientPoNumber}
              />
              <KeyValueTile
                label="Date de commande"
                value={formatDate(selectedOrder.poDate)}
                icon={<CalendarIcon className="size-3.5" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="Date de livraison convenue"
                value={formatDate(selectedOrder.expectedDeliveryDate)}
              />
              <KeyValueTile
                label="Devis de référence"
                value={selectedOrder.quotationReference || "—"}
              />
            </div>

            {/* Financial summary */}
            <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sous-total HT</span>
                <MoneyText value={selectedOrder.subtotal} className="font-semibold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">TVA ({selectedOrder.vatRate} %)</span>
                <MoneyText value={selectedOrder.vatAmount} className="font-semibold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-2 text-primary">
                <span>Total TTC de la commande</span>
                <MoneyText value={selectedOrder.total} className="text-base font-extrabold text-primary" />
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Instructions de livraison
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {selectedOrder.notes}
                </p>
              </div>
            )}
          </div>
        </DetailSheet>
      )}

      {/* Create Order Modal Sheet */}
      <DetailSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Enregistrer un Bon de Commande (PO)"
        subtitle="Sélectionnez un devis préalablement validé pour enregistrer la commande ferme du client."
      >
        {formError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Devis validé de rattachement *
            </label>
            <select
              value={selectedQuoteId}
              required
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
            >
              <option value="">Sélectionner un devis validé...</option>
              {validatedQuotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.internalReference} — {q.clientName} (${q.total.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              N° du Bon de Commande Client (PO) *
            </label>
            <input
              type="text"
              value={clientPoNumber}
              required
              onChange={(e) => setClientPoNumber(e.target.value)}
              placeholder="Ex: PO-KCC-2026-449"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Date de livraison convenue
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notes logistiques
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Instructions pour la livraison sur site..."
              className="w-full rounded-lg border border-input bg-card p-3 text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="h-8 text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="h-8 bg-primary text-primary-foreground text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Enregistrement...
                </>
              ) : (
                "Valider et enregistrer la commande"
              )}
            </Button>
          </div>
        </form>
      </DetailSheet>
    </div>
  );
}
