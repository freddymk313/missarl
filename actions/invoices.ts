"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createInvoiceFromOrder, cancelInvoice } from "@/lib/db/invoices";

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

    revalidatePath("/dashboard/factures");
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
    revalidatePath("/dashboard/factures");
    if (cancelled?.clientId) {
      revalidatePath(`/dashboard/clients/${cancelled.clientId}`);
    }
    return { success: true, invoice: cancelled };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'annulation de la facture.";
    return { success: false, error: message };
  }
}
