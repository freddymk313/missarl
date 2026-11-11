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
  FileText,
  Download,
  Truck,
  Check,
} from "lucide-react";
import { InvoiceRecord } from "@/lib/db/invoices";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cancelInvoiceAction, updateInvoiceNormalizedNumberAction } from "@/actions/invoices";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";
import { ResponsiveModal } from "@/components/dashboard/ui/responsive-modal";
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
  const [normalizedInput, setNormalizedInput] = useState("");
  const [isSavingNormalized, setIsSavingNormalized] = useState(false);
  const [normalizedSaved, setNormalizedSaved] = useState(false);

  const openInvoiceDetails = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setNormalizedInput(inv.normalizedInvoiceNumber || "");
    setNormalizedSaved(false);
  };

  const handleSaveNormalizedNumber = async () => {
    if (!selectedInvoice) return;
    setIsSavingNormalized(true);
    setNormalizedSaved(false);
    try {
      const res = await updateInvoiceNormalizedNumberAction(
        selectedInvoice.id,
        normalizedInput.trim() || null
      );
      if (!res.success) {
        alert(res.error || "Update failed");
      } else if (res.invoice) {
        setInvoices((prev) => prev.map((i) => (i.id === selectedInvoice.id ? res.invoice! : i)));
        setSelectedInvoice(res.invoice);
        setNormalizedSaved(true);
        setTimeout(() => setNormalizedSaved(false), 2500);
      }
    } finally {
      setIsSavingNormalized(false);
    }
  };

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
      alert("Please provide an explicit cancellation reason.");
      return;
    }

    const res = await cancelInvoiceAction(id, cancellationReason);
    if (!res.success) {
      alert(res.error || "Cancellation failed.");
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Invoices
          </p>
          <p className="text-xl font-black text-primary mt-1">{invoices.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Unpaid Invoices
          </p>
          <p className="text-xl font-black text-warning mt-1">{unpaidCount}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Invoiced Volume
          </p>
          <p className="text-xl font-black text-primary font-mono mt-1">
             {formatUSD(totalInvoiced)}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Outstanding Receivables
          </p>
          <p className="text-xl font-black text-destructive font-mono mt-1">
             {formatUSD(totalReceivables)}
          </p>
        </div>
      </div>

      {/* Top Filter and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice no., client, order..."
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
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Fully paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
        >
          <Receipt className="size-4" /> Invoice from an Order
        </Link>
      </div>

      {/* Invoices Table - Desktop View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Invoice No.</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Order & Delivery Note</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Total (incl. tax)</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions & PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-muted-foreground">
                    <Receipt className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">No invoices found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoices are generated automatically with each delivery batch.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => openInvoiceDetails(inv)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <RefChip value={inv.invoiceNumber} />
                      {inv.normalizedInvoiceNumber && (
                        <p
                          className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[150px]"
                          title={`Standardized: ${inv.normalizedInvoiceNumber}`}
                        >
                          {inv.normalizedInvoiceNumber}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">{inv.clientName}</td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs text-muted-foreground block">
                          {inv.orderNumber || "Direct"}
                        </span>
                        {inv.deliveryNoteNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                            <Truck className="size-2.5" /> {inv.deliveryNoteNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{inv.issueDate}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{inv.dueDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText amount={inv.total} className="text-xs font-bold text-foreground" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText amount={inv.paidAmount} className="text-xs font-bold text-success" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText amount={inv.balanceDue} className="text-xs font-black text-destructive" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                          title="View details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf?disposition=inline`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
                          title="Preview Invoice PDF"
                        >
                          <FileText className="size-3.5" />
                        </a>
                        <a
                          href={`/api/invoices/${inv.id}/pdf?disposition=attachment`}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Download Invoice PDF"
                        >
                          <Download className="size-3.5" />
                        </a>
                        {inv.balanceDue > 0 && inv.status !== "CANCELLED" && (
                          <Link
                            href={`/dashboard/payments?client=${inv.clientId}&invoice=${inv.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 text-[10px] font-bold text-success hover:bg-success/25 transition-colors border border-success/30 ml-0.5"
                            title="Record payment"
                          >
                            <CreditCard className="size-3" /> Pay
                          </Link>
                        )}
                        {inv.paidAmount === 0 && inv.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => setCancellingId(inv.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Cancel with reason"
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

      {/* Invoices - Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card">
            <Receipt className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground text-sm">No invoices found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices are generated automatically with each delivery batch.
            </p>
          </div>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.id}
              onClick={() => openInvoiceDetails(inv)}
              className="rounded-2xl border border-border bg-card p-4 shadow-xs cursor-pointer active:scale-[0.99] transition-transform space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <RefChip value={inv.invoiceNumber} />
                <StatusBadge status={inv.status} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground truncate">{inv.clientName}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {inv.orderNumber && <span>PO: {inv.orderNumber}</span>}
                  {inv.deliveryNoteNumber && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                      <Truck className="size-3" /> {inv.deliveryNoteNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Date: {inv.issueDate}</span>
                <span className={inv.status === "OVERDUE" ? "text-destructive font-bold" : ""}>
                  Due: {inv.dueDate}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                <div>
                  <MoneyText amount={inv.total} className="text-xs font-bold text-foreground font-mono" />
                  {inv.balanceDue > 0 && (
                    <p className="text-[10px] text-destructive font-bold">
                      Due: {formatUSD(inv.balanceDue)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/api/invoices/${inv.id}/pdf?disposition=inline`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                    title="Preview Invoice PDF"
                  >
                    <FileText className="size-4" />
                  </a>
                  {inv.balanceDue > 0 && inv.status !== "CANCELLED" && (
                    <Link
                      href={`/dashboard/payments?client=${inv.clientId}&invoice=${inv.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1 text-[10px] font-bold text-success border border-success/30"
                    >
                      <CreditCard className="size-3" /> Pay
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Sheet for Invoice */}
      <DetailSheet
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        size="xl"
        title={selectedInvoice?.invoiceNumber || "Invoice Details"}
        statusBadge={selectedInvoice ? <StatusBadge status={selectedInvoice.status} /> : undefined}
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Billed Client</p>
              <h2 className="text-base font-black text-foreground mt-0.5 flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                {selectedInvoice.clientName}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile label="Issue Date" value={selectedInvoice.issueDate} />
              <KeyValueTile label="Due Date" value={selectedInvoice.dueDate} />
              <KeyValueTile label="Linked Order" value={selectedInvoice.orderNumber || "Direct"} />
              <KeyValueTile label="Client PO No." value={selectedInvoice.clientPoNumber || "—"} />
              <KeyValueTile label="Associated Delivery Note" value={selectedInvoice.deliveryNoteNumber || "—"} />
              <KeyValueTile label="VAT Rate" value={`${selectedInvoice.vatRate}%`} />
            </div>

            {/* Normalized Invoice Number Configuration Box */}
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  Standardized Invoice Number (Fiscal / Tax ID)
                </label>
                {selectedInvoice.normalizedInvoiceNumber ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground font-bold">
                    Assigned
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">
                    Not specified (—)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Official fiscal identifier used on statement of unpaid invoices (e.g. <code className="font-mono text-primary font-bold">FC/CD02035320/1-6/2026</code>).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. FC/CD02035320/1-6/2026"
                  value={normalizedInput}
                  onChange={(e) => setNormalizedInput(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleSaveNormalizedNumber}
                  disabled={isSavingNormalized}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs shrink-0 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {normalizedSaved ? (
                    <>
                      <Check className="size-3.5 text-accent" /> Saved
                    </>
                  ) : isSavingNormalized ? (
                    "Saving..."
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>

            {/* PDF Generation Quick Strip */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <span className="text-[11px] font-bold text-primary block">Official Invoice Document (PDF)</span>
              <div className="flex gap-2">
                <a
                  href={`/api/invoices/${selectedInvoice.id}/pdf?disposition=inline`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs"
                >
                  <FileText className="size-3.5" /> Preview Invoice PDF
                </a>
                <a
                  href={`/api/invoices/${selectedInvoice.id}/pdf?disposition=attachment`}
                  className="inline-flex items-center justify-center size-9 rounded-lg border border-primary/30 bg-card hover:bg-primary/10 text-primary transition-colors"
                  title="Download PDF"
                >
                  <Download className="size-4" />
                </a>
              </div>

              {selectedInvoice.deliveryNoteId && (
                <div className="pt-2 border-t border-primary/15 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Linked Delivery Note:</span>
                  <a
                    href={`/api/delivery-notes/${selectedInvoice.deliveryNoteId}/pdf?disposition=inline`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <Truck className="size-3" /> View Note {selectedInvoice.deliveryNoteNumber}
                  </a>
                </div>
              )}
            </div>

            {/* Financial Balance Card */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (excl. tax):</span>
                <MoneyText amount={selectedInvoice.subtotal} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({selectedInvoice.vatRate}%):</span>
                <MoneyText amount={selectedInvoice.vatAmount} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground border-t border-border/80 pt-2">
                <span>Total Invoice (incl. tax):</span>
                <MoneyText amount={selectedInvoice.total} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-success">
                <span>Amount Received:</span>
                <MoneyText amount={selectedInvoice.paidAmount} className="font-mono font-bold text-success" />
              </div>
              <div className="flex justify-between text-sm font-black text-destructive border-t border-border pt-2">
                <span>OUTSTANDING BALANCE DUE:</span>
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
                  <CreditCard className="size-4" /> Record a payment for this invoice
                </Link>
              )}
            </div>
          </div>
        )}
      </DetailSheet>

      {/* Cancellation Modal */}
      <ResponsiveModal
        open={!!cancellingId}
        onClose={() => setCancellingId(null)}
        title="Invoice Cancellation Reason"
        variant="danger"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Invoices cannot be deleted without a trace. A written cancellation reason is recorded in the official audit log.
          </p>
          <textarea
            required
            rows={3}
            placeholder="Specify the reason (billing error, dispute, order cancellation...)"
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancellingId(null)}
              className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => cancellingId && handleCancelInvoice(cancellingId)}
              className="h-10 px-5 rounded-xl bg-destructive text-white hover:bg-destructive/90 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}