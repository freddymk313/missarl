"use strict";
// ============================================================================
// Sales Invoices Repository (Direct SQL)
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoices = getInvoices;
exports.getInvoiceById = getInvoiceById;
exports.createInvoiceFromOrder = createInvoiceFromOrder;
exports.cancelInvoice = cancelInvoice;
exports.updateInvoiceNormalizedNumber = updateInvoiceNormalizedNumber;
const db_1 = require("@/lib/db");
const orders_1 = require("@/lib/db/orders");
const audit_1 = require("@/lib/db/audit");
async function getInvoices(options) {
    const clientId = options?.clientId || null;
    const status = options?.status || null;
    const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;
    let rows;
    try {
        rows = (await (0, db_1.sql) `
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
    `);
    }
    catch (err) {
        const errorObj = err;
        if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
            rows = (await (0, db_1.sql) `
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
      `);
        }
        else {
            throw err;
        }
    }
    return rows;
}
async function getInvoiceById(id) {
    let rows;
    try {
        rows = (await (0, db_1.sql) `
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
    `);
    }
    catch (err) {
        const errorObj = err;
        if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
            rows = (await (0, db_1.sql) `
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
      `);
        }
        else {
            throw err;
        }
    }
    if (!rows || rows.length === 0)
        return null;
    const invoice = rows[0];
    let itemRows = [];
    try {
        itemRows = await (0, db_1.sql) `
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
    }
    catch {
        try {
            itemRows = await (0, db_1.sql) `
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
        }
        catch (fallbackErr) {
            console.error("[DB] getInvoiceById fallback items query failed:", fallbackErr);
            throw fallbackErr;
        }
    }
    invoice.items = itemRows;
    return invoice;
}
async function createInvoiceFromOrder(data) {
    const order = await (0, orders_1.getOrderById)(data.orderId);
    if (!order)
        throw new Error("Commande introuvable.");
    if (order.status === "CANCELLED") {
        throw new Error("Impossible de facturer une commande annulée.");
    }
    if (!order.items || order.items.length === 0) {
        throw new Error("La commande ne contient aucune ligne d'article.");
    }
    // Generate sequential invoice number (format: 009/026/FAC)
    const currentYear = new Date().getFullYear();
    const yearCode = "0" + String(currentYear).slice(-2);
    let invoiceNumber;
    try {
        const invCounterRows = await (0, db_1.sql) `
      INSERT INTO document_counters (doc_type, year, current_val)
      VALUES ('INVOICE', ${currentYear}, 1)
      ON CONFLICT (doc_type, year)
      DO UPDATE SET current_val = document_counters.current_val + 1, updated_at = NOW()
      RETURNING current_val;
    `;
        const nextSeqFAC = invCounterRows[0]?.current_val ?? 1;
        invoiceNumber = `${String(nextSeqFAC).padStart(3, "0")}/${yearCode}/FAC`;
    }
    catch {
        const countRows = await (0, db_1.sql) `
      SELECT COUNT(*)::int as count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
    `;
        const nextSeqFAC = (Number(countRows[0]?.count) || 0) + 1;
        invoiceNumber = `${String(nextSeqFAC).padStart(3, "0")}/${yearCode}/FAC`;
    }
    const dueDays = data.dueDays ?? 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const invoiceRows = await (0, db_1.sql) `
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
    const invoiceId = invoiceRows[0].id;
    for (const item of order.items) {
        await (0, db_1.sql) `
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
    await (0, audit_1.logAudit)({
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
    return created;
}
async function cancelInvoice(id, reason, userId) {
    const current = await getInvoiceById(id);
    if (!current)
        throw new Error("Facture introuvable.");
    if (current.status === "PAID" || current.status === "PARTIALLY_PAID") {
        throw new Error("Impossible d'annuler une facture qui a déjà reçu des paiements. Veuillez d'abord révoquer ou réallouer les paiements.");
    }
    await (0, db_1.sql) `
    UPDATE invoices
    SET 
      status = 'CANCELLED',
      cancellation_reason = ${reason.trim()},
      balance_due = 0,
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${id}
  `;
    await (0, audit_1.logAudit)({
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
async function updateInvoiceNormalizedNumber(id, normalizedNumber, userId) {
    const current = await getInvoiceById(id);
    if (!current) {
        throw new Error("Facture introuvable.");
    }
    const trimmed = normalizedNumber?.trim() || null;
    try {
        await (0, db_1.sql) `
      UPDATE invoices
      SET 
        normalized_invoice_number = ${trimmed},
        updated_by = ${userId},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    }
    catch (err) {
        const errorObj = err;
        if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
            await (0, db_1.sql) `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS normalized_invoice_number VARCHAR(150);`;
            await (0, db_1.sql) `
        UPDATE invoices
        SET 
          normalized_invoice_number = ${trimmed},
          updated_by = ${userId},
          updated_at = NOW()
        WHERE id = ${id}
      `;
        }
        else {
            throw err;
        }
    }
    await (0, audit_1.logAudit)({
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
