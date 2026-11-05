"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  X,
  Eye,
  AlertCircle,
  Truck,
  Loader2,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Building2,
  Hash,
  Barcode,
} from "lucide-react";
import {
  ItemRecord,
  MatchBadge,
  CategoryRecord,
  BrandRecord,
  UnitRecord,
  ItemStats,
} from "@/lib/db/items";
import { SupplierRecord } from "@/lib/db/suppliers";
import { ClientRecord } from "@/lib/db/clients";
import { CurrencyRecord, ExchangeRateRecord } from "@/lib/db/items";
import { UserRole } from "@/lib/permissions";
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  addSupplierOfferAction,
  searchItemsAction,
  getItemAction,
} from "@/actions/items";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArticlesManagerProps {
  initialItems: ItemRecord[];
  stats: ItemStats;
  categories: CategoryRecord[];
  brands: BrandRecord[];
  units: UnitRecord[];
  suppliers: SupplierRecord[];
  clients: ClientRecord[];
  currencies: CurrencyRecord[];
  exchangeRates: ExchangeRateRecord[];
  role: UserRole;
}

// ─── Badge helper ────────────────────────────────────────────────────────────

function MatchBadgeChip({ badge }: { badge: MatchBadge }) {
  if (badge.type === "CLIENT_CODE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
        <Building2 className="size-3" />
        {badge.clientName}
      </span>
    );
  }
  if (badge.type === "MPN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
        <Hash className="size-3" />
        Mfr Part No.
      </span>
    );
  }
  if (badge.type === "SUPPLIER_CODE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
        <Truck className="size-3" />
        {badge.supplierName}
      </span>
    );
  }
  if (badge.type === "SKU") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
        <Barcode className="size-3" />
        SKU
      </span>
    );
  }
  return null;
}

// ─── Price formatting ─────────────────────────────────────────────────────────

function formatMoney(amount: number, currencyCode: string, symbol: string) {
  const formatted = amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currencyCode === "USD") return `$ ${formatted}`;
  if (currencyCode === "ZAR") return `R ${formatted}`;
  return `${symbol} ${formatted}`;
}

// ─── SpecsEditor ─────────────────────────────────────────────────────────────

function SpecsEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const entries = Object.entries(value);
  const add = () => onChange({ ...value, "": "" });
  const remove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };
  const updateKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  };
  const updateVal = (key: string, val: string) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            placeholder="Key (e.g. Power)"
            value={k}
            onChange={(e) => updateKey(k, e.target.value)}
            className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            placeholder="Value (e.g. 132 kW)"
            value={v}
            onChange={(e) => updateVal(k, e.target.value)}
            className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => remove(k)}
            className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-primary hover:underline font-semibold"
      >
        + Add specification
      </button>
    </div>
  );
}

// ─── ClientCodesEditor ───────────────────────────────────────────────────────

interface ClientCodeRow {
  clientId: string;
  value: string;
}

