"use server";

import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/db/users";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";
import { logAudit } from "@/lib/db/audit";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { success: false, error: "Veuillez saisir votre adresse email et votre mot de passe." };
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return { success: false, error: "Identifiants invalides." };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: "Ce compte utilisateur a été désactivé. Veuillez contacter un administrateur.",
      };
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Identifiants invalides." };
    }

    // Create session in DB & set HTTP-only cookie
    await createSession(user.id);

    await logAudit({
      userId: user.id,
      action: "USER_LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[Login Action Error]:", err);
    return { success: false, error: "Une erreur est survenue lors de la connexion. Veuillez réessayer." };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/connexion");
}
