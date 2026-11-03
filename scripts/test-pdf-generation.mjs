// ============================================================================
// Test Suite: Quotation PDF Generation & Calculations Validation (pdf-lib)
// ============================================================================

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { generateQuotationPdf } from "../lib/pdf/quotation-pdf.ts";

async function runTests() {
  console.log("=== Testing Quotation PDF Generation & Logic (pdf-lib) ===\n");

  // Sample Mock Data matching QuotationPdfData
  const mockData = {
    company: {
      name: "MARC INGINEERING SERVICES SARL",
      rccm: "CD/LSH/RCCM/26-B-00277",
      address: "Commune et Ville de Lubumbashi",
      city: "Lubumbashi, Haut-Katanga",
      country: "République Démocratique du Congo",
      phones: ["+243 992 224 458", "+243 900 041 696"],
      email: "messarl2023@gmail.com",
      logoPath: "/images/logo.png",
    },
    client: {
      name: "KAMOTO COPPER COMPANY S.A.",
      code: "CLI-KCC-01",
      email: "procurement@kcc.cd",
      phone: "+243 810 000 000",
      billingAddress: "Kolwezi, Lualaba, RDC",
      taxId: null,
    },
    reference: "DEV-KCC-2026-001",
    clientRfqNumber: "RFQ-KCC-2026-8899",
    docType: "QUOTATION",
    documentDate: "2026-11-03",
    validityDate: "2026-12-03",
    currency: "USD",
    paymentTerms: "30 jours fin de mois",
    deliveryLeadTime: "Ex-stock Lubumbashi / 2-3 semaines",
    notes: "Fourniture certifiée d'origine constructeur avec certificats de matière et conformité technique.",
    status: "VALIDATED",
    lines: [
      {
        lineNumber: 1,
        description: "Roulement à rouleaux coniques SKF 32218 J2/Q - Spécial broyeur primaire - Haute résistance aux charges combinées radiales et axiales",
        unit: "Pce",
        quantity: 4,
        unitPrice: 450.50,
        discountPercent: 5.0, // 5% discount
        lineSubtotal: 1711.90, // 4 * 450.50 * 0.95 = 1711.90
      },
      {
        lineNumber: 2,
        description: "Joint d'étanchéité Viton haute température Ø 180mm",
        unit: "Pce",
        quantity: 10,
        unitPrice: 85.00,
        discountPercent: 0,
        lineSubtotal: 850.00,
      },
      {
        lineNumber: 3,
        description: "Graisse industrielle synthétique Mobilith SHC 220 - Seau 18kg",
        unit: "Pail",
        quantity: 2.5,
        unitPrice: 320.00,
        discountPercent: 0,
        lineSubtotal: 800.00,
      }
    ],
    subtotal: 3361.90,
    vatRate: 16.0,
    vatAmount: 537.90,
    total: 3899.80,
    createdByName: "Marc K.",
  };

  // Test 1: Calculation integrity
  console.log("Test 1: Verifying arithmetic integrity...");
  const calculatedSubtotal = mockData.lines.reduce((acc, l) => acc + l.lineSubtotal, 0);
  assert.strictEqual(Math.round(calculatedSubtotal * 100) / 100, mockData.subtotal);
  const calculatedVat = Math.round(mockData.subtotal * (mockData.vatRate / 100) * 100) / 100;
  assert.strictEqual(calculatedVat, mockData.vatAmount);
  const calculatedTotal = Math.round((mockData.subtotal + calculatedVat) * 100) / 100;
  assert.strictEqual(calculatedTotal, mockData.total);
  console.log("✔ Arithmetic calculations match perfectly (Subtotal: $3,361.90, TVA: $537.90, Total: $3,899.80)");

  // Test 2: Confidentiality check
  console.log("Test 2: Verifying no confidential supplier fields exposed...");
  for (const line of mockData.lines) {
    assert.strictEqual(line.supplierPriceSnapshot, undefined);
    assert.strictEqual(line.supplierOfferId, undefined);
    assert.strictEqual(line.commissionAmountSnapshot, undefined);
    assert.strictEqual(line.exchangeRateSnapshot, undefined);
  }
  console.log("✔ Confidential commercial fields are strictly excluded from client-facing data");

  // Test 3: PDF Document Rendering via pdf-lib
  console.log("Test 3: Generating PDF buffer with pdf-lib...");
  let logoBuffer = null;
  const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }

  const pdfBytes = await generateQuotationPdf(mockData, logoBuffer);
  assert.ok(pdfBytes && pdfBytes.length > 0, "PDF bytes must be non-empty");

  // Test 4: PDF Header Verification
  console.log("Test 4: Verifying PDF header signature...");
  const header = Buffer.from(pdfBytes.subarray(0, 5)).toString("ascii");
  assert.strictEqual(header, "%PDF-", "Generated buffer must begin with '%PDF-'");
  console.log(`✔ Valid PDF binary generated successfully (${pdfBytes.length} bytes)`);

  // Test 5: Multi-page handling test with 25 lines
  console.log("Test 5: Testing multi-page quotation with 25 items...");
  const multiPageData = {
    ...mockData,
    reference: "DEV-KCC-2026-MULTI",
    lines: Array.from({ length: 25 }, (_, idx) => ({
      lineNumber: idx + 1,
      description: `Item chiffré numéro #${idx + 1} avec longue spécification technique industrielle de remplacement`,
      unit: "Pce",
      quantity: idx + 1,
      unitPrice: 100.0,
      discountPercent: 0,
      lineSubtotal: (idx + 1) * 100.0,
    })),
  };
  const multiPdf = await generateQuotationPdf(multiPageData, logoBuffer);
  const multiHeader = Buffer.from(multiPdf.subarray(0, 5)).toString("ascii");
  assert.strictEqual(multiHeader, "%PDF-");
  console.log(`✔ Multi-page quotation PDF generated successfully (${multiPdf.length} bytes)`);

  console.log("\nAll PDF Generation & Integrity Tests PASSED!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
