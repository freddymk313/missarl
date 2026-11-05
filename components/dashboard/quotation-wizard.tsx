"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Search,
  X,
  Package,
} from "lucide-react";
import Link from "next/link";
import { ClientRecord } from "@/lib/db/clients";
import { ItemRecord } from "@/lib/db/items";
import { createQuotationAction } from "@/actions/quotations";
import { formatUSD } from "@/lib/formatters";
import { QuotationPdfActions } from "@/components/dashboard/quotation-pdf-actions";

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
  unitPrice: number; // Client quoted price ($)
  supplyPrice: number; // Purchase / supplier cost ($)
  discountPercent: number;
  commissionPercent: number | null; // null = use global commission
}

// ── Helpers for Client Tag & Reference Number ────────────────────────────────

function getClientTag(client?: ClientRecord): string {
  if (!client) return "CLIENT";
  const upperName = (client.name || "").toUpperCase();
  const upperCode = (client.code || "").toUpperCase();
  if (upperName.includes("KICO") || upperCode.includes("KICO")) return "KICO";
  if (upperName.includes("CHEMAF") || upperCode.includes("CHEMAF"))
    return "CHEMAF";
  if (upperName.includes("KAMOA") || upperCode.includes("KAMOA"))
    return "KAMOA";
  return client.code
    ? client.code.replace(/[^A-Za-z0-9]/g, "")
    : (client.name.split(" ")[0] || "CLIENT").toUpperCase();
}

