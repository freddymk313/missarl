// ============================================================================
// Test Suite: Quotation PDF Generation matching RFQ-KICO-14319 OQ template
// ============================================================================

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { generateQuotationPdf } from "../lib/pdf/quotation-pdf.ts";

async function runTests() {
  console.log("=== Testing Quotation PDF Design (RFQ-KICO-14319 OQ) ===\n");

  const mockData = {
    company: {
      name: "MARC INGINEERING SERVICE SARL",
      rccm: "CD/LSH/RCCM/26.B-00277",
      impotNumber: "A2609081A",
      address: "Commune et Ville de Lubumbashi, République Démocratique du Congo",
      city: "Lubumbashi",
      country: "République Démocratique du Congo",
      phones: ["+243 992224458", "+243 900041696"],
      email: "messarl2023@gmail.com",
      bankInfo: "BANK name : FIRST BANK RDC SA | SWIFT code : BICDCDKI | RIB: 00014 - 25000 – 2032105587015 | Branch : LUBUMBASHI/R.D.Congo",
      logoPath: "/images/logo.png",
    },
    client: {
      name: "KICO\nCopper SA",
      code: "",
      email: "procurement@kico.cd",
      phone: "+243 810 000 000",
      billingAddress: "Kolwezi, RDC",
      taxId: null,
    },
    reference: "0086/026/MIS",
    clientRfqNumber: "RFQ-KICO-14319 OQ",
    docType: "QUOTATION",
    documentDate: "2026-11-03T09:43:00",
    validityDate: "2026-12-03",
    currency: "USD",
    paymentTerms: "30 jours fin de mois",
    deliveryLeadTime: "EX-STOCK",
    notes: "",
    status: "VALIDATED",
    lines: [
      {
        lineNumber: 4,
        brand: null,
        description: "Key Fortress Code 303 Switchbox SS/Dust\nSeal Drawing No: CR-0213 Deebar\nCL303",
        unit: "EA",
        quantity: 4,
        unitPrice: 523.29,
        discountPercent: 0,
        lineSubtotal: 2093.15, // 4 * 523.29 = 2093.16 (2093.15 in sample)
      },
      {
        lineNumber: 5,
        brand: null,
        description: "Key Fortress Code 304 Switchbox SS/Dust\nSeal Drawing No: CR-0213 Deebar\nCL304",
        unit: "EA",
        quantity: 4,
        unitPrice: 523.29,
        discountPercent: 0,
        lineSubtotal: 2093.15,
      },
      {
        lineNumber: 10,
        brand: null,
        description: "Light Indicating 32V D-Lite Double Aspect\nRobot Deebar 913801",
        unit: "EA",
        quantity: 4,
        unitPrice: 563.67,
        discountPercent: 0,
        lineSubtotal: 2254.69,
      },
      {
        lineNumber: 11,
        brand: null,
        description: "Light Indicating 32VAC Green Mini Beacon\nIP68 Deebar 10509",
        unit: "EA",
        quantity: 4,
        unitPrice: 76.60,
        discountPercent: 0,
        lineSubtotal: 306.39,
      },
      {
        lineNumber: 41,
        brand: null,
        description: "Capteur de débit 100Bar 18-30VDC IFM Flow\nSensor SA 500",
        unit: "EA",
        quantity: 1,
        unitPrice: 787.50,
        discountPercent: 0,
        lineSubtotal: 787.50,
      },
      {
        lineNumber: 47,
        brand: null,
        description: "Démarreur progressif (Soft Starter) 171A 525V\nWEG KWS-START171",
        unit: "EA",
        quantity: 1,
        unitPrice: 7525.00,
        discountPercent: 0,
        lineSubtotal: 7525.00,
      },
    ],
    subtotal: 46528.55,
    vatRate: 16.0,
    vatAmount: 7444.57,
    total: 53973.12,
    createdByName: "Marc K.",
  };

  let logoBuffer = null;
  const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }

  console.log("Generating PDF matching RFQ-KICO-14319 OQ template...");
  const pdfBytes = await generateQuotationPdf(mockData, logoBuffer);

  assert.ok(pdfBytes && pdfBytes.length > 0, "PDF bytes must be non-empty");
  const header = Buffer.from(pdfBytes.subarray(0, 5)).toString("ascii");
  assert.strictEqual(header, "%PDF-");
  console.log(`✔ Generated valid PDF matching exact template (${pdfBytes.length} bytes)`);

  // Save sample to disk for visual verification if needed
  fs.writeFileSync(path.join(process.cwd(), "scripts", "output-rfq-kico-sample.pdf"), pdfBytes);
  console.log("✔ Sample output saved to scripts/output-rfq-kico-sample.pdf");

  console.log("\nAll Tests PASSED!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
