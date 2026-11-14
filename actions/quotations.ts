"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { validateQuotationBlobImageUrl } from "@/lib/blob";
import {
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  getQuotationById,
} from "@/lib/db/quotations";

const MAX_BRAND_LENGTH = 100;

interface QuotationActionLineInput {
  itemId?: string;
  brand?: string | null;
  brandImageUrl?: string | null;
  supplierOfferId?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  supplierPriceSnapshot?: number | null;
  supplierCurrencySnapshot?: string | null;
  supplierVatIncludedSnapshot?: boolean | null;
  supplierVatRateSnapshot?: number | null;
  exchangeRateSnapshot?: number | null;
  baseCostUsdSnapshot?: number | null;
  commissionPercent?: number | null;
  commissionAmount?: number | null;
}

function validateAndNormalizeLineBrands(
  items: QuotationActionLineInput[]
): { ok: true; items: QuotationActionLineInput[] } | { ok: false; error: string } {
  const normalizedItems: QuotationActionLineInput[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lineNum = i + 1;

    let normalizedBrand: string | null | undefined = item.brand;
    if (item.brand !== undefined) {
      const trimmedBrand = (item.brand ?? "").trim();
      if (trimmedBrand.length > MAX_BRAND_LENGTH) {
        return {
          ok: false,
          error: `Ligne ${lineNum} : le nom de la marque ne doit pas dépasser ${MAX_BRAND_LENGTH} caractères.`,
        };
      }
      normalizedBrand = trimmedBrand;
    }

    let normalizedImageUrl: string | null = null;
    if (typeof item.brandImageUrl === "string" && item.brandImageUrl.trim().length > 0) {
      const urlCheck = validateQuotationBlobImageUrl(item.brandImageUrl);
      if (!urlCheck.valid) {
        return {
          ok: false,
          error: `Ligne ${lineNum} : ${urlCheck.error}`,
        };
      }
      normalizedImageUrl = urlCheck.url;
    }

    normalizedItems.push({
      ...item,
      brand: normalizedBrand,
      brandImageUrl: normalizedImageUrl,
    });
  }

  return { ok: true, items: normalizedItems };
}

export async function createQuotationAction(payload: {
  clientId: string;
  docType: "QUOTATION" | "PROFORMA";
  internalReference?: string;
  clientRfqNumber?: string;
  validityDays?: number;
  vatRate?: number;
  paymentTerms?: string;
  deliveryLeadTime?: string;
  notes?: string;
  defaultCommissionPercent?: number;
  items: QuotationActionLineInput[];
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.clientId) {
    return { success: false, error: "Veuillez sélectionner un client." };
  }

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: "Le devis doit comporter au moins une ligne d'article." };
  }

  const brandCheck = validateAndNormalizeLineBrands(payload.items);
  if (!brandCheck.ok) {
    return { success: false, error: brandCheck.error };
  }

  try {
    const quotation = await createQuotation({
      ...payload,
      items: brandCheck.items,
      userId: session.id,
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/clients/${payload.clientId}`);
    return { success: true, quotation };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création du devis.";
    return { success: false, error: message };
  }
}

export async function updateQuotationAction(payload: {
  quotationId: string;
  docType?: "QUOTATION" | "PROFORMA";
  clientRfqNumber?: string;
  validityDays?: number;
  vatRate?: number;
  paymentTerms?: string;
  deliveryLeadTime?: string;
  notes?: string;
  defaultCommissionPercent?: number;
  expectedUpdatedAt?: string;
  items: QuotationActionLineInput[];
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.quotationId) {
    return { success: false, error: "ID du devis manquant." };
  }
  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: "Le devis doit comporter au moins une ligne d'article." };
  }

  const brandCheck = validateAndNormalizeLineBrands(payload.items);
  if (!brandCheck.ok) {
    return { success: false, error: brandCheck.error };
  }

  try {
    const quotation = await updateQuotation({
      ...payload,
      items: brandCheck.items,
      userId: session.id,
    });

    revalidatePath("/dashboard/quotes");
    revalidatePath(`/dashboard/quotes/${payload.quotationId}`);
    revalidatePath(`/dashboard/quotes/${payload.quotationId}/edit`);
    if (quotation?.clientId) {
      revalidatePath(`/dashboard/clients/${quotation.clientId}`);
    }
    return {
      success: true,
      quotation: {
        id: quotation.id,
        internalReference: quotation.internalReference,
        clientId: quotation.clientId,
      },
    };
  } catch (err: unknown) {
    console.error("[updateQuotationAction] Error updating quotation:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour du devis.";
    return { success: false, error: message };
  }
}

export async function updateQuotationStatusAction(
  id: string,
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "EXPIRED" | "REJECTED" | "CANCELLED",
  cancellationReason?: string
) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (status === "CANCELLED" && (!cancellationReason || !cancellationReason.trim())) {
    return { success: false, error: "Un motif d'annulation est obligatoire." };
  }

  try {
    const updated = await updateQuotationStatus(id, status, session.id, cancellationReason);
    revalidatePath("/dashboard/quotations");
    if (updated?.clientId) {
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
    }
    return { success: true, quotation: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de changement de statut.";
    return { success: false, error: message };
  }
}

export async function getQuotationItemsAction(quotationId: string) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  try {
    const quotation = await getQuotationById(quotationId);
    if (!quotation) {
      return { success: false, error: "Devis introuvable." };
    }
    return { success: true, items: quotation.items || [], quotation };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des articles du devis.";
    return { success: false, error: message };
  }
}
