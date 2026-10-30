"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Printer,
  Download,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { ClientAccountStatement } from "@/lib/db/statements";
import {
  PageHeader,
  MoneyText,
  RefChip,
  ProgressRing,
  formatDate,
  formatDateLong,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

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
  const [currentClientId, setCurrentClientId] = React.useState(selectedClientId);
  const [currentStartDate, setCurrentStartDate] = React.useState(startDate);
  const [currentEndDate, setCurrentEndDate] = React.useState(endDate);

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

  const handleDownloadCsv = () => {
    if (!statement || !statement.transactions || statement.transactions.length === 0) return;

    const headers = [
      "Date",
      "Reference",
      "Description",
      "Debit (USD)",
      "Credit (USD)",
      "Solde Progressif (USD)",
    ];

    const rows = statement.transactions.map((entry) => [
      formatDate(entry.date),
      `"${entry.reference.replace(/"/g, '""')}"`,
      `"${entry.description.replace(/"/g, '""')}"`,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.runningBalance.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `releve-compte-${statement.client.clientCode || "client"}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedClient = clients.find((c) => c.id === currentClientId);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Relevés de Compte Clients"
        description="Situation comptable chronologique, débit/crédit et balance de clôture par tiers."
        icon={<FileText className="size-5" />}
        actions={
          statement ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                className="h-9 gap-1.5 text-xs border-border/80"
              >
                <Download className="size-3.5" />
                <span>Télécharger CSV</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                <Printer className="size-3.5" />
                <span>Imprimer / PDF</span>
              </Button>
            </div>
          ) : null
        }
      />

      {/* Filter Bar (Screenshot 4 pattern) */}
      <form
        onSubmit={handleFilter}
        className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-wrap items-end gap-3.5"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Sélectionner un client *
          </label>
          <select
            value={currentClientId}
            onChange={(e) => setCurrentClientId(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-bold text-primary outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Date début
          </label>
          <input
            type="date"
            value={currentStartDate}
            onChange={(e) => setCurrentStartDate(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs outline-none"
          />
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Date fin
          </label>
          <input
            type="date"
            value={currentEndDate}
            onChange={(e) => setCurrentEndDate(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs outline-none"
          />
        </div>

        <Button
          type="submit"
          className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shrink-0"
        >
          Actualiser le relevé
        </Button>
      </form>

      {/* Main Content Grid: Statement Table Left + Summary Card Right */}
      {statement ? (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Statement Table Left */}
          <div className="lg:col-span-8 rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/70">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {statement.client.name}
                  </h3>
                  <RefChip variant="primary">{statement.client.clientCode}</RefChip>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Période: {startDate ? formatDate(startDate) : "Origine"} au{" "}
                  {endDate ? formatDate(endDate) : "Ce jour"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                  Solde de clôture
                </span>
                <MoneyText
                  value={statement.closingBalance}
                  className="text-lg font-extrabold text-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Référence</th>
                    <th className="py-3 px-3">Libellé opération</th>
                    <th className="py-3 px-3 text-right">Débit (+)</th>
                    <th className="py-3 px-3 text-right">Crédit (-)</th>
                    <th className="py-3 px-3 text-right">Solde ($ USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {statement.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        Aucun mouvement enregistré sur la période sélectionnée.
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3 text-muted-foreground tabular-nums">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          <RefChip>{entry.referenceNumber}</RefChip>
                        </td>
                        <td className="py-3 px-3 text-foreground font-medium max-w-xs">
                          {entry.description}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-foreground font-semibold">
                          {entry.debit > 0 ? <MoneyText value={entry.debit} /> : "—"}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-success font-semibold">
                          {entry.credit > 0 ? <MoneyText value={entry.credit} /> : "—"}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-foreground">
                          <MoneyText value={entry.runningBalance} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* End of statement formal mention */}
            <div className="pt-6 border-t border-border/70 text-right text-xs text-muted-foreground font-medium">
              Fait à Lubumbashi, le {formatDateLong(new Date())}
            </div>
          </div>

          {/* Right Summary Card (Screenshot 4 pattern) */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border/70">
                Synthèse Financière
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-primary" />
                    <span>Total Débit (Facturé)</span>
                  </span>
                  <MoneyText value={statement.totalDebit} className="font-bold text-foreground" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <TrendingDown className="size-3.5 text-success" />
                    <span>Total Crédit (Encaissé)</span>
                  </span>
                  <MoneyText value={statement.totalCredit} className="font-bold text-success" />
                </div>

                <div className="border-t border-border pt-3.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">Solde restant</span>
                  <MoneyText
                    value={statement.closingBalance}
                    className="text-xl font-extrabold text-primary"
                  />
                </div>
              </div>

              {/* Recovery Rate Ring */}
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Taux de recouvrement
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {statement.totalDebit > 0
                      ? Math.min(100, Math.round((statement.totalCredit / statement.totalDebit) * 100))
                      : 100}
                    % encaissé
                  </span>
                </div>
                <ProgressRing
                  value={
                    statement.totalDebit > 0
                      ? (statement.totalCredit / statement.totalDebit) * 100
                      : 100
                  }
                  size={42}
                  strokeWidth={4}
                  colorClass="text-success"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card">
          <FileText className="mx-auto size-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-foreground">Aucun relevé affiché</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sélectionnez un client ci-dessus pour consulter son relevé de compte.
          </p>
        </div>
      )}
    </div>
  );
}
