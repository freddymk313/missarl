"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { ClientAccountStatement } from "@/lib/db/statements";

interface StatementsViewerProps {
  clients: ClientRecord[];
  statement: ClientAccountStatement | null;
  selectedClientId: string;
  startDate?: string;
  endDate?: string;
}

export function StatementsViewer({
  clients,
  statement,
  selectedClientId,
  startDate = "",
  endDate = "",
}: StatementsViewerProps) {
  const router = useRouter();
  const [currentClientId, setCurrentClientId] = useState(selectedClientId);
  const [currentStartDate, setCurrentStartDate] = useState(startDate);
  const [currentEndDate, setCurrentEndDate] = useState(endDate);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentClientId) params.set("clientId", currentClientId);
    if (currentStartDate) params.set("startDate", currentStartDate);
    if (currentEndDate) params.set("endDate", currentEndDate);
    router.push(`/dashboard/releves?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <form
        onSubmit={handleFilter}
        className="rounded-2xl border border-border bg-white p-5 shadow-2xs flex flex-wrap items-end gap-4"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-700">Sélectionner un client *</label>
          <select
            value={currentClientId}
            onChange={(e) => setCurrentClientId(e.target.value)}
            className="form-field mt-1 text-xs font-bold text-primary"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="block text-xs font-bold text-slate-700">Date début</label>
          <input
            type="date"
            value={currentStartDate}
            onChange={(e) => setCurrentStartDate(e.target.value)}
            className="form-field mt-1 text-xs"
          />
        </div>

        <div className="w-40">
          <label className="block text-xs font-bold text-slate-700">Date fin</label>
          <input
            type="date"
            value={currentEndDate}
            onChange={(e) => setCurrentEndDate(e.target.value)}
            className="form-field mt-1 text-xs"
          />
        </div>

        <button type="submit" className="button button-primary text-xs shrink-0">
          Actualiser le relevé
        </button>

        {statement && (
          <button
            type="button"
            onClick={handlePrint}
            className="button button-outline text-xs shrink-0 flex items-center gap-1.5"
          >
            <Printer className="size-4" /> Imprimer / PDF
          </button>
        )}
      </form>

      {/* Statement Sheet */}
      {statement ? (
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Statement Header */}
          <div className="flex justify-between items-start border-b border-border pb-6">
            <div>
              <p className="kicker">Extrait de Compte Client</p>
              <h2 className="text-xl font-black text-primary mt-1">{statement.client.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Code client : {statement.client.code}</p>
              {statement.client.taxId && (
                <p className="text-xs text-muted-foreground">NIF : {statement.client.taxId}</p>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs font-extrabold uppercase text-bronze">Situation Financière</p>
              <p className="text-2xl font-black text-primary mt-1">
                ${statement.closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Devise : {statement.currency} · Solde net débiteur
              </p>
            </div>
          </div>

          {/* Period Summary Cards */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-border/80 text-xs">
            <div>
              <p className="text-muted-foreground">Solde Initial :</p>
              <p className="text-sm font-bold text-slate-800">
                ${statement.openingBalance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Facturations Période :</p>
              <p className="text-sm font-bold text-slate-900">
                +${statement.totalDebits.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Paiements Reçus :</p>
              <p className="text-sm font-bold text-emerald-700">
                -${statement.totalCredits.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Solde Net Final :</p>
              <p className="text-sm font-black text-rose-700">
                ${statement.closingBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Statement Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-slate-50/80 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Réf. Pièce</th>
                  <th className="py-3 px-3">Détail de l&apos;écriture</th>
                  <th className="py-3 px-3 text-right">Débit ($)</th>
                  <th className="py-3 px-3 text-right">Crédit ($)</th>
                  <th className="py-3 px-3 text-right">Solde Progressif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {statement.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Aucune écriture comptable enregistrée pour ce client sur la période.
                    </td>
                  </tr>
                ) : (
                  statement.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono text-muted-foreground">{tx.date}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            tx.type === "INVOICE" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {tx.type === "INVOICE" ? "Facture" : "Encaissement"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{tx.reference}</td>
                      <td className="py-3 px-3 text-slate-700">{tx.description}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {tx.debit > 0 ? `$${tx.debit.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {tx.credit > 0 ? `$${tx.credit.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        ${tx.runningBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground rounded-2xl border border-dashed border-border bg-white">
          <FileText className="mx-auto size-10 text-slate-300 mb-2" />
          Sélectionnez un client pour générer le relevé de compte en temps réel.
        </div>
      )}
    </div>
  );
}
