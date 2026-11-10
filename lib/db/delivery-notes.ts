// ============================================================================
// Delivery Notes & Delivery Batches Repository (Direct SQL)
// Manages Bons de Livraison (BL), associated Invoice generation,
// quantity allocations and physical delivery tracking.
// ============================================================================

import { sql } from "@/lib/db";
import { getOrderById } from "@/lib/db/orders";
import { logAudit } from "@/lib/db/audit";

export interface DeliveryNoteLineItem {
  id: string;
  deliveryNoteId: string;
  orderItemId: string;
  itemId: string | null;
  lineNumber: number;
  description: string;
  unit: string;
  brand?: string | null;
  quantityDelivered: number;
  observation?: string | null;
}

export interface DeliveryNoteRecord {
  id: string;
  blNumber: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  orderId: string;
  orderNumber?: string;
  clientPoNumber?: string;
  quotationReference?: string;
  clientRfqNumber?: string;
  invoiceId: string | null;
  invoiceNumber?: string | null;
  deliveryDate: string;
  carrierName: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
  receiverName: string | null;
  status: "PREPARED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  notes: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: DeliveryNoteLineItem[];
}

export interface DeliveryBatchItemInput {
  orderItemId: string;
  quantity: number;
  observation?: string;
}

/**
 * Retrieves delivery notes with optional filters.
 */
export async function getDeliveryNotes(options?: {
  orderId?: string;
  clientId?: string;
  status?: string;
  search?: string;
}): Promise<DeliveryNoteRecord[]> {
  const orderId = options?.orderId || null;
  const clientId = options?.clientId || null;
  const status = options?.status || null;
  const searchTerm = options?.search?.trim()
    ? `%${options.search.trim().toLowerCase()}%`
    : null;

  const rows = await sql`
    SELECT 
      dn.id,
      dn.bl_number as "blNumber",
      dn.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      dn.order_id as "orderId",
      o.order_number as "orderNumber",
      o.client_po_number as "clientPoNumber",
      q.internal_reference as "quotationReference",
      q.client_rfq_number as "clientRfqNumber",
      dn.invoice_id as "invoiceId",
      i.invoice_number as "invoiceNumber",
      dn.delivery_date::text as "deliveryDate",
      dn.carrier_name as "carrierName",
      dn.driver_name as "driverName",
      dn.vehicle_plate as "vehiclePlate",
      dn.receiver_name as "receiverName",
      dn.status,
      dn.notes,
      dn.cancellation_reason as "cancellationReason",
      dn.created_by as "createdBy",
      u.full_name as "createdByName",
      dn.created_at as "createdAt",
      dn.updated_at as "updatedAt"
    FROM delivery_notes dn
    JOIN clients c ON dn.client_id = c.id
    JOIN orders o ON dn.order_id = o.id
    JOIN quotations q ON o.quotation_id = q.id
    LEFT JOIN invoices i ON dn.invoice_id = i.id
    LEFT JOIN users u ON dn.created_by = u.id
    WHERE (${orderId}::uuid IS NULL OR dn.order_id = ${orderId}::uuid)
      AND (${clientId}::uuid IS NULL OR dn.client_id = ${clientId}::uuid)
      AND (${status}::text IS NULL OR dn.status = ${status})
      AND (${searchTerm}::text IS NULL OR 
           LOWER(dn.bl_number) LIKE ${searchTerm} OR 
           LOWER(o.order_number) LIKE ${searchTerm} OR 
           LOWER(o.client_po_number) LIKE ${searchTerm} OR 
           LOWER(c.name) LIKE ${searchTerm})
    ORDER BY dn.created_at DESC
  `;

  return rows as unknown as DeliveryNoteRecord[];
}

/**
 * Retrieves a single delivery note by ID, including its line items.
 */
