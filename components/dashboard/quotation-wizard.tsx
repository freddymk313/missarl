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
  Pencil,
  ImagePlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { ClientRecord } from "@/lib/db/clients";
import { ItemRecord } from "@/lib/db/items";
import { createQuotationAction, updateQuotationAction } from "@/actions/quotations";
import { formatUSD } from "@/lib/formatters";
import { QuotationPdfActions } from "@/components/dashboard/quotation-pdf-actions";
import type { QuotationRecord, QuotationLineItem } from "@/lib/db/quotations";

interface QuotationWizardProps {
  clients: ClientRecord[];
  items: ItemRecord[];
  preselectedClientId?: string;
  // Edit mode
  mode?: "create" | "edit";
  initialQuotation?: QuotationRecord;
  initialLines?: QuotationLineItem[];
}

interface LineItemDraft {
  _key: string;
  itemId?: string;
  brand: string;
  brandImageUrl: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number; // Client quoted price ($)
  supplyPrice: number; // Purchase / supplier cost ($)
  discountPercent: number;
  commissionPercent: number | null; // null = use global commission
  // Snapshot fields preserved during edit
  _supplierPriceSnapshot?: number | null;
  _supplierCurrencySnapshot?: string | null;
  _supplierVatIncludedSnapshot?: boolean | null;
  _supplierVatRateSnapshot?: number | null;
  _exchangeRateSnapshot?: number | null;
  _baseCostUsdSnapshot?: number | null;
  _supplierOfferId?: string | null;
}

const MAX_CLIENT_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
let draftKeyCounter = 0;

function createDraftKey(): string {
  draftKeyCounter += 1;
  return `draft-${Date.now()}-${draftKeyCounter}`;
}

