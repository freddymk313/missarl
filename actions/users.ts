"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createUser, updateUser } from "@/lib/db/users";
import { UserRole } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit";

export async function createUserAction(formData: FormData) {
  const session = await requireSession(["SUPER_ADMIN"]);

  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const role = formData.get("role")?.toString() as UserRole;

  if (!email || !password || !fullName || !role) {
    return { success: false, error: "Tous les champs sont obligatoires." };
  }

  if (password.length < 6) {
    return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  try {
    const user = await createUser({
      email,
      password,
      fullName,
      role,
    });

    await logAudit({
      userId: session.id,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: user.id,
      details: { email: user.email, role: user.role, fullName: user.fullName },
    });

    revalidatePath("/dashboard/utilisateurs");
    return { success: true, user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de création du compte utilisateur.";
    return { success: false, error: message };
  }
}

export async function updateUserAction(
  userId: string,
  data: {
    fullName?: string;
    role?: UserRole;
    password?: string;
    isActive?: boolean;
  }
) {
  const session = await requireSession(["SUPER_ADMIN"]);

  try {
    const updated = await updateUser(userId, data);
    if (!updated) return { success: false, error: "Utilisateur introuvable." };

    await logAudit({
      userId: session.id,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: userId,
      details: { role: data.role, isActive: data.isActive },
    });

    revalidatePath("/dashboard/utilisateurs");
    return { success: true, user: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de modification.";
    return { success: false, error: message };
  }
}
