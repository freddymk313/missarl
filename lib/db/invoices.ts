// ============================================================================
// Sales Invoices Repository (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";
import { getOrderById } from "@/lib/db/orders";
import { logAudit } from "@/lib/db/audit";

export interface InvoiceLineItem {
  id: string;
  orderItemId: string | null;
  itemId: string | null;
  lineNumber: number;
  description: string;
  unit: string;
  brand?: string | null;
  discountPercent?: number;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  lineTotal?: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  normalizedInvoiceNumber?: string | null;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  orderId: string | null;
  orderNumber?: string | null;
  clientPoNumber?: string | null;
  deliveryNoteId?: string | null;
  deliveryNoteNumber?: string | null;
  quotationId: string | null;
  quotationReference?: string | null;
  clientRfqNumber?: string | null;
  issueDate: string;
  dueDate: string;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  currency: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentTerms: string | null;
  notes: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceLineItem[];
}

export async function getInvoices(options?: {
  clientId?: string;
  status?: string;
  search?: string;
}): Promise<InvoiceRecord[]> {
  const clientId = options?.clientId || null;
  const status = options?.status || null;
  const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;

  let rows: Record<string, unknown>[];
  try {
    rows = (await sql`
      SELECT 
        i.id,
        i.invoice_number as "invoiceNumber",
        i.normalized_invoice_number as "normalizedInvoiceNumber",
        i.client_id as "clientId",
        c.code as "clientCode",
        c.name as "clientName",
        i.order_id as "orderId",
        o.order_number as "orderNumber",
        o.client_po_number as "clientPoNumber",
        dn.id as "deliveryNoteId",
        dn.bl_number as "deliveryNoteNumber",
        i.quotation_id as "quotationId",
        q.internal_reference as "quotationReference",
        q.client_rfq_number as "clientRfqNumber",
        i.issue_date::text as "issueDate",
        i.due_date::text as "dueDate",
        i.status,
        i.currency,
        i.subtotal::float as subtotal,
        i.vat_rate::float as "vatRate",
        i.vat_amount::float as "vatAmount",
        i.total::float as total,
        i.paid_amount::float as "paidAmount",
        i.balance_due::float as "balanceDue",
        i.payment_terms as "paymentTerms",
        i.notes,
        i.cancellation_reason as "cancellationReason",
        i.created_by as "createdBy",
        u.full_name as "createdByName",
        i.created_at as "createdAt",
        i.updated_at as "updatedAt"
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN quotations q ON i.quotation_id = q.id
      LEFT JOIN delivery_notes dn ON dn.invoice_id = i.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE (${clientId}::uuid IS NULL OR i.client_id = ${clientId}::uuid)
        AND (${status}::text IS NULL OR i.status = ${status})
        AND (${searchTerm}::text IS NULL OR 
             LOWER(i.invoice_number) LIKE ${searchTerm} OR 
             LOWER(c.name) LIKE ${searchTerm} OR
             LOWER(COALESCE(o.order_number, '')) LIKE ${searchTerm} OR
             LOWER(COALESCE(o.client_po_number, '')) LIKE ${searchTerm} OR
             LOWER(COALESCE(dn.bl_number, '')) LIKE ${searchTerm})
      ORDER BY i.created_at DESC
    `) as Record<string, unknown>[];
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
      rows = (await sql`
        SELECT 
          i.id,
          i.invoice_number as "invoiceNumber",
          NULL::text as "normalizedInvoiceNumber",
          i.client_id as "clientId",
          c.code as "clientCode",
          c.name as "clientName",
          i.order_id as "orderId",
          o.order_number as "orderNumber",
          o.client_po_number as "clientPoNumber",
          dn.id as "deliveryNoteId",
          dn.bl_number as "deliveryNoteNumber",
          i.quotation_id as "quotationId",
          q.internal_reference as "quotationReference",
          q.client_rfq_number as "clientRfqNumber",
          i.issue_date::text as "issueDate",
          i.due_date::text as "dueDate",
          i.status,
          i.currency,
          i.subtotal::float as subtotal,
          i.vat_rate::float as "vatRate",
          i.vat_amount::float as "vatAmount",
          i.total::float as total,
          i.paid_amount::float as "paidAmount",
          i.balance_due::float as "balanceDue",
          i.payment_terms as "paymentTerms",
          i.notes,
          i.cancellation_reason as "cancellationReason",
          i.created_by as "createdBy",
          u.full_name as "createdByName",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt"
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN quotations q ON i.quotation_id = q.id
        LEFT JOIN delivery_notes dn ON dn.invoice_id = i.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE (${clientId}::uuid IS NULL OR i.client_id = ${clientId}::uuid)
          AND (${status}::text IS NULL OR i.status = ${status})
          AND (${searchTerm}::text IS NULL OR 
               LOWER(i.invoice_number) LIKE ${searchTerm} OR 
               LOWER(c.name) LIKE ${searchTerm} OR
               LOWER(COALESCE(o.order_number, '')) LIKE ${searchTerm} OR
               LOWER(COALESCE(o.client_po_number, '')) LIKE ${searchTerm} OR
               LOWER(COALESCE(dn.bl_number, '')) LIKE ${searchTerm})
        ORDER BY i.created_at DESC
      `) as Record<string, unknown>[];
    } else {
      throw err;
    }
  }

  return rows as unknown as InvoiceRecord[];
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  let rows: Record<string, unknown>[];
  try {
    rows = (await sql`
      SELECT 
        i.id,
        i.invoice_number as "invoiceNumber",
        i.normalized_invoice_number as "normalizedInvoiceNumber",
        i.client_id as "clientId",
        c.code as "clientCode",
        c.name as "clientName",
        c.email as "clientEmail",
        c.phone as "clientPhone",
        c.billing_address as "clientBillingAddress",
        c.tax_id as "clientTaxId",
        i.order_id as "orderId",
        o.order_number as "orderNumber",
        o.client_po_number as "clientPoNumber",
        dn.id as "deliveryNoteId",
        dn.bl_number as "deliveryNoteNumber",
        i.quotation_id as "quotationId",
        q.internal_reference as "quotationReference",
        q.client_rfq_number as "clientRfqNumber",
        i.issue_date::text as "issueDate",
        i.due_date::text as "dueDate",
        i.status,
        i.currency,
        i.subtotal::float as subtotal,
        i.vat_rate::float as "vatRate",
        i.vat_amount::float as "vatAmount",
        i.total::float as total,
        i.paid_amount::float as "paidAmount",
        i.balance_due::float as "balanceDue",
        i.payment_terms as "paymentTerms",
        i.notes,
        i.cancellation_reason as "cancellationReason",
        i.created_by as "createdBy",
        u.full_name as "createdByName",
        i.created_at as "createdAt",
        i.updated_at as "updatedAt"
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN quotations q ON i.quotation_id = q.id
      LEFT JOIN delivery_notes dn ON dn.invoice_id = i.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE (i.id::text = ${id} OR i.invoice_number = ${id} OR i.normalized_invoice_number = ${id})
      LIMIT 1
    `) as Record<string, unknown>[];
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
      rows = (await sql`
        SELECT 
          i.id,
          i.invoice_number as "invoiceNumber",
          NULL::text as "normalizedInvoiceNumber",
          i.client_id as "clientId",
          c.code as "clientCode",
          c.name as "clientName",
          c.email as "clientEmail",
          c.phone as "clientPhone",
          c.billing_address as "clientBillingAddress",
          c.tax_id as "clientTaxId",
          i.order_id as "orderId",
          o.order_number as "orderNumber",
          o.client_po_number as "clientPoNumber",
          dn.id as "deliveryNoteId",
          dn.bl_number as "deliveryNoteNumber",
          i.quotation_id as "quotationId",
          q.internal_reference as "quotationReference",
          q.client_rfq_number as "clientRfqNumber",
          i.issue_date::text as "issueDate",
          i.due_date::text as "dueDate",
          i.status,
          i.currency,
          i.subtotal::float as subtotal,
          i.vat_rate::float as "vatRate",
          i.vat_amount::float as "vatAmount",
          i.total::float as total,
          i.paid_amount::float as "paidAmount",
          i.balance_due::float as "balanceDue",
          i.payment_terms as "paymentTerms",
          i.notes,
          i.cancellation_reason as "cancellationReason",
          i.created_by as "createdBy",
          u.full_name as "createdByName",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt"
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN quotations q ON i.quotation_id = q.id
        LEFT JOIN delivery_notes dn ON dn.invoice_id = i.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE (i.id::text = ${id} OR i.invoice_number = ${id})
        LIMIT 1
      `) as Record<string, unknown>[];
    } else {
      throw err;
    }
  }

  if (!rows || rows.length === 0) return null;
  const invoice = rows[0] as unknown as InvoiceRecord;

  let itemRows: unknown[] = [];
  try {
    itemRows = await sql`
      SELECT 
        id,
        order_item_id as "orderItemId",
        item_id as "itemId",
        line_number as "lineNumber",
        description_snapshot as "description",
        unit_snapshot as "unit",
        brand_snapshot as "brand",
        COALESCE(discount_percent_snapshot, 0)::float as "discountPercent",
        quantity::float as "quantity",
        unit_price_snapshot::float as "unitPrice",
        line_subtotal::float as "lineSubtotal",
        line_subtotal::float as "lineTotal"
      FROM invoice_items
      WHERE invoice_id = ${invoice.id}
      ORDER BY line_number ASC
    `;
  } catch {
    try {
      itemRows = await sql`
        SELECT 
          id,
          order_item_id as "orderItemId",
          item_id as "itemId",
          line_number as "lineNumber",
          description_snapshot as "description",
          unit_snapshot as "unit",
          NULL as "brand",
          0::float as "discountPercent",
          quantity::float as "quantity",
          unit_price_snapshot::float as "unitPrice",
          line_subtotal::float as "lineSubtotal",
          line_subtotal::float as "lineTotal"
        FROM invoice_items
        WHERE invoice_id = ${invoice.id}
        ORDER BY line_number ASC
      `;
    } catch (fallbackErr) {
      console.error("[DB] getInvoiceById fallback items query failed:", fallbackErr);
      throw fallbackErr;
    }
  }

  invoice.items = itemRows as unknown as InvoiceLineItem[];
  return invoice;
}