function ClientCodesEditor({
  value,
  onChange,
  clients,
}: {
  value: ClientCodeRow[];
  onChange: (v: ClientCodeRow[]) => void;
  clients: ClientRecord[];
}) {
  const add = () =>
    onChange([...value, { clientId: clients[0]?.id ?? "", value: "" }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const update = (i: number, field: keyof ClientCodeRow, val: string) =>
    onChange(value.map((row, j) => (j === i ? { ...row, [field]: val } : row)));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select
            value={row.clientId}
            onChange={(e) => update(i, "clientId", e.target.value)}
            className="h-8 w-40 rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
          <input
            placeholder="Client code (e.g. KI78967)"
            value={row.value}
            onChange={(e) => update(i, "value", e.target.value)}
            className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {clients.length > 0 && (
        <button
          type="button"
          onClick={add}
          className="text-xs text-primary hover:underline font-semibold"
        >
          + Add client code
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ArticlesManager({
  initialItems,
  stats,
  categories,
  brands,
  units,
  suppliers,
  clients,
  currencies,
  role,
}: ArticlesManagerProps) {
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN";

  // State
  const [items, setItems] = useState<ItemRecord[]>(initialItems);
  const [currentStats, setCurrentStats] = useState<ItemStats>(stats);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");

  const [isSearching, startSearch] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ItemRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Detail sheet
  const [detailItem, setDetailItem] = useState<ItemRecord | null>(null);

  // Add offer modal
  const [offerModalItem, setOfferModalItem] = useState<ItemRecord | null>(null);
  const [offerError, setOfferError] = useState("");

  // Form state
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [mpn, setMpn] = useState("");
  const [unitCode, setUnitCode] = useState("EA");
  const [supplyPrice, setSupplyPrice] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [clientCodes, setClientCodes] = useState<ClientCodeRow[]>([]);
  // Offer fields in create form
  const [offerSupplierId, setOfferSupplierId] = useState(
    suppliers[0]?.id ?? "",
  );
  const [offerSupplierCode, setOfferSupplierCode] = useState("");
  const [offerCurrency] = useState("USD");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerLeadTime, setOfferLeadTime] = useState("");
  const [offerMinQty, setOfferMinQty] = useState("");
  const [offerDate, setOfferDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [offerValidUntil, setOfferValidUntil] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [includeOffer, setIncludeOffer] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openDetail = async (item: ItemRecord) => {
    setDetailItem(item);
    try {
      const res = await getItemAction(item.id);
      if (res.success && res.item) {
        setDetailItem(res.item);
      }
    } catch {
      // Keep existing detailItem on network error
    }
  };

  const resetForm = () => {
    setDesignation("");
    setDescription("");
    setCategoryId("");
    setBrandName("");
    setMpn("");
    setUnitCode("EA");
    setSupplyPrice("");
    setQuotedPrice("");
    setSpecs({});
    setClientCodes([]);
    setOfferSupplierId(suppliers[0]?.id ?? "");
    setOfferSupplierCode("");
    setOfferPrice("");
    setOfferLeadTime("");
    setOfferMinQty("");
    setOfferDate(new Date().toISOString().split("T")[0]);
    setOfferValidUntil("");
    setOfferNotes("");
    setIncludeOffer(false);
    setFormError("");
  };

  const openCreate = () => {
    setEditingItem(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = async (item: ItemRecord) => {
    setEditingItem(item);
    setDesignation(item.designation ?? "");
    setDescription(item.description);
    setCategoryId(item.categoryId ?? "");
    setBrandName(item.brandName ?? "");
    setMpn(item.manufacturerPartNumber ?? "");
    setUnitCode(item.unitCode ?? "EA");
    const initialSupply =
      item.supplyPrice != null
        ? item.supplyPrice.toString()
        : item.cheapestOfferUsd != null
        ? item.cheapestOfferUsd.toString()
        : "";
    setSupplyPrice(initialSupply);
    setQuotedPrice(item.quotedPrice != null ? item.quotedPrice.toString() : "");
    setSpecs(item.specs ?? {});
    setClientCodes([]);
    setIncludeOffer(false);
    setFormError("");
    setModalOpen(true);

    try {
      const res = await getItemAction(item.id);
      if (res.success && res.item) {
        const full = res.item;
        setEditingItem(full);
        if (full.supplyPrice != null) {
          setSupplyPrice(full.supplyPrice.toString());
        } else if (full.cheapestOfferUsd != null && !initialSupply) {
          setSupplyPrice(full.cheapestOfferUsd.toString());
        }
        if (full.quotedPrice != null) {
          setQuotedPrice(full.quotedPrice.toString());
        }
        if (full.specs && Object.keys(full.specs).length > 0) {
          setSpecs(full.specs);
        }
      }
    } catch {
      // Keep initial populated values
    }
  };

  const handleSearch = () => {
    startSearch(async () => {
      const res = await searchItemsAction(searchQuery, {
        categoryId: filterCategory || undefined,
        supplierId: filterSupplier || undefined,
      });
      if (res.success) setItems(res.items);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    startSubmit(async () => {
      if (editingItem) {
        const res = await updateItemAction(editingItem.id, {
          designation,
          description,
          categoryId: categoryId || null,
          brandName: brandName || null,
          manufacturerPartNumber: mpn || null,
          unitCode: unitCode || null,
          supplyPrice: supplyPrice ? parseFloat(supplyPrice) : null,
          quotedPrice: quotedPrice ? parseFloat(quotedPrice) : null,
          specs,
        });
        if (!res.success) {
          setFormError(res.error || "Update failed.");
        } else if (res.item) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? res.item! : i)),
          );
          if (detailItem?.id === editingItem.id) setDetailItem(res.item!);
          setModalOpen(false);
        }
      } else {
        const res = await createItemAction({
          designation,
          description,
          categoryId: categoryId || undefined,
          brandName: brandName || undefined,
          manufacturerPartNumber: mpn || undefined,
          unitCode,
          supplyPrice: supplyPrice
            ? parseFloat(supplyPrice)
            : offerPrice
            ? parseFloat(offerPrice)
            : undefined,
          quotedPrice: quotedPrice ? parseFloat(quotedPrice) : undefined,
          specs,
          clientCodes,
          offer:
            includeOffer && offerSupplierId && offerPrice
              ? {
                  supplierId: offerSupplierId,
                  supplierItemCode: offerSupplierCode || undefined,
                  currencyCode: "USD",
                  currency: "USD",
                  unitPrice: parseFloat(offerPrice),
                  leadTimeDays: offerLeadTime
                    ? parseInt(offerLeadTime)
                    : undefined,
                  minOrderQty: offerMinQty
                    ? parseFloat(offerMinQty)
                    : undefined,
                  quotedOn: offerDate || undefined,
                  validUntil: offerValidUntil || undefined,
                  notes: offerNotes || undefined,
                }
              : undefined,
        });
        if (!res.success) {
          setFormError(res.error || "Creation failed.");
        } else if (res.item) {
          setItems((prev) => [res.item!, ...prev]);
          setCurrentStats((prev) => ({
            ...prev,
            totalItems: prev.totalItems + 1,
            itemsWithoutOffer:
              res.item!.currentOffers && res.item!.currentOffers.length > 0
                ? prev.itemsWithoutOffer
                : prev.itemsWithoutOffer + 1,
          }));
          setModalOpen(false);
          resetForm();
        }
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleteError("");
    startSubmit(async () => {
      const res = await deleteItemAction(deleteTarget.id);
      if (!res.success) {
        setDeleteError(res.error || "Delete failed.");
      } else {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        setCurrentStats((prev) => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
        }));
        setDeleteTarget(null);
      }
    });
  };

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerModalItem) return;
    setOfferError("");
    startSubmit(async () => {
      const res = await addSupplierOfferAction(offerModalItem.id, {
        supplierId: offerSupplierId,
        supplierItemCode: offerSupplierCode || undefined,
        currencyCode: "USD",
        currency: "USD",
        unitPrice: parseFloat(offerPrice),
        leadTimeDays: offerLeadTime ? parseInt(offerLeadTime) : undefined,
        minOrderQty: offerMinQty ? parseFloat(offerMinQty) : undefined,
        quotedOn: offerDate || undefined,
        validUntil: offerValidUntil || undefined,
        notes: offerNotes || undefined,
      });
      if (!res.success) {
        setOfferError(res.error || "Failed to add offer.");
      } else {
        if (res.item) {
          setItems((prev) =>
            prev.map((i) => (i.id === res.item!.id ? res.item! : i))
          );
          if (detailItem?.id === res.item.id) {
            setDetailItem(res.item);
          }
        }
        setOfferModalItem(null);
        resetForm();
      }
    });
  };

  const getCurrencySymbol = (code: string) => {
    const c = currencies.find((cu) => cu.code === code);
    return c?.symbol ?? code;
  };

  // ── KPI Bar ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: currentStats.totalItems },
          { label: "Categories Used", value: currentStats.categoriesUsed },
          {
            label: "Suppliers Referenced",
            value: currentStats.suppliersReferenced,
          },
          {
            label: "Items Without Offer",
            value: currentStats.itemsWithoutOffer,
            warn: currentStats.itemsWithoutOffer > 0,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              {kpi.label}
            </p>
            <p
              className={`text-xl font-black mt-1 ${
                kpi.warn ? "text-warning" : "text-primary"
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Role notice */}
      {!canManage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-secondary/80 p-3.5 text-xs text-foreground border border-border">
          <AlertCircle className="size-4 text-accent shrink-0" />
          <span>
            Read-only mode: you can browse the catalogue but cannot create or
            modify items.
          </span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by client code, manufacturer P/N, supplier code, description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 w-full sm:w-auto rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFr}
              </option>
            ))}
          </select>

          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="h-9 w-full sm:w-auto rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="h-9 px-4 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer disabled:opacity-55 shrink-0 flex items-center justify-center"
          >
            {isSearching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>

        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="size-4" /> New Item
          </button>
        )}
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Brand / MPN</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4 text-right">Supplier Price ($)</th>
                <th className="py-3.5 px-4 text-right">Quoted Price ($)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <Package className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                    No items found. Try a different search.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-foreground line-clamp-1">
                        {item.designation || item.description}
                      </p>
                      {item.matchBadge && item.matchBadge.type !== "FUZZY" && (
                        <div className="mt-0.5">
                          <MatchBadgeChip badge={item.matchBadge} />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.categoryName ? (
                        <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                          {item.categoryName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground">
                        {item.brandName || "—"}
                      </span>
                      {item.manufacturerPartNumber && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.manufacturerPartNumber}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-muted-foreground">
                      {item.unitCode || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {item.supplyPrice != null ? (
                        <div>
                          <span className="font-bold text-foreground">
                            $ {item.supplyPrice.toFixed(2)}
                          </span>
                          {item.cheapestOfferUsd != null && item.cheapestOfferUsd !== item.supplyPrice && (
                            <p className="text-[10px] text-muted-foreground">
                              Offer: $ {item.cheapestOfferUsd.toFixed(2)}
                            </p>
                          )}
                        </div>
                      ) : item.cheapestOfferUsd != null ? (
                        <span className="font-bold text-foreground">
                          $ {item.cheapestOfferUsd.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {item.quotedPrice != null ? (
                        <span className="font-bold text-primary">
                          $ {item.quotedPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          title="View details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                              title="Edit"
                            >
                              <Edit className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(item);
                                setDeleteError("");
                              }}
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL SHEET ── */}
      <DetailSheet
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.skuRef || "Item Detail"}
        statusBadge={
          detailItem ? (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                detailItem.isActive
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {detailItem.isActive ? "Active" : "Inactive"}
            </span>
          ) : undefined
        }
      >
        {detailItem && (
          <div className="space-y-5">
            {/* Designation */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Designation
              </p>
              <h2 className="text-base font-black text-foreground mt-1 leading-snug">
                {detailItem.designation || "—"}
              </h2>
            </div>

            {/* Full description */}
            <div className="rounded-xl bg-secondary/30 border border-border p-3.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Full Technical Description
              </p>
              <p className="text-xs text-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">
                {detailItem.description}
              </p>
            </div>

            {/* Pricing Overview: Supplier Price ($) & Quoted Price ($) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/40 border border-border p-3 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Supplier Price ($)
                  </p>
                  <p className="font-mono font-bold text-foreground text-base mt-1">
                    {detailItem.supplyPrice != null
                      ? `$ ${detailItem.supplyPrice.toFixed(2)}`
                      : detailItem.cheapestOfferUsd != null
                      ? `$ ${detailItem.cheapestOfferUsd.toFixed(2)}`
                      : "—"}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  Coût d&apos;achat fournisseur
                </span>
              </div>
              <div className="rounded-xl bg-gold/10 border border-primary/20 p-3 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Quoted Price ($)
                  </p>
                  <p className="font-mono font-bold text-primary text-base mt-1">
                    {detailItem.quotedPrice != null
                      ? `$ ${detailItem.quotedPrice.toFixed(2)}`
                      : "—"}
                  </p>
                </div>
                <span className="text-[10px] text-primary/70 mt-1">
                  Prix devisé au client
                </span>
              </div>
            </div>

            {/* Attributes */}
            <div className="grid grid-cols-3 gap-2.5">
              <KeyValueTile
                label="Category"
                value={detailItem.categoryName || "—"}
              />
              <KeyValueTile label="Brand" value={detailItem.brandName || "—"} />
              <KeyValueTile label="Unit" value={detailItem.unitCode || "—"} />
            </div>

            {/* MPN */}
            {detailItem.manufacturerPartNumber && (
              <div className="rounded-xl bg-secondary/30 border border-border p-3">
                <p className="text-[10px] font-bold text-muted-foreground">
                  Manufacturer Part Number
                </p>
                <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                  {detailItem.manufacturerPartNumber}
                </p>
              </div>
            )}

            {/* Specs */}
            {detailItem.specs && Object.keys(detailItem.specs).length > 0 && (
              <div className="rounded-xl bg-secondary/30 border border-border p-3 space-y-1.5">
                <p className="text-xs font-bold text-primary">Specifications</p>
                {Object.entries(detailItem.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Identifiers */}
            {detailItem.identifiers && detailItem.identifiers.length > 0 && (
              <div className="rounded-xl bg-secondary/30 border border-border p-3 space-y-2">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5 text-accent" /> Identifiers
                </p>
                {detailItem.identifiers.map((id) => (
                  <div
                    key={id.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <div>
                      {id.kind === "CLIENT_CODE" && id.clientName && (
                        <span className="text-muted-foreground">
                          {id.clientName}:{" "}
                        </span>
                      )}
                      <span className="font-mono font-bold text-foreground">
                        {id.value}
                      </span>
                    </div>
                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                      {id.kind}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Current Offers */}
            {detailItem.currentOffers &&
              detailItem.currentOffers.length > 0 && (
                <div className="rounded-xl bg-secondary/30 border border-border p-3 space-y-2">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Truck className="size-3.5 text-accent" /> Current Supplier
                    Offers
                  </p>
                  {detailItem.currentOffers.map((offer) => {
                    const isCheapest =
                      offer.unitPriceUsd != null &&
                      detailItem.cheapestOfferUsd != null &&
                      offer.unitPriceUsd <= detailItem.cheapestOfferUsd + 0.001;
                    return (
                      <div
                        key={offer.id}
                        className={`rounded-lg border p-2.5 space-y-1 text-xs ${
                          isCheapest
                            ? "border-success/40 bg-success/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>{offer.supplierName}</span>
                          {isCheapest && (
                            <span className="text-[10px] text-success font-bold">
                              Best price
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-primary">
                            {formatMoney(
                              offer.unitPrice,
                              offer.currencyCode,
                              offer.currencySymbol,
                            )}
                          </span>
                          {offer.unitPriceUsd != null ? (
                            <span className="text-muted-foreground">
                              ≈ $ {offer.unitPriceUsd.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-warning text-[10px]">
                              rate manquant
                            </span>
                          )}
                        </div>
                        {offer.supplierItemCode && (
                          <p className="text-muted-foreground font-mono text-[10px]">
                            Supplier code: {offer.supplierItemCode}
                          </p>
                        )}
                        {offer.leadTimeDays && (
                          <p className="text-muted-foreground text-[10px]">
                            Lead time: {offer.leadTimeDays} days
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {/* Actions */}
            {canManage && (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOfferModalItem(detailItem);
                    setOfferSupplierId(suppliers[0]?.id ?? "");
                    setOfferSupplierCode("");
                    setOfferPrice("");
                    setOfferLeadTime("");
                    setOfferMinQty("");
                    setOfferDate(new Date().toISOString().split("T")[0]);
                    setOfferValidUntil("");
                    setOfferNotes("");
                    setOfferError("");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  <Truck className="size-4" /> Add Supplier Offer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openEdit(detailItem);
                    setDetailItem(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                >
                  <Edit className="size-4" /> Edit Item
                </button>
              </div>
            )}
          </div>
        )}
      </DetailSheet>

      {/* ── CREATE / EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl border border-border my-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                {editingItem ? "Edit Item" : "New Item"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              {/* Section: Identification */}
              <fieldset>
                <legend className="text-xs font-black text-primary uppercase tracking-wide mb-3">
                  Identification
                </legend>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Short Designation *{" "}
                      <span className="text-muted-foreground font-normal">
                        (noun first, e.g. MOTOR, ELECTRIC 132KW)
                      </span>
                    </label>
                    <input
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="VALVE, BUTTERFLY PN16 DN100"
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Full Technical Description *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed technical specification…"
                      className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Category *
                      </label>
                      <select
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                      >
                        <option value="">Select…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameFr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Unit *
                      </label>
                      <select
                        required
                        value={unitCode}
                        onChange={(e) => setUnitCode(e.target.value)}
                        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                      >
                        {units.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.code} — {u.labelFr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Brand / Manufacturer
                      </label>
                      <input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        list="brands-catalog-list"
                        placeholder="KSB, Schneider, Weir…"
                        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                      />
                      <datalist id="brands-catalog-list">
                        {brands.map((b) => (
                          <option key={b.id} value={b.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Manufacturer Part Number (MPN)
                      </label>
                      <input
                        value={mpn}
                        onChange={(e) => setMpn(e.target.value)}
                        placeholder="SDW6205050AENORV"
                        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Supply Price ($){" "}
                        <span className="text-muted-foreground font-normal">
                          (Coût fournisseur)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={supplyPrice}
                        onChange={(e) => setSupplyPrice(e.target.value)}
                        placeholder="0.00"
                        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Quoted Price ($){" "}
                        <span className="text-muted-foreground font-normal">
                          (Prix devisé client)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quotedPrice}
                        onChange={(e) => setQuotedPrice(e.target.value)}
                        placeholder="0.00"
                        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Section: Specs */}
              <fieldset>
                <legend className="text-xs font-black text-primary uppercase tracking-wide mb-3">
                  Specifications{" "}
                  <span className="text-muted-foreground font-normal normal-case">
                    (optional key/value)
                  </span>
                </legend>
                <SpecsEditor value={specs} onChange={setSpecs} />
              </fieldset>

              {/* Section: Client Codes (create only) */}
              {!editingItem && (
                <fieldset>
                  <legend className="text-xs font-black text-primary uppercase tracking-wide mb-3">
                    Client Codes{" "}
                    <span className="text-muted-foreground font-normal normal-case">
                      (optional)
                    </span>
                  </legend>
                  <ClientCodesEditor
                    value={clientCodes}
                    onChange={setClientCodes}
                    clients={clients}
                  />
                </fieldset>
              )}

              {/* Section: Supplier Offer (create only) */}
              {!editingItem && suppliers.length > 0 && (
                <fieldset>
                  <legend className="text-xs font-black text-primary uppercase tracking-wide mb-2 flex items-center gap-2">
                    Supplier Offer
                    <button
                      type="button"
                      onClick={() => setIncludeOffer(!includeOffer)}
                      className="text-[10px] font-normal text-primary hover:underline normal-case"
                    >
                      {includeOffer ? (
                        <>
                          <ChevronUp className="inline size-3 mr-0.5" /> Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="inline size-3 mr-0.5" /> Add
                          one
                        </>
                      )}
                    </button>
                  </legend>
                  {includeOffer && (
                    <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Supplier *
                          </label>
                          <select
                            value={offerSupplierId}
                            onChange={(e) => setOfferSupplierId(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                          >
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Supplier Item Code
                          </label>
                          <input
                            value={offerSupplierCode}
                            onChange={(e) =>
                              setOfferSupplierCode(e.target.value)
                            }
                            placeholder="Supplier's own reference"
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Currency
                          </label>
                          <div className="h-8 flex items-center px-2.5 rounded-lg border border-border bg-card text-xs font-mono font-bold text-foreground mt-1">
                            USD ($)
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Supplier Price ($) *
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={offerPrice}
                              onChange={(e) => setOfferPrice(e.target.value)}
                              placeholder="0.00"
                              className="h-8 w-full rounded-lg border border-border bg-card pl-6 pr-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Quoted On
                          </label>
                          <input
                            type="date"
                            value={offerDate}
                            onChange={(e) => setOfferDate(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            value={offerValidUntil}
                            onChange={(e) => setOfferValidUntil(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Lead Time (days)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={offerLeadTime}
                            onChange={(e) => setOfferLeadTime(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-foreground">
                            Min. Order Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={offerMinQty}
                            onChange={(e) => setOfferMinQty(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground">
                          Notes
                        </label>
                        <input
                          value={offerNotes}
                          onChange={(e) => setOfferNotes(e.target.value)}
                          placeholder="e.g. FOB Johannesburg, subject to availability"
                          className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                        />
                      </div>
                    </div>
                  )}
                </fieldset>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  {editingItem ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-destructive">
                Delete Item
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-foreground">
              Delete{" "}
              <span className="font-bold">
                {deleteTarget.designation || deleteTarget.skuRef}
              </span>
              ? This cannot be undone.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Items referenced in quotations, orders or invoices cannot be
              deleted.
            </p>
            {deleteError && (
              <p className="mt-3 text-xs text-destructive font-semibold">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD OFFER MODAL ── */}
      {offerModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                Add Supplier Offer
              </h3>
              <button
                type="button"
                onClick={() => setOfferModalItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Item:{" "}
              <span className="font-bold text-foreground">
                {offerModalItem.designation || offerModalItem.skuRef}
              </span>
            </p>

            {offerError && (
              <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {offerError}
              </div>
            )}

            <form onSubmit={handleAddOffer} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Supplier *
                  </label>
                  <select
                    required
                    value={offerSupplierId}
                    onChange={(e) => setOfferSupplierId(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Supplier Code
                  </label>
                  <input
                    value={offerSupplierCode}
                    onChange={(e) => setOfferSupplierCode(e.target.value)}
                    placeholder="Supplier ref"
                    className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Currency
                  </label>
                  <div className="h-8 flex items-center px-2.5 rounded-lg border border-border bg-card text-xs font-mono font-bold text-foreground mt-1">
                    USD ($)
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Supplier Price ($) *
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-full rounded-lg border border-border bg-card pl-6 pr-2 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Quoted On
                  </label>
                  <input
                    type="date"
                    value={offerDate}
                    onChange={(e) => setOfferDate(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={offerValidUntil}
                    onChange={(e) => setOfferValidUntil(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerLeadTime}
                    onChange={(e) => setOfferLeadTime(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Notes
                </label>
                <input
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  placeholder="Optional note…"
                  className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOfferModalItem(null)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Save Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}