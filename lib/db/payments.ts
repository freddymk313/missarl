// ============================================================================
// Payments & Multi-Invoice Allocation Repository (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";
import { getInvoiceById } from "@/lib/db/invoices";
import { logAudit } from "@/lib/db/audit";

export interface PaymentAllocationRecord {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber?: string;
  allocatedAmount: number;
  allocatedAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  paymentDate: string;
  amount: number;
  unallocatedAmount: number;
  currency: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string | null;
  status: "RECORDED" | "RECONCILED" | "CANCELLED";
  cancellationReason: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  allocations?: PaymentAllocationRecord[];
}

export async function getPayments(options?: {
  clientId?: string;
  search?: string;
}): Promise<PaymentRecord[]> {
  const clientId = options?.clientId || null;
  const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;

  const rows = await sql`
    SELECT 
      p.id,
      p.payment_number as "paymentNumber",
      p.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      p.payment_date::text as "paymentDate",
      p.amount::float as amount,
      p.unallocated_amount::float as "unallocatedAmount",
      p.currency,
      p.payment_method as "paymentMethod",
      p.reference_number as "referenceNumber",
      p.notes,
      p.status,
      p.cancellation_reason as "cancellationReason",
      p.created_by as "createdBy",
      u.full_name as "createdByName",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt"
    FROM payments p
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE (${clientId}::uuid IS NULL OR p.client_id = ${clientId}::uuid)
      AND (${searchTerm}::text IS NULL OR 
           LOWER(p.payment_number) LIKE ${searchTerm} OR 
           LOWER(p.reference_number) LIKE ${searchTerm} OR 
           LOWER(c.name) LIKE ${searchTerm})
    ORDER BY p.created_at DESC
  `;

  return rows as unknown as PaymentRecord[];
}

export async function getPaymentById(id: string): Promise<PaymentRecord | null> {
  const rows = await sql`
    SELECT 
      p.id,
      p.payment_number as "paymentNumber",
      p.client_id as "clientId",
      c.code as "clientCode",
      c.name as "clientName",
      p.payment_date::text as "paymentDate",
      p.amount::float as amount,
      p.unallocated_amount::float as "unallocatedAmount",
      p.currency,
      p.payment_method as "paymentMethod",
      p.reference_number as "referenceNumber",
      p.notes,
      p.status,
      p.cancellation_reason as "cancellationReason",
      p.created_by as "createdBy",
      u.full_name as "createdByName",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt"
    FROM payments p
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const payment = rows[0] as unknown as PaymentRecord;

  const allocRows = await sql`
    SELECT 
      pa.id,
      pa.payment_id as "paymentId",
      pa.invoice_id as "invoiceId",
      i.invoice_number as "invoiceNumber",
      pa.allocated_amount::float as "allocatedAmount",
      pa.allocated_at as "allocatedAt"
    FROM payment_allocations pa
    JOIN invoices i ON pa.invoice_id = i.id
    WHERE pa.payment_id = ${id}
    ORDER BY pa.allocated_at ASC
  `;

  payment.allocations = allocRows as unknown as PaymentAllocationRecord[];
  return payment;
}

export async function recordPayment(data: {
  clientId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  paymentDate?: string;
  notes?: string;
  allocations?: Array<{ invoiceId: string; amount: number }>;
  userId: string;
}): Promise<PaymentRecord> {
  if (data.amount <= 0) {
    throw new Error("Le montant du paiement doit être supérieur à zéro.");
  }

  // 1. Generate receipt number
  const currentYear = new Date().getFullYear();
  const countRows = await sql`
    SELECT COUNT(*)::int as count FROM payments WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
  `;
  const nextSeq = (countRows[0].count as number) + 1;
  const paymentNumber = `MIS/REC/${currentYear}/${String(nextSeq).padStart(3, "0")}`;

  // 2. Validate allocations against invoice balances and client ownership
  let totalAllocated = 0;
  const verifiedAllocations: Array<{ invoiceId: string; amount: number }> = [];

  if (data.allocations && data.allocations.length > 0) {
    for (const alloc of data.allocations) {
      if (alloc.amount <= 0) continue;
      const invoice = await getInvoiceById(alloc.invoiceId);
      if (!invoice) throw new Error(`Facture ${alloc.invoiceId} introuvable.`);
      if (invoice.clientId !== data.clientId) {
        throw new Error(
          `Violation d'intégrité : La facture ${invoice.invoiceNumber} n'appartient pas au client sélectionné.`
        );
      }
      if (alloc.amount > invoice.balanceDue + 0.001) {
        throw new Error(
          `Le montant alloué ($${alloc.amount}) dépasse le solde restant de la facture ${invoice.invoiceNumber} ($${invoice.balanceDue}).`
        );
      }
      totalAllocated += alloc.amount;
      verifiedAllocations.push(alloc);
    }
  }

  if (totalAllocated > data.amount + 0.001) {
    throw new Error("Le montant total alloué ne peut pas dépasser le montant du paiement reçu.");
  }

  const unallocatedAmount = Math.max(0, Math.round((data.amount - totalAllocated) * 100) / 100);

  // 3. Insert payment
  const paymentRows = await sql`
    INSERT INTO payments (
      payment_number, client_id, payment_date, amount, unallocated_amount,
      currency, payment_method, reference_number, notes, status, created_by
    )
    VALUES (
      ${paymentNumber},
      ${data.clientId},
      ${data.paymentDate || "CURRENT_DATE"},
      ${data.amount},
      ${unallocatedAmount},
      'USD',
      ${data.paymentMethod},
      ${data.referenceNumber.trim()},
      ${data.notes?.trim() || null},
      ${totalAllocated > 0 ? "RECONCILED" : "RECORDED"},
      ${data.userId}
    )
    RETURNING id;
  `;

  const paymentId = paymentRows[0].id as string;

  // 4. Record allocations and update invoices
  for (const alloc of verifiedAllocations) {
    await sql`
      INSERT INTO payment_allocations (payment_id, invoice_id, client_id, allocated_amount, created_by)
      VALUES (${paymentId}, ${alloc.invoiceId}, ${data.clientId}, ${alloc.amount}, ${data.userId})
    `;

    // Update invoice balance
    await sql`
      UPDATE invoices
      SET 
        paid_amount = paid_amount + ${alloc.amount},
        balance_due = balance_due - ${alloc.amount},
        status = CASE 
          WHEN (balance_due - ${alloc.amount}) <= 0.009 THEN 'PAID'
          ELSE 'PARTIALLY_PAID'
        END,
        updated_at = NOW()
      WHERE id = ${alloc.invoiceId}
    `;
  }

  await logAudit({
    userId: data.userId,
    action: "PAYMENT_RECORDED",
    entityType: "PAYMENT",
    entityId: paymentId,
    details: {
      paymentNumber,
      amount: data.amount,
      referenceNumber: data.referenceNumber,
      allocatedCount: verifiedAllocations.length,
      unallocatedAmount,
    },
  });

  const created = await getPaymentById(paymentId);
  return created!;
}
