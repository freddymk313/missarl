"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Calculator, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { ClientRecord } from "@/lib/db/clients";
import { ItemRecord } from "@/lib/db/items";
import { createQuotationAction } from "@/actions/quotations";

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
        router.push("/dashboard/quotations");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <Link
          href="/dashboard/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Retour à la liste des devis
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="button button-primary text-xs"
        >
          {isSubmitting ? "Génération en cours..." : "Valider et Générer le Devis"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {/* Header Parameters */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-accent" /> Paramètres Commerciaux de la Proposition
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700">Client destinataire *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
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
            <label className="block text-xs font-bold text-slate-700">Type de document *</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as "QUOTATION" | "PROFORMA")}
              className="form-field mt-1 text-xs font-bold"
            >
              <option value="QUOTATION">Devis Standard Commercial</option>
              <option value="PROFORMA">Facture Proforma</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">N° Appel d&apos;offre / RFQ Client</label>
            <input
              type="text"
              value={clientRfqNumber}
              onChange={(e) => setClientRfqNumber(e.target.value)}
              placeholder="ex: RFQ-KCC-2026-089"
              className="form-field mt-1 text-xs font-semibold"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Validité (jours)</label>
            <input
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
              className="form-field mt-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">Taux TVA (%)</label>
            <input
              type="number"
              step="0.1"
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              className="form-field mt-1 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">Conditions de règlement</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="form-field mt-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">Délai de livraison</label>
            <input
              type="text"
              value={deliveryLeadTime}
              onChange={(e) => setDeliveryLeadTime(e.target.value)}
              className="form-field mt-1 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Observations / Notes complémentaires</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mentions spéciales ou spécifications particulières pour le client..."
            className="form-field mt-1 text-xs"
          />
        </div>
      </div>

      {/* Line Items Editor */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
            <Calculator className="size-4 text-accent" /> Articles et Spécifications Chiffrées
          </h3>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-primary hover:bg-accent hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" /> Ajouter une ligne
          </button>
        </div>

        <div className="space-y-4">
          {lines.map((line, index) => {
            const lineSubtotal = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);

            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-border/80 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Ligne #{index + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="size-3.5" /> Supprimer
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700">Sélection Catalogue (Optionnel)</label>
                    <select
                      value={line.itemId || ""}
                      onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                      className="form-field mt-1 text-xs"
                    >
                      <option value="">Sélectionner un article pré-enregistré...</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.skuRef} — {it.description.substring(0, 40)}... (${it.sellingPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-700">Désignation complète pour le devis *</label>
                    <input
                      type="text"
                      required
                      value={line.description}
                      onChange={(e) => updateLine(index, "description", e.target.value)}
                      placeholder="Description détaillée de la fourniture..."
                      className="form-field mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Unité *</label>
                    <input
                      type="text"
                      required
                      value={line.unit}
                      onChange={(e) => updateLine(index, "unit", e.target.value)}
                      placeholder="Pce, Mètre, Lot..."
                      className="form-field mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Quantité *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                      className="form-field mt-1 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Prix unitaire HT ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="form-field mt-1 text-xs font-mono font-bold text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Total Ligne HT</label>
                    <div className="form-field mt-1 flex items-center bg-slate-100 font-mono font-extrabold text-primary text-xs">
                      ${lineSubtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals Summary */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm rounded-xl border border-border bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Sous-total HT :</span>
              <span className="font-mono font-bold text-slate-800">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>TVA ({vatRate}%) :</span>
              <span className="font-mono font-bold text-slate-800">${vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-primary border-t border-border pt-2">
              <span>TOTAL TTC (USD) :</span>
              <span className="font-mono text-base text-primary">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
