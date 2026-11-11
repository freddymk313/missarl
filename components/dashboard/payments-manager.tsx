"use client";

import { useState } from "react";
import { Plus, Search, CreditCard, X } from "lucide-react";
import { PaymentRecord } from "@/lib/db/payments";
import { ClientRecord } from "@/lib/db/clients";
import { InvoiceRecord } from "@/lib/db/invoices";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { recordPaymentAction } from "@/actions/payments";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { ResponsiveModal } from "@/components/dashboard/ui/responsive-modal";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { formatUSD } from "@/lib/formatters";

interface PaymentsManagerProps {
  initialPayments: PaymentRecord[];
  clients: ClientRecord[];
  unpaidInvoices: InvoiceRecord[];
  preselectedClientId?: string;
  preselectedInvoiceId?: string;
}

export function PaymentsManager({
  initialPayments,
  clients,
  unpaidInvoices,
  preselectedClientId,
  preselectedInvoiceId,
}: PaymentsManagerProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(!!preselectedInvoiceId);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || clients[0]?.id || "");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedAllocations, setSelectedAllocations] = useState<Record<string, number>>(
    preselectedInvoiceId ? { [preselectedInvoiceId]: 0 } : {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = payments.filter((p) => {
    return (
      searchTerm.trim() === "" ||
      p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalCollected = payments.reduce((sum, p) => (p.status !== "CANCELLED" ? sum + p.amount : sum), 0);
  const totalUnallocated = payments.reduce((sum, p) => (p.status !== "CANCELLED" ? sum + p.unallocatedAmount : sum), 0);
  const clientInvoices = unpaidInvoices.filter((i) => i.clientId === selectedClientId);

  const handleOpenModal = () => {
    setFormError("");
    setIsModalOpen(true);
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    setSelectedAllocations((prev) => ({
      ...prev,
      [invoiceId]: Math.max(0, val),
    }));
  };

  const handleQuickAllocate = (invoice: InvoiceRecord) => {
    setAmount(invoice.balanceDue);
    setSelectedAllocations({ [invoice.id]: invoice.balanceDue });
  };

  const totalAllocated = Object.values(selectedAllocations).reduce((sum, val) => sum + (val || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedClientId) {
      setFormError("Veuillez sélectionner un client.");
      return;
    }

    if (amount <= 0) {
      setFormError("Le montant du paiement doit être supérieur à zéro.");
      return;
    }

    if (!referenceNumber.trim()) {
      setFormError("La référence du paiement (Bordereau / Swift) est obligatoire.");
      return;
    }

    const allocations = Object.entries(selectedAllocations)
      .filter(([, allocAmount]) => allocAmount > 0)
      .map(([invoiceId, allocAmount]) => ({ invoiceId, amount: allocAmount }));

    setIsSubmitting(true);
    try {
      const res = await recordPaymentAction({
        clientId: selectedClientId,
        amount,
        paymentMethod,
        referenceNumber,
        paymentDate,
        notes,
        allocations,
      });

      if (!res.success) {
        setFormError(res.error || "Erreur d'enregistrement.");
      } else if (res.payment) {
        setPayments((prev) => [res.payment!, ...prev]);
        setIsModalOpen(false);
        setAmount(0);
        setReferenceNumber("");
        setSelectedAllocations({});
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Nombre d&apos;Encaissements
          </p>
          <p className="text-xl font-black text-primary mt-1">{payments.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Total Encaissé
          </p>
          <p className="text-xl font-black text-success font-mono mt-1">
             {formatUSD(totalCollected)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Solde Non Affecté
          </p>
          <p className="text-xl font-black text-muted-foreground font-mono mt-1">
             {formatUSD(totalUnallocated)}
          </p>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par N° reçu, bordereau, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘F
          </span>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Enregistrer un Encaissement
        </button>
      </div>

      {/* Payments Data Table - Desktop */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">N° Reçu</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4">Réf. Bordereau / Transaction</th>
                <th className="py-3.5 px-4 text-right">Montant Encaissé</th>
                <th className="py-3.5 px-4 text-right">Non Alloué</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <CreditCard className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">Aucun paiement enregistré</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enregistrez les bordereaux de versement et virements bancaires reçus.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((pay) => (
                  <tr key={pay.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      <RefChip value={pay.paymentNumber} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{pay.clientName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{pay.paymentDate}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{pay.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{pay.referenceNumber}</td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={pay.amount} className="text-xs font-black text-success" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MoneyText amount={pay.unallocatedAmount} className="text-xs text-muted-foreground" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={pay.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments - Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card">
            <CreditCard className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground text-sm">Aucun paiement enregistré</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enregistrez les bordereaux de versement et virements bancaires reçus.
            </p>
          </div>
        ) : (
          filtered.map((pay) => (
            <div
              key={pay.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <RefChip value={pay.paymentNumber} />
                <StatusBadge status={pay.status} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground truncate">{pay.clientName}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Réf: <span className="font-mono font-bold text-foreground">{pay.referenceNumber}</span>
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{pay.paymentDate}</span>
                <span className="font-semibold">{pay.paymentMethod}</span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                <MoneyText amount={pay.amount} className="text-sm font-black text-success font-mono" />
                {pay.unallocatedAmount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Non alloué: {formatUSD(pay.unallocatedAmount)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Payment Registration */}
      <ResponsiveModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrer un Règlement Client"
        maxWidthClass="max-w-xl"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Client payeur *</label>
              <select
                required
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedAllocations({});
                }}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground">Date d&apos;encaissement *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Montant reçu ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-black text-primary text-base focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground">Mode de paiement *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              >
                <option value="BANK_TRANSFER">Virement Bancaire (Swift)</option>
                <option value="CHECK">Chèque Certifié</option>
                <option value="CASH">Espèces</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground">
              Référence du paiement (Bordereau de versement / Swift / N° chèque) *
            </label>
            <input
              type="text"
              required
              placeholder="ex: RAW-DEP-2026-9901"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
            />
          </div>

          {/* Invoices Allocation Section */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <p className="text-xs font-black text-primary">
                Affectation aux factures ouvertes ({clientInvoices.length})
              </p>
              <span className="text-[11px] font-bold text-muted-foreground">
                Alloué: ${totalAllocated.toFixed(2)} / ${amount.toFixed(2)}
              </span>
            </div>

            {clientInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Aucune facture impayée pour ce client. Le montant sera enregistré comme solde créditeur non alloué.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {clientInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-card p-3 border border-border text-xs"
                  >
                    <div>
                      <RefChip value={inv.invoiceNumber} />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Total: ${inv.total.toFixed(2)} · Reste dû:{" "}
                        <span className="font-bold text-destructive">${inv.balanceDue.toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleQuickAllocate(inv)}
                        className="rounded-lg bg-secondary px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                      >
                        Payer tout
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={inv.balanceDue}
                        value={selectedAllocations[inv.id] || ""}
                        onChange={(e) =>
                          handleAllocationChange(inv.id, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-24 h-8 rounded-lg border border-border bg-card px-2 text-xs font-mono text-right font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground">Notes / Remarques comptables</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes de comptabilité interne..."
              className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Enregistrement..." : "Valider l'encaissement"}
            </button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}
