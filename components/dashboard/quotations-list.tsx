"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  Download,
  AlertCircle,
  FileText,
  Building,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { QuotationRecord } from "@/lib/db/quotations";
import { updateQuotationStatusAction } from "@/actions/quotations";
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
  DetailSheet,
  formatDate,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

interface QuotationsListProps {
  initialQuotations: QuotationRecord[];
}

export function QuotationsList({ initialQuotations }: QuotationsListProps) {
  const [quotations, setQuotations] = React.useState<QuotationRecord[]>(initialQuotations);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [docTypeFilter, setDocTypeFilter] = React.useState("ALL");

  // Detail Sheet state
  const [selectedQuotation, setSelectedQuotation] = React.useState<QuotationRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = React.useState("");
  const [actionError, setActionError] = React.useState("");

  // Stats
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === "DRAFT").length;
  const submittedCount = quotations.filter((q) => q.status === "SUBMITTED").length;
  const validatedCount = quotations.filter((q) => q.status === "VALIDATED").length;

  const inProgressQuotes = React.useMemo(() => {
    return quotations
      .filter((q) => q.status === "SUBMITTED" || q.status === "DRAFT")
      .slice(0, 3);
  }, [quotations]);

  const filtered = React.useMemo(() => {
    return quotations.filter((q) => {
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch =
        s === "" ||
        q.internalReference.toLowerCase().includes(s) ||
        (q.clientName && q.clientName.toLowerCase().includes(s)) ||
        (q.clientRfqNumber && q.clientRfqNumber.toLowerCase().includes(s));

      const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
      const matchesType = docTypeFilter === "ALL" || q.docType === docTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [quotations, searchTerm, statusFilter, docTypeFilter]);

  const handleOpenDetail = (q: QuotationRecord) => {
    setSelectedQuotation(q);
    setCancellingId(null);
    setCancellationReason("");
    setActionError("");
    setIsDetailOpen(true);
  };

  const handleValidate = async (id: string) => {
    if (!confirm("Voulez-vous valider commercialement ce devis ?")) return;
    setActionError("");
    const res = await updateQuotationStatusAction(id, "VALIDATED");
    if (res.success && res.quotation) {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? res.quotation! : q))
      );
      setSelectedQuotation(res.quotation);
    } else {
      setActionError(res.error || "Erreur de validation");
    }
  };

  const handleCancel = async (id: string) => {
    if (!cancellationReason.trim()) {
      alert("Veuillez indiquer un motif d'annulation.");
      return;
    }
    setActionError("");
    const res = await updateQuotationStatusAction(
      id,
      "CANCELLED",
      cancellationReason
    );
    if (res.success && res.quotation) {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? res.quotation! : q))
      );
      setSelectedQuotation(res.quotation);
      setCancellingId(null);
      setCancellationReason("");
    } else {
      setActionError(res.error || "Erreur d'annulation");
    }
  };

  const columns = React.useMemo<ColumnDef<QuotationRecord>[]>(
    () => [
      {
        accessorKey: "internalReference",
        header: "Réf. Devis",
        cell: ({ row }) => (
          <RefChip variant="primary">
            {row.original.internalReference}
          </RefChip>
        ),
      },
      {
        accessorKey: "clientRfqNumber",
        header: "RFQ Client",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium">
            {row.original.clientRfqNumber || "—"}
          </span>
        ),
      },
      {
        accessorKey: "clientName",
        header: "Client & Projet",
        cell: ({ row }) => (
          <div className="max-w-xs">
            <span className="font-bold text-foreground block truncate">
              {row.original.clientName}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {row.original.docType === "PROFORMA" ? "Proforma" : "Devis Standard"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "documentDate",
        header: "Date d'émission",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDate(row.original.documentDate)}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: "Total ($ USD)",
        cell: ({ row }) => (
          <MoneyText
            value={row.original.total}
            className="font-bold text-foreground text-sm"
          />
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
        title="Devis & Factures Proformas"
        description="Gestion des chiffrages miniers et propositions avec numérotation séquentielle par client."
        icon={<FileSpreadsheet className="size-5" />}
        actions={
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Nouveau devis</span>
          </Link>
        }
      />

      {/* Stat Strip (Screenshot 3 pattern) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total chiffrages"
          value={totalCount}
          subtitle="Dossiers enregistrés"
          icon={<FileSpreadsheet className="size-4" />}
        />
        <StatTile
          label="Brouillons"
          value={draftCount}
          subtitle="En cours de rédaction"
        />
        <StatTile
          label="Soumis au client"
          value={submittedCount}
          subtitle="En attente de retour RFQ"
        />
        <StatTile
          label="Validés commercialement"
          value={validatedCount}
          subtitle="Prêts pour bon de commande (PO)"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      {/* "Demandes en cours" Cards (Screenshot 3 pattern) */}
      {inProgressQuotes.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/70 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Demandes en cours de traitement
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {inProgressQuotes.length} dossier{inProgressQuotes.length > 1 ? "s" : ""} prioritaire{inProgressQuotes.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressQuotes.map((q) => (
              <div
                key={q.id}
                onClick={() => handleOpenDetail(q)}
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/30 p-4 hover:border-primary/40 hover:bg-card transition-all cursor-pointer shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <RefChip variant="primary">{q.internalReference}</RefChip>
                    <StatusPill status={q.status} />
                  </div>
                  <h4 className="mt-2.5 font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    {q.clientName}
                  </h4>
                  {q.clientRfqNumber && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      RFQ: {q.clientRfqNumber}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/70 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(q.documentDate)}
                  </span>
                  <MoneyText
                    value={q.total}
                    className="font-bold text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={handleOpenDetail}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par référence, RFQ ou client..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilterCount={
              (statusFilter !== "ALL" ? 1 : 0) +
              (docTypeFilter !== "ALL" ? 1 : 0)
            }
            filterContent={
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Statut du devis
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground outline-none"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="SUBMITTED">Soumis</option>
                    <option value="VALIDATED">Validé</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Type de document
                  </label>
                  <select
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground outline-none"
                  >
                    <option value="ALL">Tous les types</option>
                    <option value="QUOTATION">Devis Standard</option>
                    <option value="PROFORMA">Facture Proforma</option>
                  </select>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setDocTypeFilter("ALL");
                    }}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            }
            extraActions={
              <DateRangePicker placeholder="Période d'émission" />
            }
          />
        }
        renderMobileCard={(q) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <RefChip variant="primary">{q.internalReference}</RefChip>
              <StatusPill status={q.status} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">{q.clientName}</p>
              {q.clientRfqNumber && (
                <p className="text-xs text-muted-foreground">RFQ: {q.clientRfqNumber}</p>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">{formatDate(q.documentDate)}</span>
              <MoneyText value={q.total} className="font-bold text-foreground" />
            </div>
          </div>
        )}
      />

      {/* Right Detail Sheet */}
      {selectedQuotation && (
        <DetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedQuotation.internalReference}
          subtitle={`Client: ${selectedQuotation.clientName}`}
          badge={<StatusPill status={selectedQuotation.status} />}
          footer={
            <div className="flex items-center gap-2 flex-wrap justify-end w-full">
              {selectedQuotation.status === "SUBMITTED" && (
                <Button
                  type="button"
                  onClick={() => handleValidate(selectedQuotation.id)}
                  className="h-9 gap-1.5 bg-success text-success-foreground hover:bg-success/90 text-xs font-semibold"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Valider le devis</span>
                </Button>
              )}

              {selectedQuotation.status !== "CANCELLED" && (
                cancellingId === selectedQuotation.id ? (
                  <div className="flex items-center gap-2 w-full pt-2">
                    <input
                      type="text"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Motif explicite d'annulation..."
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
                      onClick={() => handleCancel(selectedQuotation.id)}
                      className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
                    >
                      Confirmer
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancellingId(selectedQuotation.id)}
                    className="h-9 gap-1.5 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <XCircle className="size-3.5" />
                    <span>Annuler l&apos;offre</span>
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
                value={formatDate(selectedQuotation.documentDate)}
                icon={<CalendarIcon className="size-3.5" />}
              />
              <KeyValueTile
                label="Validité"
                value={`${selectedQuotation.validityDays} jours`}
                icon={<Clock className="size-3.5" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <KeyValueTile
                label="N° RFQ Client"
                value={selectedQuotation.clientRfqNumber || "Non spécifié"}
              />
              <KeyValueTile
                label="Modalités de paiement"
                value={selectedQuotation.paymentTerms || "30 jours"}
              />
            </div>

            <KeyValueTile
              label="Délai de livraison prévu"
              value={selectedQuotation.deliveryLeadTime || "Ex-stock"}
            />

            {/* Financial Summary */}
            <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sous-total HT</span>
                <MoneyText value={selectedQuotation.subtotal} className="font-semibold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">TVA ({selectedQuotation.vatRate} %)</span>
                <MoneyText value={selectedQuotation.vatAmount} className="font-semibold text-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-2 text-primary">
                <span>Total Général TTC</span>
                <MoneyText value={selectedQuotation.total} className="text-base font-extrabold text-primary" />
              </div>
            </div>

            {selectedQuotation.notes && (
              <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Remarques & Conditions particulières
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {selectedQuotation.notes}
                </p>
              </div>
            )}
          </div>
        </DetailSheet>
      )}
    </div>
  );
}
