// ============================================================================
// Clients Repository & Atomic Quotation Sequence Service
// Direct SQL via Neon PostgreSQL
// ============================================================================

import { sql } from "@/lib/db";

export interface ClientRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  deliveryAddress: string | null;
  taxId: string | null;
  paymentTerms: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getClients(search?: string): Promise<ClientRecord[]> {
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    const rows = await sql`
      SELECT 
        id,
        code,
        name,
        contact_person as "contactPerson",
        email,
        phone,
        billing_address as "billingAddress",
        delivery_address as "deliveryAddress",
        tax_id as "taxId",
        payment_terms as "paymentTerms",
        currency,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM clients
      WHERE LOWER(name) LIKE ${term}
         OR LOWER(code) LIKE ${term}
         OR LOWER(COALESCE(contact_person, '')) LIKE ${term}
         OR LOWER(COALESCE(email, '')) LIKE ${term}
      ORDER BY name ASC
    `;
    return rows as unknown as ClientRecord[];
  }

  const rows = await sql`
    SELECT 
      id,
      code,
      name,
      contact_person as "contactPerson",
      email,
      phone,
      billing_address as "billingAddress",
      delivery_address as "deliveryAddress",
      tax_id as "taxId",
      payment_terms as "paymentTerms",
      currency,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM clients
    ORDER BY name ASC
  `;
  return rows as unknown as ClientRecord[];
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const rows = await sql`
    SELECT 
      id,
      code,
      name,
      contact_person as "contactPerson",
      email,
      phone,
      billing_address as "billingAddress",
      delivery_address as "deliveryAddress",
      tax_id as "taxId",
      payment_terms as "paymentTerms",
      currency,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM clients
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as ClientRecord;
}

export async function createClient(data: {
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  taxId?: string;
  paymentTerms?: string;
  currency?: string;
}): Promise<ClientRecord> {
  const cleanCode = data.code.trim().toUpperCase();
  const rows = await sql`
    INSERT INTO clients (
      code, name, contact_person, email, phone, 
      billing_address, delivery_address, tax_id, 
      payment_terms, currency, is_active
    )
    VALUES (
      ${cleanCode},
      ${data.name.trim()},
      ${data.contactPerson?.trim() || null},
      ${data.email?.trim() || null},
      ${data.phone?.trim() || null},
      ${data.billingAddress?.trim() || null},
      ${data.deliveryAddress?.trim() || null},
      ${data.taxId?.trim() || null},
      ${data.paymentTerms?.trim() || "30_DAYS"},
      ${data.currency?.trim() || "USD"},
      TRUE
    )
    RETURNING 
      id, code, name, contact_person as "contactPerson",
      email, phone, billing_address as "billingAddress",
      delivery_address as "deliveryAddress", tax_id as "taxId",
      payment_terms as "paymentTerms", currency, is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
  `;
  return rows[0] as unknown as ClientRecord;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<ClientRecord, "id" | "createdAt" | "updatedAt">>
): Promise<ClientRecord | null> {
  const rows = await sql`
    UPDATE clients
    SET 
      name = COALESCE(${data.name ?? null}, name),
      contact_person = COALESCE(${data.contactPerson ?? null}, contact_person),
      email = COALESCE(${data.email ?? null}, email),
      phone = COALESCE(${data.phone ?? null}, phone),
      billing_address = COALESCE(${data.billingAddress ?? null}, billing_address),
      delivery_address = COALESCE(${data.deliveryAddress ?? null}, delivery_address),
      tax_id = COALESCE(${data.taxId ?? null}, tax_id),
      payment_terms = COALESCE(${data.paymentTerms ?? null}, payment_terms),
      currency = COALESCE(${data.currency ?? null}, currency),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING 
      id, code, name, contact_person as "contactPerson",
      email, phone, billing_address as "billingAddress",
      delivery_address as "deliveryAddress", tax_id as "taxId",
      payment_terms as "paymentTerms", currency, is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as ClientRecord;
}

/**
 * Concurrency-safe atomic generation of per-client quotation internal reference.
 * Prevents race conditions and duplicate sequences. Never reuses sequence numbers.
 */
export async function getNextQuotationReference(
  clientId: string,
  docType: "QUOTATION" | "PROFORMA"
): Promise<{ reference: string; sequenceNumber: number; year: number }> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error(`Client ID introuvable: ${clientId}`);
  }

  const currentYear = new Date().getFullYear();

  const seqRows = await sql`
    INSERT INTO client_quotation_sequences (client_id, year, last_sequence)
    VALUES (${clientId}, ${currentYear}, 1)
    ON CONFLICT (client_id, year)
    DO UPDATE SET 
      last_sequence = client_quotation_sequences.last_sequence + 1,
      updated_at = NOW()
    RETURNING last_sequence as "lastSequence";
  `;

  const seqNum = Number(seqRows[0].lastSequence);
  const paddedSeq = String(seqNum).padStart(3, "0");
  const prefix = docType === "PROFORMA" ? "PRO" : "DEV";
  const reference = `MIS/${prefix}/${client.code}/${currentYear}/${paddedSeq}`;

  return {
    reference,
    sequenceNumber: seqNum,
    year: currentYear,
  };
}
