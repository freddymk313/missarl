"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Printer,
  Download,
  Building2,
  TrendingDown,
  TrendingUp,
  Scale,
} from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { ClientAccountStatement } from "@/lib/db/statements";
import { formatUSD } from "@/lib/formatters";
import { RefChip } from "@/components/dashboard/ui/ref-chip";

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
    router.push(`/dashboard/statements?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (!statement) return;

    const headers = ["Date", "Type", "Reference", "Libelle", "Debit_USD", "Credit_USD", "Solde_Progressif_USD"];
    const rows = statement.transactions.map((tx) => [
      `"${tx.date}"`,
      `"${tx.type === "INVOICE" ? "Facture" : "Encaissement"}"`,
      `"${tx.reference}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.debit.toFixed(2),
      tx.credit.toFixed(2),
      tx.runningBalance.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Releve_${statement.client.code}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filter and Export Bar */}
      <form
        onSubmit={handleFilter}
        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-wrap items-end gap-3 print:hidden"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-bold text-foreground">Sélectionner un client *</label>
          <select
            value={currentClientId}
            onChange={(e) => setCurrentClientId(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-xs font-bold text-foreground">Date début</label>
          <input
            type="date"
            value={currentStartDate}
            onChange={(e) => setCurrentStartDate(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
          />
        </div>

        <div className="w-36">
          <label className="block text-xs font-bold text-foreground">Date fin</label>
          <input
            type="date"
            value={currentEndDate}
            onChange={(e) => setCurrentEndDate(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
          />
        </div>

        <button
          type="submit"
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          Actualiser le relevé
        </button>

        {statement && (
          <>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="h-9 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="size-3.5 text-muted-foreground" /> Télécharger CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="size-3.5 text-muted-foreground" /> Imprimer / PDF
            </button>
          </>
        )}
      </form>

      {/* Statement Sheet */}
      {statement ? (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Statement Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Extrait de Compte Client
              </span>
              <h2 className="text-xl font-black text-primary mt-1 flex items-center gap-2">
                <Building2 className="size-5 text-accent" />
                {statement.client.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <RefChip value={statement.client.code} />
                {statement.client.taxId && (
                  <span className="text-xs text-muted-foreground">
                    NIF: <span className="font-mono font-bold text-foreground">{statement.client.taxId}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Solde Net Débiteur
              </span>
              <p className="text-2xl font-black text-destructive font-mono mt-0.5">
                $ {formatUSD(statement.closingBalance)}
              </p>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Devise officielle : {statement.currency}
              </p>
            </div>
          </div>

          {/* Period Summary Cards (matching Comfort Shift screenshot 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-secondary/30 border border-border text-xs">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Solde Initial</p>
              <p className="text-sm font-mono font-bold text-foreground mt-0.5">
                $ {formatUSD(statement.openingBalance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <TrendingUp className="size-3 text-destructive" /> Facturations Période
              </p>
              <p className="text-sm font-mono font-bold text-foreground mt-0.5">
                +$ {formatUSD(statement.totalDebits)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <TrendingDown className="size-3 text-success" /> Règlements Encaissés
              </p>
              <p className="text-sm font-mono font-bold text-success mt-0.5">
                -${formatUSD(statement.totalCredits)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Scale className="size-3 text-primary" /> Solde Net de Clôture
              </p>
              <p className="text-sm font-mono font-black text-destructive mt-0.5">
                $ {formatUSD(statement.closingBalance)}
              </p>
            </div>
          </div>

          {/* Statement Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Réf. Pièce</th>
                  <th className="py-3 px-3">Détail de l&apos;écriture</th>
                  <th className="py-3 px-3 text-right">Débit (Facture)</th>
                  <th className="py-3 px-3 text-right">Crédit (Règlement)</th>
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
                    <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-muted-foreground">{tx.date}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            tx.type === "INVOICE"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-success/15 text-success border border-success/30"
                          }`}
                        >
                          {tx.type === "INVOICE" ? "Facture" : "Encaissement"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <RefChip value={tx.reference} />
                      </td>
                      <td className="py-3 px-3 text-foreground">{tx.description}</td>
                      <td className="py-3 px-3 text-right font-mono text-foreground">
                        {tx.debit > 0 ? `$ ${formatUSD(tx.debit)}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-success font-bold">
                        {tx.credit > 0 ? `$ ${formatUSD(tx.credit)}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-foreground">
                        $ {formatUSD(tx.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Certified closing statement signature note */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-3">
            <p className="italic">
              Arrêté le présent relevé de compte à Lubumbashi, certifié sincère et conforme aux écritures comptables MIS SARL.
            </p>
            <p className="font-bold text-foreground shrink-0">
              Direction Administrative et Financière
            </p>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground rounded-2xl border border-dashed border-border bg-card">
          <FileText className="mx-auto size-10 text-muted-foreground/40 mb-2" />
          <p className="font-bold text-foreground">Sélectionnez un compte client</p>
          <p className="text-xs text-muted-foreground mt-1">
            Générez l&apos;extrait de compte en temps réel pour consulter la balance débiteur.
          </p>
        </div>
      )}
    </div>
  );
}
