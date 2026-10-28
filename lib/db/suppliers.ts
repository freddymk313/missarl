// ============================================================================
// Suppliers Repository for MIS SARL (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  country: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getSuppliers(search?: string): Promise<SupplierRecord[]> {
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    const rows = await sql`
      SELECT 
        id, code, name, country,
        contact_person as "contactPerson",
        email, phone, address, notes,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM suppliers
      WHERE LOWER(name) LIKE ${term}
         OR LOWER(code) LIKE ${term}
         OR LOWER(COALESCE(country, '')) LIKE ${term}
         OR LOWER(COALESCE(contact_person, '')) LIKE ${term}
      ORDER BY name ASC
    `;
    return rows as unknown as SupplierRecord[];
  }

  const rows = await sql`
    SELECT 
      id, code, name, country,
      contact_person as "contactPerson",
      email, phone, address, notes,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM suppliers
    ORDER BY name ASC
  `;
  return rows as unknown as SupplierRecord[];
}

export async function getSupplierById(id: string): Promise<SupplierRecord | null> {
  const rows = await sql`
    SELECT 
      id, code, name, country,
      contact_person as "contactPerson",
      email, phone, address, notes,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM suppliers
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as SupplierRecord;
}

export async function createSupplier(data: {
  code: string;
  name: string;
  country?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}): Promise<SupplierRecord> {
  const cleanCode = data.code.trim().toUpperCase();
  const rows = await sql`
    INSERT INTO suppliers (
      code, name, country, contact_person, email, phone, address, notes, is_active
    )
    VALUES (
      ${cleanCode},
      ${data.name.trim()},
      ${data.country?.trim() || null},
      ${data.contactPerson?.trim() || null},
      ${data.email?.trim() || null},
      ${data.phone?.trim() || null},
      ${data.address?.trim() || null},
      ${data.notes?.trim() || null},
      TRUE
    )
    RETURNING 
      id, code, name, country,
      contact_person as "contactPerson",
      email, phone, address, notes,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;
  return rows[0] as unknown as SupplierRecord;
}

export async function updateSupplier(
  id: string,
  data: Partial<Omit<SupplierRecord, "id" | "createdAt" | "updatedAt">>
): Promise<SupplierRecord | null> {
  const rows = await sql`
    UPDATE suppliers
    SET 
      name = COALESCE(${data.name ?? null}, name),
      country = COALESCE(${data.country ?? null}, country),
      contact_person = COALESCE(${data.contactPerson ?? null}, contact_person),
      email = COALESCE(${data.email ?? null}, email),
      phone = COALESCE(${data.phone ?? null}, phone),
      address = COALESCE(${data.address ?? null}, address),
      notes = COALESCE(${data.notes ?? null}, notes),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING 
      id, code, name, country,
      contact_person as "contactPerson",
      email, phone, address, notes,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as SupplierRecord;
}
