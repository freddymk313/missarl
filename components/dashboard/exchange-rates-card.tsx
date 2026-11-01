"use client";

import { useState, useTransition } from "react";
import { DollarSign, Loader2, Edit2, Check, X } from "lucide-react";
import { CurrencyRecord, ExchangeRateRecord } from "@/lib/db/items";
import { upsertExchangeRateAction } from "@/actions/items";

interface ExchangeRatesCardProps {
  currencies: CurrencyRecord[];
  initialRates: ExchangeRateRecord[];
  canEdit: boolean;
}

export function ExchangeRatesCard({
  currencies,
  initialRates,
  canEdit,
}: ExchangeRatesCardProps) {
  const [rates, setRates] = useState<ExchangeRateRecord[]>(initialRates);
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const nonUsdCurrencies = currencies.filter((c) => c.code !== "USD");

  const getRateFor = (code: string) => {
    return rates.find((r) => r.currencyCode === code);
  };

  const handleStartEdit = (code: string) => {
    const rate = getRateFor(code);
    setEditingCurrency(code);
    setError("");
    // If rateToUsd is e.g. 0.000357 (1 USD = 2800 CDF), show 2800
    if (rate && rate.rateToUsd > 0) {
      const unitsPerUsd = 1 / rate.rateToUsd;
      setInputValue(unitsPerUsd.toString());
      setNoteValue(rate.note || "");
    } else {
      setInputValue("");
      setNoteValue("");
    }
  };

  const handleCancel = () => {
    setEditingCurrency(null);
    setError("");
  };

  const handleSave = (code: string) => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid positive number.");
      return;
    }

    startTransition(async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await upsertExchangeRateAction({
        currencyCode: code,
        nUnitsPerUsd: val,
        effectiveOn: today,
        note: noteValue || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to update exchange rate.");
      } else {
        setRates((prev) => {
          const filtered = prev.filter((r) => r.currencyCode !== code);
          const c = currencies.find((cu) => cu.code === code);
          const newRecord: ExchangeRateRecord = {
            id: res.rate?.id || "temp-" + Date.now(),
            currencyCode: code,
            currencyName: c?.name || code,
            currencySymbol: c?.symbol || code,
            rateToUsd: 1 / val,
            effectiveOn: today,
            note: noteValue || null,
            createdAt: new Date().toISOString(),
          };
          return [...filtered, newRecord];
        });
        setEditingCurrency(null);
        setError("");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-black text-primary flex items-center gap-2">
          <DollarSign className="size-4 text-primary" /> Taux de Change & Devises
        </h3>
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
          Devise pivot : USD ($)
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Taux indicatifs pour convertir les cotations fournisseurs (CDF, ZAR) en USD lors de la recherche et de la cotation devis.
      </p>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive font-semibold border border-destructive/20">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* USD Row (Always 1) */}
        <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3 border border-border/60 text-xs">
          <div>
            <span className="font-bold text-foreground">USD ($)</span>
            <p className="text-[10px] text-muted-foreground">US Dollar — Pivot</p>
          </div>
          <span className="font-mono font-bold text-foreground">
            1 USD = 1.0000 USD
          </span>
        </div>

        {/* Dynamic Currencies */}
        {nonUsdCurrencies.map((c) => {
          const rate = getRateFor(c.code);
          const isEditing = editingCurrency === c.code;
          const unitsPerUsd = rate && rate.rateToUsd > 0 ? (1 / rate.rateToUsd) : null;

          return (
            <div
              key={c.code}
              className="rounded-xl bg-secondary/30 p-3 border border-border/60 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground">
                    {c.code} ({c.symbol})
                  </span>
                  <p className="text-[10px] text-muted-foreground">{c.name}</p>
                </div>

                {!isEditing ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {unitsPerUsd != null ? (
                        <p className="font-mono font-bold text-primary">
                          1 USD = {unitsPerUsd.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} {c.code}
                        </p>
                      ) : (
                        <p className="font-mono text-warning font-semibold">Taux non défini</p>
                      )}
                      {rate?.effectiveOn && (
                        <p className="text-[10px] text-muted-foreground">
                          Au {new Date(rate.effectiveOn).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(c.code)}
                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-secondary cursor-pointer"
                        title="Modifier le taux"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSave(c.code)}
                      className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                      title="Enregistrer"
                    >
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleCancel}
                      className="p-1 rounded text-muted-foreground hover:bg-secondary cursor-pointer"
                      title="Annuler"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      1 USD = combien de {c.code} ?
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={`ex: ${c.code === "CDF" ? "2850" : "18.5"}`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">
                        {c.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      Note / Source
                    </label>
                    <input
                      type="text"
                      placeholder="ex: BCC officiel ou Marché"
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

