"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createInvoiceFromOrder,
  cancelInvoice,
  updateInvoiceNormalizedNumber,
} from "@/lib/db/invoices";

export async function createInvoiceAction(payload: {
  orderId: string;
  dueDays?: number;
  notes?: string;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.orderId) {
    return { success: false, error: "Veuillez sélectionner une commande." };
  }

  try {
    const invoice = await createInvoiceFromOrder({
      ...payload,
      userId: session.id,
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/clients/${invoice.clientId}`);
    return { success: true, invoice };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de création de la facture.";
    return { success: false, error: message };
  }
}

export async function cancelInvoiceAction(id: string, reason: string) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!reason || !reason.trim()) {
    return { success: false, error: "Un motif d'annulation est obligatoire." };
  }

  try {
    const cancelled = await cancelInvoice(id, reason, session.id);
    revalidatePath("/dashboard/invoices");
    if (cancelled?.clientId) {
      revalidatePath(`/dashboard/clients/${cancelled.clientId}`);
    }
    return { success: true, invoice: cancelled };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'annulation de la facture.";
    return { success: false, error: message };
  }
}

export async function updateInvoiceNormalizedNumberAction(
  invoiceId: string,
  normalizedInvoiceNumber: string | null
) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!invoiceId || typeof invoiceId !== "string") {
    return { success: false, error: "Identifiant de facture manquant." };
  }

  const trimmed = normalizedInvoiceNumber?.trim() || null;
  if (trimmed && trimmed.length > 150) {
    return { success: false, error: "Le numéro normalisé ne peut excéder 150 caractères." };
  }

  try {
    const updated = await updateInvoiceNormalizedNumber(invoiceId, trimmed, session.id);
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/statements");
    if (updated?.clientId) {
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
    }
    return { success: true, invoice: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { success: false, error: message };
  }
}
