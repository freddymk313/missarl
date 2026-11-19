// ============================================================================
// Automated Verification Test Suite for Gemini RFQ Import Assistant
// Verifies: file validation, extraction normalization, designation/description-only
// matching, unit normalization, duplicate detection, bulk item creation,
// source order preservation, and unitPrice = 0 preservation in createQuotation.
// ============================================================================

import assert from "node:assert/strict";
import {
  detectRFQFileMimeFromBytes,
  MAX_RFQ_FILE_BYTES,
  validateRFQDocumentFile,
} from "../lib/rfq-file-validation";
import { normalizeExtractedRFQPayload } from "../lib/gemini/rfq-extractor";
import { normalizeUnitFromCatalog } from "../lib/rfq-import-types";
import {
  findDesignationDescriptionDuplicates,
  getActiveCatalogueSummariesForMatching,
  matchExtractedRFQItems,
} from "../lib/db/rfq-item-matching";
import {
  buildOrderedQuotationDraftLines,
  createInitialReviewLines,
  groupReviewLinesByStatus,
  REVIEW_GROUP_ORDER,
  validateReviewLinesForQuote,
} from "../lib/rfq-draft-builder";
import { createItem, getUnits } from "../lib/db/items";
import { createQuotation, getQuotationById } from "../lib/db/quotations";
import { mockDb } from "../lib/mock-db";