function getInitialSequence(clientTag: string): number {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`mis_quote_seq_${clientTag}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }
  if (clientTag === "KICO") return 88;
  if (clientTag === "CHEMAF") return 24;
  if (clientTag === "KAMOA") return 114;
  return 1;
}

function formatRefNumber(seq: number): string {
  const padded = String(seq).padStart(4, "0");
  return `${padded}/026/MIS`;
}

// ── Searchable Combobox for Pre-registered Catalog Items ─────────────────────

function CatalogItemCombobox({
  items,
  selectedItemId,
  onSelect,
}: {
  items: ItemRecord[];
  selectedItemId?: string;
  onSelect: (item: ItemRecord | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items.slice(0, 8);
    const q = searchTerm.toLowerCase();
    return items
      .filter((it) => {
        const des = (it.designation || "").toLowerCase();
        const desc = (it.description || "").toLowerCase();
        const mpn = (it.manufacturerPartNumber || "").toLowerCase();
        const sku = (it.skuRef || "").toLowerCase();
        const brand = (it.brandName || "").toLowerCase();
        return (
          des.includes(q) ||
          desc.includes(q) ||
          mpn.includes(q) ||
          sku.includes(q) ||
          brand.includes(q)
        );
      })
      .slice(0, 10);
  }, [items, searchTerm]);

  return (
    <div ref={containerRef} className="relative mt-1">
      {selectedItem ? (
        <div className="flex items-center justify-between gap-2 h-9 w-full rounded-xl border border-primary/30 bg-primary/5 px-2.5 text-xs">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="font-mono text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
              {selectedItem.skuRef}
            </span>
            <span className="font-semibold text-foreground truncate">
              {selectedItem.designation || selectedItem.description}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setSearchTerm("");
              setIsOpen(true);
            }}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
            title="Désélectionner l'article"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Rechercher nom, code, MPN..."
            className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {isOpen && !selectedItem && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[320px] overflow-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl backdrop-blur-md">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <Package className="size-6 mx-auto mb-1 text-muted-foreground/40" />
              Aucun article correspondant
            </div>
          ) : (
            filtered.map((it) => {
              const buyPrice = it.supplyPrice ?? it.cheapestOfferUsd;
              const sellPrice = it.quotedPrice ?? buyPrice;
              return (
                <div
                  key={it.id}
                  onClick={() => {
                    onSelect(it);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className="flex flex-col gap-0.5 rounded-lg p-2.5 text-xs hover:bg-secondary cursor-pointer transition-colors border-b border-border/40 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground truncate">
                      {it.designation || it.description}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 font-bold bg-secondary px-1.5 py-0.5 rounded">
                      {it.skuRef}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                    <span className="truncate">
                      {it.brandName ? `${it.brandName} ` : ""}
                      {it.manufacturerPartNumber
                        ? `[MPN: ${it.manufacturerPartNumber}]`
                        : ""}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0 font-mono">
                      {buyPrice != null && (
                        <span className="text-muted-foreground text-[10px]">
                          Achat: $ {buyPrice.toFixed(2)}
                        </span>
                      )}
                      {sellPrice != null ? (
                        <span className="font-bold text-primary">
                          Vente: $ {sellPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">
                          (Sans prix)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Main QuotationWizard Component ──────────────────────────────────────────

export function QuotationWizard({
  clients,
  items,
  preselectedClientId,
}: QuotationWizardProps) {
  const router = useRouter();

  // Selected Client
  const [clientId, setClientId] = useState(
    preselectedClientId || clients[0]?.id || "",
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) || clients[0],
    [clients, clientId],
  );

  const clientTag = useMemo(
    () => getClientTag(selectedClient),
    [selectedClient],
  );

  // Reference Number REF N° (e.g. 0088/026/MIS) — client-side auto-initialized and fully editable
  const [internalRef, setInternalRef] = useState<string>(() => {
    const tag = getClientTag(
      clients.find((c) => c.id === (preselectedClientId || clients[0]?.id)),
    );
    return formatRefNumber(getInitialSequence(tag));
  });

  // Client RFQ Number: User only types the number (e.g. 14425)
  const [rfqNumber, setRfqNumber] = useState("");

  // Full RFQ format computed: RFQ-[TAG]-[NUM] OQ
  const fullRfq = useMemo(() => {
    const trimmed = rfqNumber.trim();
    if (!trimmed) return "";
    if (trimmed.toUpperCase().startsWith("RFQ-")) return trimmed;
    return `RFQ-${clientTag}-${trimmed} OQ`;
  }, [rfqNumber, clientTag]);

  // Handle client selection change: update REF N° and RFQ tag
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const newClient = clients.find((c) => c.id === newClientId);
    const newTag = getClientTag(newClient);
    const seq = getInitialSequence(newTag);
    setInternalRef(formatRefNumber(seq));
  };

  const [docType, setDocType] = useState<"QUOTATION" | "PROFORMA">("QUOTATION");
  const [validityDays, setValidityDays] = useState(30);
  const [vatRate, setVatRate] = useState(16);
  const [globalCommission, setGlobalCommission] = useState(75);
  const [paymentTerms, setPaymentTerms] = useState("30 jours fin de mois");
  const [deliveryLeadTime, setDeliveryLeadTime] = useState(
    "Ex-stock Lubumbashi / 2-3 semaines",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedQuotation, setSavedQuotation] = useState<{
    id: string;
    reference: string;
  } | null>(null);

  const [lines, setLines] = useState<LineItemDraft[]>([
    {
      description: "",
      unit: "Pce",
      quantity: 1,
      unitPrice: 0,
      supplyPrice: 0,
      discountPercent: 0,
      commissionPercent: null,
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
        supplyPrice: 0,
        discountPercent: 0,
        commissionPercent: null,
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
    value: LineItemDraft[K],
  ) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        return { ...line, [field]: value };
      }),
    );
  };

  const handleSelectCatalogItem = (index: number, item: ItemRecord | null) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (!item) {
          return {
            ...line,
            itemId: undefined,
          };
        }
        const buyPrice = item.supplyPrice ?? item.cheapestOfferUsd ?? 0;
        const effectiveComm = line.commissionPercent ?? globalCommission;
        // Use stored quoted price if available, otherwise compute from commission
        const sellPrice =
          item.quotedPrice ??
          (buyPrice > 0 ? buyPrice * (1 + effectiveComm / 100) : buyPrice);
        return {
          ...line,
          itemId: item.id,
          description: item.designation
            ? `${item.designation} — ${item.description}`
            : item.description,
          unit: item.unitCode || "EA",
          unitPrice: sellPrice,
          supplyPrice: buyPrice,
        };
      }),
    );
  };

  // ── Financial Calculations ────────────────────────────────────────────────
  const totalPurchaseCost = lines.reduce((sum, line) => {
    const qty = Math.max(0, line.quantity || 0);
    const buy = Math.max(0, line.supplyPrice || 0);
    return sum + qty * buy;
  }, 0);

  const subtotalSelling = lines.reduce((sum, line) => {
    const qty = Math.max(0, line.quantity || 0);
    const price = Math.max(0, line.unitPrice || 0);
    const disc = Math.min(100, Math.max(0, line.discountPercent || 0));
    return sum + qty * price * (1 - disc / 100);
  }, 0);

  const grossMargin = subtotalSelling - totalPurchaseCost;
  const marginPercent =
    totalPurchaseCost > 0 ? (grossMargin / totalPurchaseCost) * 100 : 0;

  const vatAmount = subtotalSelling * (vatRate / 100);
  const grandTotal = subtotalSelling + vatAmount;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return;
    }

    if (!internalRef.trim()) {
      setError("Le numéro de référence du devis (REF N°) est obligatoire.");
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
        internalReference: internalRef.trim(),
        clientRfqNumber: fullRfq || undefined,
        validityDays,
        vatRate,
        paymentTerms,
        deliveryLeadTime,
        notes,
        items: validLines.map((line) => ({
          itemId: line.itemId,
          description: line.description,
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          supplierPriceSnapshot: line.supplyPrice || null,
          baseCostUsdSnapshot: line.supplyPrice || null,
          commissionAmount:
            line.unitPrice - line.supplyPrice > 0
              ? line.unitPrice - line.supplyPrice
              : 0,
          commissionPercent: line.commissionPercent ?? globalCommission,
        })),
      });

      if (!res.success) {
        setError(res.error || "Erreur de création.");
        setIsSubmitting(false);
      } else if (res.quotation) {
        // Auto-increment and remember the next sequence in localStorage
        try {
          const match = internalRef.match(/^(\d+)/);
          if (match) {
            const currentSeq = parseInt(match[1], 10);
            if (!isNaN(currentSeq)) {
              localStorage.setItem(
                `mis_quote_seq_${clientTag}`,
                String(currentSeq + 1),
              );
            }
          }
        } catch {
          // Ignore localStorage write failures
        }

        // Show success state with PDF actions before redirecting
        setSavedQuotation({
          id: res.quotation.id,
          reference: res.quotation.internalReference,
        });
        setIsSubmitting(false);
      } else {
        router.push("/dashboard/quotes");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setIsSubmitting(false);
    }
  };

  // ── Success State ─────────────────────────────────────────────────────────
  if (savedQuotation) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-8 space-y-6 max-w-lg mx-auto text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-14 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="size-7 text-success" />
          </div>
          <div>
            <h2 className="text-lg font-black text-success">
              Devis enregistré !
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Référence :{" "}
              <span className="font-mono font-bold text-foreground">
                {savedQuotation.reference}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-black text-primary mb-3">
            Générer le document PDF
          </p>
          <QuotationPdfActions
            quotationId={savedQuotation.id}
            quotationRef={savedQuotation.reference}
          />
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/quotes")}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Retour à la liste des devis
        </button>
      </div>
    );
  }

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
          {isSubmitting
            ? "Génération en cours..."
            : "Valider et Enregistrer le Devis"}
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
              Paramètres Commerciaux &amp; Client
            </h3>

            {/* Client, REF N°, RFQ, Doc Type */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Client */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Client destinataire *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  required
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. REF N° (Modifiable & initialisé selon le client) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    REF N° (Devis) *
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    +1 auto
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={internalRef}
                  onChange={(e) => setInternalRef(e.target.value)}
                  placeholder="0088/026/MIS"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-black text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              {/* 3. RFQ Client (Seul le numéro est saisi) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    RFQ Client
                  </label>
                  {fullRfq ? (
                    <span className="text-[10px] font-mono font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                      {fullRfq}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ex: {clientTag}-14425
                    </span>
                  )}
                </div>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground select-none">
                    RFQ-{clientTag}-
                  </span>
                  <input
                    type="text"
                    value={rfqNumber}
                    onChange={(e) => {
                      let val = e.target.value;
                      const prefixRegex = new RegExp(`^RFQ-${clientTag}-`, "i");
                      val = val.replace(prefixRegex, "").replace(/\s*OQ$/i, "");
                      setRfqNumber(val);
                    }}
                    placeholder="14425"
                    style={{
                      paddingLeft: `calc(${clientTag.length + 5}ch + 0.9rem)`,
                    }}
                    className="h-9 w-full rounded-xl border border-border bg-card pr-10 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground select-none">
                    OQ
                  </span>
                </div>
              </div>

              {/* 4. Type de document */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Type de document *
                </label>
                <select
                  value={docType}
                  onChange={(e) =>
                    setDocType(e.target.value as "QUOTATION" | "PROFORMA")
                  }
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 cursor-pointer"
                >
                  <option value="QUOTATION">Devis Standard</option>
                  <option value="PROFORMA">Facture Proforma</option>
                </select>
              </div>
            </div>

            {/* Row 2: Terms & Lead times */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Validité (jours)
                </label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) =>
                    setValidityDays(parseInt(e.target.value) || 30)
                  }
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Taux TVA (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Commission globale (%)
                  </label>
                  <span className="text-[10px] text-primary font-bold">
                    défaut par ligne
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="500"
                  value={globalCommission}
                  onChange={(e) =>
                    setGlobalCommission(parseFloat(e.target.value) || 0)
                  }
                  placeholder="ex: 75"
                  className="h-9 w-full rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Délai livraison
                </label>
                <input
                  type="text"
                  value={deliveryLeadTime}
                  onChange={(e) => setDeliveryLeadTime(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground">
                Observations / Spécifications
              </label>
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
                const qty = Math.max(0, line.quantity || 0);
                const price = Math.max(0, line.unitPrice || 0);
                const disc = Math.min(
                  100,
                  Math.max(0, line.discountPercent || 0),
                );
                const lineSubtotal = qty * price * (1 - disc / 100);

                // Effective commission for this line (line-specific or global)
                const effectiveComm =
                  line.commissionPercent !== null &&
                  line.commissionPercent !== undefined
                    ? line.commissionPercent
                    : globalCommission;
                const isLineOverride = line.commissionPercent !== null;

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span className="text-primary font-black">
                        Ligne #{index + 1}
                      </span>
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
                      {/* Searchable catalog item combobox */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-foreground">
                          Catalogue pré-enregistré (recherche rapide)
                        </label>
                        <CatalogItemCombobox
                          items={items}
                          selectedItemId={line.itemId}
                          onSelect={(item) =>
                            handleSelectCatalogItem(index, item)
                          }
                        />
                      </div>

                      {/* Full description */}
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-foreground">
                          Désignation complète pour le devis *
                        </label>
                        <input
                          type="text"
                          required
                          value={line.description}
                          onChange={(e) =>
                            updateLine(index, "description", e.target.value)
                          }
                          placeholder="Description détaillée de la fourniture ou pièce..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>
                    </div>

                    {/* Row: Unité | Quantité | Coût Achat | Commission % | Prix Vente | Total */}
                    <div className="grid gap-3 sm:grid-cols-6">
                      <div>
                        <label className="block text-[11px] font-bold text-foreground">
                          Unité *
                        </label>
                        <input
                          type="text"
                          required
                          value={line.unit}
                          onChange={(e) =>
                            updateLine(index, "unit", e.target.value)
                          }
                          placeholder="Pce, Mètre, Lot..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">
                          Quantité *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground">
                          Coût Achat ($){" "}
                          <span className="text-[9px] font-normal">
                            (Fourn.)
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.supplyPrice}
                          onChange={(e) => {
                            const newBuy = parseFloat(e.target.value) || 0;
                            // Auto-compute sell price from commission when buy price changes
                            const newSell =
                              newBuy > 0
                                ? newBuy * (1 + effectiveComm / 100)
                                : line.unitPrice;
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i !== index
                                  ? l
                                  : {
                                      ...l,
                                      supplyPrice: newBuy,
                                      unitPrice: newBuy > 0 ? newSell : l.unitPrice,
                                    },
                              ),
                            );
                          }}
                          placeholder="0.00"
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      {/* Per-line commission % override */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-foreground">
                            Commis. (%)
                          </label>
                          {isLineOverride ? (
                            <button
                              type="button"
                              onClick={() => {
                                // Reset to global, recompute sell price
                                const buy = line.supplyPrice;
                                const newSell =
                                  buy > 0
                                    ? buy * (1 + globalCommission / 100)
                                    : line.unitPrice;
                                setLines((prev) =>
                                  prev.map((l, i) =>
                                    i !== index
                                      ? l
                                      : {
                                          ...l,
                                          commissionPercent: null,
                                          unitPrice: buy > 0 ? newSell : l.unitPrice,
                                        },
                                  ),
                                );
                              }}
                              className="text-[9px] text-primary underline cursor-pointer hover:text-primary/70"
                              title="Réinitialiser à la commission globale"
                            >
                              ↺ global
                            </button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              = {globalCommission}%
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="500"
                          value={
                            line.commissionPercent !== null &&
                            line.commissionPercent !== undefined
                              ? line.commissionPercent
                              : ""
                          }
                          placeholder={String(globalCommission)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === "" ? null : parseFloat(raw) || 0;
                            const buy = line.supplyPrice;
                            const comm = val !== null ? val : globalCommission;
                            const newSell =
                              buy > 0
                                ? buy * (1 + comm / 100)
                                : line.unitPrice;
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i !== index
                                  ? l
                                  : {
                                      ...l,
                                      commissionPercent: val,
                                      unitPrice: buy > 0 ? newSell : l.unitPrice,
                                    },
                              ),
                            );
                          }}
                          className={`h-9 w-full rounded-xl border px-3 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 ${
                            isLineOverride
                              ? "border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                              : "border-border bg-card text-foreground"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">
                          Prix Vente HT ($) *{" "}
                          <span className="text-[9px] font-normal text-primary">
                            (Client)
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={line.unitPrice}
                          onChange={(e) =>
                            updateLine(
                              index,
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">
                          Total Ligne HT
                        </label>
                        <div className="h-9 w-full rounded-xl border border-border bg-secondary/50 px-3 flex items-center font-mono font-black text-primary text-xs mt-1">
                          {formatUSD(lineSubtotal)}
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

            {/* Purchase cost & Commission preview */}
            <div className="rounded-xl bg-secondary/40 border border-border p-3.5 space-y-2">
              {/* Global commission indicator */}
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border/60">
                <span className="font-bold text-foreground">
                  Commission globale :
                </span>
                <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {globalCommission}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">
                  Coût d&apos;achat total :
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatUSD(totalPurchaseCost)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">
                  Marge / Commission :
                </span>
                <span
                  className={`font-mono font-bold ${
                    grossMargin >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatUSD(grossMargin)}{" "}
                  {totalPurchaseCost > 0
                    ? `(${marginPercent >= 0 ? "+" : ""}${marginPercent.toFixed(1)}%)`
                    : ""}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
                Total sans commission (coût achat) :{" "}
                <span className="font-bold text-foreground">
                  {formatUSD(totalPurchaseCost)}
                </span>
              </p>
            </div>

            {/* Client-facing totals */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total Brut HT (Client) :</span>
                <span className="font-mono font-bold text-foreground">
                  {formatUSD(subtotalSelling)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taux TVA applicable :</span>
                <span className="font-mono font-bold text-foreground">
                  {vatRate} %
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Montant TVA :</span>
                <span className="font-mono font-bold text-foreground">
                  {formatUSD(vatAmount)}
                </span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase text-foreground">
                    Total TTC
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Devise officielle : USD
                  </p>
                </div>
                <span className="font-mono text-2xl font-black text-primary">
                  {formatUSD(grandTotal)}
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
                {isSubmitting
                  ? "Génération en cours..."
                  : "Valider et Générer le Devis"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
