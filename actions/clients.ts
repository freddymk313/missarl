"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createClient, updateClient, ClientRecord } from "@/lib/db/clients";
import { logAudit } from "@/lib/db/audit";

export async function createClientAction(formData: FormData) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  const code = formData.get("code")?.toString().trim();
  const name = formData.get("name")?.toString().trim();
  const contactPerson = formData.get("contactPerson")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const billingAddress = formData.get("billingAddress")?.toString().trim();
  const deliveryAddress = formData.get("deliveryAddress")?.toString().trim();
  const taxId = formData.get("taxId")?.toString().trim();
  const paymentTerms = formData.get("paymentTerms")?.toString().trim() || "30_DAYS";
  const currency = formData.get("currency")?.toString().trim() || "USD";

  if (!code || !name) {
    return { success: false, error: "Le code client et le nom sont obligatoires." };
  }

  try {
    const client = await createClient({
      code,
      name,
      contactPerson,
      email,
      phone,
      billingAddress,
      deliveryAddress,
      taxId,
      paymentTerms,
      currency,
    });

    await logAudit({
      userId: session.id,
      action: "CLIENT_CREATED",
      entityType: "CLIENT",
      entityId: client.id,
      details: { code: client.code, name: client.name },
    });

    revalidatePath("/dashboard/clients");
    return { success: true, client };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de création du client.";
    return { success: false, error: message };
  }
}

export async function updateClientAction(
  clientId: string,
  data: Partial<Omit<ClientRecord, "id" | "createdAt" | "updatedAt">>
) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  try {
    const updated = await updateClient(clientId, data);
    if (!updated) return { success: false, error: "Client introuvable." };

    await logAudit({
      userId: session.id,
      action: "CLIENT_UPDATED",
      entityType: "CLIENT",
      entityId: clientId,
      details: data,
    });

    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true, client: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { success: false, error: message };
  }
}
