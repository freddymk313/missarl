"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createItem, updateItem, ItemRecord } from "@/lib/db/items";
import { logAudit } from "@/lib/db/audit";

export async function createItemAction(formData: FormData) {
  // Strict rule: Article & price management belongs to SUPER_ADMIN only
  const session = await requireSession(["SUPER_ADMIN"]);

  const skuRef = formData.get("skuRef")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const category = formData.get("category")?.toString().trim();
  const unit = formData.get("unit")?.toString().trim();
  const brand = formData.get("brand")?.toString().trim();
  const supplierId = formData.get("supplierId")?.toString().trim() || undefined;
  const purchasePrice = parseFloat(formData.get("purchasePrice")?.toString() || "0");
  const sellingPrice = parseFloat(formData.get("sellingPrice")?.toString() || "0");
  const stockQuantity = parseFloat(formData.get("stockQuantity")?.toString() || "0");
  const minStockLevel = parseFloat(formData.get("minStockLevel")?.toString() || "0");

  if (!skuRef || !description || !unit) {
    return { success: false, error: "La référence (SKU), la description et l'unité sont obligatoires." };
  }

  if (isNaN(sellingPrice) || sellingPrice < 0) {
    return { success: false, error: "Le prix de vente doit être un nombre positif." };
  }

  try {
    const item = await createItem({
      skuRef,
      description,
      category,
      unit,
      brand,
      supplierId,
      purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
      sellingPrice,
      stockQuantity,
      minStockLevel,
    });

    await logAudit({
      userId: session.id,
      action: "ITEM_CREATED",
      entityType: "ITEM",
      entityId: item.id,
      details: { skuRef: item.skuRef, sellingPrice: item.sellingPrice },
    });

    revalidatePath("/dashboard/articles");
    return { success: true, item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de création de l'article.";
    return { success: false, error: message };
  }
}

export async function updateItemAction(
  itemId: string,
  data: Partial<Omit<ItemRecord, "id" | "createdAt" | "updatedAt">>
) {
  // Strict rule: Article & price management belongs to SUPER_ADMIN only
  const session = await requireSession(["SUPER_ADMIN"]);

  try {
    const updated = await updateItem(itemId, data);
    if (!updated) return { success: false, error: "Article introuvable." };

    await logAudit({
      userId: session.id,
      action: "ITEM_UPDATED",
      entityType: "ITEM",
      entityId: itemId,
      details: data,
    });

    revalidatePath("/dashboard/articles");
    return { success: true, item: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { success: false, error: message };
  }
}
