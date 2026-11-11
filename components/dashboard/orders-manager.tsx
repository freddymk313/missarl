"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  Receipt,
  X,
  Truck,
  Eye,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PackageCheck,
  Ban,
  Clock,
  Layers,
  Info,
} from "lucide-react";
import { OrderRecord, OrderLineItem } from "@/lib/db/orders";
import { QuotationRecord, QuotationLineItem } from "@/lib/db/quotations";
import { DeliveryNoteRecord } from "@/lib/db/delivery-notes";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  createOrderAction,
  getOrderAllocationsAction,
  getOrderDetailAction,
} from "@/actions/orders";
import { getQuotationItemsAction } from "@/actions/quotations";
import {
  createDeliveryBatchAction,
  updateDeliveryNoteStatusAction,
  getDeliveryNotesForOrderAction,
} from "@/actions/delivery-notes";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";
import { ResponsiveModal } from "@/components/dashboard/ui/responsive-modal";
import { formatUSD } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [, startTransition] = useTransition();
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ── New Order Modal State (with Partial Acceptance) ────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(!!initialNewOrderQuoteId);
  const [selectedQuoteId, setSelectedQuoteId] = useState(initialNewOrderQuoteId || "");
  const [clientPoNumber, setClientPoNumber] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Quotation lines for partial acceptance
  const [quoteItems, setQuoteItems] = useState<QuotationLineItem[]>([]);
  const [isLoadingQuoteItems, setIsLoadingQuoteItems] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const [acceptedQuantities, setAcceptedQuantities] = useState<Record<string, number>>({});

  // ── Order Detail & Delivery Batches State ─────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [detailedOrder, setDetailedOrder] = useState<OrderRecord | null>(null);
  const [allocations, setAllocations] = useState<
    Record<string, { ordered: number; delivered: number; reserved: number; available: number }>
  >({});
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteRecord[]>([]);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  // ── Delivery Batch Creation Modal State ────────────────────────────────────
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [carrierName, setCarrierName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [deliveryNotesText, setDeliveryNotesText] = useState("");
  const [dueDays, setDueDays] = useState(30);
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});
  const [batchObservations, setBatchObservations] = useState<Record<string, string>>({});
  const [batchSelectedIds, setBatchSelectedIds] = useState<Record<string, boolean>>({});
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchError, setBatchError] = useState("");

  // ── Status Transition / Cancellation Modal State ──────────────────────────
  const [cancellingBlId, setCancellingBlId] = useState<string | null>(null);
  const [blCancellationReason, setBlCancellationReason] = useState("");

  // Load quotation items whenever selected quotation changes in creation modal
  useEffect(() => {
    let isMounted = true;
    if (!selectedQuoteId) {
      return;
    }

    queueMicrotask(() => {
      if (!isMounted) return;
      setIsLoadingQuoteItems(true);
      setFormError("");
    });

    getQuotationItemsAction(selectedQuoteId).then((res) => {
      if (!isMounted) return;
      setIsLoadingQuoteItems(false);
      if (res.success && res.items) {
        setQuoteItems(res.items);
        // By default, select all items with their quoted quantities
        const initialSelected: Record<string, boolean> = {};
        const initialQtys: Record<string, number> = {};
        for (const item of res.items) {
          if (item.id) {
            initialSelected[item.id] = true;
            initialQtys[item.id] = item.quantity;
          }
        }
        setSelectedItemIds(initialSelected);
        setAcceptedQuantities(initialQtys);
      } else {
        setFormError(res.error || "Impossible de charger les lignes du devis.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedQuoteId]);

  // Load detailed order, allocations, and delivery notes when an order is opened
  const loadOrderFullDetails = async (orderId: string) => {
    setIsLoadingOrderDetails(true);
    setOrderDetailError(null);
    try {
      const [orderRes, allocRes, blRes] = await Promise.all([
        getOrderDetailAction(orderId),
        getOrderAllocationsAction(orderId),
        getDeliveryNotesForOrderAction(orderId),
      ]);

      if (orderRes.success && orderRes.order) {
        setDetailedOrder(orderRes.order);
        setSelectedOrder(orderRes.order);
      } else if (!orderRes.success) {
        setOrderDetailError(orderRes.error || "Impossible de récupérer les articles de cette commande.");
      }
      if (allocRes.success && allocRes.allocations) {
        setAllocations(allocRes.allocations);
      }
      if (blRes.success && blRes.deliveryNotes) {
        setDeliveryNotes(blRes.deliveryNotes);
      }
    } catch (err: unknown) {
      setOrderDetailError(err instanceof Error ? err.message : "Erreur inattendue lors du chargement des détails.");
    } finally {
      setIsLoadingOrderDetails(false);
    }
  };

  const handleSelectOrder = (order: OrderRecord) => {
    setSelectedOrder(order);
    setDetailedOrder(order);
    setOrderDetailError(null);
    loadOrderFullDetails(order.id);
  };

  // Open delivery modal with initialized quantities
  const handleOpenDeliveryModal = () => {
    if (!detailedOrder || !detailedOrder.items) return;

    const initialSel: Record<string, boolean> = {};
    const initialQtys: Record<string, number> = {};
    const initialObs: Record<string, string> = {};

    for (const item of detailedOrder.items) {
      const avail = allocations[item.id]?.available ?? item.quantityOrdered;
      if (avail > 0) {
        initialSel[item.id] = true;
        initialQtys[item.id] = avail;
        initialObs[item.id] = "";
      }
    }

    setBatchSelectedIds(initialSel);
    setBatchQuantities(initialQtys);
    setBatchObservations(initialObs);
    setDeliveryDate(new Date().toISOString().split("T")[0]);
    setCarrierName("");
    setDriverName("");
    setVehiclePlate("");
    setReceiverName("");
    setDeliveryNotesText("");
    setDueDays(30);
    setBatchError("");
    setIsDeliveryModalOpen(true);
  };

  // Submit delivery batch (creates BL + Invoice atomically)
  const handleCreateDeliveryBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedOrder || !detailedOrder.items) return;

    setBatchError("");
    const itemsToDeliver = Object.entries(batchSelectedIds)
      .filter(([, selected]) => selected)
      .map(([orderItemId]) => {
        const qty = batchQuantities[orderItemId] ?? 0;
        const obs = batchObservations[orderItemId] ?? "";
        return {
          orderItemId,
          quantity: qty,
          observation: obs,
        };
      });

    if (itemsToDeliver.length === 0) {
      setBatchError("Veuillez cocher au moins un article à inclure dans ce lot de livraison.");
      return;
    }

    for (const it of itemsToDeliver) {
      const avail = allocations[it.orderItemId]?.available ?? 0;
      if (it.quantity <= 0) {
        setBatchError("Chaque quantité à livrer doit être supérieure à zéro.");
        return;
      }
      if (it.quantity > avail) {
        setBatchError(`La quantité (${it.quantity}) dépasse le disponible restant (${avail}).`);
        return;
      }
    }

    setIsSubmittingBatch(true);
    try {
      const res = await createDeliveryBatchAction({
        orderId: detailedOrder.id,
        deliveryDate,
        carrierName: carrierName || undefined,
        driverName: driverName || undefined,
        vehiclePlate: vehiclePlate || undefined,
        receiverName: receiverName || undefined,
        notes: deliveryNotesText || undefined,
        dueDays,
        items: itemsToDeliver,
      });

      if (!res.success) {
        setBatchError(res.error || "Erreur lors de la préparation de la livraison.");
      } else {
        setIsDeliveryModalOpen(false);
        // Reload details immediately
        await loadOrderFullDetails(detailedOrder.id);
        // Refresh orders list status
        setOrders((prev) =>
          prev.map((o) => (o.id === detailedOrder.id ? { ...o, status: "PARTIALLY_DELIVERED" } : o))
        );
      }
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Update BL status (IN_TRANSIT, DELIVERED, CANCELLED)
  const handleUpdateBlStatus = async (
    blId: string,
    newStatus: "PREPARED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED",
    reason?: string
  ) => {
    try {
      const res = await updateDeliveryNoteStatusAction(blId, newStatus, reason);
      if (!res.success) {
        alert(res.error || "Erreur de changement de statut du BL.");
      } else {
        if (selectedOrder) {
          await loadOrderFullDetails(selectedOrder.id);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inattendue");
    }
  };

  // Filter orders
  const filtered = orders.filter((o) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clientPoNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeOrders = orders.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PARTIALLY_DELIVERED"
  );
  const totalAmount = orders.reduce(
    (sum, o) => (o.status !== "CANCELLED" ? sum + o.total : sum),
    0
  );

  // Partial PO live calculations in Create PO modal
  const selectedQuote = validatedQuotations.find((q) => q.id === selectedQuoteId);
  const vatRate = selectedQuote?.vatRate ?? 16.0;

  const acceptedLines = quoteItems.filter((it) => it.id && selectedItemIds[it.id]);
  const calculatedSubtotal = acceptedLines.reduce((sum: number, it) => {
    const qty = Number((it.id ? acceptedQuantities[it.id] : undefined) ?? it.quantity);
    const discount = Number(it.discountPercent || 0);
    const lineSub = Math.round(qty * it.unitPrice * (1 - discount / 100) * 100) / 100;
    return sum + lineSub;
  }, 0);
  const calculatedVat = Math.round(calculatedSubtotal * (vatRate / 100) * 100) / 100;
  const calculatedTotal = Math.round((calculatedSubtotal + calculatedVat) * 100) / 100;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (acceptedLines.length === 0) {
      setFormError("Veuillez sélectionner au moins un article accepté pour créer la commande.");
      return;
    }

    const payloadSelectedItems = acceptedLines.map((it) => ({
      quotationItemId: it.id!,
      quantity: acceptedQuantities[it.id!] ?? it.quantity,
    }));

    setIsSubmitting(true);
    try {
      const res = await createOrderAction({
        quotationId: selectedQuoteId,
        clientPoNumber,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes,
        selectedItems: payloadSelectedItems,
      });

      if (!res.success) {
        setFormError(res.error || "Erreur de création de la commande.");
      } else if (res.order) {
        startTransition(() => {
          setOrders((prev) => [res.order!, ...prev]);
        });
        setIsModalOpen(false);
        setClientPoNumber("");
        setSelectedQuoteId("");
        setQuoteItems([]);
        setSelectedItemIds({});
        setAcceptedQuantities({});
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: check if order has any pending deliverable items
  const totalDeliverableAvailable = Object.values(allocations).reduce(
    (sum, a) => sum + a.available,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Orders (PO)
          </p>
          <p className="text-xl font-black text-primary mt-1">{orders.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Pending Deliveries
          </p>
          <p className="text-xl font-black text-primary mt-1">{activeOrders.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Completed (Delivered)
          </p>
          <p className="text-xl font-black text-success mt-1">
            {orders.filter((o) => o.status === "COMPLETED").length}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Ordered Volume
          </p>
          <p className="text-xl font-black text-primary font-mono mt-1">
            {formatUSD(totalAmount)}
          </p>
        </div>
      </div>

      {/* Ongoing Delivery Cards */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Truck className="size-3.5 text-primary" /> Active Orders & Fulfillment in Progress
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.slice(0, 3).map((ord) => (
              <div
                key={ord.id}
                onClick={() => handleSelectOrder(ord)}
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
                    <p className="text-[10px] text-muted-foreground">Total Amount (incl. tax)</p>
                    <MoneyText amount={ord.total} className="font-mono font-black text-primary text-sm" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOrder(ord);
                    }}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors cursor-pointer border border-primary/20"
                  >
                    <Layers className="size-3" /> Manage deliveries
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Track Orders Filter & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by MIS order no., client PO, company..."
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
            <option value="ALL">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PARTIALLY_DELIVERED">Partially delivered</option>
            <option value="COMPLETED">Completed (Delivered)</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setFormError("");
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Record Purchase Order (PO)
        </button>
      </div>

      {/* Orders Data Table - Desktop View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Order No. (PO)</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Client PO No.</th>
                <th className="py-3.5 px-4">Validated Quote</th>
                <th className="py-3.5 px-4">PO Date</th>
                <th className="py-3.5 px-4 text-right">Total (incl. tax)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">No orders found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Convert a validated quotation into a purchase order to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <RefChip value={order.orderNumber} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">{order.clientName}</td>
                    <td className="py-3.5 px-4 font-bold text-foreground">{order.clientPoNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{order.quotationReference}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{order.poDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText amount={order.total} className="text-xs font-black text-primary" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectOrder(order)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-bold text-[11px] transition-colors cursor-pointer"
                          title="Details and deliveries"
                        >
                          <Eye className="size-3.5" /> Open
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders - Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card">
            <ShoppingCart className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground text-sm">No orders found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Convert a validated quotation into a purchase order to get started.
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => handleSelectOrder(order)}
              className="rounded-2xl border border-border bg-card p-4 shadow-xs cursor-pointer active:scale-[0.99] transition-transform space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <RefChip value={order.orderNumber} />
                <StatusBadge status={order.status} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground truncate">{order.clientName}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Client PO: <span className="font-mono font-bold text-foreground">{order.clientPoNumber}</span>
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Date: {order.poDate}</span>
                {order.quotationReference && (
                  <span className="font-mono text-[10px] text-muted-foreground">Devis: {order.quotationReference}</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                <MoneyText amount={order.total} className="text-sm font-black text-primary font-mono" />
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <Eye className="size-3.5" /> Details
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Order Detail & Delivery Batches Sheet ─────────────────────────── */}
      <DetailSheet
        isOpen={!!selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setDetailedOrder(null);
        }}
        size="xl"
        title={selectedOrder?.orderNumber || "Purchase Order Details"}
        statusBadge={selectedOrder ? <StatusBadge status={selectedOrder.status} /> : undefined}
        hasChildDialog={isDeliveryModalOpen}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Ordering Client</p>
              <h2 className="text-base font-black text-foreground mt-0.5">
                {selectedOrder.clientName}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile label="Client PO" value={selectedOrder.clientPoNumber} />
              <KeyValueTile label="Originating Quote" value={selectedOrder.quotationReference || "—"} />
              <KeyValueTile label="PO Date" value={selectedOrder.poDate} />
              <KeyValueTile label="Agreed Delivery" value={selectedOrder.expectedDeliveryDate || "Agreed"} />
            </div>

            {selectedOrder.notes && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Delivery Instructions</span>
                <p className="text-foreground mt-0.5">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Financial Totals */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (excl. tax):</span>
                <MoneyText amount={selectedOrder.subtotal} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({selectedOrder.vatRate}%):</span>
                <MoneyText amount={selectedOrder.vatAmount} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-sm font-black text-primary border-t border-border pt-2">
                <span>TOTAL ORDER (INCL. TAX):</span>
                <MoneyText amount={selectedOrder.total} className="font-mono text-base text-primary" />
              </div>
            </div>

            {/* Delivery Action Button */}
            {selectedOrder.status !== "CANCELLED" && (
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Batch Shipping (Delivery Notes)</span>
                  </div>
                  <span className="text-[11px] font-bold text-primary">
                    {totalDeliverableAvailable > 0
                      ? `${totalDeliverableAvailable} available to deliver`
                      : "All items are allocated"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={totalDeliverableAvailable <= 0}
                  onClick={handleOpenDeliveryModal}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PackageCheck className="size-4" /> Prepare partial delivery (New Delivery Note)
                </button>
              </div>
            )}

            {/* Items with Allocation Status */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShoppingCart className="size-3.5 text-primary" /> Ordered Items & Availability
              </h3>
              {isLoadingOrderDetails ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading availability...</p>
              ) : orderDetailError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Error loading items</p>
                    <p className="text-[11px] mt-0.5 opacity-90">{orderDetailError}</p>
                  </div>
                </div>
              ) : !detailedOrder?.items || detailedOrder.items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No items recorded on this order.</p>
              ) : (
                <div className="space-y-2">
                  {detailedOrder.items.map((item: OrderLineItem) => {
                    const alloc = allocations[item.id] || {
                      ordered: item.quantityOrdered,
                      delivered: item.quantityDelivered,
                      reserved: 0,
                      available: item.quantityOrdered - item.quantityDelivered,
                    };
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-border bg-card space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-secondary text-[10px] font-black">
                              {item.lineNumber}
                            </span>
                            <span className="font-bold text-foreground">{item.description}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            {formatUSD(item.lineTotal)}
                          </span>
                        </div>

                        {item.brand && (
                          <p className="text-[10px] text-muted-foreground pl-7">
                            Brand: <span className="font-semibold text-foreground">{item.brand}</span>
                          </p>
                        )}

                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 text-[10px]">
                          <div>
                            <span className="text-muted-foreground block">Ordered</span>
                            <span className="font-bold text-foreground">
                              {alloc.ordered} {item.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Delivered</span>
                            <span className="font-bold text-success">
                              {alloc.delivered} {item.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">In Progress</span>
                            <span className="font-bold text-warning">
                              {alloc.reserved} {item.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Available</span>
                            <span
                              className={`font-black ${
                                alloc.available > 0 ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              {alloc.available} {item.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delivery Notes (BL) History & Linked Invoices */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Truck className="size-3.5 text-primary" /> Delivery Notes & Associated Invoices ({deliveryNotes.length})
              </h3>

              {deliveryNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No delivery notes issued for this order.
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryNotes.map((bl) => (
                    <div
                      key={bl.id}
                      className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <RefChip value={bl.blNumber} />
                            <StatusBadge status={bl.status} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Delivery date: <span className="font-bold text-foreground">{bl.deliveryDate}</span>
                          </p>
                        </div>

                        {bl.invoiceNumber && (
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground block">Linked invoice</span>
                            <RefChip value={bl.invoiceNumber} />
                          </div>
                        )}
                      </div>

                      {(bl.carrierName || bl.driverName || bl.vehiclePlate) && (
                        <div className="rounded-xl bg-secondary/40 p-2.5 text-[11px] text-foreground space-y-0.5">
                          {bl.carrierName && <p>Carrier: <span className="font-semibold">{bl.carrierName}</span></p>}
                          {bl.driverName && <p>Driver: <span className="font-semibold">{bl.driverName}</span></p>}
                          {bl.vehiclePlate && <p>Plate: <span className="font-mono font-semibold">{bl.vehiclePlate}</span></p>}
                          {bl.receiverName && <p>Receiver: <span className="font-semibold">{bl.receiverName}</span></p>}
                        </div>
                      )}

                      {/* PDF Actions & Status Transitions */}
                      <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* BL PDF */}
                          <a
                            href={`/api/delivery-notes/${bl.id}/pdf?disposition=inline`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-bold text-foreground transition-colors"
                            title="Preview Delivery Note PDF"
                          >
                            <FileText className="size-3 text-primary" /> Delivery Note PDF
                          </a>
                          <a
                            href={`/api/delivery-notes/${bl.id}/pdf?disposition=attachment`}
                            className="inline-flex items-center justify-center size-7 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                            title="Download Delivery Note PDF"
                          >
                            <Download className="size-3.5" />
                          </a>

                          {/* Invoice PDF */}
                          {bl.invoiceId && (
                            <>
                              <a
                                href={`/api/invoices/${bl.invoiceId}/pdf?disposition=inline`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-[11px] font-bold text-primary transition-colors border border-primary/25"
                                title="Preview Invoice PDF"
                              >
                                <Receipt className="size-3" /> Invoice PDF
                              </a>
                              <a
                                href={`/api/invoices/${bl.invoiceId}/pdf?disposition=attachment`}
                                className="inline-flex items-center justify-center size-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/25"
                                title="Download Invoice PDF"
                              >
                                <Download className="size-3.5" />
                              </a>
                            </>
                          )}
                        </div>

                        {/* Status transition controls */}
                        <div className="flex items-center gap-1.5">
                          {bl.status === "PREPARED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBlStatus(bl.id, "IN_TRANSIT")}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-warning/15 hover:bg-warning/25 text-[11px] font-bold text-warning border border-warning/30 transition-colors cursor-pointer"
                              title="Mark as in transit"
                            >
                              <Truck className="size-3" /> In transit
                            </button>
                          )}

                          {bl.status === "IN_TRANSIT" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBlStatus(bl.id, "DELIVERED")}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-success/15 hover:bg-success/25 text-[11px] font-bold text-success border border-success/30 transition-colors cursor-pointer"
                              title="Confirm physical client delivery"
                            >
                              <CheckCircle2 className="size-3" /> Delivered
                            </button>
                          )}

                          {bl.status !== "DELIVERED" && bl.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt("Reason for delivery note cancellation:");
                                if (reason && reason.trim()) {
                                  handleUpdateBlStatus(bl.id, "CANCELLED", reason.trim());
                                }
                              }}
                              className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Cancel this delivery note"
                            >
                              <Ban className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailSheet>

      {/* ── Modal Create Order from Quotation with Partial Selection ─────── */}
      <ResponsiveModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Purchase Order (Customer PO)"
        maxWidthClass="max-w-2xl"
      >
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            Full or partial item acceptance from validated quotation
          </p>

            {formError && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Reference Validated Quotation *
                </label>
                <select
                  required
                  value={selectedQuoteId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedQuoteId(val);
                    if (!val) {
                      setQuoteItems([]);
                      setSelectedItemIds({});
                      setAcceptedQuantities({});
                    }
                  }}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                >
                  <option value="">Select a validated quotation...</option>
                  {validatedQuotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.internalReference} — {q.clientName} (${q.total.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Customer PO Number (e.g. PO/2026/045) *
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
                    Agreed Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              {/* Partial Items Selection Table */}
              {selectedQuoteId && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Select items accepted by customer PO
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          for (const it of quoteItems) {
                            if (it.id) all[it.id] = true;
                          }
                          setSelectedItemIds(all);
                        }}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Select all
                      </button>
                      <span className="text-muted-foreground text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIds({})}
                        className="text-[11px] font-bold text-muted-foreground hover:underline cursor-pointer"
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>

                  {isLoadingQuoteItems ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Loading quotation items...
                    </p>
                  ) : quoteItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      This quotation contains no items.
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[520px]">
                        <thead className="bg-secondary/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                          <tr>
                            <th className="p-2.5 w-8 text-center">✓</th>
                            <th className="p-2.5">Item / Description</th>
                            <th className="p-2.5 text-center">Quoted</th>
                            <th className="p-2.5 text-right">Unit Price</th>
                            <th className="p-2.5 text-center w-24">Accepted Qty</th>
                            <th className="p-2.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {quoteItems.map((it) => {
                            const isChecked = !!(it.id && selectedItemIds[it.id]);
                            const acceptedQty = Number((it.id ? acceptedQuantities[it.id] : undefined) ?? it.quantity);
                            const discount = Number(it.discountPercent || 0);
                            const lineSub = Math.round(acceptedQty * it.unitPrice * (1 - discount / 100) * 100) / 100;

                            return (
                              <tr
                                key={it.id || it.lineNumber}
                                className={isChecked ? "bg-card" : "bg-secondary/20 opacity-60"}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (!it.id) return;
                                      const checked = e.target.checked;
                                      setSelectedItemIds((prev) => ({ ...prev, [it.id!]: checked }));
                                      if (checked && !acceptedQuantities[it.id]) {
                                        setAcceptedQuantities((prev) => ({ ...prev, [it.id!]: it.quantity }));
                                      }
                                    }}
                                    className="rounded size-4 text-primary focus:ring-primary/20 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <p className="font-bold text-foreground">{it.description}</p>
                                  {it.brand && (
                                    <p className="text-[10px] text-muted-foreground">Brand: {it.brand}</p>
                                  )}
                                </td>
                                <td className="p-2.5 text-center font-mono">
                                  {it.quantity} {it.unit}
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {formatUSD(it.unitPrice)}
                                </td>
                                <td className="p-2.5 text-center">
                                  <input
                                    type="number"
                                    min="0.01"
                                    max={it.quantity}
                                    step="any"
                                    disabled={!isChecked}
                                    value={acceptedQty}
                                    onChange={(e) => {
                                      if (!it.id) return;
                                      const val = parseFloat(e.target.value);
                                      setAcceptedQuantities((prev) => ({
                                        ...prev,
                                        [it.id!]: isNaN(val) ? 0 : Math.min(val, it.quantity),
                                      }));
                                    }}
                                    className="h-8 w-20 rounded-lg border border-border bg-card px-2 text-center text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
                                  />
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-primary">
                                  {isChecked ? formatUSD(lineSub) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}

                  {/* Live Financial Summary */}
                  {acceptedLines.length > 0 && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs space-y-1.5 border border-border">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Selected items:</span>
                        <span className="font-bold text-foreground">
                          {acceptedLines.length} / {quoteItems.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Accepted Subtotal (excl. tax):</span>
                        <MoneyText amount={calculatedSubtotal} className="font-mono font-bold text-foreground" />
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT ({vatRate}%):</span>
                        <MoneyText amount={calculatedVat} className="font-mono font-bold text-foreground" />
                      </div>
                      <div className="flex justify-between text-sm font-black text-primary border-t border-border pt-1.5">
                        <span>TOTAL ACCEPTED ORDER:</span>
                        <MoneyText amount={calculatedTotal} className="font-mono text-base text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-foreground">
                  Delivery Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific transport or unloading instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || acceptedLines.length === 0}
                  className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </ResponsiveModal>

      {/* ── Modal Prepare Partial Delivery Batch (BL + Linked Invoice) ─────── */}
      <Dialog open={isDeliveryModalOpen} onOpenChange={(open) => { if (!open) setIsDeliveryModalOpen(false); }}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        >
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-extrabold text-primary flex items-center gap-2">
                  <PackageCheck className="size-5" /> Prepare Delivery Note (BL)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically generates 1 Delivery Note and 1 associated Invoice for this batch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
          </DialogHeader>

          {detailedOrder && (
            <>
              {batchError && (
                <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                  {batchError}
                </div>
              )}

              <form onSubmit={handleCreateDeliveryBatch} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Delivery Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Associated Invoice Due Period
                    </label>
                    <select
                      value={dueDays}
                      onChange={(e) => setDueDays(Number(e.target.value))}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    >
                      <option value={15}>15 days</option>
                      <option value={30}>30 days (Standard)</option>
                      <option value={45}>45 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Carrier
                    </label>
                    <input
                      type="text"
                      placeholder="MIS SARL / External"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      placeholder="Jean Mukendi"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Vehicle Plate
                    </label>
                    <input
                      type="text"
                      placeholder="1234AB/05"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Client Receiver Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Warehouse manager / client receiver..."
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>

                {/* Items Allocation Table */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                    Items and quantities to deliver in this batch
                  </span>

                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[500px]">
                        <thead className="bg-secondary/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                        <tr>
                          <th className="p-2.5 w-8 text-center">✓</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-center">Available</th>
                          <th className="p-2.5 text-center w-28">Qty to Deliver</th>
                          <th className="p-2.5">Note on Delivery Document</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {detailedOrder.items?.map((it) => {
                          const avail = allocations[it.id]?.available ?? 0;
                          const isChecked = !!batchSelectedIds[it.id] && avail > 0;
                          const qty = batchQuantities[it.id] ?? avail;
                          const obs = batchObservations[it.id] ?? "";

                          return (
                            <tr
                              key={it.id}
                              className={avail === 0 ? "bg-secondary/20 opacity-50" : "bg-card"}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled={avail <= 0}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setBatchSelectedIds((prev) => ({ ...prev, [it.id]: checked }));
                                    if (checked && !batchQuantities[it.id]) {
                                      setBatchQuantities((prev) => ({ ...prev, [it.id]: avail }));
                                    }
                                  }}
                                  className="rounded size-4 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-2.5">
                                <p className="font-bold text-foreground">{it.description}</p>
                                {it.brand && (
                                  <p className="text-[10px] text-muted-foreground">Brand: {it.brand}</p>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-bold text-foreground">
                                {avail} {it.unit}
                              </td>
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  min="0.01"
                                  max={avail}
                                  step="any"
                                  disabled={!isChecked}
                                  value={qty}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setBatchQuantities((prev) => ({
                                      ...prev,
                                      [it.id]: isNaN(val) ? 0 : Math.min(val, avail),
                                    }));
                                  }}
                                  className="h-8 w-24 rounded-lg border border-border bg-card px-2 text-center text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  placeholder="e.g. Package 1/2, Good condition..."
                                  disabled={!isChecked}
                                  value={obs}
                                  onChange={(e) =>
                                    setBatchObservations((prev) => ({ ...prev, [it.id]: e.target.value }))
                                  }
                                  className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Notes / Specific instructions for this batch
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Unloading instructions, transport references..."
                    value={deliveryNotesText}
                    onChange={(e) => setDeliveryNotesText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsDeliveryModalOpen(false)}
                    className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBatch}
                    className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingBatch ? "Generating batch..." : "Confirm Shipment & Generate Delivery Note + Invoice"}
                  </button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}