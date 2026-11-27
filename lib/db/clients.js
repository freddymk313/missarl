"use strict";
// ============================================================================
// Clients Repository & Atomic Quotation Sequence Service
// Direct SQL via Neon PostgreSQL
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClients = getClients;
exports.getClientById = getClientById;
exports.createClient = createClient;
exports.updateClient = updateClient;
exports.deleteClient = deleteClient;
exports.getNextQuotationReference = getNextQuotationReference;
exports.peekNextQuotationReference = peekNextQuotationReference;
const db_1 = require("@/lib/db");
async function getClients(search) {
    if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        const rows = await (0, db_1.sql) `
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
        return rows;
    }
    const rows = await (0, db_1.sql) `
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
    return rows;
}
async function getClientById(id) {
    const rows = await (0, db_1.sql) `
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
    if (!rows || rows.length === 0)
        return null;
    return rows[0];
}
async function createClient(data) {
    const cleanCode = data.code.trim().toUpperCase();
    const rows = await (0, db_1.sql) `
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
    return rows[0];
}
async function updateClient(id, data) {
    const rows = await (0, db_1.sql) `
    UPDATE clients
    SET 
      code = COALESCE(${data.code ? data.code.trim().toUpperCase() : null}, code),
      name = COALESCE(${data.name ?? null}, name),
      contact_person = COALESCE(${data.contactPerson ?? null}, contact_person),
      email = COALESCE(${data.email ?? null}, email),
      phone = COALESCE(${data.phone ?? null}, phone),
      billing_address = COALESCE(${data.billingAddress ?? null}, billing_address),
      delivery_address = COALESCE(${data.deliveryAddress ?? null}, delivery_address),
      tax_id = COALESCE(${data.taxId ?? null}, tax_id),
      payment_terms = COALESCE(${data.paymentTerms ?? null}, payment_terms),
      currency = COALESCE(${data.currency ?? null}, currency),
      is_active = COALESCE(${data.isActive !== undefined ? data.isActive : null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING 
      id, code, name, contact_person as "contactPerson",
      email, phone, billing_address as "billingAddress",
      delivery_address as "deliveryAddress", tax_id as "taxId",
      payment_terms as "paymentTerms", currency, is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
  `;
    if (!rows || rows.length === 0)
        return null;
    return rows[0];
}
async function deleteClient(id) {
    await (0, db_1.sql) `DELETE FROM client_quotation_sequences WHERE client_id = ${id}`;
    const rows = await (0, db_1.sql) `
    DELETE FROM clients
    WHERE id = ${id}
    RETURNING id
  `;
    return rows && rows.length > 0;
}
/**
 * Concurrency-safe atomic generation of per-client quotation internal reference.
 * Format: NNNN/YYY/MIS (e.g. 0090/026/MIS for sequence 90 in year 2026).
 * Reconciles the counter with GREATEST(db_counter, max sequence_number, max parsed reference).
 * Never reuses sequence numbers, never decreases the counter.
 */
async function getNextQuotationReference(clientId) {
    const client = await getClientById(clientId);
    if (!client) {
        throw new Error(`Client ID introuvable: ${clientId}`);
    }
    const currentYear = new Date().getFullYear();
    const yearCode = String(currentYear % 1000).padStart(3, "0");
    // Atomic UPSERT: advance counter to GREATEST(db_counter, max_seq_in_quotations, max_parsed_ref) + 1
    const seqRows = await (0, db_1.sql) `
    WITH current_max AS (
      SELECT GREATEST(
        COALESCE((SELECT last_sequence FROM client_quotation_sequences WHERE client_id = ${clientId} AND year = ${currentYear}), 0),
        COALESCE((SELECT MAX(sequence_number) FROM quotations WHERE client_id = ${clientId} AND year = ${currentYear}), 0),
        COALESCE((SELECT MAX(
          CASE
            WHEN internal_reference ~ '^[0-9]{1,6}/'
            THEN CAST(SPLIT_PART(internal_reference, '/', 1) AS INTEGER)
            ELSE 0
          END
        ) FROM quotations WHERE client_id = ${clientId} AND year = ${currentYear}), 0)
      ) AS max_seq
    )
    INSERT INTO client_quotation_sequences (client_id, year, last_sequence)
    VALUES (${clientId}, ${currentYear}, (SELECT max_seq + 1 FROM current_max))
    ON CONFLICT (client_id, year)
    DO UPDATE SET
      last_sequence = GREATEST(
        client_quotation_sequences.last_sequence + 1,
        (SELECT max_seq + 1 FROM current_max)
      ),
      updated_at = NOW()
    RETURNING last_sequence AS "lastSequence"
  `;
    const seqNum = Number(seqRows[0].lastSequence);
    const paddedSeq = String(seqNum).padStart(4, "0");
    const reference = `${paddedSeq}/${yearCode}/MIS`;
    return {
        reference,
        sequenceNumber: seqNum,
        year: currentYear,
    };
}
/**
 * Peek at the next expected quotation reference WITHOUT consuming/incrementing the counter.
 * Safe to call when displaying the form — does not reserve any number.
 */
async function peekNextQuotationReference(clientId) {
    const client = await getClientById(clientId);
    if (!client) {
        throw new Error(`Client ID introuvable: ${clientId}`);
    }
    const currentYear = new Date().getFullYear();
    const yearCode = String(currentYear % 1000).padStart(3, "0");
    const rows = await (0, db_1.sql) `
    SELECT GREATEST(
      COALESCE((SELECT last_sequence FROM client_quotation_sequences WHERE client_id = ${clientId} AND year = ${currentYear}), 0),
      COALESCE((SELECT MAX(sequence_number) FROM quotations WHERE client_id = ${clientId} AND year = ${currentYear}), 0),
      COALESCE((SELECT MAX(
        CASE
          WHEN internal_reference ~ '^[0-9]{1,6}/'
          THEN CAST(SPLIT_PART(internal_reference, '/', 1) AS INTEGER)
          ELSE 0
        END
      ) FROM quotations WHERE client_id = ${clientId} AND year = ${currentYear}), 0)
    ) + 1 AS next_seq
  `;
    const seqNum = Number(rows[0].next_seq) || 1;
    const paddedSeq = String(seqNum).padStart(4, "0");
    return {
        reference: `${paddedSeq}/${yearCode}/MIS`,
        sequenceNumber: seqNum,
        year: currentYear,
    };
}
