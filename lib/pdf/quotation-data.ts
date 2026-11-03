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
  address: string;
  city: string;
  country: string;
  phones: string[];
  email: string;
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

  // Company info from site config (single source of truth)
  const company: CompanyInfo = {
    name: siteConfig.name,
    rccm: siteConfig.legal.rccm,
    address: siteConfig.address.line,
    city: `${siteConfig.address.city}, ${siteConfig.address.region}`,
    country: siteConfig.address.country,
    phones: [...siteConfig.phones],
    email: siteConfig.email,
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
    taxId: null, // Not available in QuotationRecord — OK per business rules
  };

  // Map line items — use ONLY snapshot values, never supplier data
  const lines: QuotationLineForPdf[] = (record.items ?? []).map(
    (item: QuotationLineItem): QuotationLineForPdf => ({
      lineNumber: item.lineNumber,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice, // unit_price_snapshot — the client-facing price
      discountPercent: item.discountPercent ?? 0,
      lineSubtotal: item.lineSubtotal,
    })
  );

  return {
    company,
    client,
    reference: record.internalReference,
    clientRfqNumber: record.clientRfqNumber,
    docType: record.docType,
    documentDate: record.documentDate,
    validityDate: record.validityDate,
    currency: record.currency,
    paymentTerms: record.paymentTerms,
    deliveryLeadTime: record.deliveryLeadTime,
    notes: record.notes,
    status: record.status,
    lines,
    // Use persisted totals — never recalculate
    subtotal: record.subtotal,
    vatRate: record.vatRate,
    vatAmount: record.vatAmount,
    total: record.total,
    createdByName: record.createdByName ?? null,
  };
}

