"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createQuotation, updateQuotationStatus } from "@/lib/db/quotations";

export async function createQuotationAction(payload: {
  clientId: string;
  docType: "QUOTATION" | "PROFORMA";
  clientRfqNumber?: string;
  validityDays?: number;
  vatRate?: number;
  paymentTerms?: string;
  deliveryLeadTime?: string;
  notes?: string;
  defaultCommissionPercent?: number;
  items: Array<{
    itemId?: string;
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
  }>;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.clientId) {
    return { success: false, error: "Veuillez sélectionner un client." };
  }

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: "Le devis doit comporter au moins une ligne d'article." };
  }

  try {
    const quotation = await createQuotation({
      ...payload,
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
