"use client";

import { useState } from "react";
import { Plus, Search, CreditCard, X } from "lucide-react";
import { PaymentRecord } from "@/lib/db/payments";
import { ClientRecord } from "@/lib/db/clients";
import { InvoiceRecord } from "@/lib/db/invoices";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { recordPaymentAction } from "@/actions/payments";

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par N° reçu, bordereau, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-field pl-10 text-xs"
          />
        </div>

        <button onClick={handleOpenModal} className="button button-primary text-xs shrink-0">
          <Plus className="size-4" /> Enregistrer un Encaissement
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">N° Reçu</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4">Réf. Bordereau / Transaction</th>
                <th className="py-3.5 px-4 text-right">Montant Encaissé ($)</th>
                <th className="py-3.5 px-4 text-right">Non Alloué ($)</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <CreditCard className="mx-auto size-8 text-slate-300 mb-2" />
                    Aucun paiement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                filtered.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{pay.paymentNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{pay.clientName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{pay.paymentDate}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{pay.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{pay.referenceNumber}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                      ${pay.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      ${pay.unallocatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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

      {/* Modal Payment Registration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                Enregistrer un Règlement Client
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Client payeur *</label>
                  <select
                    required
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setSelectedAllocations({});
                    }}
                    className="form-field mt-1 text-xs font-bold text-primary"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Date d&apos;encaissement *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Montant reçu ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount || ""}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="form-field mt-1 text-xs font-mono font-black text-primary text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Mode de paiement *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="form-field mt-1 text-xs font-bold"
                  >
                    <option value="BANK_TRANSFER">Virement Bancaire</option>
                    <option value="CHECK">Chèque Certifié</option>
                    <option value="CASH">Espèces</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Référence du paiement (Bordereau de versement / Swift / N° chèque) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: RAW-DEP-2026-9901"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="form-field mt-1 text-xs font-mono font-bold"
                />
              </div>

              {/* Invoices Allocation Section */}
              <div className="rounded-xl border border-border bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-primary">
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
                        className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-border text-xs"
                      >
                        <div>
                          <p className="font-mono font-bold text-primary">{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Total: ${inv.total.toFixed(2)} · Reste dû:{" "}
                            <span className="font-bold text-rose-600">${inv.balanceDue.toFixed(2)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickAllocate(inv)}
                            className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold hover:bg-slate-200"
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
                            className="w-24 form-field text-xs font-mono text-right font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Notes / Remarques</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes de comptabilité..."
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
                  {isSubmitting ? "Enregistrement..." : "Valider l'encaissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