export async function createInvoiceFromOrder(data: {
  orderId: string;
  dueDays?: number;
  notes?: string;
  userId: string;
}): Promise<InvoiceRecord> {
  const order = await getOrderById(data.orderId);
  if (!order) throw new Error("Commande introuvable.");

  if (order.status === "CANCELLED") {
    throw new Error("Impossible de facturer une commande annulée.");
  }

  if (!order.items || order.items.length === 0) {
    throw new Error("La commande ne contient aucune ligne d'article.");
  }

  // Generate sequential invoice number (format: 009/026/FAC)
  const currentYear = new Date().getFullYear();
  const yearCode = "0" + String(currentYear).slice(-2);
  let invoiceNumber: string;
  try {
    const invCounterRows = await sql`
      INSERT INTO document_counters (doc_type, year, current_val)
      VALUES ('INVOICE', ${currentYear}, 1)
      ON CONFLICT (doc_type, year)
      DO UPDATE SET current_val = document_counters.current_val + 1, updated_at = NOW()
      RETURNING current_val;
    `;
    const nextSeqFAC = invCounterRows[0]?.current_val ?? 1;
    invoiceNumber = `${String(nextSeqFAC).padStart(3, "0")}/${yearCode}/FAC`;
  } catch {
    const countRows = await sql`
      SELECT COUNT(*)::int as count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
    `;
    const nextSeqFAC = (Number(countRows[0]?.count) || 0) + 1;
    invoiceNumber = `${String(nextSeqFAC).padStart(3, "0")}/${yearCode}/FAC`;
  }

  const dueDays = data.dueDays ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invoiceRows = await sql`
    INSERT INTO invoices (
      invoice_number, client_id, order_id, quotation_id,
      issue_date, due_date, status, currency,
      subtotal, vat_rate, vat_amount, total,
      paid_amount, balance_due, notes, created_by
    )
    VALUES (
      ${invoiceNumber},
      ${order.clientId},
      ${order.id},
      ${order.quotationId},
      CURRENT_DATE,
      ${dueDate.toISOString().split("T")[0]},
      'ISSUED',
      ${order.currency},
      ${order.subtotal},
      ${order.vatRate},
      ${order.vatAmount},
      ${order.total},
      0.00,
      ${order.total},
      ${data.notes?.trim() || null},
      ${data.userId}
    )
    RETURNING id;
  `;

  const invoiceId = invoiceRows[0].id as string;

  for (const item of order.items) {
    await sql`
      INSERT INTO invoice_items (
        invoice_id, order_item_id, item_id, line_number,
        description_snapshot, unit_snapshot, quantity,
        unit_price_snapshot, line_subtotal
      )
      VALUES (
        ${invoiceId},
        ${item.id},
        ${item.itemId},
        ${item.lineNumber},
        ${item.description},
        ${item.unit},
        ${item.quantityOrdered},
        ${item.unitPrice},
        ${item.lineTotal}
      )
    `;
  }

  await logAudit({
    userId: data.userId,
    action: "INVOICE_ISSUED_FROM_ORDER",
    entityType: "INVOICE",
    entityId: invoiceId,
    details: {
      invoiceNumber,
      orderNumber: order.orderNumber,
      total: order.total,
    },
  });

  const created = await getInvoiceById(invoiceId);
  return created!;
}