export async function getDeliveryNoteById(
  id: string
): Promise<DeliveryNoteRecord | null> {
  const rows = await sql`
    SELECT 
      dn.id,
      dn.bl_number as "blNumber",
      dn.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      c.email as "clientEmail",
      c.phone as "clientPhone",
      dn.order_id as "orderId",
      o.order_number as "orderNumber",
      o.client_po_number as "clientPoNumber",
      q.internal_reference as "quotationReference",
      q.client_rfq_number as "clientRfqNumber",
      dn.invoice_id as "invoiceId",
      i.invoice_number as "invoiceNumber",
      dn.delivery_date::text as "deliveryDate",
      dn.carrier_name as "carrierName",
      dn.driver_name as "driverName",
      dn.vehicle_plate as "vehiclePlate",
      dn.receiver_name as "receiverName",
      dn.status,
      dn.notes,
      dn.cancellation_reason as "cancellationReason",
      dn.created_by as "createdBy",
      u.full_name as "createdByName",
      dn.created_at as "createdAt",
      dn.updated_at as "updatedAt"
    FROM delivery_notes dn
    JOIN clients c ON dn.client_id = c.id
    JOIN orders o ON dn.order_id = o.id
    JOIN quotations q ON o.quotation_id = q.id
    LEFT JOIN invoices i ON dn.invoice_id = i.id
    LEFT JOIN users u ON dn.created_by = u.id
    WHERE dn.id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const bl = rows[0] as unknown as DeliveryNoteRecord;

  const itemRows = await sql`
    SELECT 
      dni.id,
      dni.delivery_note_id as "deliveryNoteId",
      dni.order_item_id as "orderItemId",
      dni.item_id as "itemId",
      dni.line_number as "lineNumber",
      dni.description_snapshot as "description",
      dni.unit_snapshot as "unit",
      COALESCE(oi.brand_snapshot, it.brand) as "brand",
      dni.quantity_delivered::float as "quantityDelivered",
      COALESCE(dni.observation_snapshot, '') as "observation"
    FROM delivery_note_items dni
    JOIN order_items oi ON dni.order_item_id = oi.id
    LEFT JOIN items it ON dni.item_id = it.id
    WHERE dni.delivery_note_id = ${id}
    ORDER BY dni.line_number ASC
  `;

  bl.items = itemRows as unknown as DeliveryNoteLineItem[];
  return bl;
}

/**
 * Computes allocation numbers for an order:
 * Ordered, Delivered (DELIVERED status), Reserved (PREPARED or IN_TRANSIT), and Available.
 */
export async function getOrderAllocations(orderId: string): Promise<
  Record<
    string,
    {
      ordered: number;
      delivered: number;
      reserved: number;
      available: number;
    }
  >
> {
  const itemAllocRows = await sql`
    SELECT 
      dni.order_item_id as "orderItemId",
      dn.status as "blStatus",
      COALESCE(SUM(dni.quantity_delivered), 0)::float as "qty"
    FROM delivery_note_items dni
    JOIN delivery_notes dn ON dni.delivery_note_id = dn.id
    WHERE dn.order_id = ${orderId}
      AND dn.status != 'CANCELLED'
    GROUP BY dni.order_item_id, dn.status
  `;

  const order = await getOrderById(orderId);
  const result: Record<
    string,
    { ordered: number; delivered: number; reserved: number; available: number }
  > = {};

  if (!order || !order.items) return result;

  for (const item of order.items) {
    result[item.id] = {
      ordered: item.quantityOrdered,
      delivered: 0,
      reserved: 0,
      available: item.quantityOrdered,
    };
  }

  for (const row of itemAllocRows as unknown as { orderItemId: string; blStatus: string; qty: number }[]) {
    if (result[row.orderItemId]) {
      if (row.blStatus === "DELIVERED") {
        result[row.orderItemId].delivered += row.qty;
      } else if (row.blStatus === "PREPARED" || row.blStatus === "IN_TRANSIT") {
        result[row.orderItemId].reserved += row.qty;
      }
    }
  }

  for (const id of Object.keys(result)) {
    const totalAllocated = result[id].delivered + result[id].reserved;
    result[id].available = Math.max(0, result[id].ordered - totalAllocated);
  }

  return result;
}

/**
 * Creates one new delivery note and one new associated invoice as a single delivery batch.
 * Concurrency-safe: verifies remaining available quantity inside atomic check.
 */
export async function createDeliveryBatch(data: {
  orderId: string;
  deliveryDate?: string;
  carrierName?: string;
  driverName?: string;
  vehiclePlate?: string;
  receiverName?: string;
  notes?: string;
  dueDays?: number;
  items: DeliveryBatchItemInput[];
  userId: string;
}): Promise<{ deliveryNote: DeliveryNoteRecord; invoiceId: string; invoiceNumber: string }> {
  // 1. Fetch & validate order
  const order = await getOrderById(data.orderId);
  if (!order) throw new Error("Commande introuvable.");

  if (order.status === "CANCELLED") {
    throw new Error("Impossible de préparer une livraison sur une commande annulée.");
  }

  if (!order.items || order.items.length === 0) {
    throw new Error("La commande ne contient aucune ligne.");
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("Veuillez sélectionner au moins un article à livrer.");
  }

  // 2. Fetch current allocations to ensure non-over-allocation
  const allocations = await getOrderAllocations(data.orderId);

  // Validate items & calculate batch totals
  const orderItemMap = new Map(order.items.map((it) => [it.id, it]));
  const seenOrderItemIds = new Set<string>();

  interface ValidatedDeliveryItem {
    orderItem: (typeof order.items)[0];
    quantityToDeliver: number;
    observation: string;
    lineSubtotal: number;
  }

  const validatedItems: ValidatedDeliveryItem[] = [];
  let batchSubtotal = 0;

  for (const input of data.items) {
    if (seenOrderItemIds.has(input.orderItemId)) {
      throw new Error("Ligne d'article dupliquée dans la demande de livraison.");
    }
    seenOrderItemIds.add(input.orderItemId);

    const orderItem = orderItemMap.get(input.orderItemId);
    if (!orderItem) {
      throw new Error(`L'article ${input.orderItemId} n'appartient pas à cette commande.`);
    }

    const available = allocations[orderItem.id]?.available ?? 0;
    const qty = Number(input.quantity);

    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Quantité invalide pour l'article ${orderItem.lineNumber}.`);
    }

    if (qty > available + 0.0001) {
      throw new Error(
        `Quantité demandée (${qty}) supérieure au disponible (${available}) pour l'article ${orderItem.lineNumber} (${orderItem.description}).`
      );
    }

    // Cumulative rounding reconciliation:
    // If delivering all remaining available items of this order line, reconcile with lineTotal
    const isFinalDeliveryOfLine = Math.abs(qty - available) < 0.0001 && available > 0;
    const discount = orderItem.discountPercent || 0;
    let lineSubtotal = Math.round(qty * orderItem.unitPrice * (1 - discount / 100) * 100) / 100;

    if (isFinalDeliveryOfLine) {
      // Find previously invoiced amount for this order item
      const invoicedRows = await sql`
        SELECT COALESCE(SUM(line_subtotal), 0)::float as "prevSubtotal"
        FROM invoice_items ii
        JOIN invoices inv ON ii.invoice_id = inv.id
        WHERE ii.order_item_id = ${orderItem.id}
          AND inv.status != 'CANCELLED'
      `;
      const prevSubtotal = (invoicedRows[0]?.prevSubtotal as number) || 0;
      const expectedRemainder = Math.round((orderItem.lineTotal - prevSubtotal) * 100) / 100;
      if (expectedRemainder > 0) {
        lineSubtotal = expectedRemainder;
      }
    }

    batchSubtotal = Math.round((batchSubtotal + lineSubtotal) * 100) / 100;

    validatedItems.push({
      orderItem,
      quantityToDeliver: qty,
      observation: input.observation?.trim() || "",
      lineSubtotal,
    });
  }

  // 3. Financial calculations for this batch only
  const vatRate = order.vatRate || 16.0;
  const vatAmount = Math.round(batchSubtotal * (vatRate / 100) * 100) / 100;
  const batchTotal = Math.round((batchSubtotal + vatAmount) * 100) / 100;

  const currentYear = new Date().getFullYear();

  // 4. Concurrency-safe sequential numbering
  const blCounterRows = await sql`
    INSERT INTO document_counters (doc_type, year, current_val)
    VALUES ('DELIVERY_NOTE', ${currentYear}, 1)
    ON CONFLICT (doc_type, year)
    DO UPDATE SET current_val = document_counters.current_val + 1, updated_at = NOW()
    RETURNING current_val;
  `;
  const nextSeqBL = blCounterRows[0]?.current_val ?? 1;
  const blNumber = `MIS/BL/${currentYear}/${String(nextSeqBL).padStart(3, "0")}`;

  const invCounterRows = await sql`
    INSERT INTO document_counters (doc_type, year, current_val)
    VALUES ('INVOICE', ${currentYear}, 1)
    ON CONFLICT (doc_type, year)
    DO UPDATE SET current_val = document_counters.current_val + 1, updated_at = NOW()
    RETURNING current_val;
  `;
  const nextSeqFAC = invCounterRows[0]?.current_val ?? 1;
  const invoiceNumber = `MIS/FAC/${currentYear}/${String(nextSeqFAC).padStart(3, "0")}`;

  // 5. Compute Due Date
  const dueDays = data.dueDays ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);
  const deliveryDate = data.deliveryDate || new Date().toISOString().split("T")[0];

  // 6. Create Invoice Header
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
      ${deliveryDate},
      ${dueDate.toISOString().split("T")[0]},
      'ISSUED',
      ${order.currency},
      ${batchSubtotal},
      ${vatRate},
      ${vatAmount},
      ${batchTotal},
      0.00,
      ${batchTotal},
      ${data.notes?.trim() || `Facturation associée au Bon de Livraison ${blNumber}`},
      ${data.userId}
    )
    RETURNING id;
  `;
  const invoiceId = invoiceRows[0].id as string;

  // 7. Create Invoice Items
  for (const vi of validatedItems) {
    await sql`
      INSERT INTO invoice_items (
        invoice_id, order_item_id, item_id, line_number,
        description_snapshot, unit_snapshot, quantity,
        unit_price_snapshot, line_subtotal,
        brand_snapshot, discount_percent_snapshot
      )
      VALUES (
        ${invoiceId},
        ${vi.orderItem.id},
        ${vi.orderItem.itemId || null},
        ${vi.orderItem.lineNumber},
        ${vi.orderItem.description},
        ${vi.orderItem.unit},
        ${vi.quantityToDeliver},
        ${vi.orderItem.unitPrice},
        ${vi.lineSubtotal},
        ${vi.orderItem.brand || null},
        ${vi.orderItem.discountPercent || 0.00}
      )
    `;
  }

  // 8. Create Delivery Note Header
  const blRows = await sql`
    INSERT INTO delivery_notes (
      bl_number, client_id, order_id, invoice_id,
      delivery_date, carrier_name, driver_name,
      vehicle_plate, receiver_name, status, notes, created_by
    )
    VALUES (
      ${blNumber},
      ${order.clientId},
      ${order.id},
      ${invoiceId},
      ${deliveryDate},
      ${data.carrierName?.trim() || null},
      ${data.driverName?.trim() || null},
      ${data.vehiclePlate?.trim() || null},
      ${data.receiverName?.trim() || null},
      'PREPARED',
      ${data.notes?.trim() || null},
      ${data.userId}
    )
    RETURNING id;
  `;
  const blId = blRows[0].id as string;

  // 9. Create Delivery Note Items
  for (const vi of validatedItems) {
    await sql`
      INSERT INTO delivery_note_items (
        delivery_note_id, order_item_id, item_id, line_number,
        description_snapshot, unit_snapshot, quantity_delivered,
        observation_snapshot
      )
      VALUES (
        ${blId},
        ${vi.orderItem.id},
        ${vi.orderItem.itemId || null},
        ${vi.orderItem.lineNumber},
        ${vi.orderItem.description},
        ${vi.orderItem.unit},
        ${vi.quantityToDeliver},
        ${vi.observation || null}
      )
    `;
  }

  // 10. Audit log
  await logAudit({
    userId: data.userId,
    action: "DELIVERY_BATCH_CREATED",
    entityType: "DELIVERY_NOTE",
    entityId: blId,
    details: {
      blNumber,
      invoiceNumber,
      orderNumber: order.orderNumber,
      clientPoNumber: order.clientPoNumber,
      itemsCount: validatedItems.length,
      batchSubtotal,
      batchTotal,
    },
  });

  const createdBl = await getDeliveryNoteById(blId);
  return {
    deliveryNote: createdBl!,
    invoiceId,
    invoiceNumber,
  };
}

/**
 * Updates a delivery note's status:
 * PREPARED -> IN_TRANSIT -> DELIVERED -> CANCELLED
 * Safely updates physical delivery progress and parent order status.
 */
export async function updateDeliveryNoteStatus(
  id: string,
  newStatus: "PREPARED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED",
  userId: string,
  cancellationReason?: string
): Promise<DeliveryNoteRecord> {
  const bl = await getDeliveryNoteById(id);
  if (!bl) throw new Error("Bon de livraison introuvable.");

  if (bl.status === newStatus) {
    return bl;
  }

  if (bl.status === "DELIVERED" && newStatus === "CANCELLED") {
    throw new Error(
      "Impossible d'annuler un bon de livraison déjà marqué comme LIVRÉ. La réception physique a déjà été actée."
    );
  }

  if (bl.status === "CANCELLED") {
    throw new Error("Un bon de livraison déjà annulé ne peut plus changer de statut.");
  }

  // If cancelling, check linked invoice
  if (newStatus === "CANCELLED" && bl.invoiceId) {
    const invRows = await sql`
      SELECT id, invoice_number, status, paid_amount::float as "paidAmount"
      FROM invoices
      WHERE id = ${bl.invoiceId}
    `;
    const invoice = invRows[0] as unknown as { id: string; invoiceNumber: string; status: string; paidAmount: number };
    if (invoice && invoice.paidAmount > 0) {
      throw new Error(
        `Impossible d'annuler le bon de livraison : la facture associée ${invoice.invoiceNumber} a déjà reçu un règlement (${invoice.paidAmount} $). Révoquez ou réaffectez d'abord le paiement.`
      );
    }
    // Cancel the unpaid associated invoice as well
    if (invoice && invoice.status !== "CANCELLED") {
      await sql`
        UPDATE invoices
        SET status = 'CANCELLED',
            cancellation_reason = ${cancellationReason || `Annulation conjointe avec BL ${bl.blNumber}`},
            updated_at = NOW()
        WHERE id = ${bl.invoiceId}
      `;
    }
  }

  // If marking DELIVERED, update order_items.quantity_delivered
  if (newStatus === "DELIVERED") {
    if (bl.items) {
      for (const item of bl.items) {
        await sql`
          UPDATE order_items
          SET quantity_delivered = quantity_delivered + ${item.quantityDelivered}
          WHERE id = ${item.orderItemId}
        `;
      }
    }
  }

  // Update delivery note status
  await sql`
    UPDATE delivery_notes
    SET status = ${newStatus},
        cancellation_reason = COALESCE(${cancellationReason ?? null}, cancellation_reason),
        updated_at = NOW()
    WHERE id = ${id}
  `;

  // Recompute parent order status based on actual physical deliveries
  const orderAllocations = await getOrderAllocations(bl.orderId);
  let totalOrdered = 0;
  let totalDelivered = 0;

  for (const alloc of Object.values(orderAllocations)) {
    totalOrdered += alloc.ordered;
    totalDelivered += alloc.delivered;
  }

  let newOrderStatus: "CONFIRMED" | "PARTIALLY_DELIVERED" | "COMPLETED" = "CONFIRMED";
  if (totalDelivered >= totalOrdered - 0.0001 && totalOrdered > 0) {
    newOrderStatus = "COMPLETED";
  } else if (totalDelivered > 0) {
    newOrderStatus = "PARTIALLY_DELIVERED";
  }

  await sql`
    UPDATE orders
    SET status = ${newOrderStatus},
        updated_at = NOW()
    WHERE id = ${bl.orderId}
  `;

  // Audit
  await logAudit({
    userId,
    action: `DELIVERY_NOTE_STATUS_${newStatus}`,
    entityType: "DELIVERY_NOTE",
    entityId: id,
    details: {
      blNumber: bl.blNumber,
      previousStatus: bl.status,
      newStatus,
      cancellationReason,
      newOrderStatus,
    },
  });

  const updated = await getDeliveryNoteById(id);
  return updated!;
}
