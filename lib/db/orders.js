"use strict";
// ============================================================================
// Customer Purchase Orders Repository (Direct SQL)
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrders = getOrders;
exports.getOrderById = getOrderById;
exports.createOrderFromQuotation = createOrderFromQuotation;
exports.updateOrderStatus = updateOrderStatus;
exports.getOrderDeliveryNotes = getOrderDeliveryNotes;
const db_1 = require("@/lib/db");
const quotations_1 = require("@/lib/db/quotations");
const audit_1 = require("@/lib/db/audit");
async function getOrders(options) {
    const clientId = options?.clientId || null;
    const status = options?.status || null;
    const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;
    const rows = await (0, db_1.sql) `
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
    return rows;
}
async function getOrderById(id) {
    const rows = await (0, db_1.sql) `
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
    if (!rows || rows.length === 0)
        return null;
    const order = rows[0];
    let itemRows = [];
    try {
        itemRows = await (0, db_1.sql) `
      SELECT 
        id,
        quotation_item_id as "quotationItemId",
        item_id as "itemId",
        line_number as "lineNumber",
        description_snapshot as "description",
        unit_snapshot as "unit",
        brand_snapshot as "brand",
        COALESCE(discount_percent_snapshot, 0)::float as "discountPercent",
        quantity_ordered::float as "quantityOrdered",
        quantity_delivered::float as "quantityDelivered",
        unit_price_snapshot::float as "unitPrice",
        line_subtotal::float as "lineTotal"
      FROM order_items
      WHERE order_id = ${id}
      ORDER BY line_number ASC
    `;
    }
    catch {
        try {
            itemRows = await (0, db_1.sql) `
        SELECT 
          oi.id,
          oi.quotation_item_id as "quotationItemId",
          oi.item_id as "itemId",
          oi.line_number as "lineNumber",
          oi.description_snapshot as "description",
          oi.unit_snapshot as "unit",
          it.brand as "brand",
          0::float as "discountPercent",
          oi.quantity_ordered::float as "quantityOrdered",
          oi.quantity_delivered::float as "quantityDelivered",
          oi.unit_price_snapshot::float as "unitPrice",
          oi.line_subtotal::float as "lineTotal"
        FROM order_items oi
        LEFT JOIN items it ON oi.item_id = it.id
        WHERE oi.order_id = ${id}
        ORDER BY oi.line_number ASC
      `;
        }
        catch (fallbackErr) {
            console.error("[DB] getOrderById fallback query failed:", fallbackErr);
            throw fallbackErr;
        }
    }
    order.items = itemRows;
    return order;
}
async function createOrderFromQuotation(data) {
    // 1. Fetch & validate quotation
    const quote = await (0, quotations_1.getQuotationById)(data.quotationId);
    if (!quote)
        throw new Error("Devis introuvable.");
    if (quote.status !== "VALIDATED") {
        throw new Error(`Impossible de créer un bon de commande : le devis ${quote.internalReference} a le statut ${quote.status}. Il doit être VALIDÉ.`);
    }
    if (!quote.items || quote.items.length === 0) {
        throw new Error("Le devis ne contient aucune ligne.");
    }
    const itemsToInsert = [];
    if (data.selectedItems && data.selectedItems.length > 0) {
        const quoteItemMap = new Map((quote.items || []).map((it) => [it.id || "", it]));
        const seenQuoteItemIds = new Set();
        for (const sel of data.selectedItems) {
            if (seenQuoteItemIds.has(sel.quotationItemId)) {
                throw new Error("Ligne d'article dupliquée dans l'acceptation du bon de commande.");
            }
            seenQuoteItemIds.add(sel.quotationItemId);
            const quoteItem = quoteItemMap.get(sel.quotationItemId);
            if (!quoteItem) {
                throw new Error(`La ligne de devis ${sel.quotationItemId} est introuvable sur le devis.`);
            }
            const qty = Number(sel.quantity);
            if (isNaN(qty) || qty <= 0) {
                throw new Error(`Quantité acceptée invalide pour l'article ${quoteItem.lineNumber}.`);
            }
            if (qty > quoteItem.quantity + 0.0001) {
                throw new Error(`La quantité acceptée (${qty}) ne peut pas dépasser la quantité devisée (${quoteItem.quantity}) pour l'article ${quoteItem.lineNumber}.`);
            }
            const discount = quoteItem.discountPercent || 0;
            const lineSubtotal = Math.round(qty * quoteItem.unitPrice * (1 - discount / 100) * 100) / 100;
            itemsToInsert.push({
                quotationItemId: quoteItem.id || null,
                itemId: quoteItem.itemId || null,
                lineNumber: quoteItem.lineNumber,
                description: quoteItem.description,
                unit: quoteItem.unit,
                brand: quoteItem.brand || null,
                quantity: qty,
                unitPrice: quoteItem.unitPrice,
                discountPercent: discount,
                lineSubtotal,
            });
        }
    }
    else {
        // Default: accept all quotation lines at full quantity
        for (const item of quote.items) {
            itemsToInsert.push({
                quotationItemId: item.id || null,
                itemId: item.itemId || null,
                lineNumber: item.lineNumber,
                description: item.description,
                unit: item.unit,
                brand: item.brand || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent || 0,
                lineSubtotal: item.lineSubtotal,
            });
        }
    }
    if (itemsToInsert.length === 0) {
        throw new Error("Veuillez sélectionner au moins un article accepté pour créer la commande.");
    }
    // Calculate order subtotal and VAT
    const subtotal = Math.round(itemsToInsert.reduce((sum, it) => sum + it.lineSubtotal, 0) * 100) / 100;
    const vatRate = quote.vatRate ?? 16.0;
    const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    // 3. Concurrency-safe sequential order numbering
    const currentYear = new Date().getFullYear();
    let orderNumber;
    try {
        const yearCode = "0" + String(currentYear).slice(-2);
        const counterRows = await (0, db_1.sql) `
      INSERT INTO document_counters (doc_type, year, current_val)
      VALUES ('ORDER', ${currentYear}, 1)
      ON CONFLICT (doc_type, year)
      DO UPDATE SET current_val = document_counters.current_val + 1, updated_at = NOW()
      RETURNING current_val;
    `;
        const nextSeq = counterRows[0]?.current_val ?? 1;
        orderNumber = `${String(nextSeq).padStart(3, "0")}/${yearCode}/BC`;
    }
    catch {
        const yearCode = "0" + String(currentYear).slice(-2);
        const countRows = await (0, db_1.sql) `
      SELECT COUNT(*)::int as count FROM orders WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
    `;
        const nextSeq = countRows[0].count + 1;
        orderNumber = `${String(nextSeq).padStart(3, "0")}/${yearCode}/BC`;
    }
    // 4. Insert order header
    const orderRows = await (0, db_1.sql) `
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
      ${subtotal},
      ${vatRate},
      ${vatAmount},
      ${total},
      ${data.notes?.trim() || null},
      ${data.userId}
    )
    RETURNING id;
  `;
    const orderId = orderRows[0].id;
    // 5. Insert lines with snapshots (with compatibility fallback if migration 005 is not yet applied)
    for (const item of itemsToInsert) {
        try {
            await (0, db_1.sql) `
        INSERT INTO order_items (
          order_id, quotation_item_id, item_id, line_number,
          description_snapshot, unit_snapshot, quantity_ordered,
          quantity_delivered, unit_price_snapshot, line_subtotal,
          brand_snapshot, discount_percent_snapshot
        )
        VALUES (
          ${orderId},
          ${item.quotationItemId},
          ${item.itemId},
          ${item.lineNumber},
          ${item.description},
          ${item.unit},
          ${item.quantity},
          0,
          ${item.unitPrice},
          ${item.lineSubtotal},
          ${item.brand},
          ${item.discountPercent}
        )
      `;
        }
        catch (insertErr) {
            console.warn("[DB] order_items insert with brand/discount snapshot failed. Retrying with pre-005 schema:", insertErr);
            await (0, db_1.sql) `
        INSERT INTO order_items (
          order_id, quotation_item_id, item_id, line_number,
          description_snapshot, unit_snapshot, quantity_ordered,
          quantity_delivered, unit_price_snapshot, line_subtotal
        )
        VALUES (
          ${orderId},
          ${item.quotationItemId},
          ${item.itemId},
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
    }
    // 6. Audit log
    await (0, audit_1.logAudit)({
        userId: data.userId,
        action: "ORDER_CREATED_FROM_QUOTATION",
        entityType: "ORDER",
        entityId: orderId,
        details: {
            orderNumber,
            clientPoNumber: data.clientPoNumber,
            quotationReference: quote.internalReference,
            itemsAcceptedCount: itemsToInsert.length,
            subtotal,
            total,
        },
    });
    const created = await getOrderById(orderId);
    return created;
}
async function updateOrderStatus(id, status, userId, cancellationReason) {
    const current = await getOrderById(id);
    if (!current)
        throw new Error("Commande introuvable.");
    if (current.status === "CANCELLED") {
        throw new Error("Une commande annulée ne peut plus être modifiée.");
    }
    await (0, db_1.sql) `
    UPDATE orders
    SET 
      status = ${status},
      cancellation_reason = COALESCE(${cancellationReason ?? null}, cancellation_reason),
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${id}
  `;
    await (0, audit_1.logAudit)({
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
async function getOrderDeliveryNotes(orderId) {
    const { getDeliveryNotes } = await Promise.resolve().then(() => __importStar(require("@/lib/db/delivery-notes")));
    return getDeliveryNotes({ orderId });
}