export async function cancelInvoice(
  id: string,
  reason: string,
  userId: string
): Promise<InvoiceRecord | null> {
  const current = await getInvoiceById(id);
  if (!current) throw new Error("Facture introuvable.");

  if (current.status === "PAID" || current.status === "PARTIALLY_PAID") {
    throw new Error(
      "Impossible d'annuler une facture qui a déjà reçu des paiements. Veuillez d'abord révoquer ou réallouer les paiements."
    );
  }

  await sql`
    UPDATE invoices
    SET 
      status = 'CANCELLED',
      cancellation_reason = ${reason.trim()},
      balance_due = 0,
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  await logAudit({
    userId,
    action: "INVOICE_CANCELLED",
    entityType: "INVOICE",
    entityId: id,
    details: {
      invoiceNumber: current.invoiceNumber,
      reason: reason.trim(),
    },
  });

  return getInvoiceById(id);
}

export async function updateInvoiceNormalizedNumber(
  id: string,
  normalizedNumber: string | null,
  userId: string
): Promise<InvoiceRecord | null> {
  const current = await getInvoiceById(id);
  if (!current) {
    throw new Error("Facture introuvable.");
  }

  const trimmed = normalizedNumber?.trim() || null;

  try {
    await sql`
      UPDATE invoices
      SET 
        normalized_invoice_number = ${trimmed},
        updated_by = ${userId},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
      await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS normalized_invoice_number VARCHAR(150);`;
      await sql`
        UPDATE invoices
        SET 
          normalized_invoice_number = ${trimmed},
          updated_by = ${userId},
          updated_at = NOW()
        WHERE id = ${id}
      `;
    } else {
      throw err;
    }
  }

  await logAudit({
    userId,
    action: "UPDATE_INVOICE_NORMALIZED_NUMBER",
    entityType: "INVOICE",
    entityId: id,
    details: {
      invoiceNumber: current.invoiceNumber,
      normalizedInvoiceNumber: trimmed,
    },
  });

  return getInvoiceById(id);
}
