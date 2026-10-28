"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, FileSpreadsheet, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { QuotationRecord } from "@/lib/db/quotations";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { updateQuotationStatusAction } from "@/actions/quotations";

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

  const handleValidate = async (id: string) => {
    if (!confirm("Voulez-vous valider commercialement ce devis ?")) return;
    const res = await updateQuotationStatusAction(id, "VALIDATED");
    if (res.success && res.quotation) {
      setQuotations((prev) => prev.map((q) => (q.id === id ? res.quotation! : q)));
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
      setCancellingId(null);
      setCancellationReason("");
    }
  };

  return (
    <div className="space-y-6">
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
              className="form-field pl-10 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-field text-xs font-semibold shrink-0"
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
            className="form-field text-xs font-semibold shrink-0"
          >
            <option value="ALL">Tous types</option>
            <option value="QUOTATION">Devis Standard</option>
            <option value="PROFORMA">Proforma</option>
          </select>
        </div>

        <Link href="/dashboard/quotations/nouveau" className="button button-primary text-xs shrink-0">
          <Plus className="size-4" /> Nouveau Devis
        </Link>
      </div>

      {/* Quotations Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Réf. Interne</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Réf. RFQ Client</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Montant TTC ($)</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto size-8 text-slate-300 mb-2" />
                    Aucun devis trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{quote.internalReference}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{quote.clientName}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                        {quote.docType === "PROFORMA" ? "Proforma" : "Devis"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{quote.clientRfqNumber || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{quote.documentDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {quote.status === "DRAFT" && (
                          <button
                            onClick={() => handleValidate(quote.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                            title="Valider le devis"
                          >
                            <CheckCircle2 className="size-3" /> Valider
                          </button>
                        )}
                        {quote.status === "VALIDATED" && (
                          <Link
                            href={`/dashboard/commandes?newOrderFromQuoteId=${quote.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                            title="Convertir en commande d'achat"
                          >
                            Créer PO <ArrowRight className="size-3" />
                          </Link>
                        )}
                        {quote.status !== "CANCELLED" && (
                          <button
                            onClick={() => setCancellingId(quote.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                            title="Annuler le devis"
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
                onClick={() => handleCancel(cancellingId)}
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
