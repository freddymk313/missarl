// ============================================================================
// Quotation PDF Data Service — MIS SARL
// Retrieves all data needed for PDF generation from Neon PostgreSQL.
// NEVER exposes supplier prices, commissions or exchange rates to output.
// ============================================================================

import { getQuotationById, QuotationRecord, QuotationLineItem } from "@/lib/db/quotations";
import { siteConfig } from "@/app/config/site";

export interface CompanyInfo {
  name: string;
  rccm: string;
  impotNumber: string;
  address: string;
  city: string;
  country: string;
  phones: string[];
  email: string;
  bankInfo: string;
  logoPath: string;
}

export interface ClientInfo {
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  taxId: string | null;
}

export interface QuotationLineForPdf {
  lineNumber: number;
  brand?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineSubtotal: number;
}

export interface QuotationPdfData {
  company: CompanyInfo;
  client: ClientInfo;
  reference: string;
  clientRfqNumber: string | null;
  rfqNumber?: string | null;
  docType: "QUOTATION" | "PROFORMA";
  documentDate: string;
  validityDate: string;
  currency: string;
  paymentTerms: string | null;
  deliveryLeadTime: string | null;
  notes: string | null;
  status: string;
  lines: QuotationLineForPdf[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  createdByName: string | null;
}

/**
 * Retrieves and structures quotation data for PDF generation.
 * Uses ONLY the persisted quotation snapshots — never recalculates from supplier data.
 */
export async function getQuotationPdfData(
  quotationId: string
): Promise<QuotationPdfData | null> {
  const record: QuotationRecord | null = await getQuotationById(quotationId);
  if (!record) return null;

  // Company info matching MIS SARL reference template (RFQ-KICO-14319 OQ)
  const company: CompanyInfo = {
    name: "MARC INGINEERING SERVICE SARL",
    rccm: siteConfig.legal.rccm || "CD/LSH/RCCM/26.B-00277",
    impotNumber: "A2609081A",
    address: `${siteConfig.address.line}, ${siteConfig.address.country}`,
    city: `${siteConfig.address.city}, ${siteConfig.address.region}`,
    country: siteConfig.address.country,
    phones: siteConfig.phones && siteConfig.phones.length > 0
      ? [...siteConfig.phones]
      : ["+243 992224458", "+243 900041696"],
    email: siteConfig.email || "messarl2023@gmail.com",
    bankInfo:
      "BANK name : FIRST BANK RDC SA | SWIFT code : BICDCDKI | RIB: 00014 - 25000 – 2032105587015 | Branch : LUBUMBASHI/R.D.Congo",
    logoPath: "/images/logo.png",
  };

  // Client info from database record
  const client: ClientInfo = {
    name: record.clientName ?? "Client inconnu",
    code: record.clientCode ?? "",
    email: (record as QuotationRecord & { clientEmail?: string }).clientEmail ?? null,
    phone: (record as QuotationRecord & { clientPhone?: string }).clientPhone ?? null,
    billingAddress:
      (record as QuotationRecord & { clientBillingAddress?: string }).clientBillingAddress ?? null,
    taxId: null,
  };

  // Map line items — snapshot values only, never supplier data
  const lines: QuotationLineForPdf[] = (record.items ?? []).map(
    (item: QuotationLineItem): QuotationLineForPdf => ({
      lineNumber: item.lineNumber,
      brand: item.brand ?? null,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice, // unit_price_snapshot
      discountPercent: item.discountPercent ?? 0,
      lineSubtotal: item.lineSubtotal,
    })
  );

  const rec = record as unknown as Record<string, unknown>;
  const rawRfq =
    record.clientRfqNumber ??
    rec.client_rfq_number ??
    rec.rfqNumber ??
    rec.rfq ??
    null;
  const clientRfqNumber = typeof rawRfq === "string" ? rawRfq.trim() : null;

  return {
    company,
    client,
    reference: record.internalReference,
    clientRfqNumber,
    rfqNumber: clientRfqNumber,
    docType: record.docType,
    documentDate: record.documentDate,
    validityDate: record.validityDate,
    currency: record.currency,
    paymentTerms: record.paymentTerms,
    deliveryLeadTime: record.deliveryLeadTime,
    notes: record.notes,
    status: record.status,
    lines,
    // Persisted totals
    subtotal: record.subtotal,
    vatRate: record.vatRate,
    vatAmount: record.vatAmount,
    total: record.total,
    createdByName: record.createdByName ?? null,
  };
}
