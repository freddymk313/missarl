// ============================================================================
// Authentication & Session Management for MIS SARL
// Direct SQL via Neon PostgreSQL, secure scrypt hashing, no ORM
// ============================================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { UserRole, UserSession } from "@/lib/permissions";

const SESSION_COOKIE_NAME = "mis_session";
const SESSION_TTL_DAYS = 7;

/**
 * Hashes a plaintext password using Node.js scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against the stored salt:hash string using timingSafeEqual
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Creates a new active session token in the database and sets the HTTP-only cookie
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (${userId}, ${tokenHash}, ${ipAddress || null}, ${userAgent || null}, ${expiresAt.toISOString()})
  `;

  // Update last_login_at
  await sql`
    UPDATE users SET last_login_at = NOW() WHERE id = ${userId}
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

/**
 * Retrieves the current authenticated user session from the cookie and database
 */
export async function getCurrentSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const rows = await sql`
      SELECT 
        u.id, 
        u.email, 
        u.full_name as "fullName", 
        u.role, 
        u.is_active as "isActive",
        s.expires_at as "expiresAt"
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ${tokenHash}
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0] as unknown as {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      isActive: boolean;
    };

    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      isActive: row.isActive,
    };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: unknown }).digest === "string" &&
      ((err as { digest: string }).digest.includes("DYNAMIC_SERVER_USAGE") ||
        (err as { digest: string }).digest.includes("NEXT_REDIRECT") ||
        (err as { digest: string }).digest.includes("HANGING_PROMISE"))
    ) {
      throw err;
    }
    console.error("[Auth] Error getting current session:", err);
    return null;
  }
}

/**
 * Requires an active session. Redirects to login or dashboard if unauthorized.
 */
export async function requireSession(allowedRoles?: UserRole[]): Promise<UserSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  return session;
}

/**
 * Clears the session from the database and deletes the cookie
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (err) {
    console.error("[Auth] Error destroying session:", err);
  }
}
