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
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  orderId: string | null;
  orderNumber?: string | null;
  quotationId: string | null;
  quotationReference?: string | null;
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

  const rows = await sql`
    SELECT 
      i.id,
      i.invoice_number as "invoiceNumber",
      i.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      i.order_id as "orderId",
      o.order_number as "orderNumber",
      i.quotation_id as "quotationId",
      q.internal_reference as "quotationReference",
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
    LEFT JOIN users u ON i.created_by = u.id
    WHERE (${clientId}::uuid IS NULL OR i.client_id = ${clientId}::uuid)
      AND (${status}::text IS NULL OR i.status = ${status})
      AND (${searchTerm}::text IS NULL OR 
           LOWER(i.invoice_number) LIKE ${searchTerm} OR 
           LOWER(c.name) LIKE ${searchTerm} OR
           LOWER(COALESCE(o.order_number, '')) LIKE ${searchTerm})
    ORDER BY i.created_at DESC
  `;

  return rows as unknown as InvoiceRecord[];
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  const rows = await sql`
    SELECT 
      i.id,
      i.invoice_number as "invoiceNumber",
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
      i.quotation_id as "quotationId",
      q.internal_reference as "quotationReference",
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
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const invoice = rows[0] as unknown as InvoiceRecord;

  const itemRows = await sql`
    SELECT 
      id,
      order_item_id as "orderItemId",
      item_id as "itemId",
      line_number as "lineNumber",
      description_snapshot as "description",
      unit_snapshot as "unit",
      quantity::float as "quantity",
      unit_price_snapshot::float as "unitPrice",
      line_subtotal::float as "lineSubtotal"
    FROM invoice_items
    WHERE invoice_id = ${id}
    ORDER BY line_number ASC
  `;

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

  // Generate sequential invoice number
  const currentYear = new Date().getFullYear();
  const countRows = await sql`
    SELECT COUNT(*)::int as count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
  `;
  const nextSeq = (countRows[0].count as number) + 1;
  const invoiceNumber = `MIS/FAC/${currentYear}/${String(nextSeq).padStart(3, "0")}`;

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
