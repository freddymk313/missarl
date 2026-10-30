"use client";

import * as React from "react";
import Link from "next/link";
import {
  Receipt,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar as CalendarIcon,
  XCircle,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { InvoiceRecord } from "@/lib/db/invoices";
import { cancelInvoiceAction } from "@/actions/invoices";
import {
  PageHeader,
  StatTile,
  DataTable,
  DataTableToolbar,
  DateRangePicker,
  RefChip,
  StatusPill,
  MoneyText,
  KeyValueTile,
  ProgressRing,
  DetailSheet,
  formatDate,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

interface InvoicesManagerProps {
  initialInvoices: InvoiceRecord[];
}

export function InvoicesManager({ initialInvoices }: InvoicesManagerProps) {
  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Detail Sheet state
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = React.useState("");
  const [actionError, setActionError] = React.useState("");

  // Stats calculation
  const issuedCount = invoices.filter((i) => i.status === "ISSUED").length;
  const paidCount = invoices.filter((i) => i.status === "PAID").length;
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const totalReceivables = invoices.reduce(
    (sum, i) => (i.status !== "CANCELLED" ? sum + i.balanceDue : sum),
    0
  );

  const filtered = React.useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(q)) ||
        (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const handleOpenDetail = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setCancellingId(null);
    setCancellationReason("");
    setActionError("");
    setIsDetailOpen(true);
  };

  const handleCancelInvoice = async (id: string) => {
    if (!cancellationReason.trim()) {
      alert("Veuillez saisir un motif d'annulation explicite.");
      return;
    }

    setActionError("");
    const res = await cancelInvoiceAction(id, cancellationReason);
    if (!res.success) {
      setActionError(res.error || "Erreur lors de l'annulation de la facture.");
    } else if (res.invoice) {
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? res.invoice! : i))
      );
      setSelectedInvoice(res.invoice);
      setCancellingId(null);
      setCancellationReason("");
    }
  };

  const getPaymentProgress = (inv: InvoiceRecord) => {
    if (inv.status === "PAID") return 100;
    if (inv.total <= 0) return 0;
    const paid = inv.total - inv.balanceDue;
    return Math.min(100, Math.max(0, Math.round((paid / inv.total) * 100)));
  };

  const columns = React.useMemo<ColumnDef<InvoiceRecord>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "N° Facture Normalisée",
        cell: ({ row }) => (
          <RefChip variant="primary">{row.original.invoiceNumber}</RefChip>
        ),
      },
      {
        accessorKey: "clientName",
        header: "Client & Commande",
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block truncate">
              {row.original.clientName}
            </span>
            {row.original.orderNumber && (
              <span className="text-[11px] text-muted-foreground">
                BC: {row.original.orderNumber}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "issueDate",
        header: "Date d'émission",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDate(row.original.issueDate)}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: "Montant Facturé",
        cell: ({ row }) => (
          <MoneyText
            value={row.original.total}
            className="font-bold text-foreground text-sm"
          />
        ),
      },
      {
        id: "paymentProgress",
        header: "Règlement",
        cell: ({ row }) => {
          const progress = getPaymentProgress(row.original);
          const paid = row.original.total - row.original.balanceDue;
          return (
            <div className="flex items-center gap-2">
              <ProgressRing value={progress} size={30} strokeWidth={3} />
              <div>
                <MoneyText value={paid} className="text-xs font-semibold text-foreground block" />
                <span className="text-[10px] text-muted-foreground">{progress}%</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "balanceDue",
        header: "Solde Dû",
        cell: ({ row }) =>
          row.original.balanceDue > 0 ? (
            <MoneyText
              value={row.original.balanceDue}
              className="font-bold text-destructive text-sm"
            />
          ) : (
            <span className="text-xs font-semibold text-success">Soldée</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row.original);
              }}
              className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-auto"
              title="Consulter"
            >
              <Eye className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Factures de Vente"
        description="Facturation normalisée conforme aux exigences fiscales avec suivi des encaissements et soldes résiduels."
        icon={<Receipt className="size-5" />}
        actions={
          <Link
            href="/dashboard/orders"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Facturer depuis une commande</span>
          </Link>
        }
      />

      {/* Stat Strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Factures émises"
          value={issuedCount}
          subtitle="En cours de règlement"
          icon={<Receipt className="size-4" />}
        />
        <StatTile
          label="Factures soldées"
          value={paidCount}
          subtitle="Paiement 100 % encaissé"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatTile
          label="Échues en retard"
          value={overdueCount}
          subtitle="Dépassement du délai de paiement"
          icon={<AlertTriangle className="size-4" />}
        />
        <StatTile
          label="Montant impayé total"
          value={<MoneyText value={totalReceivables} />}
          subtitle="Créances clients à recouvrer"
        />
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={handleOpenDetail}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par N° facture, client, commande..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilterCount={statusFilter !== "ALL" ? 1 : 0}
            filterContent={
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Statut de paiement
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground outline-none"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="ISSUED">Émise</option>
                  <option value="PARTIALLY_PAID">Partiellement payée</option>
                  <option value="PAID">Payée intégralement</option>
                  <option value="OVERDUE">En retard</option>
                  <option value="CANCELLED">Annulée</option>
                </select>
                <div className="pt-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter("ALL")}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            }
            extraActions={
              <DateRangePicker placeholder="Période de facturation" />
            }
          />
        }
        renderMobileCard={(inv) => {
          const progress = getPaymentProgress(inv);
          return (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RefChip variant="primary">{inv.invoiceNumber}</RefChip>
                  <StatusPill status={inv.status} />
                </div>
                <div className="flex items-center gap-1.5">
                  <ProgressRing value={progress} size={28} strokeWidth={3} />
                  <span className="text-xs font-bold tabular-nums">{progress}%</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{inv.clientName}</p>
                {inv.orderNumber && (
                  <p className="text-xs text-muted-foreground">BC: {inv.orderNumber}</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Total: <MoneyText value={inv.total} className="font-semibold text-foreground" />
                  </span>
                  {inv.balanceDue > 0 && (
                    <span className="text-destructive font-bold text-[11px]">
                      Reste: <MoneyText value={inv.balanceDue} />
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground tabular-nums">
                  {formatDate(inv.issueDate)}
                </span>
              </div>
            </div>
          );
        }}
      />

      {/* Detail Sheet */}
      {selectedInvoice && (
        <DetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedInvoice.invoiceNumber}
          subtitle={`Client: ${selectedInvoice.clientName}`}
          badge={<StatusPill status={selectedInvoice.status} />}
          footer={
            <div className="flex items-center gap-2 justify-end w-full flex-wrap">
              {selectedInvoice.balanceDue > 0 && selectedInvoice.status !== "CANCELLED" && (
                <Link
                  href={`/dashboard/payments?invoiceId=${selectedInvoice.id}&clientId=${selectedInvoice.clientId}`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90"
                >
                  <CreditCard className="size-3.5" />
                  <span>Enregistrer un paiement</span>
                </Link>
              )}

              {selectedInvoice.status !== "CANCELLED" && (
                cancellingId === selectedInvoice.id ? (
                  <div className="flex items-center gap-2 w-full pt-2">
                    <input
                      type="text"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Motif explicite d'annulation fiscale..."
                      className="h-9 flex-1 rounded-lg border border-destructive/40 bg-card px-2.5 text-xs text-foreground outline-none"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancellingId(null)}
                      className="h-9 text-xs"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCancelInvoice(selectedInvoice.id)}
                      className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
                    >
                      Confirmer l&apos;annulation
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancellingId(selectedInvoice.id)}
                    className="h-9 gap-1.5 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <XCircle className="size-3.5" />
                    <span>Annuler cette facture</span>
                  </Button>
                )
              )}
            </div>
          }
        >
          {actionError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {actionError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="Date d'émission"
                value={formatDate(selectedInvoice.issueDate)}
                icon={<CalendarIcon className="size-3.5" />}
              />
              <KeyValueTile
                label="Date d'échéance"
                value={formatDate(selectedInvoice.dueDate)}
                icon={<Clock className="size-3.5" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="Bon de commande (PO)"
                value={selectedInvoice.orderNumber || "—"}
              />
              <KeyValueTile
                label="Devis d'origine"
                value={selectedInvoice.quotationReference || "—"}
              />
            </div>

            {/* Financial Status Breakdown */}
            <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sous-total HT</span>
                <MoneyText value={selectedInvoice.subtotal} className="font-semibold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">TVA ({selectedInvoice.vatRate} %)</span>
                <MoneyText value={selectedInvoice.vatAmount} className="font-semibold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-2 text-foreground">
                <span>Total Facturé TTC</span>
                <MoneyText value={selectedInvoice.total} className="text-base font-extrabold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Montant réglé</span>
                <MoneyText
                  value={selectedInvoice.total - selectedInvoice.balanceDue}
                  className="font-bold text-success"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-destructive font-semibold">Solde exigible restant</span>
                <MoneyText
                  value={selectedInvoice.balanceDue}
                  className="font-extrabold text-destructive text-sm"
                />
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Notes comptables
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {selectedInvoice.notes}
                </p>
              </div>
            )}
          </div>
        </DetailSheet>
      )}
    </div>
  );
}
