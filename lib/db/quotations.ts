// ============================================================================
// Quotations & Proforma Invoices Repository (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";
import { getNextQuotationReference } from "@/lib/db/clients";
import { logAudit } from "@/lib/db/audit";

export interface QuotationLineItem {
  id?: string;
  itemId?: string | null;
  brand?: string | null;
  supplierOfferId?: string | null;
  lineNumber: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  lineSubtotal: number;
  // Commercial Cost & Calculation Snapshots
  supplierPriceSnapshot?: number | null;
  supplierCurrencySnapshot?: string | null;
  supplierVatIncludedSnapshot?: boolean | null;
  supplierVatRateSnapshot?: number | null;
  exchangeRateSnapshot?: number | null;
  baseCostUsdSnapshot?: number | null;
  commissionPercentSnapshot?: number | null;
  commissionAmountSnapshot?: number | null;
}

export interface QuotationRecord {
  id: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  docType: "QUOTATION" | "PROFORMA";
  clientRfqNumber: string | null;
  internalReference: string;
  sequenceNumber: number;
  year: number;
  documentDate: string;
  validityDate: string;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "EXPIRED" | "REJECTED" | "CANCELLED";
  currency: string;
  defaultCommissionPercent?: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentTerms: string | null;
  deliveryLeadTime: string | null;
  notes: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: QuotationLineItem[];
}

export async function getQuotations(options?: {
  clientId?: string;
  status?: string;
  docType?: string;
  search?: string;
}): Promise<QuotationRecord[]> {
  const clientId = options?.clientId || null;
  const status = options?.status || null;
  const docType = options?.docType || null;
  const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;

  const rows = await sql`
    SELECT 
      q.id,
      q.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      q.doc_type as "docType",
      q.client_rfq_number as "clientRfqNumber",
      q.internal_reference as "internalReference",
      q.sequence_number as "sequenceNumber",
      q.year,
      q.document_date::text as "documentDate",
      q.validity_date::text as "validityDate",
      q.status,
      q.currency,
      COALESCE((to_jsonb(q)->>'default_commission_percent')::float, 0.0) as "defaultCommissionPercent",
      q.subtotal::float as subtotal,
      q.vat_rate::float as "vatRate",
      q.vat_amount::float as "vatAmount",
      q.total::float as total,
      q.payment_terms as "paymentTerms",
      q.delivery_lead_time as "deliveryLeadTime",
      q.notes,
      q.cancellation_reason as "cancellationReason",
      q.created_by as "createdBy",
      u.full_name as "createdByName",
      q.created_at as "createdAt",
      q.updated_at as "updatedAt"
    FROM quotations q
    JOIN clients c ON q.client_id = c.id
    LEFT JOIN users u ON q.created_by = u.id
    WHERE (${clientId}::uuid IS NULL OR q.client_id = ${clientId}::uuid)
      AND (${status}::text IS NULL OR q.status = ${status})
      AND (${docType}::text IS NULL OR q.doc_type = ${docType})
      AND (${searchTerm}::text IS NULL OR 
           LOWER(q.internal_reference) LIKE ${searchTerm} OR 
           LOWER(COALESCE(q.client_rfq_number, '')) LIKE ${searchTerm} OR 
           LOWER(c.name) LIKE ${searchTerm})
    ORDER BY q.created_at DESC
  `;

  return rows as unknown as QuotationRecord[];
}

