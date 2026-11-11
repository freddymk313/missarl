// ============================================================================
// Unpaid Invoices Account Statement Data Service — MIS SARL
// Retrieves authoritative unpaid invoices data and client information
// for official "RELEVE DE COMPTE & FACTURE NON PAYEE" PDF generation.
// ============================================================================

import { sql } from "@/lib/db";
import { getClientById } from "@/lib/db/clients";
import { getDefaultCompanyInfo, CompanyInfo } from "./mis-document-layout";

export interface UnpaidInvoiceRow {
  id: string;
  issueDate: string; // YYYY-MM-DD
  invoiceNumber: string; // Internal MIS reference (e.g. MIS/FAC/2026/001)
  normalizedInvoiceNumber: string | null; // DGI reference (e.g. FC/CD02035320/1-6/2026)
  clientPoNumber: string | null; // Customer PO number (e.g. PO 5100002237 OX)
  orderNumber: string | null;
  currency: string;
  debit: number; // Total invoiced amount
  credit: number; // Amount actually allocated & paid against this invoice
  balance: number; // Outstanding balance due
  status: string;
}

export interface UnpaidInvoicesStatementData {
  company: CompanyInfo;
  client: {
    id: string;
    name: string;
    code: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    billingAddress: string | null;
    currency: string;
  };
  periodStart: string | null;
  periodEnd: string | null;
  generationDate: string; // Formatted DD/MM/YYYY
  invoices: UnpaidInvoiceRow[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
  currency: string;
  unallocatedCredits?: number;
}

export async function getUnpaidInvoicesStatement(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<UnpaidInvoicesStatementData> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error("Client introuvable.");
  }

  const company = getDefaultCompanyInfo();
  const startFilter = startDate?.trim() || null;
  const endFilter = endDate?.trim() || null;

  // Retrieve eligible unpaid invoices:
  // - Belongs to client
  // - Status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
  // - Balance due > 0
  // - Not cancelled, not draft
  // - Matching optional issue_date range
  let rows: Record<string, unknown>[];
  try {
    rows = (await sql`
      SELECT 
        i.id,
        i.invoice_number as "invoiceNumber",
        i.normalized_invoice_number as "normalizedInvoiceNumber",
        o.client_po_number as "clientPoNumber",
        o.order_number as "orderNumber",
        i.issue_date::text as "issueDate",
        i.currency,
        i.total::float as "debit",
        i.paid_amount::float as "credit",
        i.balance_due::float as "balance",
        i.status
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      WHERE i.client_id = ${clientId}::uuid
        AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
        AND i.balance_due > 0
        AND (${startFilter}::text IS NULL OR i.issue_date >= ${startFilter}::date)
        AND (${endFilter}::text IS NULL OR i.issue_date <= ${endFilter}::date)
      ORDER BY i.issue_date ASC, i.invoice_number ASC
    `) as Record<string, unknown>[];
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "42703" || errorObj?.message?.includes("normalized_invoice_number")) {
      rows = (await sql`
        SELECT 
          i.id,
          i.invoice_number as "invoiceNumber",
          NULL::text as "normalizedInvoiceNumber",
          o.client_po_number as "clientPoNumber",
          o.order_number as "orderNumber",
          i.issue_date::text as "issueDate",
          i.currency,
          i.total::float as "debit",
          i.paid_amount::float as "credit",
          i.balance_due::float as "balance",
          i.status
        FROM invoices i
        LEFT JOIN orders o ON i.order_id = o.id
        WHERE i.client_id = ${clientId}::uuid
          AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
          AND i.balance_due > 0
          AND (${startFilter}::text IS NULL OR i.issue_date >= ${startFilter}::date)
          AND (${endFilter}::text IS NULL OR i.issue_date <= ${endFilter}::date)
        ORDER BY i.issue_date ASC, i.invoice_number ASC
      `) as Record<string, unknown>[];
    } else {
      throw err;
    }
  }

  // Map and reconcile accounting values
  const invoices: UnpaidInvoiceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  let totalBalance = 0;

  for (const r of rows) {
    const debit = Math.round(Number(r.debit || 0) * 100) / 100;
    const credit = Math.round(Number(r.credit || 0) * 100) / 100;
    // Reconcile balance: Debit - Credit
    const balance = Math.round(Number(r.balance ?? (debit - credit)) * 100) / 100;

    // Check for potential discrepancies
    const expectedBalance = Math.round((debit - credit) * 100) / 100;
    if (Math.abs(balance - expectedBalance) > 0.01) {
      console.warn(
        `[Statement] Reconciled financial variance on invoice ${r.invoiceNumber}: persisted balance=${balance}, calculated=${expectedBalance}`
      );
    }

    invoices.push({
      id: r.id as string,
      issueDate: r.issueDate as string,
      invoiceNumber: r.invoiceNumber as string,
      normalizedInvoiceNumber: (r.normalizedInvoiceNumber as string) || null,
      clientPoNumber: (r.clientPoNumber as string) || null,
      orderNumber: (r.orderNumber as string) || null,
      currency: (r.currency as string) || client.currency || "USD",
      debit,
      credit,
      balance,
      status: r.status as string,
    });

    totalDebit += debit;
    totalCredit += credit;
    totalBalance += balance;
  }

  // Format today's date dynamically as DD/MM/YYYY
  const today = new Date();
  const dayStr = String(today.getDate()).padStart(2, "0");
  const monthStr = String(today.getMonth() + 1).padStart(2, "0");
  const yearStr = today.getFullYear();
  const generationDate = `${dayStr}/${monthStr}/${yearStr}`;

  return {
    company,
    client: {
      id: client.id,
      name: client.name,
      code: client.code,
      taxId: client.taxId,
      email: client.email,
      phone: client.phone,
      billingAddress: client.billingAddress,
      currency: client.currency || "USD",
    },
    periodStart: startFilter,
    periodEnd: endFilter,
    generationDate,
    invoices,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    totalBalance: Math.round(totalBalance * 100) / 100,
    currency: invoices[0]?.currency || client.currency || "USD",
  };
}
