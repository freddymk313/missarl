"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { ClientRecord } from "@/lib/db/clients";
import { ItemRecord } from "@/lib/db/items";
import { createQuotationAction } from "@/actions/quotations";
import { formatUSD } from "@/lib/formatters";

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
  const [clientId, setClientId] = useState(preselectedClientId || clients[0]?.id || "");
  const [docType, setDocType] = useState<"QUOTATION" | "PROFORMA">("QUOTATION");
  const [clientRfqNumber, setClientRfqNumber] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [vatRate, setVatRate] = useState(16);
  const [paymentTerms, setPaymentTerms] = useState("30 jours fin de mois");
  const [deliveryLeadTime, setDeliveryLeadTime] = useState("Ex-stock Lubumbashi / 2-3 semaines");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [lines, setLines] = useState<LineItemDraft[]>([
    {
      description: "",
      unit: "Pce",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
    },
  ]);

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

  // Financial calculations
  const subtotal = lines.reduce((sum, line) => {
    const qty = Math.max(0, line.quantity || 0);
    const price = Math.max(0, line.unitPrice || 0);
    const disc = Math.min(100, Math.max(0, line.discountPercent || 0));
    return sum + qty * price * (1 - disc / 100);
  }, 0);

  const vatAmount = subtotal * (vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return;
    }

    const validLines = lines.filter((l) => l.description.trim() !== "");
    if (validLines.length === 0) {
      setError("Veuillez saisir au moins un article avec une désignation.");
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
        setError(res.error || "Erreur de création.");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Bar with back link and submit action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Retour à la liste des devis
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="size-4" />
          {isSubmitting ? "Génération en cours..." : "Valider et Enregistrer le Devis"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-xs font-bold text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Main Grid: Left parameters & lines, Right sticky financial recap */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Parameters & Lines */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Parameters */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-primary flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              Paramètres Commerciaux & Client
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-foreground">Client destinataire *</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Type de document *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as "QUOTATION" | "PROFORMA")}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                >
                  <option value="QUOTATION">Devis Standard Commercial</option>
                  <option value="PROFORMA">Facture Proforma</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">N° Appel d&apos;offre / RFQ Client</label>
                <input
                  type="text"
                  value={clientRfqNumber}
                  onChange={(e) => setClientRfqNumber(e.target.value)}
                  placeholder="ex: RFQ-KCC-2026-089"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-foreground">Validité (jours)</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">Taux TVA (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">Règlement</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">Délai livraison</label>
                <input
                  type="text"
                  value={deliveryLeadTime}
                  onChange={(e) => setDeliveryLeadTime(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground">Observations / Spécifications</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mentions spéciales ou consignes de livraison pour le client..."
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              />
            </div>
          </div>

          {/* Step 2: Line Items */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-black text-primary flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                Spécifications et Lignes Chiffrées ({lines.length})
              </h3>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-secondary/80 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                <Plus className="size-3.5" /> Ajouter une ligne
              </button>
            </div>

            <div className="space-y-3.5">
              {lines.map((line, index) => {
                const lineSubtotal = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span className="text-primary font-black">Ligne #{index + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> Supprimer
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-foreground">Catalogue pré-enregistré</label>
                        <select
                          value={line.itemId || ""}
                          onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                          className="h-9 w-full rounded-xl border border-border bg-card px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        >
                          <option value="">Sélectionner un article...</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.skuRef} — {it.description.substring(0, 35)}... (${it.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-bold text-foreground">Désignation complète pour le devis *</label>
                        <input
                          type="text"
                          required
                          value={line.description}
                          onChange={(e) => updateLine(index, "description", e.target.value)}
                          placeholder="Description détaillée de la fourniture ou pièce..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-[11px] font-bold text-foreground">Unité *</label>
                        <input
                          type="text"
                          required
                          value={line.unit}
                          onChange={(e) => updateLine(index, "unit", e.target.value)}
                          placeholder="Pce, Mètre, Lot..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">Quantité *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={line.quantity}
                          onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">Prix unitaire HT ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">Total Ligne HT</label>
                        <div className="h-9 w-full rounded-xl border border-border bg-secondary/50 px-3 flex items-center font-mono font-black text-primary text-xs mt-1">
                          $ {formatUSD(lineSubtotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Financial Recap */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-primary flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </span>
              Récapitulatif Financier
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total Brut HT :</span>
                <span className="font-mono font-bold text-foreground">$ {formatUSD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taux TVA applicable :</span>
                <span className="font-mono font-bold text-foreground">{vatRate} %</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Montant TVA :</span>
                <span className="font-mono font-bold text-foreground">$ {formatUSD(vatAmount)}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase text-foreground">Total TTC</span>
                  <p className="text-[10px] text-muted-foreground">Devise officielle : USD</p>
                </div>
                <span className="font-mono text-2xl font-black text-primary">
                  $ {formatUSD(grandTotal)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                {isSubmitting ? "Génération en cours..." : "Valider et Générer le Devis"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
