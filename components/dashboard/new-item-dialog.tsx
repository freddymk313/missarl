"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import type {
  BrandRecord,
  CategoryRecord,
  ItemRecord,
  UnitRecord,
} from "@/lib/db/items";
import type { ClientRecord } from "@/lib/db/clients";
import type { SupplierRecord } from "@/lib/db/suppliers";
import { createItemAction } from "@/actions/items";
import { validateOptionalCatalogPrice } from "@/lib/rfq-import-types";
import { ResponsiveModal } from "@/components/dashboard/ui/responsive-modal";
import { USNumberInput } from "@/components/dashboard/ui/us-number-input";

interface ClientCodeRow {
  clientId: string;
  value: string;
}

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
            className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            placeholder="Value (e.g. 132 kW)"
            value={v}
            onChange={(e) => updateVal(k, e.target.value)}
            className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => remove(k)}
            className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-primary hover:underline font-semibold cursor-pointer"
      >
        + Add specification
      </button>
    </div>
  );
}

function ClientCodesEditor({
  value,
  onChange,
  clients,
  defaultClientId,
}: {
  value: ClientCodeRow[];
  onChange: (v: ClientCodeRow[]) => void;
  clients: ClientRecord[];
  defaultClientId?: string;
}) {
  const fallbackClientId =
    (defaultClientId && clients.some((c) => c.id === defaultClientId)
      ? defaultClientId
      : clients[0]?.id) ?? "";

  const add = () =>
    onChange([...value, { clientId: fallbackClientId, value: "" }]);
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
            className="h-9 w-40 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select client…</option>
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
            className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {clients.length > 0 && (
        <button
          type="button"
          onClick={add}
          className="text-xs text-primary hover:underline font-semibold cursor-pointer"
        >
          + Add client code
        </button>
      )}
    </div>
  );
}

export interface NewItemDialogProps {
  open: boolean;
  onClose: () => void;
  categories: CategoryRecord[];
  brands: BrandRecord[];
  units: UnitRecord[];
  suppliers: SupplierRecord[];
  clients: ClientRecord[];
  defaultClientId?: string;
  onCreated: (item: ItemRecord) => void;
}

