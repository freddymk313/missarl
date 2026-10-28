"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createOrderFromQuotation, updateOrderStatus } from "@/lib/db/orders";

export async function createOrderAction(payload: {
  quotationId: string;
  clientPoNumber: string;
  expectedDeliveryDate?: string;
  notes?: string;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.quotationId) {
    return { success: false, error: "Veuillez sélectionner un devis validé." };
  }

  if (!payload.clientPoNumber || !payload.clientPoNumber.trim()) {
    return { success: false, error: "Le numéro de bon de commande client (PO N°) est obligatoire." };
  }

  try {
    const order = await createOrderFromQuotation({
      ...payload,
      userId: session.id,
    });

    revalidatePath("/dashboard/commandes");
    revalidatePath(`/dashboard/clients/${order.clientId}`);
    return { success: true, order };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de la commande.";
    return { success: false, error: message };
  }
}

export async function updateOrderStatusAction(
  id: string,
  status: "PENDING" | "CONFIRMED" | "PARTIALLY_DELIVERED" | "COMPLETED" | "CANCELLED",
  cancellationReason?: string
) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (status === "CANCELLED" && (!cancellationReason || !cancellationReason.trim())) {
    return { success: false, error: "Un motif d'annulation est obligatoire." };
  }

  try {
    const updated = await updateOrderStatus(id, status, session.id, cancellationReason);
    revalidatePath("/dashboard/commandes");
    if (updated?.clientId) {
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
    }
    return { success: true, order: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de modification du statut.";
    return { success: false, error: message };
  }
}
