"use client";

import * as React from "react";
import {
  CreditCard,
  Plus,
  Receipt,
  CheckCircle2,
  Calendar as CalendarIcon,
  Loader2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { PaymentRecord } from "@/lib/db/payments";
import { ClientRecord } from "@/lib/db/clients";
import { InvoiceRecord } from "@/lib/db/invoices";
import { recordPaymentAction } from "@/actions/payments";
import {
  PageHeader,
  StatTile,
  DataTable,
  DataTableToolbar,
  DateRangePicker,
  RefChip,
  StatusPill,
  MoneyText,
  DetailSheet,
  formatDate,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

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
  const [payments, setPayments] = React.useState<PaymentRecord[]>(initialPayments);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Record payment modal sheet
  const [isModalOpen, setIsModalOpen] = React.useState(!!preselectedInvoiceId);
  const [selectedClientId, setSelectedClientId] = React.useState(
    preselectedClientId || clients[0]?.id || ""
  );
  const [amount, setAmount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState("");
  const [selectedAllocations, setSelectedAllocations] = React.useState<
    Record<string, number>
  >(preselectedInvoiceId ? { [preselectedInvoiceId]: 0 } : {});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const filtered = React.useMemo(() => {
    return payments.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      return (
        q === "" ||
        p.paymentNumber.toLowerCase().includes(q) ||
        p.referenceNumber.toLowerCase().includes(q) ||
        (p.clientName && p.clientName.toLowerCase().includes(q))
      );
    });
  }, [payments, searchTerm]);

  const clientInvoices = React.useMemo(() => {
    return unpaidInvoices.filter((i) => i.clientId === selectedClientId);
  }, [unpaidInvoices, selectedClientId]);

  // Compute stats
  const totalCount = payments.length;
  const totalAmountCollected = payments.reduce(
    (sum, p) => (p.status !== "CANCELLED" ? sum + p.amount : sum),
    0
  );
  const totalUnallocated = payments.reduce(
    (sum, p) => (p.status !== "CANCELLED" ? sum + p.unallocatedAmount : sum),
    0
  );

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

  const totalAllocated = Object.values(selectedAllocations).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

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
      .map(([invoiceId, allocAmount]) => ({
        invoiceId,
        amount: allocAmount,
      }));

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

  const paymentMethodLabels: Record<string, string> = {
    BANK_TRANSFER: "Virement Bancaire (Swift)",
    CHECK: "Chèque Certifié",
    CASH: "Espèces (Caisse Centrale)",
    OTHER: "Autre Modalité",
  };

  const columns = React.useMemo<ColumnDef<PaymentRecord>[]>(
    () => [
      {
        accessorKey: "paymentNumber",
        header: "N° Reçu de Caisse",
        cell: ({ row }) => (
          <RefChip variant="primary">{row.original.paymentNumber}</RefChip>
        ),
      },
      {
        accessorKey: "clientName",
        header: "Client & Émetteur",
        cell: ({ row }) => (
          <span className="font-bold text-foreground block truncate">
            {row.original.clientName}
          </span>
        ),
      },
      {
        accessorKey: "paymentDate",
        header: "Date d'encaissement",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDate(row.original.paymentDate)}
          </span>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Mode de règlement",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium">
            {paymentMethodLabels[row.original.paymentMethod] || row.original.paymentMethod}
          </span>
        ),
      },
      {
        accessorKey: "referenceNumber",
        header: "Bordereau / Swift",
        cell: ({ row }) => (
          <RefChip variant="muted">{row.original.referenceNumber}</RefChip>
        ),
      },
      {
        accessorKey: "amount",
        header: "Montant Encaissé",
        cell: ({ row }) => (
          <MoneyText
            value={row.original.amount}
            className="font-bold text-success text-sm"
          />
        ),
      },
      {
        accessorKey: "unallocatedAmount",
        header: "Reliquat Non Alloué",
        cell: ({ row }) =>
          row.original.unallocatedAmount > 0 ? (
            <MoneyText
              value={row.original.unallocatedAmount}
              className="font-semibold text-warning-foreground"
            />
          ) : (
            <span className="text-xs text-muted-foreground">0,00</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Encaissements & Règlements"
        description="Enregistrement des virements bancaires, chèques et imputations directes sur factures clients."
        icon={<CreditCard className="size-5" />}
        actions={
          <Button
            onClick={handleOpenModal}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Enregistrer un encaissement</span>
          </Button>
        }
      />

      {/* KPI Tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Total encaissé"
          value={<MoneyText value={totalAmountCollected} />}
          subtitle={`${totalCount} versement(s) au journal`}
          icon={<CreditCard className="size-4" />}
        />
        <StatTile
          label="Versements enregistrés"
          value={totalCount}
          subtitle="Règlements validés en trésorerie"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatTile
          label="Reliquat non alloué"
          value={<MoneyText value={totalUnallocated} />}
          subtitle="Acomptes en attente d'imputation"
        />
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filtered}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par N° reçu, bordereau, client..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            extraActions={
              <DateRangePicker placeholder="Période de paiement" />
            }
          />
        }
        renderMobileCard={(p) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <RefChip variant="primary">{p.paymentNumber}</RefChip>
              <StatusPill status={p.status} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">{p.clientName}</p>
              <p className="text-xs text-muted-foreground">
                Réf: {p.referenceNumber} · {paymentMethodLabels[p.paymentMethod] || p.paymentMethod}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
              <MoneyText value={p.amount} className="font-bold text-success text-sm" />
            </div>
          </div>
        )}
      />

      {/* Record Payment Sheet */}
      <DetailSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Enregistrer un Règlement Client"
        subtitle="Saisissez la référence bancaire et imputez le montant perçu sur une ou plusieurs factures."
      >
        {formError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Client émetteur du versement *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedAllocations({});
              }}
              className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Montant total reçu ($ USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs font-bold text-success outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date d&apos;encaissement *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Mode de règlement *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none"
              >
                <option value="BANK_TRANSFER">Virement Bancaire (Swift)</option>
                <option value="CHECK">Chèque Certifié</option>
                <option value="CASH">Espèces</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                N° Bordereau / Réf. Swift *
              </label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ex: FT24098762"
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
              />
            </div>
          </div>

          {/* Allocation Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-foreground">
                Imputation sur factures en attente
              </label>
              <span className="text-[11px] text-muted-foreground">
                Alloué: <MoneyText value={totalAllocated} className="font-bold text-foreground" />
              </span>
            </div>

            {clientInvoices.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-secondary/40 p-3.5 text-center text-xs text-muted-foreground">
                Aucune facture impayée trouvée pour ce client. Le versement sera conservé comme acompte non alloué.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-secondary/20 p-2 max-h-48 overflow-y-auto">
                {clientInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="py-2 px-1 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground block truncate">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Reste dû: <MoneyText value={inv.balanceDue} className="text-destructive font-semibold" />
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickAllocate(inv)}
                        className="h-7 px-2 text-[10px] text-primary"
                      >
                        Tout allouer
                      </Button>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={inv.balanceDue}
                        value={selectedAllocations[inv.id] || ""}
                        onChange={(e) =>
                          handleAllocationChange(
                            inv.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0.00"
                        className="h-8 w-24 rounded-md border border-input bg-card px-2 text-xs font-semibold tabular-nums text-foreground outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Remarques
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes ou banque de domiciliation..."
              className="w-full rounded-lg border border-input bg-card p-2 text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="h-8 text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="h-8 bg-primary text-primary-foreground text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer le paiement"
              )}
            </Button>
          </div>
        </form>
      </DetailSheet>
    </div>
  );
}
