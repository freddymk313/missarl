"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { recordPayment } from "@/lib/db/payments";

export async function recordPaymentAction(payload: {
  clientId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  paymentDate?: string;
  notes?: string;
  allocations?: Array<{ invoiceId: string; amount: number }>;
}) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  if (!payload.clientId) {
    return { success: false, error: "Veuillez sélectionner un client." };
  }

  if (payload.amount <= 0) {
    return { success: false, error: "Le montant du paiement doit être supérieur à zéro." };
  }

  if (!payload.referenceNumber || !payload.referenceNumber.trim()) {
    return { success: false, error: "Le numéro de référence du paiement (bordereau bancaire, virement, etc.) est obligatoire." };
  }

  try {
    const payment = await recordPayment({
      ...payload,
      userId: session.id,
    });

    revalidatePath("/dashboard/paiements");
    revalidatePath("/dashboard/factures");
    revalidatePath("/dashboard/releves");
    revalidatePath(`/dashboard/clients/${payload.clientId}`);
    return { success: true, payment };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du paiement.";
    return { success: false, error: message };
  }
}
