"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createOrderFromQuotation, updateOrderStatus, getOrderById, SelectedPoItemInput } from "@/lib/db/orders";
import { getOrderAllocations } from "@/lib/db/delivery-notes";

export async function createOrderAction(payload: {
  quotationId: string;
  clientPoNumber: string;
  expectedDeliveryDate?: string;
  notes?: string;
  selectedItems?: SelectedPoItemInput[];
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

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${order.clientId}`);
    return { success: true, order };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de la commande.";
    return { success: false, error: message };
  }
}

export async function getOrderAllocationsAction(orderId: string) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  try {
    const allocations = await getOrderAllocations(orderId);
    return { success: true, allocations };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de calcul des allocations.";
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
    revalidatePath("/dashboard/orders");
    if (updated?.clientId) {
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
    }
    return { success: true, order: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de modification du statut.";
    return { success: false, error: message };
  }
}

export async function getOrderDetailAction(orderId: string) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  try {
    const order = await getOrderById(orderId);
    if (!order) return { success: false, error: "Commande introuvable." };
    return { success: true, order };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement du détail de la commande.";
    return { success: false, error: message };
  }
}
