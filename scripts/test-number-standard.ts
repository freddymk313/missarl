// ============================================================================
// Automated Verification Test Suite for MIS SARL Numeric Standardization
// Tests: parseUserNumber, formatUSNumber, formatUSD, formatCurrency,
// formatQuantity, formatPlainDraft, validateOptionalCatalogPrice, and PDF formatting.
// ============================================================================

import assert from "node:assert/strict";
import {
  formatUSNumber,
  formatUSD,
  formatCurrency,
  formatQuantity,
  formatPlainDraft,
  parseUserNumber,
  toFiniteNumber,
} from "../lib/number-format";
import { validateOptionalCatalogPrice } from "../lib/rfq-import-types";
import { formatCurrency as formatPdfCurrency } from "../lib/pdf/mis-document-layout";
import { formatMoney as formatUiMoney } from "../components/dashboard/ui/formatters";
import { formatUSD as formatLegacyUSD } from "../lib/formatters";

// ── A. Parser Tests ──────────────────────────────────────────────────────────
console.log("Running A. Parser tests...");

const validCases: Array<[string, number]> = [
  ["1500", 1500],
  ["1500.05", 1500.05],
  ["3546.50", 3546.5],
  ["25070.94", 25070.94],
  ["0.25", 0.25],
  ["1250000.75", 1250000.75],
  ["0", 0],
];

for (const [raw, expected] of validCases) {
  const res = parseUserNumber(raw);
  assert.equal(res.ok, true, `Expected "${raw}" to be valid`);
  if (res.ok) {
    assert.equal(res.value, expected, `Expected "${raw}" -> ${expected}`);
  }
}

const invalidCases = [
  "1,500",
  "1,500.05",
  "1500,05",
  "3 546.50",
  "1.500,05",
  "1500.05abc",
  "Infinity",
  "NaN",
  "-10", // negative rejected by default
];

for (const raw of invalidCases) {
  const res = parseUserNumber(raw);
  assert.equal(res.ok, false, `Expected "${raw}" to be rejected`);
}

// Empty vs explicit zero
assert.deepEqual(parseUserNumber("", { required: false }), { ok: true, value: null });
assert.deepEqual(parseUserNumber("   ", { required: false }), { ok: true, value: null });
assert.deepEqual(parseUserNumber("0", { required: false }), { ok: true, value: 0 });
assert.equal(parseUserNumber("", { required: true }).ok, false);
assert.equal(parseUserNumber("0", { allowZero: false }).ok, false);

// ── B. Formatter Tests ───────────────────────────────────────────────────────
console.log("Running B. Formatter tests...");

assert.equal(formatUSNumber(1500, { minDecimals: 2, maxDecimals: 2 }), "1,500.00");
assert.equal(formatUSNumber(1500.05, { minDecimals: 2, maxDecimals: 2 }), "1,500.05");
assert.equal(formatUSNumber(3546.5, { minDecimals: 2, maxDecimals: 2 }), "3,546.50");
assert.equal(formatUSNumber(25070.94, { minDecimals: 2, maxDecimals: 2 }), "25,070.94");
assert.equal(formatUSNumber(1250000.75, { minDecimals: 2, maxDecimals: 2 }), "1,250,000.75");
assert.equal(formatUSNumber(-214.64, { minDecimals: 2, maxDecimals: 2 }), "-214.64");
assert.equal(formatUSNumber(0, { minDecimals: 2, maxDecimals: 2 }), "0.00");

assert.equal(formatUSD(1500), "$ 1,500.00");
assert.equal(formatUSD(1500.05), "$ 1,500.05");
assert.equal(formatUSD(3546.5), "$ 3,546.50");
assert.equal(formatUSD(-214.64), "-$ 214.64");
assert.equal(formatUSD(0), "$ 0.00");

assert.equal(formatCurrency(12500, "ZAR"), "R 12,500.00");
assert.equal(formatCurrency(2850.5, "CDF"), "CDF 2,850.50");

// Quantities preserve period decimals
assert.equal(formatQuantity(1.25), "1.25");
assert.equal(formatQuantity(1500.75), "1,500.75");
assert.equal(formatQuantity(5), "5");

// Centralized re-exports match
assert.equal(formatPdfCurrency(3546.5), "$ 3,546.50");
assert.equal(formatUiMoney(3546.5), "$ 3,546.50");
assert.equal(formatLegacyUSD(3546.5), "$ 3,546.50");

// ── C. Plain Draft & Boundary Tests ──────────────────────────────────────────
console.log("Running C. Input draft & boundary tests...");

assert.equal(formatPlainDraft(1500.05, 2), "1500.05");
assert.equal(formatPlainDraft(1500, 2), "1500");
assert.equal(formatPlainDraft(null, 2), "");
assert.equal(formatPlainDraft(undefined, 2), "");

assert.equal(toFiniteNumber("1500.05"), 1500.05);
assert.equal(toFiniteNumber("1,500.05", -1), -1); // Rejects grouped display string at DB boundary

// ── D. Optional Catalog Price Validation Tests ───────────────────────────────
console.log("Running D. validateOptionalCatalogPrice tests...");

assert.deepEqual(validateOptionalCatalogPrice("", "Supply Price"), { ok: true, value: null });
assert.deepEqual(validateOptionalCatalogPrice(null, "Supply Price"), { ok: true, value: null });
assert.deepEqual(validateOptionalCatalogPrice("0", "Supply Price"), { ok: true, value: 0 });
assert.deepEqual(validateOptionalCatalogPrice(0, "Supply Price"), { ok: true, value: 0 });
assert.deepEqual(validateOptionalCatalogPrice("1500.05", "Supply Price"), { ok: true, value: 1500.05 });
assert.equal(validateOptionalCatalogPrice("1,500.05", "Supply Price").ok, false);
assert.equal(validateOptionalCatalogPrice("1500,05", "Supply Price").ok, false);
assert.equal(validateOptionalCatalogPrice("-10", "Supply Price").ok, false);
assert.equal(validateOptionalCatalogPrice("12abc", "Supply Price").ok, false);

console.log("ALL NUMERIC STANDARDIZATION TESTS PASSED!");