function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
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
            title="Deselect item"
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
            placeholder="Search name, code, MPN..."
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
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full max-w-[calc(100vw-3rem)] sm:min-w-[320px] overflow-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl backdrop-blur-md">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <Package className="size-6 mx-auto mb-1 text-muted-foreground/40" />
              No matching items
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
                          Buy: $ {buyPrice.toFixed(2)}
                        </span>
                      )}
                      {sellPrice != null ? (
                        <span className="font-bold text-primary">
                          Sell: $ {sellPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">
                          (No price)
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
  mode = "create",
  initialQuotation,
  initialLines,
}: QuotationWizardProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!initialQuotation;

  // Selected Client
  const [clientId, setClientId] = useState(
    isEdit
      ? (initialQuotation?.clientId ?? preselectedClientId ?? clients[0]?.id ?? "")
      : preselectedClientId || clients[0]?.id || "",
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) || clients[0],
    [clients, clientId],
  );

  const clientTag = useMemo(
    () => getClientTag(selectedClient),
    [selectedClient],
  );

  // Reference Number REF N° — locked in edit mode, editable in create mode
  const [internalRef, setInternalRef] = useState<string>(() => {
    if (isEdit && initialQuotation) {
      return initialQuotation.internalReference;
    }
    const tag = getClientTag(
      clients.find((c) => c.id === (preselectedClientId || clients[0]?.id)),
    );
    return formatRefNumber(getInitialSequence(tag));
  });

  // Client RFQ Number — in edit mode, extract just the numeric part
  const [rfqNumber, setRfqNumber] = useState<string>(() => {
    if (isEdit && initialQuotation?.clientRfqNumber) {
      const full = initialQuotation.clientRfqNumber;
      // Strip prefix RFQ-TAG- and suffix OQ to get the raw number
      const stripped = full
        .replace(/^RFQ-[A-Z0-9]+-/i, "")
        .replace(/\s*OQ$/i, "");
      return stripped;
    }
    return "";
  });

  // Full RFQ format computed: RFQ-[TAG]-[NUM] OQ
  const fullRfq = useMemo(() => {
    const trimmed = rfqNumber.trim();
    if (!trimmed) return "";
    if (trimmed.toUpperCase().startsWith("RFQ-")) return trimmed;
    return `RFQ-${clientTag}-${trimmed} OQ`;
  }, [rfqNumber, clientTag]);

  // Handle client selection change: update REF N° and RFQ tag (create mode only)
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    if (!isEdit) {
      const newClient = clients.find((c) => c.id === newClientId);
      const newTag = getClientTag(newClient);
      const seq = getInitialSequence(newTag);
      setInternalRef(formatRefNumber(seq));
    }
  };

  const [docType, setDocType] = useState<"QUOTATION" | "PROFORMA">(
    isEdit && initialQuotation ? initialQuotation.docType : "QUOTATION",
  );
  const [validityDays, setValidityDays] = useState(
    isEdit && initialQuotation
      ? (() => {
          // Compute validityDays from validityDate
          const now = new Date();
          const exp = new Date(initialQuotation.validityDate);
          const diff = Math.round((exp.getTime() - now.getTime()) / 86400000);
          return Math.max(1, diff);
        })()
      : 30,
  );
  const [vatRate, setVatRate] = useState(
    isEdit && initialQuotation ? (initialQuotation.vatRate ?? 16) : 16,
  );
  const [globalCommission, setGlobalCommission] = useState(
    isEdit && initialQuotation
      ? (initialQuotation.defaultCommissionPercent ?? 75)
      : 75,
  );
  const [paymentTerms, setPaymentTerms] = useState(
    isEdit && initialQuotation
      ? (initialQuotation.paymentTerms ?? "30 jours fin de mois")
      : "30 jours fin de mois",
  );
  const [deliveryLeadTime, setDeliveryLeadTime] = useState(
    isEdit && initialQuotation
      ? (initialQuotation.deliveryLeadTime ?? "EX-STOCK")
      : "EX-STOCK",
  );
  const [notes, setNotes] = useState(
    isEdit && initialQuotation ? (initialQuotation.notes ?? "") : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedQuotation, setSavedQuotation] = useState<{
    id: string;
    reference: string;
    isEdit: boolean;
  } | null>(null);

  // Build initial line items from initialLines (edit mode) or a blank row (create mode)
  const [lines, setLines] = useState<LineItemDraft[]>(() => {
    if (isEdit && initialLines && initialLines.length > 0) {
      return initialLines.map((il, idx) => ({
        _key: `init-${idx}-${il.id ?? il.lineNumber}`,
        itemId: il.itemId ?? undefined,
        brand: il.brand ?? "",
        brandImageUrl: il.brandImageUrl ?? null,
        description: il.description,
        unit: il.unit,
        quantity: il.quantity,
        unitPrice: il.unitPrice,
        // Use snapshot supply price if available
        supplyPrice: il.baseCostUsdSnapshot ?? il.supplierPriceSnapshot ?? 0,
        discountPercent: il.discountPercent ?? 0,
        commissionPercent: il.commissionPercentSnapshot ?? null,
        // Carry snapshot fields for preservation
        _supplierPriceSnapshot: il.supplierPriceSnapshot ?? null,
        _supplierCurrencySnapshot: il.supplierCurrencySnapshot ?? null,
        _supplierVatIncludedSnapshot: il.supplierVatIncludedSnapshot ?? null,
        _supplierVatRateSnapshot: il.supplierVatRateSnapshot ?? null,
        _exchangeRateSnapshot: il.exchangeRateSnapshot ?? null,
        _baseCostUsdSnapshot: il.baseCostUsdSnapshot ?? null,
        _supplierOfferId: il.supplierOfferId ?? null,
      }));
    }
    return [
      {
        _key: "init-0",
        brand: "",
        brandImageUrl: null,
        description: "",
        unit: "Pce",
        quantity: 1,
        unitPrice: 0,
        supplyPrice: 0,
        discountPercent: 0,
        commissionPercent: null,
      },
    ];
  });

  // Transient UI state for per-line brand/product image uploads (keyed by line._key)
  const [lineUploads, setLineUploads] = useState<
    Record<string, { uploading: boolean; error: string | null }>
  >({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isAnyLineUploading = useMemo(
    () => Object.values(lineUploads).some((u) => u.uploading),
    [lineUploads],
  );

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        _key: createDraftKey(),
        brand: "",
        brandImageUrl: null,
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
    const removedKey = lines[index]?._key;
    setLines((prev) => prev.filter((_, i) => i !== index));
    if (removedKey) {
      setLineUploads((prev) => {
        if (!(removedKey in prev)) return prev;
        const next = { ...prev };
        delete next[removedKey];
        return next;
      });
    }
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
          brand: item.brandName?.trim() || "",
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

  const handleLineImageUpload = async (lineKey: string, file: File | null) => {
    if (!file) return;

    if (!isAllowedImageFile(file)) {
      setLineUploads((prev) => ({
        ...prev,
        [lineKey]: {
          uploading: false,
          error: "Format d'image non accepté (JPEG ou PNG uniquement).",
        },
      }));
      return;
    }

    if (file.size === 0) {
      setLineUploads((prev) => ({
        ...prev,
        [lineKey]: { uploading: false, error: "Aucun fichier sélectionné." },
      }));
      return;
    }

    if (file.size > MAX_CLIENT_IMAGE_BYTES) {
      setLineUploads((prev) => ({
        ...prev,
        [lineKey]: {
          uploading: false,
          error: "Image trop volumineuse (4 MB maximum).",
        },
      }));
      return;
    }

    setLineUploads((prev) => ({
      ...prev,
      [lineKey]: { uploading: true, error: null },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (isEdit && initialQuotation?.id) {
        formData.append("quotationId", initialQuotation.id);
      }

      const res = await fetch("/api/quotations/line-image", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!res.ok || !payload.url) {
        setLineUploads((prev) => ({
          ...prev,
          [lineKey]: {
            uploading: false,
            error: payload.error || "Échec du téléversement de l'image.",
          },
        }));
        return;
      }

      const uploadedUrl = payload.url;
      setLines((prev) =>
        prev.map((l) =>
          l._key === lineKey ? { ...l, brandImageUrl: uploadedUrl } : l,
        ),
      );
      setLineUploads((prev) => ({
        ...prev,
        [lineKey]: { uploading: false, error: null },
      }));
    } catch {
      setLineUploads((prev) => ({
        ...prev,
        [lineKey]: {
          uploading: false,
          error: "Échec du téléversement de l'image.",
        },
      }));
    }
  };

  const handleRemoveLineImage = (lineKey: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l._key === lineKey ? { ...l, brandImageUrl: null } : l,
      ),
    );
    setLineUploads((prev) => ({
      ...prev,
      [lineKey]: { uploading: false, error: null },
    }));
  };

  const scrollToTop = () => {
    const main = document.getElementById("dashboard-main-content");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setError("Please select a client.");
      return;
    }

    if (!isEdit && !internalRef.trim()) {
      setError("The quote reference number (REF N°) is required.");
      return;
    }

    if (isAnyLineUploading) {
      setError("Veuillez attendre la fin du téléversement des images.");
      return;
    }

    const validLines = lines.filter((l) => l.description.trim() !== "");
    if (validLines.length === 0) {
      setError("Please add at least one item with a description.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && initialQuotation) {
        // ── EDIT MODE ──────────────────────────────────────────────────────
        const res = await updateQuotationAction({
          quotationId: initialQuotation.id,
          docType,
          clientRfqNumber: fullRfq || undefined,
          validityDays,
          vatRate,
          paymentTerms,
          deliveryLeadTime,
          notes,
          defaultCommissionPercent: globalCommission,
          expectedUpdatedAt: initialQuotation.updatedAt,
          items: validLines.map((line) => ({
            itemId: line.itemId,
            brand: line.brand.trim(),
            brandImageUrl: line.brandImageUrl,
            supplierOfferId: line._supplierOfferId ?? null,
            description: line.description,
            unit: line.unit,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            // Preserve original snapshots — do NOT replace from current catalogue
            supplierPriceSnapshot: line._supplierPriceSnapshot ?? (line.supplyPrice || null),
            supplierCurrencySnapshot: line._supplierCurrencySnapshot ?? null,
            supplierVatIncludedSnapshot: line._supplierVatIncludedSnapshot ?? null,
            supplierVatRateSnapshot: line._supplierVatRateSnapshot ?? null,
            exchangeRateSnapshot: line._exchangeRateSnapshot ?? null,
            baseCostUsdSnapshot: line._baseCostUsdSnapshot ?? (line.supplyPrice || null),
            commissionPercent: line.commissionPercent ?? globalCommission,
            commissionAmount:
              line.unitPrice - line.supplyPrice > 0
                ? line.unitPrice - line.supplyPrice
                : 0,
          })),
        });

        if (!res.success) {
          setError(res.error || "Update failed.");
          setIsSubmitting(false);
          scrollToTop();
        } else if (res.quotation) {
          setSavedQuotation({
            id: res.quotation.id,
            reference: res.quotation.internalReference,
            isEdit: true,
          });
          setIsSubmitting(false);
          scrollToTop();
        } else {
          router.push("/dashboard/quotes");
          router.refresh();
        }
      } else {
        // ── CREATE MODE ────────────────────────────────────────────────────
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
          defaultCommissionPercent: globalCommission,
          items: validLines.map((line) => ({
            itemId: line.itemId,
            brand: line.brand.trim(),
            brandImageUrl: line.brandImageUrl,
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
          setError(res.error || "Creation failed.");
          setIsSubmitting(false);
          scrollToTop();
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
            isEdit: false,
          });
          setIsSubmitting(false);
          scrollToTop();
        } else {
          router.push("/dashboard/quotes");
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setIsSubmitting(false);
      scrollToTop();
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
              {savedQuotation.isEdit ? "Quote updated successfully!" : "Quote saved!"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Reference:{" "}
              <span className="font-mono font-bold text-foreground">
                {savedQuotation.reference}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-black text-primary mb-3">
            Generate PDF Document
          </p>
          <QuotationPdfActions
            quotationId={savedQuotation.id}
            quotationRef={savedQuotation.reference}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            router.push("/dashboard/quotes");
            router.refresh();
          }}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Back to Quotes List
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
          <ArrowLeft className="size-3.5" /> Back to Quotes List
        </Link>
        {isEdit && initialQuotation && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Editing Reference:</span>
            <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
              {initialQuotation.internalReference}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-xs font-bold text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Main Grid: Left parameters & lines, Right sticky financial recap */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (8 cols): Parameters & Lines */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Parameters */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-primary flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              Commercial Parameters &amp; Client
            </h3>

            {/* Client, REF N°, RFQ, Doc Type */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Client */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Recipient Client {isEdit ? "(Fixed)" : "*"}
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  disabled={isEdit}
                  required
                  className={`h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 ${
                    isEdit ? "opacity-75 cursor-not-allowed bg-secondary/50" : "cursor-pointer"
                  }`}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. REF N° */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    REF N° (Quote) {isEdit ? "(Locked)" : "*"}
                  </label>
                  {!isEdit && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      +1 auto
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  readOnly={isEdit}
                  disabled={isEdit}
                  value={internalRef}
                  onChange={(e) => setInternalRef(e.target.value)}
                  placeholder="0088/026/MIS"
                  className={`h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-black text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 ${
                    isEdit ? "opacity-75 cursor-not-allowed bg-secondary/50" : ""
                  }`}
                />
              </div>

              {/* 3. RFQ Client */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Client RFQ
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

              {/* 4. Document Type */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) =>
                    setDocType(e.target.value as "QUOTATION" | "PROFORMA")
                  }
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 cursor-pointer"
                >
                  <option value="QUOTATION">Standard Quote</option>
                  <option value="PROFORMA">Proforma Invoice</option>
                </select>
              </div>
            </div>

            {/* Row 2: Terms & Lead times */}
            <div className="grid gap-4 sm:grid-cols-4">
              {/* 1. Validity */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Validity (days)
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

              {/* 2. VAT Rate */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  VAT Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              {/* 3. Global Commission */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Global Commission (%)
                  </label>
                  <span className="text-[10px] text-primary font-bold">
                    default per line
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
            </div>

            <div>
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Delivery Lead Time
                </label>
                <input
                  type="text"
                  value={deliveryLeadTime}
                  onChange={(e) => setDeliveryLeadTime(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Line Items */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-black text-primary flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                Item Specifications &amp; Pricing ({lines.length})
              </h3>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-secondary/80 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                <Plus className="size-3.5" /> Add Line
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

                const uploadState = lineUploads[line._key];
                const isUploading = uploadState?.uploading ?? false;
                const uploadError = uploadState?.error ?? null;

                return (
                  <div
                    key={line._key}
                    className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span className="text-primary font-black">
                        Line #{index + 1}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      {/* Searchable catalog item combobox */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-foreground">
                          Pre-registered catalog (quick search)
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
                          Full description for the quote *
                        </label>
                        <input
                          type="text"
                          required
                          value={line.description}
                          onChange={(e) =>
                            updateLine(index, "description", e.target.value)
                          }
                          placeholder="Detailed description of the supply or part..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>
                    </div>

                    {/* Brand & Optional Visual Section (Column 2: BRAND in PDF) */}
                    <div className="grid gap-3 sm:grid-cols-12 rounded-xl border border-border/80 bg-card/60 p-3">
                      <div className="sm:col-span-5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[11px] font-bold text-foreground">
                            Brand Name{" "}
                            <span className="text-[10px] font-normal text-muted-foreground">
                              (optional)
                            </span>
                          </label>
                          {line.brand && (
                            <button
                              type="button"
                              onClick={() => updateLine(index, "brand", "")}
                              className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          maxLength={100}
                          value={line.brand}
                          onChange={(e) =>
                            updateLine(index, "brand", e.target.value)
                          }
                          placeholder="Enter brand name (optional)"
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-foreground">
                          Brand / Product Image{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            (JPEG/PNG, max 4 MB — optional)
                          </span>
                        </label>

                        <input
                          ref={(el) => {
                            fileInputRefs.current[line._key] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void handleLineImageUpload(line._key, selectedFile);
                          }}
                        />

                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                          {line.brandImageUrl ? (
                            <>
                              <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={line.brandImageUrl}
                                  alt={line.brand || `Line ${index + 1} brand`}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() =>
                                    fileInputRefs.current[line._key]?.click()
                                  }
                                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-card text-[11px] font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isUploading ? (
                                    <Loader2 className="size-3.5 animate-spin text-primary" />
                                  ) : (
                                    <RefreshCw className="size-3.5 text-primary" />
                                  )}
                                  {isUploading ? "Uploading..." : "Replace Image"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => handleRemoveLineImage(line._key)}
                                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-[11px] font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="size-3.5" />
                                  Remove Image
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() =>
                                fileInputRefs.current[line._key]?.click()
                              }
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isUploading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <ImagePlus className="size-3.5" />
                              )}
                              {isUploading ? "Uploading image..." : "Upload Image"}
                            </button>
                          )}
                        </div>

                        {uploadError && (
                          <p className="mt-1.5 text-[11px] font-semibold text-destructive">
                            {uploadError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row: Unit | Qty | Purchase Cost | Commission % | Sale Price | Total */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-foreground">
                          Unit *
                        </label>
                        <input
                          type="text"
                          required
                          value={line.unit}
                          onChange={(e) =>
                            updateLine(index, "unit", e.target.value)
                          }
                          placeholder="Pce, Metre, Lot..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-foreground">
                          Quantity *
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

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[11px] font-bold text-muted-foreground">
                          Purchase Cost ($){" "}
                          <span className="text-[9px] font-normal">
                            (Supplier)
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.supplyPrice}
                          onChange={(e) => {
                            const newBuy = parseFloat(e.target.value) || 0;
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
                                      unitPrice:
                                        newBuy > 0 ? newSell : l.unitPrice,
                                    },
                              ),
                            );
                          }}
                          placeholder="0.00"
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>

                      {/* Second row of 3 */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-foreground">
                            Commission (%)
                          </label>
                          {isLineOverride ? (
                            <button
                              type="button"
                              onClick={() => {
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
                                          unitPrice:
                                            buy > 0 ? newSell : l.unitPrice,
                                        },
                                  ),
                                );
                              }}
                              className="text-[9px] text-primary underline cursor-pointer hover:text-primary/70"
                              title="Reset to global commission"
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
                            const val =
                              raw === "" ? null : parseFloat(raw) || 0;
                            const buy = line.supplyPrice;
                            const comm = val !== null ? val : globalCommission;
                            const newSell =
                              buy > 0 ? buy * (1 + comm / 100) : line.unitPrice;
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i !== index
                                  ? l
                                  : {
                                      ...l,
                                      commissionPercent: val,
                                      unitPrice:
                                        buy > 0 ? newSell : l.unitPrice,
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
                          Sale Price excl. tax ($) *{" "}
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

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[11px] font-bold text-foreground">
                          Line Total excl. tax
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
              Financial Summary
            </h3>

            {/* Purchase cost & Commission preview */}
            <div className="rounded-xl bg-secondary/40 border border-border p-3.5 space-y-2">
              {/* Global commission indicator */}
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border/60">
                <span className="font-bold text-foreground">
                  Global commission:
                </span>
                <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {globalCommission}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">
                  Total purchase cost:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatUSD(totalPurchaseCost)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">
                  Margin / Commission:
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
                Total without commission (purchase cost):{" "}
                <span className="font-bold text-foreground">
                  {formatUSD(totalPurchaseCost)}
                </span>
              </p>
            </div>

            {/* Client-facing totals */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Gross Subtotal excl. tax (Client):</span>
                <span className="font-mono font-bold text-foreground">
                  {formatUSD(subtotalSelling)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Applicable VAT rate:</span>
                <span className="font-mono font-bold text-foreground">
                  {vatRate} %
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT Amount:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatUSD(vatAmount)}
                </span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase text-foreground">
                    Total incl. tax
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Official currency: USD
                  </p>
                </div>
                <span className="font-mono text-2xl font-black text-primary">
                  {formatUSD(grandTotal)}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-destructive bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
                {error}
              </p>
            )}

            <div className="pt-3 border-t border-border">
              {isAnyLineUploading && (
                <p className="mb-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Image upload in progress... Please wait before saving.
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting || isAnyLineUploading}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-success text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="size-4" />
                {isAnyLineUploading
                  ? "Uploading image..."
                  : isSubmitting
                  ? isEdit
                    ? "Saving changes..."
                    : "Generating..."
                  : isEdit
                  ? "Save Changes"
                  : "Validate & Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Quick Summary & Submit */}
      <div className="lg:hidden sticky bottom-0 -mx-3 -mb-3 sm:-mx-5 sm:-mb-5 p-3.5 bg-card/95 backdrop-blur-md border-t border-border z-20 flex items-center justify-between gap-3 shadow-lg pb-safe">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold block leading-none">
            Total incl. tax
          </span>
          <span className="font-mono text-base font-black text-primary leading-tight">
            {formatUSD(grandTotal)}
          </span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || isAnyLineUploading}
          className="h-10 px-5 rounded-xl bg-success text-white text-xs font-bold hover:bg-success/90 transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="size-4" />
          {isAnyLineUploading
            ? "Uploading..."
            : isSubmitting
            ? isEdit
              ? "Saving..."
              : "Generating..."
            : isEdit
            ? "Save Changes"
            : "Validate & Generate"}
        </button>
      </div>
    </form>
  );
}