export async function getQuotationById(id: string): Promise<QuotationRecord | null> {
  const rows = await sql`
    SELECT 
      q.id,
      q.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      c.email as "clientEmail",
      c.phone as "clientPhone",
      c.billing_address as "clientBillingAddress",
      q.doc_type as "docType",
      q.client_rfq_number as "clientRfqNumber",
      q.internal_reference as "internalReference",
      q.sequence_number as "sequenceNumber",
      q.year,
      q.document_date::text as "documentDate",
      q.validity_date::text as "validityDate",
      q.status,
      q.currency,
      COALESCE((to_jsonb(q)->>'default_commission_percent')::float, 0.0) as "defaultCommissionPercent",
      q.subtotal::float as subtotal,
      q.vat_rate::float as "vatRate",
      q.vat_amount::float as "vatAmount",
      q.total::float as total,
      q.payment_terms as "paymentTerms",
      q.delivery_lead_time as "deliveryLeadTime",
      q.notes,
      q.cancellation_reason as "cancellationReason",
      q.created_by as "createdBy",
      u.full_name as "createdByName",
      q.created_at as "createdAt",
      q.updated_at as "updatedAt"
    FROM quotations q
    JOIN clients c ON q.client_id = c.id
    LEFT JOIN users u ON q.created_by = u.id
    WHERE q.id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const quote = rows[0] as unknown as QuotationRecord;

  // Fetch items with snapshot commercial fields
  const itemRows = await sql`
    SELECT 
      qi.id,
      qi.item_id as "itemId",
      it.brand as "brand",
      (to_jsonb(qi)->>'supplier_offer_id')::uuid as "supplierOfferId",
      qi.line_number as "lineNumber",
      qi.description_snapshot as "description",
      qi.unit_snapshot as "unit",
      qi.quantity::float as "quantity",
      qi.unit_price_snapshot::float as "unitPrice",
      qi.discount_percent::float as "discountPercent",
      qi.line_subtotal::float as "lineSubtotal",
      (to_jsonb(qi)->>'supplier_price_snapshot')::numeric::float as "supplierPriceSnapshot",
      to_jsonb(qi)->>'supplier_currency_snapshot' as "supplierCurrencySnapshot",
      (to_jsonb(qi)->>'supplier_vat_included_snapshot')::boolean as "supplierVatIncludedSnapshot",
      (to_jsonb(qi)->>'supplier_vat_rate_snapshot')::numeric::float as "supplierVatRateSnapshot",
      (to_jsonb(qi)->>'exchange_rate_snapshot')::numeric::float as "exchangeRateSnapshot",
      (to_jsonb(qi)->>'base_cost_usd_snapshot')::numeric::float as "baseCostUsdSnapshot",
      (to_jsonb(qi)->>'commission_percent_snapshot')::numeric::float as "commissionPercentSnapshot",
      (to_jsonb(qi)->>'commission_amount_snapshot')::numeric::float as "commissionAmountSnapshot"
    FROM quotation_items qi
    LEFT JOIN items it ON qi.item_id = it.id
    WHERE qi.quotation_id = ${id}
    ORDER BY qi.line_number ASC
  `;

  quote.items = itemRows as unknown as QuotationLineItem[];
  return quote;
}

export async function createQuotation(data: {
  clientId: string;
  docType: "QUOTATION" | "PROFORMA";
  internalReference?: string;
  clientRfqNumber?: string;
  validityDays?: number;
  vatRate?: number;
  paymentTerms?: string;
  deliveryLeadTime?: string;
  notes?: string;
  defaultCommissionPercent?: number;
  items: Array<{
    itemId?: string;
    supplierOfferId?: string | null;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    supplierPriceSnapshot?: number | null;
    supplierCurrencySnapshot?: string | null;
    supplierVatIncludedSnapshot?: boolean | null;
    supplierVatRateSnapshot?: number | null;
    exchangeRateSnapshot?: number | null;
    baseCostUsdSnapshot?: number | null;
    commissionPercent?: number | null;
    commissionAmount?: number | null;
  }>;
  userId: string;
}): Promise<QuotationRecord> {
  if (!data.items || data.items.length === 0) {
    throw new Error("Un devis doit contenir au moins un article.");
  }

  const defaultCommission = data.defaultCommissionPercent ?? 0;

  // 1. Calculate financials server-side and snapshot commercial costs
  let subtotal = 0;
  const preparedLines = data.items.map((item, index) => {
    const qty = Math.max(0.01, item.quantity);
    let price = Math.max(0, item.unitPrice);
    const disc = Math.min(100, Math.max(0, item.discountPercent || 0));

    // Effective commission: item override if provided, else quotation default
    const effectiveCommissionPercent =
      item.commissionPercent !== undefined && item.commissionPercent !== null
        ? Math.max(0, item.commissionPercent)
        : Math.max(0, defaultCommission);

    // Calculate base cost in USD if available
    let baseCostUsd = item.baseCostUsdSnapshot ?? null;
    if (
      baseCostUsd === null &&
      item.supplierPriceSnapshot != null &&
      item.exchangeRateSnapshot != null
    ) {
      baseCostUsd =
        Math.round(item.supplierPriceSnapshot * item.exchangeRateSnapshot * 10000) / 10000;
    }

    // Calculate commission amount
    let commissionAmount = item.commissionAmount ?? null;
    if (commissionAmount === null && baseCostUsd !== null) {
      commissionAmount =
        Math.round(baseCostUsd * (effectiveCommissionPercent / 100) * 10000) / 10000;
    }

    // If unitPrice was not explicitly provided (> 0) and we have baseCost, derive unit price
    if (price === 0 && baseCostUsd !== null) {
      price = Math.round((baseCostUsd + (commissionAmount ?? 0)) * 100) / 100;
    }

    const lineTotal = Math.round(qty * price * (1 - disc / 100) * 100) / 100;
    subtotal += lineTotal;

    return {
      itemId: item.itemId || null,
      supplierOfferId: item.supplierOfferId || null,
      lineNumber: index + 1,
      description: item.description.trim(),
      unit: item.unit.trim(),
      quantity: qty,
      unitPrice: price,
      discountPercent: disc,
      lineSubtotal: lineTotal,
      supplierPriceSnapshot: item.supplierPriceSnapshot ?? null,
      supplierCurrencySnapshot: item.supplierCurrencySnapshot ?? null,
      supplierVatIncludedSnapshot: item.supplierVatIncludedSnapshot ?? null,
      supplierVatRateSnapshot: item.supplierVatRateSnapshot ?? null,
      exchangeRateSnapshot: item.exchangeRateSnapshot ?? null,
      baseCostUsdSnapshot: baseCostUsd,
      commissionPercentSnapshot: effectiveCommissionPercent,
      commissionAmountSnapshot: commissionAmount,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const vatRate = data.vatRate ?? 16;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  // 2. Reference generation (use user-specified reference or fallback to sequence generator)
  let reference: string;
  let sequenceNumber: number;
  let year: number;

  if (data.internalReference && data.internalReference.trim()) {
    reference = data.internalReference.trim();
    const match = reference.match(/^(\d+)/);
    sequenceNumber = match ? parseInt(match[1], 10) : 1;
    year = new Date().getFullYear();
  } else {
    const nextRef = await getNextQuotationReference(
      data.clientId,
      data.docType
    );
    reference = nextRef.reference;
    sequenceNumber = nextRef.sequenceNumber;
    year = nextRef.year;
  }

  const validityDays = data.validityDays ?? 30;
  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + validityDays);

  // 3. Insert header (with fallback if default_commission_percent column is pending migration)
  let quoteRows;
  try {
    quoteRows = await sql`
      INSERT INTO quotations (
        client_id, doc_type, client_rfq_number, internal_reference,
        sequence_number, year, document_date, validity_date,
        status, currency, default_commission_percent, subtotal, vat_rate, vat_amount, total,
        payment_terms, delivery_lead_time, notes, created_by
      )
      VALUES (
        ${data.clientId},
        ${data.docType},
        ${data.clientRfqNumber?.trim() || null},
        ${reference},
        ${sequenceNumber},
        ${year},
        CURRENT_DATE,
        ${validityDate.toISOString().split("T")[0]},
        'DRAFT',
        'USD',
        ${defaultCommission},
        ${subtotal},
        ${vatRate},
        ${vatAmount},
        ${total},
        ${data.paymentTerms?.trim() || null},
        ${data.deliveryLeadTime?.trim() || null},
        ${data.notes?.trim() || null},
        ${data.userId}
      )
      RETURNING id;
    `;
  } catch {
    quoteRows = await sql`
      INSERT INTO quotations (
        client_id, doc_type, client_rfq_number, internal_reference,
        sequence_number, year, document_date, validity_date,
        status, currency, subtotal, vat_rate, vat_amount, total,
        payment_terms, delivery_lead_time, notes, created_by
      )
      VALUES (
        ${data.clientId},
        ${data.docType},
        ${data.clientRfqNumber?.trim() || null},
        ${reference},
        ${sequenceNumber},
        ${year},
        CURRENT_DATE,
        ${validityDate.toISOString().split("T")[0]},
        'DRAFT',
        'USD',
        ${subtotal},
        ${vatRate},
        ${vatAmount},
        ${total},
        ${data.paymentTerms?.trim() || null},
        ${data.deliveryLeadTime?.trim() || null},
        ${data.notes?.trim() || null},
        ${data.userId}
      )
      RETURNING id;
    `;
  }

  const quotationId = quoteRows[0].id as string;

  // 4. Insert lines sequentially with snapshots (with fallback if pending migration)
  for (const line of preparedLines) {
    try {
      await sql`
        INSERT INTO quotation_items (
          quotation_id, item_id, line_number, description_snapshot,
          unit_snapshot, quantity, unit_price_snapshot, discount_percent, line_subtotal,
          supplier_offer_id, supplier_price_snapshot, supplier_currency_snapshot,
          supplier_vat_included_snapshot, supplier_vat_rate_snapshot, exchange_rate_snapshot,
          base_cost_usd_snapshot, commission_percent_snapshot, commission_amount_snapshot
        )
        VALUES (
          ${quotationId},
          ${line.itemId},
          ${line.lineNumber},
          ${line.description},
          ${line.unit},
          ${line.quantity},
          ${line.unitPrice},
          ${line.discountPercent},
          ${line.lineSubtotal},
          ${line.supplierOfferId},
          ${line.supplierPriceSnapshot},
          ${line.supplierCurrencySnapshot},
          ${line.supplierVatIncludedSnapshot},
          ${line.supplierVatRateSnapshot},
          ${line.exchangeRateSnapshot},
          ${line.baseCostUsdSnapshot},
          ${line.commissionPercentSnapshot},
          ${line.commissionAmountSnapshot}
        )
      `;
    } catch {
      await sql`
        INSERT INTO quotation_items (
          quotation_id, item_id, line_number, description_snapshot,
          unit_snapshot, quantity, unit_price_snapshot, discount_percent, line_subtotal
        )
        VALUES (
          ${quotationId},
          ${line.itemId},
          ${line.lineNumber},
          ${line.description},
          ${line.unit},
          ${line.quantity},
          ${line.unitPrice},
          ${line.discountPercent},
          ${line.lineSubtotal}
        )
      `;
    }
  }

  // 5. Audit log
  await logAudit({
    userId: data.userId,
    action: "QUOTATION_CREATED",
    entityType: "QUOTATION",
    entityId: quotationId,
    details: {
      internalReference: reference,
      docType: data.docType,
      subtotal,
      total,
      itemCount: preparedLines.length,
    },
  });

  const created = await getQuotationById(quotationId);
  return created!;
}

export async function updateQuotationStatus(
  id: string,
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "EXPIRED" | "REJECTED" | "CANCELLED",
  userId: string,
  cancellationReason?: string
): Promise<QuotationRecord | null> {
  const current = await getQuotationById(id);
  if (!current) throw new Error("Devis introuvable");

  if (current.status === "CANCELLED") {
    throw new Error("Un devis annulé ne peut plus être modifié.");
  }

  await sql`
    UPDATE quotations
    SET 
      status = ${status},
      cancellation_reason = COALESCE(${cancellationReason ?? null}, cancellation_reason),
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  await logAudit({
    userId,
    action: `QUOTATION_STATUS_${status}`,
    entityType: "QUOTATION",
    entityId: id,
    details: {
      previousStatus: current.status,
      newStatus: status,
      cancellationReason,
    },
  });

  return getQuotationById(id);
}
