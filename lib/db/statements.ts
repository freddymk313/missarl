// ============================================================================
// Client Account Statement Service (Computed Ledger from Authoritative DB)
// ============================================================================

import { sql } from "@/lib/db";
import { getClientById, ClientRecord } from "@/lib/db/clients";

export interface StatementTransaction {
  id: string;
  date: string;
  type: "INVOICE" | "PAYMENT";
  reference: string;
  description: string;
  debit: number;   // Invoiced amount
  credit: number;  // Paid amount
  runningBalance: number;
  status: string;
}

export interface ClientAccountStatement {
  client: ClientRecord;
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  currency: string;
  transactions: StatementTransaction[];
}

export async function getClientAccountStatement(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<ClientAccountStatement> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error("Client introuvable.");
  }

  // 1. Fetch all active invoices (debits)
  const invoiceRows = await sql`
    SELECT 
      id,
      issue_date::text as "date",
      invoice_number as "reference",
      'Facture de vente ' || invoice_number as "description",
      total::float as "debit",
      0.0 as "credit",
      status
    FROM invoices
    WHERE client_id = ${clientId}
      AND status != 'CANCELLED'
    ORDER BY issue_date ASC
  `;

  // 2. Fetch all active payments (credits)
  const paymentRows = await sql`
    SELECT 
      id,
      payment_date::text as "date",
      payment_number as "reference",
      'Paiement reçu (' || payment_method || ') Réf: ' || reference_number as "description",
      0.0 as "debit",
      amount::float as "credit",
      status
    FROM payments
    WHERE client_id = ${clientId}
      AND status != 'CANCELLED'
    ORDER BY payment_date ASC
  `;

  // 3. Merge & sort chronologically
  const allEvents = [
    ...invoiceRows.map((r) => ({
      id: r.id as string,
      date: r.date as string,
      type: "INVOICE" as const,
      reference: r.reference as string,
      description: r.description as string,
      debit: Number(r.debit),
      credit: Number(r.credit),
      status: r.status as string,
    })),
    ...paymentRows.map((r) => ({
      id: r.id as string,
      date: r.date as string,
      type: "PAYMENT" as const,
      reference: r.reference as string,
      description: r.description as string,
      debit: Number(r.debit),
      credit: Number(r.credit),
      status: r.status as string,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 4. Compute running balance and filter by date range if provided
  let runningBalance = 0;
  let openingBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  const transactions: StatementTransaction[] = [];

  for (const event of allEvents) {
    const isBeforeStart = startDate && new Date(event.date) < new Date(startDate);
    const isAfterEnd = endDate && new Date(event.date) > new Date(endDate);

    if (isBeforeStart) {
      openingBalance += event.debit - event.credit;
      runningBalance += event.debit - event.credit;
      continue;
    }

    if (!isAfterEnd) {
      runningBalance += event.debit - event.credit;
      totalDebits += event.debit;
      totalCredits += event.credit;

      transactions.push({
        ...event,
        runningBalance: Math.round(runningBalance * 100) / 100,
      });
    }
  }

  const closingBalance = Math.round(runningBalance * 100) / 100;

  return {
    client,
    periodStart: startDate || null,
    periodEnd: endDate || null,
    openingBalance: Math.round(openingBalance * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    closingBalance,
    currency: client.currency || "USD",
    transactions,
  };
}
