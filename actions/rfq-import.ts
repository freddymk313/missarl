"use server";

// ============================================================================
// Server Action: Bulk Create Missing Catalogue Items from RFQ Import
// Enforces SUPER_ADMIN / ADMIN only. Creates permanent rows in `items` with
// designation, description, unitCode, and optional supplyPrice / quotedPrice
// (never creates supplier_offers, MPNs, brands, or client/supplier codes).
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createItem, getUnits } from "@/lib/db/items";
import { logAudit } from "@/lib/db/audit";
import {
  findDesignationDescriptionDuplicates,
  getActiveCatalogueSummariesForMatching,
} from "@/lib/db/rfq-item-matching";
import {
  validateOptionalCatalogPrice,
  type BulkCreateImportedItemFailure,
  type BulkCreateImportedItemInput,
  type BulkCreateImportedItemSuccess,
  type BulkCreateImportedItemsResult,
  type CatalogueItemSummary,
} from "@/lib/rfq-import-types";

export async function createImportedItemsAction(
  items: BulkCreateImportedItemInput[]
): Promise<BulkCreateImportedItemsResult> {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      createdItems: [],
      failures: [],
      error: "No items selected for creation.",
    };
  }

  const units = await getUnits();
  const validUnitMap = new Map(
    units.map((u) => [u.code.toUpperCase(), u.code])
  );

  // Load current active catalogue summaries once (designation & description only)
  const catalogueItems: CatalogueItemSummary[] = [
    ...(await getActiveCatalogueSummariesForMatching()),
  ];

  const createdItems: BulkCreateImportedItemSuccess[] = [];
  const failures: BulkCreateImportedItemFailure[] = [];

  for (const input of items) {
    const sourceLineNumber = Number(input.sourceLineNumber);
    const designation = (input.designation || "").replace(/\s+/g, " ").trim();
    const description = (input.description || "").replace(/\s+/g, " ").trim();
    const requestedUnit = (input.unitCode || "").trim().toUpperCase();
    const validUnitCode = validUnitMap.get(requestedUnit);

    if (!Number.isInteger(sourceLineNumber) || sourceLineNumber <= 0) {
      failures.push({
        sourceLineNumber: Number.isFinite(sourceLineNumber) ? sourceLineNumber : 0,
        error: "Invalid source line number.",
      });
      continue;
    }

    if (!designation || designation.length < 2) {
      failures.push({
        sourceLineNumber,
        error: "Designation is required (at least 2 characters).",
      });
      continue;
    }

    if (!description || description.length < 2) {
      failures.push({
        sourceLineNumber,
        error: "Technical description is required (at least 2 characters).",
      });
      continue;
    }

    if (!validUnitCode) {
      failures.push({
        sourceLineNumber,
        error: `Unit "${input.unitCode || ""}" is invalid or not in catalog.`,
      });
      continue;
    }

    const supplyPriceCheck = validateOptionalCatalogPrice(
      input.supplyPrice,
      "Supplier Price (USD)"
    );
    if (!supplyPriceCheck.ok) {
      failures.push({
        sourceLineNumber,
        error: supplyPriceCheck.error,
      });
      continue;
    }

    const quotedPriceCheck = validateOptionalCatalogPrice(
      input.quotedPrice,
      "Quoted Price (USD)"
    );
    if (!quotedPriceCheck.ok) {
      failures.push({
        sourceLineNumber,
        error: quotedPriceCheck.error,
      });
      continue;
    }

    // Recheck for near-duplicates on designation + description right before insert
    const dupMap = findDesignationDescriptionDuplicates(
      [{ sourceLineNumber, designation, description }],
      catalogueItems
    );
    const existingDuplicate = dupMap.get(sourceLineNumber);
    if (existingDuplicate) {
      failures.push({
        sourceLineNumber,
        error: `A nearly identical item already exists (${existingDuplicate.skuRef}). Link the existing item instead.`,
        duplicateItem: existingDuplicate,
      });
      continue;
    }

    try {
      const created = await createItem({
        designation,
        description,
        unitCode: validUnitCode,
        supplyPrice: supplyPriceCheck.value,
        quotedPrice: quotedPriceCheck.value,
      });

      const createdSummary: CatalogueItemSummary = {
        id: created.id,
        skuRef: created.skuRef,
        designation: created.designation,
        description: created.description,
        unitCode: created.unitCode,
      };
      // Prevent creating duplicate siblings later in the same bulk batch
      catalogueItems.push(createdSummary);

      createdItems.push({
        sourceLineNumber,
        item: {
          id: created.id,
          skuRef: created.skuRef,
          designation: created.designation || designation,
          description: created.description || description,
          unitCode: created.unitCode || validUnitCode,
          supplyPrice:
            created.supplyPrice !== undefined && created.supplyPrice !== null
              ? Number(created.supplyPrice)
              : supplyPriceCheck.value,
          quotedPrice:
            created.quotedPrice !== undefined && created.quotedPrice !== null
              ? Number(created.quotedPrice)
              : quotedPriceCheck.value,
        },
      });
    } catch (err: unknown) {
      failures.push({
        sourceLineNumber,
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de la création de l'article.",
      });
    }
  }

  if (createdItems.length > 0) {
    await logAudit({
      userId: session.id,
      action: "RFQ_BULK_ITEMS_CREATED",
      entityType: "ITEM",
      entityId: createdItems[0].item.id,
      details: {
        createdCount: createdItems.length,
        failureCount: failures.length,
        createdSkuRefs: createdItems.map((c) => c.item.skuRef),
      },
    });
    revalidatePath("/dashboard/items");
    revalidatePath("/dashboard/quotes/new");
    revalidatePath("/dashboard/quotes/import");
  }

  return {
    success: createdItems.length > 0 && failures.length === 0,
    createdItems,
    failures,
  };
}
