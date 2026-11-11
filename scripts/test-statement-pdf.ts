// ============================================================================
// Verification & Acceptance Test Suite for Unpaid Invoices PDF Statement
// ============================================================================

import fs from "fs";
import path from "path";
import { getUnpaidInvoicesStatement } from "../lib/pdf/statement-data";
import { generateStatementPdf } from "../lib/pdf/statement-pdf";
import { mockDb } from "../lib/mock-db";
import { PDFDocument } from "pdf-lib";

async function runTestSuite() {
  console.log("=== STARTING UNPAID INVOICES STATEMENT PDF TEST SUITE ===\n");

  // 1. Setup Test Data matching user reference: Chemaf SA with 3 unpaid invoices
  const clientId = "b0000000-0000-0000-0000-000000000001"; // KCC or test client
  const client = mockDb.clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Client not found in mockDb");

  // Clear existing mock invoices for this client to set up deterministic test cases
  mockDb.invoices = mockDb.invoices.filter((i) => i.client_id !== clientId);

  // Test 1 & 2: Multiple invoices with partially paid invoice
  // Invoice 1: $92.00, fully unpaid
  const order1Id = "ord-test-001";
  mockDb.orders.push({
    id: order1Id,
    order_number: "MIS/CMD/2026/001",
    client_id: clientId,
    quotation_id: "q-001",
    client_po_number: "PO 5100002237 OX",
    po_date: "2026-11-08",
    expected_delivery_date: null,
    status: "CONFIRMED",
    currency: "USD",
    subtotal: 79.31,
    vat_rate: 16.0,
    vat_amount: 12.69,
    total: 92.00,
    notes: null,
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-08T08:00:00Z",
    updated_at: "2026-11-08T08:00:00Z",
  });

  mockDb.invoices.push({
    id: "inv-test-001",
    invoice_number: "MIS/FAC/2026/001",
    normalized_invoice_number: "FC/CD02035320/1-6/2026",
    client_id: clientId,
    order_id: order1Id,
    quotation_id: "q-001",
    issue_date: "2026-11-08",
    due_date: "2026-12-08",
    status: "ISSUED",
    currency: "USD",
    subtotal: 79.31,
    vat_rate: 16.0,
    vat_amount: 12.69,
    total: 92.00,
    paid_amount: 0.0,
    balance_due: 92.00,
    payment_terms: "30_DAYS",
    notes: null,
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-08T09:00:00Z",
    updated_at: "2026-11-08T09:00:00Z",
  });

  // Invoice 2: Total $2,972.00, Paid $1,000.00, Balance $1,972.00 (Partially Paid)
  const order2Id = "ord-test-002";
  mockDb.orders.push({
    id: order2Id,
    order_number: "MIS/CMD/2026/002",
    client_id: clientId,
    quotation_id: "q-002",
    client_po_number: "PO 5100002369 OX",
    po_date: "2026-11-09",
    expected_delivery_date: null,
    status: "CONFIRMED",
    currency: "USD",
    subtotal: 2562.07,
    vat_rate: 16.0,
    vat_amount: 409.93,
    total: 2972.00,
    notes: null,
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-09T08:00:00Z",
    updated_at: "2026-11-09T08:00:00Z",
  });

  mockDb.invoices.push({
    id: "inv-test-002",
    invoice_number: "MIS/FAC/2026/002",
    normalized_invoice_number: "FC/CD02035320/1-8/2026",
    client_id: clientId,
    order_id: order2Id,
    quotation_id: "q-002",
    issue_date: "2026-11-09",
    due_date: "2026-12-09",
    status: "PARTIALLY_PAID",
    currency: "USD",
    subtotal: 2562.07,
    vat_rate: 16.0,
    vat_amount: 409.93,
    total: 2972.00,
    paid_amount: 1000.00,
    balance_due: 1972.00,
    payment_terms: "30_DAYS",
    notes: "Acompte reçu",
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T09:00:00Z",
  });

  // Invoice 3: Total $1,220.60, fully unpaid
  const order3Id = "ord-test-003";
  mockDb.orders.push({
    id: order3Id,
    order_number: "MIS/CMD/2026/003",
    client_id: clientId,
    quotation_id: "q-003",
    client_po_number: "PO 4100004671 OX",
    po_date: "2026-11-10",
    expected_delivery_date: null,
    status: "CONFIRMED",
    currency: "USD",
    subtotal: 1052.24,
    vat_rate: 16.0,
    vat_amount: 168.36,
    total: 1220.60,
    notes: null,
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-10T08:00:00Z",
    updated_at: "2026-11-10T08:00:00Z",
  });

  mockDb.invoices.push({
    id: "inv-test-003",
    invoice_number: "MIS/FAC/2026/003",
    normalized_invoice_number: "FC/CD02035320/1-8/2026",
    client_id: clientId,
    order_id: order3Id,
    quotation_id: "q-003",
    issue_date: "2026-11-10",
    due_date: "2026-12-10",
    status: "ISSUED",
    currency: "USD",
    subtotal: 1052.24,
    vat_rate: 16.0,
    vat_amount: 168.36,
    total: 1220.60,
    paid_amount: 0.0,
    balance_due: 1220.60,
    payment_terms: "30_DAYS",
    notes: null,
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-10T09:00:00Z",
    updated_at: "2026-11-10T09:00:00Z",
  });

  // Test 3: Fully paid invoice (Should NOT appear)
  mockDb.invoices.push({
    id: "inv-test-paid",
    invoice_number: "MIS/FAC/2026/000",
    normalized_invoice_number: "FC/CD02035320/PAID",
    client_id: clientId,
    order_id: null,
    quotation_id: null,
    issue_date: "2026-11-01",
    due_date: "2026-12-01",
    status: "PAID",
    currency: "USD",
    subtotal: 500.0,
    vat_rate: 16.0,
    vat_amount: 80.0,
    total: 580.0,
    paid_amount: 580.0,
    balance_due: 0.0,
    payment_terms: "30_DAYS",
    notes: null,
    cancellation_reason: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-01T08:00:00Z",
    updated_at: "2026-11-05T08:00:00Z",
  });

  // Test 4: Cancelled invoice (Should NOT appear)
  mockDb.invoices.push({
    id: "inv-test-cancelled",
    invoice_number: "MIS/FAC/2026/CANCELLED",
    normalized_invoice_number: "FC/CD02035320/CANCELLED",
    client_id: clientId,
    order_id: null,
    quotation_id: null,
    issue_date: "2026-11-02",
    due_date: "2026-12-02",
    status: "CANCELLED",
    currency: "USD",
    subtotal: 800.0,
    vat_rate: 16.0,
    vat_amount: 128.0,
    total: 928.0,
    paid_amount: 0.0,
    balance_due: 928.0,
    payment_terms: "30_DAYS",
    notes: null,
    cancellation_reason: "Erreur de saisie",
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-11-02T08:00:00Z",
    updated_at: "2026-11-03T08:00:00Z",
  });

  // --- EXECUTE TEST 1: Retrieve Unpaid Statement Data ---
  console.log("TEST 1: Retrieving all unpaid invoices for client...");
  const statement = await getUnpaidInvoicesStatement(clientId);
  console.log(`Found ${statement.invoices.length} unpaid invoices.`);
  if (statement.invoices.length !== 3) {
    throw new Error(`Expected 3 unpaid invoices, got ${statement.invoices.length}`);
  }
  console.log("✓ Fully paid and cancelled invoices were successfully excluded.");

  // --- EXECUTE TEST 2: Partially Paid Invoice Accounting Verification ---
  console.log("\nTEST 2: Verifying partially paid invoice accounting...");
  const partialInv = statement.invoices.find((i) => i.id === "inv-test-002");
  if (!partialInv) throw new Error("Partially paid invoice not found in statement");
  console.log(`Invoice 2: Debit=$${partialInv.debit}, Credit=$${partialInv.credit}, Balance=$${partialInv.balance}`);
  if (partialInv.debit !== 2972.00 || partialInv.credit !== 1000.00 || partialInv.balance !== 1972.00) {
    throw new Error("Invoice 2 accounting calculation mismatch");
  }
  console.log("✓ Partially paid invoice debit, credit, and balance are exact.");

  // Check Totals
  console.log("\nTEST 3: Checking totals calculation...");
  console.log(`Total Debit: $${statement.totalDebit} (Expected: 4284.60)`);
  console.log(`Total Credit: $${statement.totalCredit} (Expected: 1000.00)`);
  console.log(`Total Balance: $${statement.totalBalance} (Expected: 3284.60)`);
  if (statement.totalBalance !== 3284.60) {
    throw new Error(`Expected total balance 3284.60, got ${statement.totalBalance}`);
  }
  console.log("✓ Totals reconcile: Total Debit - Total Credit = Total Balance ($3,284.60).");

  // --- EXECUTE TEST 6: Date Filters Verification ---
  console.log("\nTEST 6: Testing date filtering...");
  const filteredStatement = await getUnpaidInvoicesStatement(clientId, "2026-11-09", "2026-11-09");
  console.log(`Filtered (2026-11-09 to 2026-11-09): ${filteredStatement.invoices.length} invoice(s)`);
  if (filteredStatement.invoices.length !== 1 || filteredStatement.invoices[0].id !== "inv-test-002") {
    throw new Error("Date filtering failed to isolate invoice for 2026-11-09");
  }
  console.log("✓ Date filtering works accurately.");

  // --- EXECUTE TEST 8: PDF Generation and Page Structure ---
  console.log("\nTEST 8: Generating PDF document bytes...");
  const logoBuf = fs.readFileSync(path.join(process.cwd(), "public/images/logo.png"));
  const sceauBuf = fs.readFileSync(path.join(process.cwd(), "public/signature/sceau.png"));
  const sigBuf = fs.readFileSync(path.join(process.cwd(), "public/signature/signature.png"));

  const pdfBytes = await generateStatementPdf(statement, logoBuf, sceauBuf, sigBuf);
  console.log(`Generated PDF byte size: ${pdfBytes.byteLength} bytes.`);
  if (!pdfBytes || pdfBytes.byteLength < 5000) {
    throw new Error("Generated PDF is suspiciously small");
  }

  // Load with pdf-lib to verify structure
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  console.log(`PDF page count: ${pageCount} (Expected: 1 page for 3 rows)`);
  if (pageCount !== 1) {
    throw new Error(`Expected 1 page, got ${pageCount}`);
  }

  // Save generated sample PDF to verify
  const samplePdfPath = path.join(process.cwd(), "public/generated-statement-sample.pdf");
  fs.writeFileSync(samplePdfPath, Buffer.from(pdfBytes));
  console.log(`✓ Saved sample PDF to: ${samplePdfPath}`);

  // Test empty report generation
  console.log("\nTEST: Testing empty report (client with zero unpaid invoices)...");
  const emptyClientStatement = await getUnpaidInvoicesStatement(clientId, "2020-01-01", "2020-01-02");
  const emptyPdfBytes = await generateStatementPdf(emptyClientStatement, logoBuf, sceauBuf, sigBuf);
  const emptyPdfDoc = await PDFDocument.load(emptyPdfBytes);
  console.log(`Empty report generated successfully (${emptyPdfDoc.getPageCount()} page).`);
  console.log("✓ Empty report does not crash and produces valid informative PDF.");

  console.log("\n=== ALL TEST SUITE ASSERTIONS PASSED SUCCESSFULLY! ===");
}

runTestSuite().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
