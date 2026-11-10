"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createDeliveryBatch,
  updateDeliveryNoteStatus,
  getDeliveryNotes,
  getDeliveryNoteById,
  DeliveryBatchItemInput,
} from "@/lib/db/delivery-notes";

export async function createDeliveryBatchAction(payload: {
  orderId: string;
  deliveryDate?: string;
  carrierName?: string;
  driverName?: string;
  vehiclePlate?: string;
  receiverName?: string;
  notes?: string;
  dueDays?: number;
  items: DeliveryBatchItemInput[];
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.orderId) {
    return { success: false, error: "Identifiant de commande manquant." };
  }

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: "Veuillez sélectionner au moins un article à livrer." };
  }

  try {
    const result = await createDeliveryBatch({
      ...payload,
      userId: session.id,
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/statements");
    revalidatePath("/dashboard/clients");
    if (result.deliveryNote.clientId) {
      revalidatePath(`/dashboard/clients/${result.deliveryNote.clientId}`);
    }

    return {
      success: true,
      deliveryNote: result.deliveryNote,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de la livraison.";
    return { success: false, error: message };
  }
}

export async function updateDeliveryNoteStatusAction(
  id: string,
  newStatus: "PREPARED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED",
  cancellationReason?: string
) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (newStatus === "CANCELLED" && (!cancellationReason || !cancellationReason.trim())) {
    return { success: false, error: "Un motif d'annulation est obligatoire." };
  }

  try {
    const updated = await updateDeliveryNoteStatus(id, newStatus, session.id, cancellationReason);

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/statements");
    revalidatePath("/dashboard/clients");
    if (updated.clientId) {
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
    }

    return { success: true, deliveryNote: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour du statut du bon de livraison.";
    return { success: false, error: message };
  }
}

export async function getDeliveryNotesForOrderAction(orderId: string) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  try {
    const deliveryNotes = await getDeliveryNotes({ orderId });
    return { success: true, deliveryNotes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des bons de livraison.";
    return { success: false, error: message };
  }
}

export async function getDeliveryNoteDetailAction(id: string) {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  try {
    const deliveryNote = await getDeliveryNoteById(id);
    if (!deliveryNote) {
      return { success: false, error: "Bon de livraison introuvable." };
    }
    return { success: true, deliveryNote };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement du bon de livraison.";
    return { success: false, error: message };
  }
}
