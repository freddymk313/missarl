// ============================================================================
// Customer Purchase Orders Repository (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";
import { getQuotationById } from "@/lib/db/quotations";
import { logAudit } from "@/lib/db/audit";

export interface OrderLineItem {
  id: string;
  quotationItemId: string | null;
  itemId: string | null;
  lineNumber: number;
  description: string;
  unit: string;
  quantityOrdered: number;
  quantityDelivered: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  quotationId: string;
  quotationReference?: string;
  clientPoNumber: string;
  poDate: string;
  expectedDeliveryDate: string | null;
  status: "PENDING" | "CONFIRMED" | "PARTIALLY_DELIVERED" | "COMPLETED" | "CANCELLED";
  currency: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderLineItem[];
}

export async function getOrders(options?: {
  clientId?: string;
  status?: string;
  search?: string;
}): Promise<OrderRecord[]> {
  const clientId = options?.clientId || null;
  const status = options?.status || null;
  const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;

  const rows = await sql`
    SELECT 
      o.id,
      o.order_number as "orderNumber",
      o.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      o.quotation_id as "quotationId",
      q.internal_reference as "quotationReference",
      o.client_po_number as "clientPoNumber",
      o.po_date::text as "poDate",
      o.expected_delivery_date::text as "expectedDeliveryDate",
      o.status,
      o.currency,
      o.subtotal::float as subtotal,
      o.vat_rate::float as "vatRate",
      o.vat_amount::float as "vatAmount",
      o.total::float as total,
      o.notes,
      o.cancellation_reason as "cancellationReason",
      o.created_by as "createdBy",
      u.full_name as "createdByName",
      o.created_at as "createdAt",
      o.updated_at as "updatedAt"
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN quotations q ON o.quotation_id = q.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE (${clientId}::uuid IS NULL OR o.client_id = ${clientId}::uuid)
      AND (${status}::text IS NULL OR o.status = ${status})
      AND (${searchTerm}::text IS NULL OR 
           LOWER(o.order_number) LIKE ${searchTerm} OR 
           LOWER(o.client_po_number) LIKE ${searchTerm} OR 
           LOWER(c.name) LIKE ${searchTerm})
    ORDER BY o.created_at DESC
  `;

  return rows as unknown as OrderRecord[];
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const rows = await sql`
    SELECT 
      o.id,
      o.order_number as "orderNumber",
      o.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      c.email as "clientEmail",
      c.phone as "clientPhone",
      o.quotation_id as "quotationId",
      q.internal_reference as "quotationReference",
      o.client_po_number as "clientPoNumber",
      o.po_date::text as "poDate",
      o.expected_delivery_date::text as "expectedDeliveryDate",
      o.status,
      o.currency,
      o.subtotal::float as subtotal,
      o.vat_rate::float as "vatRate",
      o.vat_amount::float as "vatAmount",
      o.total::float as total,
      o.notes,
      o.cancellation_reason as "cancellationReason",
      o.created_by as "createdBy",
      u.full_name as "createdByName",
      o.created_at as "createdAt",
      o.updated_at as "updatedAt"
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN quotations q ON o.quotation_id = q.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const order = rows[0] as unknown as OrderRecord;

  const itemRows = await sql`
    SELECT 
      id,
      quotation_item_id as "quotationItemId",
      item_id as "itemId",
      line_number as "lineNumber",
      description_snapshot as "description",
      unit_snapshot as "unit",
      quantity_ordered::float as "quantityOrdered",
      quantity_delivered::float as "quantityDelivered",
      unit_price_snapshot::float as "unitPrice",
      line_subtotal::float as "lineTotal"
    FROM order_items
    WHERE order_id = ${id}
    ORDER BY line_number ASC
  `;

  order.items = itemRows as unknown as OrderLineItem[];
  return order;
}

export async function createOrderFromQuotation(data: {
  quotationId: string;
  clientPoNumber: string;
  expectedDeliveryDate?: string;
  notes?: string;
  userId: string;
}): Promise<OrderRecord> {
  // 1. Fetch & validate quotation
  const quote = await getQuotationById(data.quotationId);
  if (!quote) throw new Error("Devis introuvable.");

  if (quote.status !== "VALIDATED") {
    throw new Error(
      `Impossible de créer un bon de commande : le devis ${quote.internalReference} a le statut ${quote.status}. Il doit être VALIDÉ.`
    );
  }

  if (!quote.items || quote.items.length === 0) {
    throw new Error("Le devis ne contient aucune ligne.");
  }

  // 2. Generate sequential order number
  const currentYear = new Date().getFullYear();
  const countRows = await sql`
    SELECT COUNT(*)::int as count FROM orders WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
  `;
  const nextSeq = (countRows[0].count as number) + 1;
  const orderNumber = `MIS/BC/${currentYear}/${String(nextSeq).padStart(3, "0")}`;

  // 3. Insert order header
  const orderRows = await sql`
    INSERT INTO orders (
      order_number, client_id, quotation_id, client_po_number,
      po_date, expected_delivery_date, status, currency,
      subtotal, vat_rate, vat_amount, total, notes, created_by
    )
    VALUES (
      ${orderNumber},
      ${quote.clientId},
      ${quote.id},
      ${data.clientPoNumber.trim()},
      CURRENT_DATE,
      ${data.expectedDeliveryDate || null},
      'CONFIRMED',
      ${quote.currency},
      ${quote.subtotal},
      ${quote.vatRate},
      ${quote.vatAmount},
      ${quote.total},
      ${data.notes?.trim() || null},
      ${data.userId}
    )
    RETURNING id;
  `;

  const orderId = orderRows[0].id as string;

  // 4. Insert lines
  for (const item of quote.items) {
    await sql`
      INSERT INTO order_items (
        order_id, quotation_item_id, item_id, line_number,
        description_snapshot, unit_snapshot, quantity_ordered,
        quantity_delivered, unit_price_snapshot, line_subtotal
      )
      VALUES (
        ${orderId},
        ${item.id || null},
        ${item.itemId || null},
        ${item.lineNumber},
        ${item.description},
        ${item.unit},
        ${item.quantity},
        0,
        ${item.unitPrice},
        ${item.lineSubtotal}
      )
    `;
  }

  // 5. Audit log
  await logAudit({
    userId: data.userId,
    action: "ORDER_CREATED_FROM_QUOTATION",
    entityType: "ORDER",
    entityId: orderId,
    details: {
      orderNumber,
      clientPoNumber: data.clientPoNumber,
      quotationReference: quote.internalReference,
      total: quote.total,
    },
  });

  const created = await getOrderById(orderId);
  return created!;
}

export async function updateOrderStatus(
  id: string,
  status: "PENDING" | "CONFIRMED" | "PARTIALLY_DELIVERED" | "COMPLETED" | "CANCELLED",
  userId: string,
  cancellationReason?: string
): Promise<OrderRecord | null> {
  const current = await getOrderById(id);
  if (!current) throw new Error("Commande introuvable.");

  if (current.status === "CANCELLED") {
    throw new Error("Une commande annulée ne peut plus être modifiée.");
  }

  await sql`
    UPDATE orders
    SET 
      status = ${status},
      cancellation_reason = COALESCE(${cancellationReason ?? null}, cancellation_reason),
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  await logAudit({
    userId,
    action: `ORDER_STATUS_${status}`,
    entityType: "ORDER",
    entityId: id,
    details: {
      previousStatus: current.status,
      newStatus: status,
      cancellationReason,
    },
  });

  return getOrderById(id);
}
