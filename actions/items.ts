"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/db/audit";
import {
  searchItems,
  createItem,
  updateItem,
  deleteItem,
  addItemIdentifier,
  deleteItemIdentifier,
  addSupplierOffer,
  upsertExchangeRate,
  findOrCreateBrand,
} from "@/lib/db/items";

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchItemsAction(
  q: string,
  filters?: {
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    currencyCode?: string;
  }
) {
  await requireSession(["SUPER_ADMIN", "ADMIN", "PRICE_COLLECTOR"]);
  try {
    const items = await searchItems(q, filters);
    return { success: true, items };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Search failed.",
      items: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Create Item
// ---------------------------------------------------------------------------

export async function createItemAction(data: {
  designation: string;
  description: string;
  categoryId?: string;
  brandName?: string;
  manufacturerPartNumber?: string;
  unitCode?: string;
  specs?: Record<string, string>;
  // Optional first supplier offer
  offer?: {
    supplierId: string;
    supplierItemCode?: string;
    currencyCode: string;
    unitPrice: number;
    leadTimeDays?: number;
    minOrderQty?: number;
    quotedOn?: string;
    validUntil?: string;
    notes?: string;
  };
  // Optional client codes
  clientCodes?: Array<{ clientId: string; value: string }>;
}) {
  const session = await requireSession(["SUPER_ADMIN"]);

  if (!data.designation?.trim()) {
    return { success: false, error: "Short designation is required." };
  }
  if (!data.description?.trim()) {
    return { success: false, error: "Full description is required." };
  }
  if (!data.unitCode?.trim()) {
    return { success: false, error: "Unit is required." };
  }

  try {
    // Resolve brand
    let brandId: string | undefined;
    if (data.brandName?.trim()) {
      const brand = await findOrCreateBrand(data.brandName.trim());
      brandId = brand.id;
    }

    const item = await createItem({
      designation: data.designation,
      description: data.description,
      categoryId: data.categoryId,
      brandId,
      manufacturerPartNumber: data.manufacturerPartNumber,
      unitCode: data.unitCode,
      specs: data.specs,
    });

    // Add client codes
    if (data.clientCodes) {
      for (const cc of data.clientCodes) {
        if (cc.value?.trim()) {
          await addItemIdentifier({
            itemId: item.id,
            kind: "CLIENT_CODE",
            clientId: cc.clientId,
            value: cc.value,
          });
        }
      }
    }

    // Add first supplier offer
    if (data.offer && data.offer.supplierId && data.offer.unitPrice >= 0) {
      await addSupplierOffer({
        itemId: item.id,
        supplierId: data.offer.supplierId,
        supplierItemCode: data.offer.supplierItemCode,
        currencyCode: data.offer.currencyCode,
        unitPrice: data.offer.unitPrice,
        leadTimeDays: data.offer.leadTimeDays,
        minOrderQty: data.offer.minOrderQty,
        quotedOn: data.offer.quotedOn,
        validUntil: data.offer.validUntil,
        notes: data.offer.notes,
        userId: session.id,
      });
    }

    await logAudit({
      userId: session.id,
      action: "ITEM_CREATED",
      entityType: "ITEM",
      entityId: item.id,
      details: { skuRef: item.skuRef, designation: item.designation },
    });

    revalidatePath("/dashboard/items");
    return { success: true, item };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create item.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Update Item
// ---------------------------------------------------------------------------

export async function updateItemAction(
  itemId: string,
  data: {
    designation?: string;
    description?: string;
    categoryId?: string | null;
    brandName?: string | null;
    manufacturerPartNumber?: string | null;
    unitCode?: string | null;
    specs?: Record<string, string>;
    isActive?: boolean;
  }
) {
  const session = await requireSession(["SUPER_ADMIN"]);

  try {
    let brandId: string | null | undefined = undefined;
    if (data.brandName !== undefined) {
      if (data.brandName?.trim()) {
        const brand = await findOrCreateBrand(data.brandName.trim());
        brandId = brand.id;
      } else {
        brandId = null;
      }
    }

    const updated = await updateItem(itemId, {
      designation: data.designation,
      description: data.description,
      categoryId: data.categoryId,
      brandId,
      manufacturerPartNumber: data.manufacturerPartNumber,
      unitCode: data.unitCode,
      specs: data.specs,
      isActive: data.isActive,
    });

    if (!updated) return { success: false, error: "Item not found." };

    await logAudit({
      userId: session.id,
      action: "ITEM_UPDATED",
      entityType: "ITEM",
      entityId: itemId,
      details: data,
    });

    revalidatePath("/dashboard/items");
    return { success: true, item: updated };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update item.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Delete Item
// ---------------------------------------------------------------------------

export async function deleteItemAction(itemId: string) {
  const session = await requireSession(["SUPER_ADMIN"]);

  try {
    const result = await deleteItem(itemId);
    if (!result.success) return result;

    await logAudit({
      userId: session.id,
      action: "ITEM_DELETED",
      entityType: "ITEM",
      entityId: itemId,
      details: {},
    });

    revalidatePath("/dashboard/items");
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete item.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Add supplier offer
// ---------------------------------------------------------------------------

export async function addSupplierOfferAction(
  itemId: string,
  data: {
    supplierId: string;
    supplierItemCode?: string;
    currencyCode: string;
    unitPrice: number;
    leadTimeDays?: number;
    minOrderQty?: number;
    quotedOn?: string;
    validUntil?: string;
    notes?: string;
  }
) {
  const session = await requireSession(["SUPER_ADMIN"]);

  if (!data.supplierId) {
    return { success: false, error: "Supplier is required." };
  }
  if (!data.currencyCode) {
    return { success: false, error: "Currency is required." };
  }
  if (data.unitPrice < 0) {
    return { success: false, error: "Price must be ≥ 0." };
  }

  try {
    const offer = await addSupplierOffer({
      itemId,
      ...data,
      userId: session.id,
    });

    await logAudit({
      userId: session.id,
      action: "SUPPLIER_OFFER_ADDED",
      entityType: "ITEM",
      entityId: itemId,
      details: { supplierId: data.supplierId, unitPrice: data.unitPrice },
    });

    revalidatePath("/dashboard/items");
    return { success: true, offer };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to add supplier offer.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Add / remove identifier
// ---------------------------------------------------------------------------

export async function addItemIdentifierAction(data: {
  itemId: string;
  kind: "CLIENT_CODE" | "GTIN" | "ALT_MPN";
  clientId?: string;
  value: string;
}) {
  await requireSession(["SUPER_ADMIN"]);
  try {
    const identifier = await addItemIdentifier(data);
    revalidatePath("/dashboard/items");
    return { success: true, identifier };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to add identifier.";
    return { success: false, error: message };
  }
}

export async function deleteItemIdentifierAction(identifierId: string) {
  await requireSession(["SUPER_ADMIN"]);
  try {
    await deleteItemIdentifier(identifierId);
    revalidatePath("/dashboard/items");
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to remove identifier.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Exchange rates
// ---------------------------------------------------------------------------

export async function upsertExchangeRateAction(data: {
  currencyCode: string;
  nUnitsPerUsd: number; // user enters "1 USD = N CDF" → store 1/N
  effectiveOn: string;
  note?: string;
}) {
  const session = await requireSession(["SUPER_ADMIN"]);

  if (!data.currencyCode) {
    return { success: false, error: "Currency is required." };
  }
  if (data.currencyCode === "USD") {
    return { success: false, error: "USD rate is always 1 and cannot be changed." };
  }
  if (!data.nUnitsPerUsd || data.nUnitsPerUsd <= 0) {
    return { success: false, error: "Rate must be a positive number." };
  }

  const rateToUsd = 1 / data.nUnitsPerUsd;

  try {
    const rate = await upsertExchangeRate({
      currencyCode: data.currencyCode,
      rateToUsd,
      effectiveOn: data.effectiveOn,
      note: data.note,
      userId: session.id,
    });

    await logAudit({
      userId: session.id,
      action: "EXCHANGE_RATE_UPDATED",
      entityType: "SETTING",
      entityId: data.currencyCode,
      details: { nUnitsPerUsd: data.nUnitsPerUsd, rateToUsd },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/items");
    return { success: true, rate };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update exchange rate.";
    return { success: false, error: message };
  }
}
