// ============================================================================
// Invoice PDF Data Service — MIS SARL
// Retrieves invoice records and snapshots for professional PDF generation.
// Strictly prevents leakage of internal costs, suppliers or commissions.
// ============================================================================

import { getInvoiceById, InvoiceRecord } from "@/lib/db/invoices";
import { getDefaultCompanyInfo, CompanyInfo } from "./mis-document-layout";

export interface InvoiceLineForPdf {
  lineNumber: number;
  brand?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineSubtotal: number;
  lineTotal?: number;
}

export interface InvoicePdfData {
  company: CompanyInfo;
  client: {
    name: string;
    code: string;
    email: string | null;
    phone: string | null;
    billingAddress: string | null;
    taxId: string | null;
  };
  invoiceNumber: string;
  orderNumber: string | null;
  clientPoNumber: string | null;
  quotationReference: string | null;
  clientRfqNumber: string | null;
  deliveryNoteNumber: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  status: string;
  lines: InvoiceLineForPdf[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  createdByName: string | null;
}

export async function getInvoicePdfData(invoiceId: string): Promise<InvoicePdfData | null> {
  const record: InvoiceRecord | null = await getInvoiceById(invoiceId);
  if (!record) return null;

  const company = getDefaultCompanyInfo();

  const client = {
    name: record.clientName ?? "Client inconnu",
    code: record.clientCode ?? "",
    email: (record as unknown as Record<string, unknown>).clientEmail as string ?? null,
    phone: (record as unknown as Record<string, unknown>).clientPhone as string ?? null,
    billingAddress: (record as unknown as Record<string, unknown>).clientBillingAddress as string ?? null,
    taxId: (record as unknown as Record<string, unknown>).clientTaxId as string ?? null,
  };

  const lines: InvoiceLineForPdf[] = (record.items ?? []).map((item) => ({
    lineNumber: item.lineNumber,
    brand: item.brand ?? null,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercent: item.discountPercent ?? 0,
    lineSubtotal: item.lineSubtotal,
    lineTotal: item.lineSubtotal,
  }));

  return {
    company,
    client,
    invoiceNumber: record.invoiceNumber,
    orderNumber: record.orderNumber ?? null,
    clientPoNumber: record.clientPoNumber ?? null,
    quotationReference: record.quotationReference ?? null,
    clientRfqNumber: record.clientRfqNumber ?? null,
    deliveryNoteNumber: record.deliveryNoteNumber ?? null,
    issueDate: record.issueDate,
    dueDate: record.dueDate,
    currency: record.currency,
    paymentTerms: record.paymentTerms,
    notes: record.notes,
    status: record.status,
    lines,
    subtotal: record.subtotal,
    vatRate: record.vatRate,
    vatAmount: record.vatAmount,
    total: record.total,
    paidAmount: record.paidAmount,
    balanceDue: record.balanceDue,
    createdByName: record.createdByName ?? null,
  };
}
