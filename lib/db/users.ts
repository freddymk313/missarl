// ============================================================================
// Users Repository for MIS SARL (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";
import { UserRole } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getUsers(): Promise<UserRecord[]> {
  const rows = await sql`
    SELECT 
      id,
      email,
      full_name as "fullName",
      role,
      is_active as "isActive",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users
    ORDER BY created_at DESC
  `;
  return rows as unknown as UserRecord[];
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const rows = await sql`
    SELECT 
      id,
      email,
      full_name as "fullName",
      role,
      is_active as "isActive",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as UserRecord;
}

export async function getUserByEmail(email: string): Promise<(UserRecord & { passwordHash: string }) | null> {
  const rows = await sql`
    SELECT 
      id,
      email,
      password_hash as "passwordHash",
      full_name as "fullName",
      role,
      is_active as "isActive",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as UserRecord & { passwordHash: string };
}

export async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<UserRecord> {
  const passwordHash = hashPassword(data.password);
  const rows = await sql`
    INSERT INTO users (email, password_hash, full_name, role, is_active)
    VALUES (LOWER(${data.email.trim()}), ${passwordHash}, ${data.fullName.trim()}, ${data.role}, TRUE)
    RETURNING 
      id,
      email,
      full_name as "fullName",
      role,
      is_active as "isActive",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;
  return rows[0] as unknown as UserRecord;
}

export async function updateUser(
  id: string,
  data: {
    fullName?: string;
    role?: UserRole;
    password?: string;
    isActive?: boolean;
  }
): Promise<UserRecord | null> {
  if (data.password) {
    const passwordHash = hashPassword(data.password);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${id}`;
  }

  const rows = await sql`
    UPDATE users
    SET 
      full_name = COALESCE(${data.fullName ?? null}, full_name),
      role = COALESCE(${data.role ?? null}, role),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING 
      id,
      email,
      full_name as "fullName",
      role,
      is_active as "isActive",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as UserRecord;
}