export function NewItemDialog({
  open,
  onClose,
  categories,
  brands,
  units,
  suppliers,
  clients,
  defaultClientId,
  onCreated,
}: NewItemDialogProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState("");

  // Identification
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [mpn, setMpn] = useState("");
  const [unitCode, setUnitCode] = useState(
    units.some((u) => u.code === "EA") ? "EA" : (units[0]?.code ?? "EA"),
  );

  // Pricing
  const [supplyPrice, setSupplyPrice] = useState<number | null>(null);
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  const [supplyPriceValid, setSupplyPriceValid] = useState(true);
  const [quotedPriceValid, setQuotedPriceValid] = useState(true);

  // Specs & Client Codes
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [clientCodes, setClientCodes] = useState<ClientCodeRow[]>([]);

  // Optional Supplier Offer
  const [includeOffer, setIncludeOffer] = useState(false);
  const [offerSupplierId, setOfferSupplierId] = useState(suppliers[0]?.id ?? "");
  const [offerSupplierCode, setOfferSupplierCode] = useState("");
  const [offerPrice, setOfferPrice] = useState<number | null>(null);
  const [offerLeadTime, setOfferLeadTime] = useState<number | null>(null);
  const [offerMinQty, setOfferMinQty] = useState<number | null>(null);
  const [offerPriceValid, setOfferPriceValid] = useState(true);
  const [offerLeadTimeValid, setOfferLeadTimeValid] = useState(true);
  const [offerMinQtyValid, setOfferMinQtyValid] = useState(true);
  const [offerDate, setOfferDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [offerValidUntil, setOfferValidUntil] = useState("");
  const [offerNotes, setOfferNotes] = useState("");

  const resetForm = () => {
    setDesignation("");
    setDescription("");
    setCategoryId("");
    setBrandName("");
    setMpn("");
    setUnitCode(
      units.some((u) => u.code === "EA") ? "EA" : (units[0]?.code ?? "EA"),
    );
    setSupplyPrice(null);
    setQuotedPrice(null);
    setSupplyPriceValid(true);
    setQuotedPriceValid(true);
    setSpecs({});
    setClientCodes([]);
    setOfferSupplierId(suppliers[0]?.id ?? "");
    setOfferSupplierCode("");
    setOfferPrice(null);
    setOfferLeadTime(null);
    setOfferMinQty(null);
    setOfferPriceValid(true);
    setOfferLeadTimeValid(true);
    setOfferMinQtyValid(true);
    setOfferDate(new Date().toISOString().split("T")[0]);
    setOfferValidUntil("");
    setOfferNotes("");
    setIncludeOffer(false);
    setFormError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    if (!designation.trim()) {
      setFormError("Short designation is required.");
      return;
    }
    if (!description.trim()) {
      setFormError("Full technical description is required.");
      return;
    }
    if (!categoryId) {
      setFormError("Category is required.");
      return;
    }
    if (!unitCode.trim()) {
      setFormError("Unit is required.");
      return;
    }

    if (!supplyPriceValid || !quotedPriceValid) {
      setFormError("Please fix invalid numeric inputs before saving.");
      return;
    }

    const supplyCheck = validateOptionalCatalogPrice(
      supplyPrice,
      "Supply Price ($)",
    );
    if (!supplyCheck.ok) {
      setFormError(supplyCheck.error);
      return;
    }

    const quotedCheck = validateOptionalCatalogPrice(
      quotedPrice,
      "Quoted Price ($)",
    );
    if (!quotedCheck.ok) {
      setFormError(quotedCheck.error);
      return;
    }

    for (let i = 0; i < clientCodes.length; i++) {
      const row = clientCodes[i];
      if (!row.clientId) {
        setFormError(`Client code row ${i + 1}: please select a client.`);
        return;
      }
      if (!row.value.trim()) {
        setFormError(`Client code row ${i + 1}: client code cannot be empty.`);
        return;
      }
    }

    if (includeOffer) {
      if (!offerSupplierId) {
        setFormError("Supplier is required when adding a supplier offer.");
        return;
      }
      if (!offerPriceValid || !offerLeadTimeValid || !offerMinQtyValid) {
        setFormError("Please fix invalid supplier offer numeric inputs.");
        return;
      }
      if (offerPrice === null) {
        setFormError("Supplier Price ($) is required when adding a supplier offer.");
        return;
      }
      const offerPriceCheck = validateOptionalCatalogPrice(
        offerPrice,
        "Supplier Price ($)",
      );
      if (!offerPriceCheck.ok) {
        setFormError(offerPriceCheck.error);
        return;
      }
      if (offerLeadTime !== null && offerLeadTime < 0) {
        setFormError("Lead time cannot be negative.");
        return;
      }
      if (offerMinQty !== null && offerMinQty < 0) {
        setFormError("Minimum order quantity cannot be negative.");
        return;
      }
    }

    const cleanedSpecs: Record<string, string> = {};
    for (const [k, v] of Object.entries(specs)) {
      if (k.trim()) cleanedSpecs[k.trim()] = v;
    }

    const cleanedClientCodes = clientCodes.map((cc) => ({
      clientId: cc.clientId,
      value: cc.value.trim(),
    }));

    const effectiveSupplyPrice =
      supplyCheck.value !== null
        ? supplyCheck.value
        : includeOffer && offerPrice !== null
          ? offerPrice
          : null;

    startSubmit(async () => {
      const res = await createItemAction({
        designation: designation.trim(),
        description: description.trim(),
        categoryId,
        brandName: brandName.trim() || undefined,
        manufacturerPartNumber: mpn.trim() || undefined,
        unitCode,
        supplyPrice: effectiveSupplyPrice,
        quotedPrice: quotedCheck.value,
        specs: cleanedSpecs,
        clientCodes: cleanedClientCodes,
        offer:
          includeOffer && offerSupplierId && offerPrice !== null
            ? {
                supplierId: offerSupplierId,
                supplierItemCode: offerSupplierCode.trim() || undefined,
                currencyCode: "USD",
                currency: "USD",
                unitPrice: offerPrice,
                leadTimeDays: offerLeadTime ?? undefined,
                minOrderQty: offerMinQty ?? undefined,
                quotedOn: offerDate || undefined,
                validUntil: offerValidUntil || undefined,
                notes: offerNotes.trim() || undefined,
              }
            : undefined,
      });

      if (!res.success) {
        setFormError(res.error || "Creation failed.");
      } else if (res.item) {
        const createdItem = res.item;
        resetForm();
        onCreated(createdItem);
      }
    });
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={handleClose}
      title="New Item"
      maxWidthClass="max-w-2xl"
    >
      {formError && (
        <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
                  list="quote-brands-catalog-list"
                  placeholder="KSB, Schneider, Weir…"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
                <datalist id="quote-brands-catalog-list">
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
                    (Supplier cost)
                  </span>
                </label>
                <USNumberInput
                  value={supplyPrice}
                  onValueChange={setSupplyPrice}
                  onValidityChange={(v) => setSupplyPriceValid(v)}
                  decimalScale={4}
                  minDecimalsDisplay={2}
                  min={0}
                  placeholder="0.00"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Quoted Price ($){" "}
                  <span className="text-muted-foreground font-normal">
                    (Client selling price)
                  </span>
                </label>
                <USNumberInput
                  value={quotedPrice}
                  onValueChange={setQuotedPrice}
                  onValidityChange={(v) => setQuotedPriceValid(v)}
                  decimalScale={4}
                  minDecimalsDisplay={2}
                  min={0}
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

        {/* Section: Client Codes */}
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
            defaultClientId={defaultClientId}
          />
        </fieldset>

        {/* Section: Supplier Offer */}
        {suppliers.length > 0 && (
          <fieldset>
            <legend className="text-xs font-black text-primary uppercase tracking-wide mb-2 flex items-center gap-2">
              Supplier Offer
              <button
                type="button"
                onClick={() => setIncludeOffer(!includeOffer)}
                className="text-[10px] font-normal text-primary hover:underline normal-case cursor-pointer"
              >
                {includeOffer ? (
                  <>
                    <ChevronUp className="inline size-3 mr-0.5" /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="inline size-3 mr-0.5" /> Add one
                  </>
                )}
              </button>
            </legend>
            {includeOffer && (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Supplier *
                    </label>
                    <select
                      value={offerSupplierId}
                      onChange={(e) => setOfferSupplierId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    >
                      <option value="">Select…</option>
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
                      onChange={(e) => setOfferSupplierCode(e.target.value)}
                      placeholder="Supplier's own reference"
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Currency
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-xl border border-border bg-card text-xs font-mono font-bold text-foreground mt-1">
                      USD ($)
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Supplier Price ($) *
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-4.5 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                        $
                      </span>
                      <USNumberInput
                        value={offerPrice}
                        onValueChange={setOfferPrice}
                        onValidityChange={(v) => setOfferPriceValid(v)}
                        decimalScale={4}
                        minDecimalsDisplay={2}
                        min={0}
                        placeholder="0.00"
                        className="h-9 w-full rounded-xl border border-border bg-card pl-7 pr-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={offerValidUntil}
                      onChange={(e) => setOfferValidUntil(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Lead Time (days)
                    </label>
                    <USNumberInput
                      value={offerLeadTime}
                      onValueChange={setOfferLeadTime}
                      onValidityChange={(v) => setOfferLeadTimeValid(v)}
                      decimalScale={0}
                      minDecimalsDisplay={0}
                      min={0}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Min. Order Qty
                    </label>
                    <USNumberInput
                      value={offerMinQty}
                      onValueChange={setOfferMinQty}
                      onValidityChange={(v) => setOfferMinQtyValid(v)}
                      decimalScale={3}
                      minDecimalsDisplay={0}
                      min={0}
                      className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
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
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>
            )}
          </fieldset>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            {isSubmitting ? "Creating item..." : "Create Item"}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