async function run() {
  console.log("=== RFQ IMPORT ASSISTANT VERIFICATION SUITE ===\n");

  // --------------------------------------------------------------------------
  // 1. Magic-byte detection & file upload validation (PDF, JPEG, PNG <= 4 MB)
  // --------------------------------------------------------------------------
  const validPdfBytes = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n", "utf8");
  const validPngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]);
  const validJpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

  assert.equal(detectRFQFileMimeFromBytes(validPdfBytes), "application/pdf");
  assert.equal(detectRFQFileMimeFromBytes(validPngBytes), "image/png");
  assert.equal(detectRFQFileMimeFromBytes(validJpegBytes), "image/jpeg");
  assert.equal(detectRFQFileMimeFromBytes(Buffer.from("NOT_A_DOC")), null);

  const okPdfFile = new File([validPdfBytes], "rfq-kcc.pdf", {
    type: "application/pdf",
  });
  const okRes = await validateRFQDocumentFile(okPdfFile);
  assert.equal(okRes.ok, true, "Valid PDF under 4 MB should pass");

  const oversizedBytes = new Uint8Array(MAX_RFQ_FILE_BYTES + 10);
  oversizedBytes.set(validPdfBytes, 0);
  const oversizedFile = new File([oversizedBytes], "huge.pdf", {
    type: "application/pdf",
  });
  const oversizedRes = await validateRFQDocumentFile(oversizedFile);
  assert.equal(oversizedRes.ok, false);
  if (!oversizedRes.ok) {
    assert.equal(oversizedRes.status, 413);
  }

  const spoofedFile = new File([validJpegBytes], "fake.png", {
    type: "image/png",
  });
  const spoofedRes = await validateRFQDocumentFile(spoofedFile);
  assert.equal(spoofedRes.ok, false);
  if (!spoofedRes.ok) {
    assert.equal(spoofedRes.status, 400);
  }

  const unsupportedFile = new File([Buffer.from("PK\x03\x04")], "rfq.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const unsupportedRes = await validateRFQDocumentFile(unsupportedFile);
  assert.equal(unsupportedRes.ok, false);
  console.log("[PASS] 1. File signature, MIME, extension, and 4 MB limit checks");

  // --------------------------------------------------------------------------
  // 2. Gemini JSON payload normalization & multi-page order preservation
  // --------------------------------------------------------------------------
  const rawGeminiJson = {
    clientRfqReference: "RFQ-KICO-88412",
    documentTitle: "Demande de prix équipement électrique ABB / KICO",
    totalExtractedItems: 6,
    items: [
      {
        sourceLineNumber: 1,
        pageNumber: 1,
        designation: "AS-Interface flat cable seal Part No: E70413 Order code: E70413-AS-i cable end seal 10pcs",
        description: "AS-Interface flat cable seal Part No: E70413 Order code: E70413-AS-i cable end seal 10pcs",
        quantity: 5,
        rawUnit: "PCS",
        confidence: "high",
        extractionNotes: null,
      },
      {
        sourceLineNumber: 2,
        pageNumber: 1,
        designation: "Disj. Triph. ABB XT2N 160A",
        description: "Disjoncteur boîtier moulé 3P 160A 400V 36kA",
        quantity: 2,
        rawUnit: "EA",
        confidence: "high",
        extractionNotes: null,
      },
      {
        sourceLineNumber: 3,
        pageNumber: 2,
        designation: "Câble armé Cuivre XLPE 4x16mm²",
        description: "Câble électrique basse tension 0.6/1kV armé SWA",
        quantity: 250,
        rawUnit: "Metre",
        confidence: "high",
        extractionNotes: null,
      },
      {
        sourceLineNumber: 4,
        pageNumber: 3,
        designation: "Vanne à boule inox PN40 DN50",
        description: "Vanne industrielle à passage intégral bride PN40",
        quantity: null,
        rawUnit: "EA",
        confidence: "medium",
        extractionNotes: "Quantité illisible sur scan",
      },
      {
        sourceLineNumber: 5,
        pageNumber: 4,
        designation: "Contacteur auxiliaire industriel",
        description: "Bobine 24VDC 4NO",
        quantity: 4,
        rawUnit: "LOT_SPECIAL_XYZ",
        confidence: "high",
        extractionNotes: null,
      },
      {
        sourceLineNumber: 6,
        pageNumber: 7,
        designation: "Capteur inductif M18 PNP NO",
        description: "Portée 8mm IP67 boîtier laiton nickelé connecteur M12",
        quantity: 6,
        rawUnit: "NOS",
        confidence: "high",
        extractionNotes: null,
      },
    ],
  };

  const normalizedExtracted = normalizeExtractedRFQPayload(rawGeminiJson);
  assert.equal(normalizedExtracted.totalExtractedItems, 6);
  assert.deepEqual(
    normalizedExtracted.items.map((i) => i.sourceLineNumber),
    [1, 2, 3, 4, 5, 6]
  );
  console.log("[PASS] 2. Multi-page structured payload normalization & source indexing");

  // --------------------------------------------------------------------------
  // 3. Unit normalization (no silent fallback for unknown units)
  // --------------------------------------------------------------------------
  const units = await getUnits();
  assert.equal(normalizeUnitFromCatalog("PCS", units), "EA");
  assert.equal(normalizeUnitFromCatalog("NOS", units), "EA");
  assert.equal(normalizeUnitFromCatalog("Metre", units), "M");
  assert.equal(normalizeUnitFromCatalog("Rouleau", units), "ROLL");
  assert.equal(normalizeUnitFromCatalog("LOT_SPECIAL_XYZ", units), null);
  assert.equal(normalizeUnitFromCatalog(null, units), null);
  console.log("[PASS] 3. Unit normalization maps valid aliases and flags unknown units");

  // --------------------------------------------------------------------------
  // 4. Designation & Description ONLY matching (MPN/SKU ignored!)
  // --------------------------------------------------------------------------
  // Seed a mock catalogue entry where MPN is "ABB-XT2N-160" on a COMPLETELY unrelated
  // mechanical item ("Joint torique caoutchouc"), and another item matching "Disjoncteur Triphase"
  mockDb.items.push({
    id: "item-unrelated-mpn",
    sku: "ABB-XT2N-160",
    designation: "Joint torique caoutchouc Viton DN25",
    description: "Joint d'étanchéité haute température pour pompe centrifuge",
    category_id: "c1",
    brand_id: null,
    mpn: "ABB-XT2N-160",
    mpn_normalized: "ABBXT2N160",
    unit_code: "EA",
    specs: {},
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  mockDb.items.push({
    id: "item-disj-abb",
    sku: "MIS-000100",
    designation: "Disjoncteur Triphase ABB XT2N 160A",
    description: "Disjoncteur boîtier moulé 3P 160A 400V",
    category_id: "c3",
    brand_id: null,
    mpn: "COMPLETELY_DIFFERENT_CODE",
    mpn_normalized: "COMPLETELYDIFFERENTCODE",
    unit_code: "EA",
    specs: {},
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Add 2 very close items to verify POSSIBLE_MATCH ambiguity + max 3 candidates
  mockDb.items.push(
    {
      id: "item-cbl-1",
      sku: "MIS-000201",
      designation: "Câble armé Cuivre XLPE 4x16mm²",
      description: "Câble électrique basse tension 0.6/1kV armé SWA",
      category_id: "c3",
      brand_id: null,
      mpn: null,
      mpn_normalized: null,
      unit_code: "M",
      specs: {},
      notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "item-cbl-2",
      sku: "MIS-000202",
      designation: "Câble armé Cuivre XLPE 4x16mm²",
      description: "Câble électrique basse tension 0.6/1kV armé STA",
      category_id: "c3",
      brand_id: null,
      mpn: null,
      mpn_normalized: null,
      unit_code: "M",
      specs: {},
      notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );

  const catalogueSummaries = await getActiveCatalogueSummariesForMatching();
  const { lines: matchedLines, summary } = matchExtractedRFQItems({
    extracted: normalizedExtracted,
    catalogueItems: catalogueSummaries,
    units,
  });

  assert.equal(matchedLines.length, 6);
  // Line 1 matches existing seeded IFM E70413 by exact text
  assert.equal(matchedLines[0].status, "MATCHED");
  assert.equal(matchedLines[0].matchedItem?.itemId, "item-0001");

  // Line 2 matches item-disj-abb via designation/description ("Disj. Triph." -> "Disjoncteur Triphase"),
  // and does NOT match "item-unrelated-mpn" even though its SKU/MPN was literally "ABB-XT2N-160"!
  assert.equal(matchedLines[1].matchedItem?.itemId, "item-disj-abb");
  assert.equal(
    matchedLines[1].candidates.some((c) => c.itemId === "item-unrelated-mpn"),
    false,
    "Unrelated MPN/SKU must never trigger a match"
  );

  // Line 3 is ambiguous between item-cbl-1 and item-cbl-2 -> POSSIBLE_MATCH with <= 3 candidates
  assert.equal(matchedLines[2].status, "POSSIBLE_MATCH");
  assert.ok(matchedLines[2].candidates.length <= 3 && matchedLines[2].candidates.length >= 2);

  // Line 4 has null quantity -> NEEDS_REVIEW
  assert.equal(matchedLines[3].status, "NEEDS_REVIEW");

  // Line 5 has unknown rawUnit "LOT_SPECIAL_XYZ" -> NEEDS_REVIEW + normalizedUnitCode null
  assert.equal(matchedLines[4].status, "NEEDS_REVIEW");
  assert.equal(matchedLines[4].normalizedUnitCode, null);

  // Line 6 is not in catalogue -> NEW
  assert.equal(matchedLines[5].status, "NEW");
  assert.equal(summary.total, 6);
  console.log("[PASS] 4. Designation/description-only matching, ambiguity, and review classification");

  // --------------------------------------------------------------------------
  // 5. Grouping Order (NEW -> POSSIBLE -> MATCHED -> NEEDS_REVIEW) & Draft Order
  // --------------------------------------------------------------------------
  const reviewRows = createInitialReviewLines(matchedLines);
  const grouped = groupReviewLinesByStatus(reviewRows);
  assert.deepEqual(REVIEW_GROUP_ORDER, [
    "NEW",
    "POSSIBLE_MATCH",
    "MATCHED",
    "NEEDS_REVIEW",
  ]);
  assert.equal(grouped.NEW.map((r) => r.sourceLineNumber).join(","), "6");
  assert.equal(grouped.POSSIBLE_MATCH.map((r) => r.sourceLineNumber).join(","), "3");
  assert.equal(grouped.MATCHED.map((r) => r.sourceLineNumber).join(","), "1,2");
  assert.equal(grouped.NEEDS_REVIEW.map((r) => r.sourceLineNumber).join(","), "4,5");

  // Resolve NEEDS_REVIEW & POSSIBLE_MATCH + bulk create Line 6
  const blockedCheck = validateReviewLinesForQuote(reviewRows);
  assert.equal(blockedCheck.ok, false, "Should block while qty/unit/confirmation missing");

  // Simulate bulk creation for line 6 via createItem() + duplicate recheck
  const dupBefore = findDesignationDescriptionDuplicates(
    [
      {
        sourceLineNumber: 6,
        designation: reviewRows[5].designation,
        description: reviewRows[5].description,
      },
    ],
    await getActiveCatalogueSummariesForMatching()
  );
  assert.equal(dupBefore.size, 0, "Line 6 should not yet exist in catalogue");

  const createdLine6 = await createItem({
    designation: reviewRows[5].designation,
    description: reviewRows[5].description,
    unitCode: reviewRows[5].unitCode,
  });
  assert.ok(createdLine6.skuRef.startsWith("MIS-"));

  // Duplicate check MUST detect newly created item immediately
  const dupAfter = findDesignationDescriptionDuplicates(
    [
      {
        sourceLineNumber: 6,
        designation: reviewRows[5].designation,
        description: reviewRows[5].description,
      },
    ],
    await getActiveCatalogueSummariesForMatching()
  );
  assert.equal(dupAfter.get(6)?.id, createdLine6.id, "Duplicate recheck must prevent double insert");

  // Mark user resolutions in review state (out of order edits!)
  reviewRows[2].possibleMatchConfirmed = true; // Line 3
  reviewRows[3].quantity = 3; // Line 4 fixed qty
  reviewRows[4].unitCode = "SET"; // Line 5 fixed unit
  reviewRows[5].resolutionMode = "LINK_EXISTING";
  reviewRows[5].linkedItemId = createdLine6.id;
  reviewRows[5].linkedSkuRef = createdLine6.skuRef;

  const readyCheck = validateReviewLinesForQuote(reviewRows);
  assert.equal(readyCheck.ok, true, "Resolved lines should be ready for quote");

  const draftLines = buildOrderedQuotationDraftLines(reviewRows);
  assert.equal(draftLines.length, 6);
  // Original order restored: Line 1..6 regardless of grouped review sections
  assert.ok(draftLines[0].description.includes("E70413"));
  assert.ok(draftLines[1].description.includes("ABB XT2N 160A"));
  assert.ok(draftLines[2].description.includes("4x16mm"));
  assert.ok(draftLines[3].description.includes("Vanne à boule"));
  assert.ok(draftLines[4].description.includes("Contacteur auxiliaire"));
  assert.ok(draftLines[5].description.includes("Capteur inductif"));
  assert.equal(draftLines[5].itemId, createdLine6.id);

  // Every draft line MUST start at selling unitPrice = 0 and blank brand
  for (const dl of draftLines) {
    assert.equal(dl.unitPrice, 0);
    assert.equal(dl.supplyPrice, 0);
    assert.equal(dl.brand, "");
    assert.equal(dl.brandImageUrl, null);
  }
  console.log("[PASS] 5. Review grouping, bulk create + duplicate recheck, and source order restoration");

  // --------------------------------------------------------------------------
  // 6. Persist Quotation via createQuotation() and verify unitPrice=0 & order
  // --------------------------------------------------------------------------
  const savedQuote = await createQuotation({
    clientId: mockDb.clients[0].id,
    docType: "QUOTATION",
    clientRfqNumber: "RFQ-KICO-88412",
    validityDays: 30,
    vatRate: 16,
    defaultCommissionPercent: 25,
    items: draftLines.map((dl) => ({
      itemId: dl.itemId,
      brand: dl.brand,
      brandImageUrl: dl.brandImageUrl,
      description: dl.description,
      unit: dl.unit,
      quantity: dl.quantity,
      unitPrice: dl.unitPrice,
      discountPercent: dl.discountPercent,
    })),
    userId: mockDb.users[0].id,
  });

  const fetchedQuote = await getQuotationById(savedQuote.id);
  assert.ok(fetchedQuote && fetchedQuote.items && fetchedQuote.items.length === 6);
  assert.deepEqual(
    fetchedQuote.items.map((it) => it.lineNumber),
    [1, 2, 3, 4, 5, 6]
  );
  for (const it of fetchedQuote.items) {
    assert.equal(it.unitPrice, 0, "Persisted line unitPrice must preserve explicit 0");
  }
  console.log("[PASS] 6. Quotation saved with exact line order (1..6) and explicit unitPrice = 0");

  console.log("\n=== ALL RFQ IMPORT TESTS PASSED SUCCESSFULLY ===");
}

run().catch((err) => {
  console.error("TEST SUITE FAILED:", err);
  process.exit(1);
});
