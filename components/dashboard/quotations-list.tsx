"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  Building2,
  FileText,
} from "lucide-react";
import { QuotationRecord } from "@/lib/db/quotations";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { updateQuotationStatusAction } from "@/actions/quotations";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";
import { ResponsiveModal } from "@/components/dashboard/ui/responsive-modal";
import { formatUSD } from "@/lib/formatters";
import { QuotationPdfActions } from "@/components/dashboard/quotation-pdf-actions";

interface QuotationsListProps {
  initialQuotations: QuotationRecord[];
}

export function QuotationsList({ initialQuotations }: QuotationsListProps) {
  const [quotations, setQuotations] =
    useState<QuotationRecord[]>(initialQuotations);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<QuotationRecord | null>(
    null,
  );

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      q.internalReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.clientName &&
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.clientRfqNumber &&
        q.clientRfqNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    const matchesType = docTypeFilter === "ALL" || q.docType === docTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAmount = quotations.reduce(
    (sum, q) => (q.status !== "CANCELLED" ? sum + q.total : sum),
    0,
  );
  const validatedCount = quotations.filter(
    (q) => q.status === "VALIDATED",
  ).length;
  const draftCount = quotations.filter((q) => q.status === "DRAFT").length;

  const handleValidate = async (id: string) => {
    if (!confirm("Are you sure you want to commercially validate this quote?")) return;
    const res = await updateQuotationStatusAction(id, "VALIDATED");
    if (res.success && res.quotation) {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? res.quotation! : q)),
      );
      if (selectedQuote?.id === id) {
        setSelectedQuote(res.quotation);
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (!cancellationReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    const res = await updateQuotationStatusAction(
      id,
      "CANCELLED",
      cancellationReason,
    );
    if (res.success && res.quotation) {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? res.quotation! : q)),
      );
      if (selectedQuote?.id === id) {
        setSelectedQuote(res.quotation);
      }
      setCancellingId(null);
      setCancellationReason("");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stat Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Quotes
          </p>
          <p className="text-xl font-black text-primary mt-1">
            {quotations.length}
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Drafts
          </p>
          <p className="text-xl font-black text-foreground mt-1">
            {draftCount}
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card shadow-xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Validated
          </p>
          <p className="text-xl font-black text-success mt-1">
            {validatedCount}
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Invoiced / Quoted
          </p>
          <p className="text-xl font-black text-primary font-mono mt-1">
            {formatUSD(totalAmount)}
          </p>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        {/* Search — full width */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by quote ref, client, RFQ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters row + action */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 flex-1 min-w-[120px] rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="VALIDATED">Validated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="h-9 flex-1 min-w-[120px] rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Types</option>
            <option value="QUOTATION">Standard Quote</option>
            <option value="PROFORMA">Proforma</option>
          </select>

          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
          >
            <Plus className="size-4" /> New Quote
          </Link>
        </div>
      </div>

      {/* ── Desktop / Tablet Table (md and above) ─────────────────────────── */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Internal Ref</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Client RFQ Ref</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Total (incl. tax)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-muted-foreground"
                  >
                    <FileSpreadsheet className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">
                      No quotations found
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a new quotation to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => setSelectedQuote(quote)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <RefChip value={quote.internalReference} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {quote.clientName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {quote.docType === "PROFORMA" ? "Proforma" : "Quote"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {quote.clientRfqNumber || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {quote.documentDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText
                        amount={quote.total}
                        className="text-xs font-black text-primary"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedQuote(quote)}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                          title="View details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {/* PDF Actions (compact) */}
                        <QuotationPdfActions
                          quotationId={quote.id}
                          quotationRef={quote.internalReference}
                          compact
                        />
                        {quote.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => handleValidate(quote.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 text-[10px] font-bold text-success hover:bg-success/25 transition-colors cursor-pointer border border-success/30"
                            title="Validate quote"
                          >
                            <CheckCircle2 className="size-3" /> Validate
                          </button>
                        )}
                        {quote.status === "VALIDATED" && (
                          <Link
                            href={`/dashboard/orders?newOrderFromQuoteId=${quote.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
                            title="Convert to Purchase Order"
                          >
                            Create PO <ArrowRight className="size-3" />
                          </Link>
                        )}
                        {quote.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => setCancellingId(quote.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Cancel quote"
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

      {/* ── Mobile Card List (below md) ─────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card">
            <FileSpreadsheet className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground text-sm">No quotations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a new quotation to get started.
            </p>
          </div>
        ) : (
          filtered.map((quote) => (
            <div
              key={quote.id}
              onClick={() => setSelectedQuote(quote)}
              className="rounded-2xl border border-border bg-card p-4 shadow-xs cursor-pointer active:scale-[0.99] transition-transform"
            >
              {/* Card header row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <RefChip value={quote.internalReference} />
                <StatusBadge status={quote.status} />
              </div>

              {/* Client + type */}
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">
                  {quote.clientName}
                </span>
                <span className="ml-auto rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-foreground shrink-0">
                  {quote.docType === "PROFORMA" ? "Proforma" : "Quote"}
                </span>
              </div>

              {/* Date + RFQ ref */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>{quote.documentDate}</span>
                {quote.clientRfqNumber && (
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    RFQ: {quote.clientRfqNumber}
                  </span>
                )}
              </div>

              {/* Amount + actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                <MoneyText
                  amount={quote.total}
                  className="text-sm font-black text-primary"
                />
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <QuotationPdfActions
                    quotationId={quote.id}
                    quotationRef={quote.internalReference}
                    compact
                  />
                  {quote.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => handleValidate(quote.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1.5 text-[11px] font-bold text-success hover:bg-success/25 transition-colors cursor-pointer border border-success/30"
                    >
                      <CheckCircle2 className="size-3.5" /> Validate
                    </button>
                  )}
                  {quote.status === "VALIDATED" && (
                    <Link
                      href={`/dashboard/orders?newOrderFromQuoteId=${quote.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      PO <ArrowRight className="size-3" />
                    </Link>
                  )}
                  {quote.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => setCancellingId(quote.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Sheet for Quotation */}
      <DetailSheet
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        title={selectedQuote?.internalReference || "Quotation Details"}
        statusBadge={
          selectedQuote ? (
            <StatusBadge status={selectedQuote.status} />
          ) : undefined
        }
      >
        {selectedQuote && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Client</p>
              <h2 className="text-base font-black text-foreground mt-0.5 flex items-center gap-2">
                <Building2 className="size-4 text-primary shrink-0" />
                <span className="break-words">{selectedQuote.clientName}</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="Issue Date"
                value={selectedQuote.documentDate}
              />
              <KeyValueTile
                label="Document Type"
                value={
                  selectedQuote.docType === "PROFORMA"
                    ? "Proforma"
                    : "Standard Quote"
                }
              />
              <KeyValueTile
                label="Validity Expiration"
                value={selectedQuote.validityDate}
              />
              <KeyValueTile
                label="VAT Rate"
                value={`${selectedQuote.vatRate}%`}
              />
            </div>

            {selectedQuote.clientRfqNumber && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Client RFQ Reference
                </span>
                <p className="font-mono font-bold text-foreground mt-0.5 break-all">
                  {selectedQuote.clientRfqNumber}
                </p>
              </div>
            )}

            {/* Financial Summary */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (excl. tax):</span>
                <MoneyText
                  amount={selectedQuote.subtotal}
                  className="font-mono font-bold text-foreground"
                />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({selectedQuote.vatRate}%):</span>
                <MoneyText
                  amount={selectedQuote.vatAmount}
                  className="font-mono font-bold text-foreground"
                />
              </div>
              <div className="flex justify-between text-sm font-black text-primary border-t border-border pt-2">
                <span>TOTAL (incl. tax):</span>
                <MoneyText
                  amount={selectedQuote.total}
                  className="font-mono text-base text-primary"
                />
              </div>
            </div>

            {/* Line items if available */}
            {selectedQuote.items && selectedQuote.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-primary flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" /> Quoted Items ({selectedQuote.items.length})
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedQuote.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-border bg-card text-xs shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground break-words">
                            {it.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {it.quantity} {it.unit} × ${it.unitPrice.toFixed(2)}
                            {(it.discountPercent ?? 0) > 0 &&
                              ` (-${it.discountPercent}%)`}
                          </p>
                        </div>
                        <MoneyText
                          amount={it.lineSubtotal}
                          className="font-mono font-bold text-foreground shrink-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDF Actions */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs font-black text-primary mb-3 flex items-center gap-1.5">
                <FileText className="size-3.5" /> PDF Document
              </p>
              <QuotationPdfActions
                quotationId={selectedQuote.id}
                quotationRef={selectedQuote.internalReference}
              />
            </div>

            {/* Action buttons inside drawer */}
            <div className="pt-3 border-t border-border space-y-2">
              {selectedQuote.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => handleValidate(selectedQuote.id)}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-success text-white text-xs font-bold hover:bg-success/90 transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="size-4" /> Validate Quote
                </button>
              )}
              {selectedQuote.status === "VALIDATED" && (
                <Link
                  href={`/dashboard/orders?newOrderFromQuoteId=${selectedQuote.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <ArrowRight className="size-4" /> Convert to Purchase Order (PO)
                </Link>
              )}
            </div>
          </div>
        )}
      </DetailSheet>

      {/* Cancellation Modal — now using ResponsiveModal */}
      <ResponsiveModal
        open={!!cancellingId}
        onClose={() => { setCancellingId(null); setCancellationReason(""); }}
        title="Cancellation Reason Required"
        variant="danger"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            In accordance with accounting rules, issued quotes cannot be deleted, but are archived with an auditable reason.
          </p>
          <textarea
            required
            rows={3}
            placeholder="Provide reason for cancellation (client rejected, scope change, expired...)"
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setCancellingId(null); setCancellationReason(""); }}
              className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => cancellingId && handleCancel(cancellingId)}
              className="h-10 px-5 rounded-xl bg-destructive text-white hover:bg-destructive/90 text-xs font-bold transition-colors shadow-xs"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
