"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createSupplier, updateSupplier, SupplierRecord } from "@/lib/db/suppliers";
import { logAudit } from "@/lib/db/audit";

export async function createSupplierAction(formData: FormData) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  const code = formData.get("code")?.toString().trim();
  const name = formData.get("name")?.toString().trim();
  const country = formData.get("country")?.toString().trim();
  const contactPerson = formData.get("contactPerson")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!code || !name) {
    return { success: false, error: "Le code fournisseur et le nom sont obligatoires." };
  }

  try {
    const supplier = await createSupplier({
      code,
      name,
      country,
      contactPerson,
      email,
      phone,
      address,
      notes,
    });

    await logAudit({
      userId: session.id,
      action: "SUPPLIER_CREATED",
      entityType: "SUPPLIER",
      entityId: supplier.id,
      details: { code: supplier.code, name: supplier.name },
    });

    revalidatePath("/dashboard/fournisseurs");
    return { success: true, supplier };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de création du fournisseur.";
    return { success: false, error: message };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  data: Partial<Omit<SupplierRecord, "id" | "createdAt" | "updatedAt">>
) {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);

  try {
    const updated = await updateSupplier(supplierId, data);
    if (!updated) return { success: false, error: "Fournisseur introuvable." };

    await logAudit({
      userId: session.id,
      action: "SUPPLIER_UPDATED",
      entityType: "SUPPLIER",
      entityId: supplierId,
      details: data,
    });

    revalidatePath("/dashboard/fournisseurs");
    return { success: true, supplier: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { success: false, error: message };
  }
}
