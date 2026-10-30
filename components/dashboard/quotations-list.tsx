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
import { formatUSD } from "@/lib/formatters";

interface QuotationsListProps {
  initialQuotations: QuotationRecord[];
}

export function QuotationsList({ initialQuotations }: QuotationsListProps) {
  const [quotations, setQuotations] = useState<QuotationRecord[]>(initialQuotations);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<QuotationRecord | null>(null);

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      q.internalReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.clientName && q.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.clientRfqNumber && q.clientRfqNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    const matchesType = docTypeFilter === "ALL" || q.docType === docTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAmount = quotations.reduce((sum, q) => (q.status !== "CANCELLED" ? sum + q.total : sum), 0);
  const validatedCount = quotations.filter((q) => q.status === "VALIDATED").length;
  const draftCount = quotations.filter((q) => q.status === "DRAFT").length;

  const handleValidate = async (id: string) => {
    if (!confirm("Voulez-vous valider commercialement ce devis ?")) return;
    const res = await updateQuotationStatusAction(id, "VALIDATED");
    if (res.success && res.quotation) {
      setQuotations((prev) => prev.map((q) => (q.id === id ? res.quotation! : q)));
      if (selectedQuote?.id === id) {
        setSelectedQuote(res.quotation);
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (!cancellationReason.trim()) {
      alert("Veuillez indiquer un motif d'annulation.");
      return;
    }
    const res = await updateQuotationStatusAction(id, "CANCELLED", cancellationReason);
    if (res.success && res.quotation) {
      setQuotations((prev) => prev.map((q) => (q.id === id ? res.quotation! : q)));
      if (selectedQuote?.id === id) {
        setSelectedQuote(res.quotation);
      }
      setCancellingId(null);
      setCancellationReason("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stat Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Total Devis
          </p>
          <p className="text-xl font-black text-primary mt-1">{quotations.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Brouillons
          </p>
          <p className="text-xl font-black text-foreground mt-1">{draftCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Validés
          </p>
          <p className="text-xl font-black text-success mt-1">{validatedCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Montant Total Cumulé
          </p>
          <p className="text-xl font-black text-primary font-mono mt-1">
            $ {formatUSD(totalAmount)}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par référence devis, client, RFQ..."
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
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumis</option>
            <option value="VALIDATED">Validé</option>
            <option value="CANCELLED">Annulé</option>
          </select>

          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <option value="ALL">Tous types</option>
            <option value="QUOTATION">Devis Standard</option>
            <option value="PROFORMA">Proforma</option>
          </select>
        </div>

        <Link
          href="/dashboard/quotes/new"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
        >
          <Plus className="size-4" /> Nouveau Devis
        </Link>
      </div>

      {/* Quotations Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Réf. Interne</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Réf. RFQ Client</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">Aucun devis trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créez un nouveau devis pour démarrer une cotation.
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
                    <td className="py-3 px-4">
                      <RefChip value={quote.internalReference} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{quote.clientName}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {quote.docType === "PROFORMA" ? "Proforma" : "Devis"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-medium">{quote.clientRfqNumber || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{quote.documentDate}</td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={quote.total} className="text-xs font-black text-primary" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedQuote(quote)}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          title="Aperçu des détails"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {quote.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => handleValidate(quote.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 text-[10px] font-bold text-success hover:bg-success/25 transition-colors cursor-pointer border border-success/30"
                            title="Valider le devis"
                          >
                            <CheckCircle2 className="size-3" /> Valider
                          </button>
                        )}
                        {quote.status === "VALIDATED" && (
                          <Link
                            href={`/dashboard/orders?newOrderFromQuoteId=${quote.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
                            title="Convertir en commande d'achat"
                          >
                            Créer PO <ArrowRight className="size-3" />
                          </Link>
                        )}
                        {quote.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => setCancellingId(quote.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Annuler le devis"
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

      {/* Detail Sheet for Quotation */}
      <DetailSheet
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        title={selectedQuote?.internalReference || "Détail du Devis"}
        statusBadge={selectedQuote ? <StatusBadge status={selectedQuote.status} /> : undefined}
      >
        {selectedQuote && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Client</p>
              <h2 className="text-base font-black text-foreground mt-0.5 flex items-center gap-2">
                <Building2 className="size-4 text-accent" />
                {selectedQuote.clientName}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile label="Date d'émission" value={selectedQuote.documentDate} />
              <KeyValueTile label="Type de document" value={selectedQuote.docType === "PROFORMA" ? "Proforma" : "Devis Standard"} />
              <KeyValueTile label="Échéance validité" value={selectedQuote.validityDate} />
              <KeyValueTile label="Taux TVA" value={`${selectedQuote.vatRate}%`} />
            </div>

            {selectedQuote.clientRfqNumber && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">N° Appel d&apos;offre Client (RFQ)</span>
                <p className="font-mono font-bold text-foreground mt-0.5">{selectedQuote.clientRfqNumber}</p>
              </div>
            )}

            {/* Financial Summary */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total HT :</span>
                <MoneyText amount={selectedQuote.subtotal} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA ({selectedQuote.vatRate}%) :</span>
                <MoneyText amount={selectedQuote.vatAmount} className="font-mono font-bold text-foreground" />
              </div>
              <div className="flex justify-between text-sm font-black text-primary border-t border-border pt-2">
                <span>TOTAL TTC :</span>
                <MoneyText amount={selectedQuote.total} className="font-mono text-base text-primary" />
              </div>
            </div>

            {/* Line items if available */}
            {selectedQuote.items && selectedQuote.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-primary flex items-center gap-1.5">
                  <FileText className="size-3.5 text-accent" /> Articles chiffrés ({selectedQuote.items.length})
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedQuote.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-border bg-card text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-foreground">{it.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {it.quantity} {it.unit} × ${it.unitPrice.toFixed(2)}
                          {(it.discountPercent ?? 0) > 0 && ` (-${it.discountPercent}%)`}
                        </p>
                      </div>
                      <MoneyText amount={it.lineSubtotal} className="font-mono font-bold text-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons inside drawer */}
            <div className="pt-3 border-t border-border space-y-2">
              {selectedQuote.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => handleValidate(selectedQuote.id)}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-success text-white text-xs font-bold hover:bg-success/90 transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="size-4" /> Valider le devis
                </button>
              )}
              {selectedQuote.status === "VALIDATED" && (
                <Link
                  href={`/dashboard/orders?newOrderFromQuoteId=${selectedQuote.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <ArrowRight className="size-4" /> Convertir en Bon de Commande (PO)
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
              Motif d&apos;annulation obligatoire
            </h3>
            <p className="text-xs text-muted-foreground">
              Conformément aux règles comptables, les devis émis ne sont pas supprimés mais archivés avec un motif traçable.
            </p>
            <textarea
              required
              rows={3}
              placeholder="Indiquez la raison de l'annulation (rejet client, modification du cahier des charges...)"
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
                onClick={() => handleCancel(cancellingId)}
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
