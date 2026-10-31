"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createUser, updateUser, deleteUser } from "@/lib/db/users";
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

    revalidatePath("/dashboard/users");
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
    email?: string;
    role?: UserRole;
    password?: string;
    isActive?: boolean;
  }
) {
  const session = await requireSession(["SUPER_ADMIN"]);

  if (userId === session.id) {
    if (data.role && data.role !== "SUPER_ADMIN") {
      return { success: false, error: "Vous ne pouvez pas retirer votre propre rôle de Super Administrateur." };
    }
    if (data.isActive === false) {
      return { success: false, error: "Vous ne pouvez pas désactiver votre propre compte." };
    }
  }

  if (data.password && data.password.trim().length > 0 && data.password.trim().length < 6) {
    return { success: false, error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }

  try {
    const updated = await updateUser(userId, data);
    if (!updated) return { success: false, error: "Utilisateur introuvable." };

    await logAudit({
      userId: session.id,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: userId,
      details: {
        role: data.role,
        isActive: data.isActive,
        email: data.email,
        fullName: data.fullName,
        passwordChanged: Boolean(data.password && data.password.trim().length > 0),
      },
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/utilisateurs");
    return { success: true, user: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de modification.";
    return { success: false, error: message };
  }
}

export async function deleteUserAction(userId: string) {
  const session = await requireSession(["SUPER_ADMIN"]);

  if (userId === session.id) {
    return { success: false, error: "Vous ne pouvez pas supprimer votre propre compte Super Administrateur." };
  }

  try {
    const deleted = await deleteUser(userId);
    if (!deleted) {
      return { success: false, error: "Utilisateur introuvable." };
    }

    await logAudit({
      userId: session.id,
      action: "USER_DELETED",
      entityType: "USER",
      entityId: userId,
      details: { deletedUserId: userId },
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/utilisateurs");
    return { success: true };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string };
    if (errObj?.code === "23503" || errObj?.message?.includes("foreign key")) {
      return {
        success: false,
        error: "Impossible de supprimer cet utilisateur car des documents (devis, commandes, factures ou paiements) lui sont rattachés. Désactivez plutôt son compte.",
      };
    }
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression de l'utilisateur.";
    return { success: false, error: message };
  }
}
