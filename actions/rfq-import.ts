"use server";

// ============================================================================
// Server Action: Bulk Create Missing Catalogue Items from RFQ Import
// Enforces SUPER_ADMIN / ADMIN only. Creates items using ONLY designation,
// description, and unitCode (no prices, offers, brands, MPNs, or identifiers).
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createItem, getUnits } from "@/lib/db/items";
import { logAudit } from "@/lib/db/audit";
import {
  findDesignationDescriptionDuplicates,
  getActiveCatalogueSummariesForMatching,
} from "@/lib/db/rfq-item-matching";
import type {
  BulkCreateImportedItemFailure,
  BulkCreateImportedItemInput,
  BulkCreateImportedItemSuccess,
  BulkCreateImportedItemsResult,
  CatalogueItemSummary,
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
      error: "Aucun article sélectionné pour la création.",
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

    if (!designation || designation.length < 2) {
      failures.push({
        sourceLineNumber,
        error: "La désignation est obligatoire (2 caractères minimum).",
      });
      continue;
    }

    if (!description || description.length < 2) {
      failures.push({
        sourceLineNumber,
        error: "La description technique est obligatoire (2 caractères minimum).",
      });
      continue;
    }

    if (!validUnitCode) {
      failures.push({
        sourceLineNumber,
        error: `Unité "${input.unitCode || ""}" invalide ou absente du référentiel.`,
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
        error: `Un article quasi identique existe déjà (${existingDuplicate.skuRef}). Associez l'article existant.`,
        duplicateItem: existingDuplicate,
      });
      continue;
    }

    try {
      const created = await createItem({
        designation,
        description,
        unitCode: validUnitCode,
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
    success: createdItems.length > 0 || failures.length === 0,
    createdItems,
    failures,
  };
}
