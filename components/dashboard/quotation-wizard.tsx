"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Calculator,
  Loader2,
  Building2,
  Package,
} from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { ItemRecord } from "@/lib/db/items";
import { createQuotationAction } from "@/actions/quotations";
import {
  PageHeader,
  MoneyText,
  RefChip,
  KeyValueTile,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

interface QuotationWizardProps {
  clients: ClientRecord[];
  items: ItemRecord[];
  preselectedClientId?: string;
}

interface LineItemDraft {
  itemId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export function QuotationWizard({
  clients,
  items,
  preselectedClientId,
}: QuotationWizardProps) {
  const router = useRouter();

  // Stepper state: 1: Client & RFQ, 2: Articles, 3: Récapitulatif
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);

  const [clientId, setClientId] = React.useState(
    preselectedClientId || clients[0]?.id || ""
  );
  const [docType, setDocType] = React.useState<"QUOTATION" | "PROFORMA">("QUOTATION");
  const [clientRfqNumber, setClientRfqNumber] = React.useState("");
  const [validityDays, setValidityDays] = React.useState(30);
  const [vatRate, setVatRate] = React.useState(16);
  const [paymentTerms, setPaymentTerms] = React.useState("30 jours fin de mois");
  const [deliveryLeadTime, setDeliveryLeadTime] = React.useState(
    "Ex-stock Lubumbashi / 2-3 semaines"
  );
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const [lines, setLines] = React.useState<LineItemDraft[]>([
    {
      description: "",
      unit: "Pce",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
    },
  ]);

  const selectedClient = React.useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        description: "",
        unit: "Pce",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = <K extends keyof LineItemDraft>(
    index: number,
    field: K,
    value: LineItemDraft[K]
  ) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        return { ...line, [field]: value };
      })
    );
  };

  const handleSelectCatalogItem = (index: number, itemId: string) => {
    const found = items.find((it) => it.id === itemId);
    if (!found) return;

    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        return {
          ...line,
          itemId: found.id,
          description: found.description,
          unit: found.unit,
          unitPrice: found.sellingPrice,
        };
      })
    );
  };

  // Calculations
  const subtotal = React.useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Math.max(0, line.quantity || 0);
      const price = Math.max(0, line.unitPrice || 0);
      const disc = Math.min(100, Math.max(0, line.discountPercent || 0));
      return sum + qty * price * (1 - disc / 100);
    }, 0);
  }, [lines]);

  const vatAmount = subtotal * (vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  const validateStep1 = () => {
    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep2 = () => {
    const validLines = lines.filter((l) => l.description.trim() !== "");
    if (validLines.length === 0) {
      setError("Veuillez saisir au moins une ligne d'article avec une désignation.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return;
    }

    const validLines = lines.filter((l) => l.description.trim() !== "");
    if (validLines.length === 0) {
      setError("Veuillez renseigner au moins un article valide.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createQuotationAction({
        clientId,
        docType,
        clientRfqNumber: clientRfqNumber.trim() || undefined,
        validityDays,
        vatRate,
        paymentTerms,
        deliveryLeadTime,
        notes,
        items: validLines,
      });

      if (!res.success) {
        setError(res.error || "Erreur de création du devis.");
        setIsSubmitting(false);
      } else {
        router.push("/dashboard/quotes");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl pb-24 md:pb-6">
      <PageHeader
        title="Création d'une Offre Commerciale"
        description="Génération séquentielle de devis ou facture proforma avec préservation des prix d'émission."
        icon={<FileSpreadsheet className="size-5" />}
        actions={
          <Link
            href="/dashboard/quotes"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Retour aux devis</span>
          </Link>
        }
      />

      {/* Stepper Navigation */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 text-left transition-colors ${
              currentStep === 1
                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
          >
            <div
              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                currentStep === 1
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider block opacity-80">
                Étape 1
              </span>
              <span className="text-xs truncate block">Client & RFQ</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setCurrentStep(2);
            }}
            className={`flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 text-left transition-colors ${
              currentStep === 2
                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
          >
            <div
              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                currentStep === 2
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider block opacity-80">
                Étape 2
              </span>
              <span className="text-xs truncate block">Articles & Tarifs</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3);
            }}
            className={`flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 text-left transition-colors ${
              currentStep === 3
                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
          >
            <div
              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                currentStep === 3
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider block opacity-80">
                Étape 3
              </span>
              <span className="text-xs truncate block">Récapitulatif</span>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      {/* Main Grid: Form Left + Sticky Summary Right */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Current Step Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Client & RFQ */}
          {currentStep === 1 && (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    1. Informations Client & Référence RFQ
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sélectionnez la société destinataire et le numéro de consultation.
                  </p>
                </div>
                {selectedClient && (
                  <RefChip variant="primary">{selectedClient.code}</RefChip>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Client destinataire *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Type de document *
                    </label>
                    <select
                      value={docType}
                      onChange={(e) =>
                        setDocType(e.target.value as "QUOTATION" | "PROFORMA")
                      }
                      className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none"
                    >
                      <option value="QUOTATION">Devis Standard</option>
                      <option value="PROFORMA">Facture Proforma</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Numéro de RFQ Client
                    </label>
                    <input
                      type="text"
                      value={clientRfqNumber}
                      onChange={(e) => setClientRfqNumber(e.target.value)}
                      placeholder="Ex: RFQ-KCC-2026-089"
                      className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Délai de validité de l&apos;offre
                    </label>
                    <select
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
                    >
                      <option value={15}>15 jours calendaires</option>
                      <option value={30}>30 jours calendaires</option>
                      <option value={60}>60 jours calendaires</option>
                      <option value={90}>90 jours calendaires</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Taux de TVA standard
                    </label>
                    <select
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
                    >
                      <option value={16}>16 % (Taux standard RDC)</option>
                      <option value={0}>0 % (Exonération minière conventionnée)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Modalités de règlement
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Délai & lieu de livraison
                    </label>
                    <input
                      type="text"
                      value={deliveryLeadTime}
                      onChange={(e) => setDeliveryLeadTime(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setCurrentStep(2);
                  }}
                  className="h-10 gap-2 bg-primary text-primary-foreground text-xs font-semibold"
                >
                  <span>Passer aux articles</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Articles */}
          {currentStep === 2 && (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    2. Lignes d&apos;articles & Quantités
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sélectionnez un article du catalogue ou saisissez une désignation libre.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="h-8 gap-1.5 text-xs border-border"
                >
                  <Plus className="size-3.5" />
                  <span>Ajouter une ligne</span>
                </Button>
              </div>

              <div className="space-y-4">
                {lines.map((line, idx) => {
                  const lineTotal =
                    Math.max(0, line.quantity || 0) *
                    Math.max(0, line.unitPrice || 0) *
                    (1 - Math.min(100, Math.max(0, line.discountPercent || 0)) / 100);

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-primary">
                          Ligne #{idx + 1}
                        </span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Select from catalog helper */}
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Importer depuis le catalogue (optionnel)
                        </label>
                        <select
                          value={line.itemId || ""}
                          onChange={(e) =>
                            handleSelectCatalogItem(idx, e.target.value)
                          }
                          className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none"
                        >
                          <option value="">Sélectionner un article...</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.skuRef} — {it.description} (${it.sellingPrice.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[11px] font-semibold text-foreground mb-1">
                          Désignation de la fourniture *
                        </label>
                        <input
                          type="text"
                          value={line.description}
                          required
                          onChange={(e) =>
                            updateLine(idx, "description", e.target.value)
                          }
                          placeholder="Description détaillée de l'équipement ou pièce..."
                          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
                        />
                      </div>

                      {/* Quantities, Unit, Price & Discount */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Quantité *
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            required
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold tabular-nums text-foreground outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Unité *
                          </label>
                          <input
                            type="text"
                            value={line.unit}
                            required
                            onChange={(e) =>
                              updateLine(idx, "unit", e.target.value)
                            }
                            placeholder="Pce, Kit..."
                            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Prix unitaire ($ USD) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            required
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs font-semibold tabular-nums text-foreground outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Total ligne HT
                          </label>
                          <div className="h-9 rounded-lg border border-border/80 bg-card px-3 text-xs font-bold text-primary flex items-center tabular-nums">
                            <MoneyText value={lineTotal} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="h-10 text-xs"
                >
                  <ArrowLeft className="size-3.5 mr-1" />
                  <span>Étape précédente</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setCurrentStep(3);
                  }}
                  className="h-10 gap-2 bg-primary text-primary-foreground text-xs font-semibold"
                >
                  <span>Passer au récapitulatif</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Récapitulatif */}
          {currentStep === 3 && (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    3. Validation & Conditions Particulières
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vérifiez l&apos;ensemble des données avant l&apos;enregistrement transactionnel.
                  </p>
                </div>
                <CheckCircle2 className="size-5 text-success" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <KeyValueTile
                  label="Client"
                  value={selectedClient?.name || "—"}
                />
                <KeyValueTile
                  label="Type d'offre"
                  value={docType === "PROFORMA" ? "Facture Proforma" : "Devis Standard"}
                />
                <KeyValueTile
                  label="Numéro RFQ Client"
                  value={clientRfqNumber || "Non spécifié"}
                />
                <KeyValueTile
                  label="Validité"
                  value={`${validityDays} jours calendaires`}
                />
              </div>

              {/* Notes block */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Remarques & Mentions contractuelles (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Conditions de livraison spécifiques, exonérations de douane..."
                  className="w-full rounded-xl border border-input bg-card p-3 text-xs text-foreground outline-none"
                />
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="h-10 text-xs"
                >
                  <ArrowLeft className="size-3.5 mr-1" />
                  <span>Modifier les articles</span>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Enregistrement en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-accent" />
                      <span>Émettre le devis transactionnel</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Summary Card (Desktop) */}
        <div className="lg:col-span-4 sticky top-20 rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-border/70 flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Récapitulatif Financier
            </h3>
            <Calculator className="size-4 text-primary" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nombre de lignes</span>
              <span className="font-semibold text-foreground tabular-nums">
                {lines.filter((l) => l.description.trim()).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sous-total HT</span>
              <MoneyText value={subtotal} className="font-semibold text-foreground" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TVA ({vatRate} %)</span>
              <MoneyText value={vatAmount} className="font-semibold text-foreground" />
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-primary">Total TTC ($ USD)</span>
              <MoneyText
                value={grandTotal}
                className="text-lg font-extrabold text-primary"
              />
            </div>
          </div>

          <div className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Numérotation automatique</p>
            <p>
              Une référence interne unique (ex: 057/026/MIS) sera générée automatiquement pour ce client.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 p-3.5 backdrop-blur-md flex md:hidden items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
            Total TTC
          </span>
          <MoneyText value={grandTotal} className="text-base font-extrabold text-primary" />
        </div>

        {currentStep < 3 ? (
          <Button
            type="button"
            onClick={() => {
              if (currentStep === 1 && validateStep1()) setCurrentStep(2);
              else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
            }}
            className="h-10 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold"
          >
            <span>Suivant</span>
            <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 gap-1.5 bg-primary text-primary-foreground text-xs font-bold"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5 text-accent" />
            )}
            <span>Émettre</span>
          </Button>
        )}
      </div>
    </form>
  );
}
