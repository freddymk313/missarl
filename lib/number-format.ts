// ============================================================================
// Centralized Numeric Formatting & Strict Parsing Utilities for MIS SARL
// Standard: US English numeric convention (comma = thousands, period = decimal)
// Input: Plain ungrouped numbers only (e.g. "1500.05")
// Display: Automatic US grouping (e.g. "1,500.05", "$ 1,500.05")
// ============================================================================

export interface FormatUSNumberOptions {
  minDecimals?: number;
  maxDecimals?: number;
  fallback?: string;
}

/**
 * Formats a general numeric value using US English grouping (comma thousands, period decimal).
 * Does NOT force 2 decimal places unless specified in options.
 */
export function formatUSNumber(
  value: number | null | undefined,
  options?: FormatUSNumberOptions
): string {
  const fallback = options?.fallback ?? "0";
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  const minDecimals = options?.minDecimals ?? 0;
  const maxDecimals = Math.max(minDecimals, options?.maxDecimals ?? 6);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(value);
}

/**
 * Formats monetary amounts in USD strictly with 2 decimal places and US grouping:
 * e.g. "$ 1,500.00", "$ 1,500.05", "-$ 214.64"
 */
export function formatUSD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "$ 0.00";
  }

  const isNegative = amount < 0;
  const absFormatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Math.abs(amount));

  return `${isNegative ? "-" : ""}$ ${absFormatted}`;
}

/**
 * Formats monetary amounts for any supported currency (USD, CDF, ZAR, etc.)
 * using US English grouping and period decimals with 2 decimal places.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode = "USD",
  customSymbol?: string
): string {
  const code = currencyCode.toUpperCase();
  const symbol =
    customSymbol ??
    (code === "USD" ? "$" : code === "ZAR" ? "R" : code === "CDF" ? "CDF" : code);

  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return `${symbol} 0.00`;
  }

  const isNegative = amount < 0;
  const absFormatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Math.abs(amount));

  return `${isNegative ? "-" : ""}${symbol} ${absFormatted}`;
}

/**
 * Formats a compact PDF currency string without extra space after $ if preferred
 * or matching MIS SARL US convention: "$ 1,500.00" / "-$ 214.64".
 */
export function formatPDFCurrency(amount: number | null | undefined): string {
  return formatUSD(amount);
}

/**
 * Formats a numeric quantity for display or PDF with US grouping and period decimal.
 * Preserves decimals up to maxDecimals (default 4) without trailing zeros unless minDecimals is set.
 */
export function formatQuantity(
  qty: number | null | undefined,
  minDecimals = 0,
  maxDecimals = 4
): string {
  return formatUSNumber(qty, { minDecimals, maxDecimals, fallback: "0" });
}

export interface ParseUserNumberOptions {
  required?: boolean;
  allowNegative?: boolean;
  allowZero?: boolean;
  min?: number;
  max?: number;
  maxDecimals?: number;
}

export type ParseUserNumberResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/**
 * Strict parser for unformatted user-entered numeric strings.
 * - Accepts plain numbers only: ^\d+(\.\d+)?$ (or ^-?\d+(\.\d+)?$ if allowNegative)
 * - Rejects commas, internal spaces, NaN, Infinity, malformed strings
 * - Distinguishes empty input (returns null when optional) from explicit 0
 */
export function parseUserNumber(
  raw: string | number | null | undefined,
  options?: ParseUserNumberOptions
): ParseUserNumberResult {
  const allowNegative = options?.allowNegative ?? false;
  const allowZero = options?.allowZero ?? true;
  const required = options?.required ?? false;

  if (raw === null || raw === undefined) {
    return required
      ? { ok: false, error: "This value is required." }
      : { ok: true, value: null };
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return { ok: false, error: "Invalid number (NaN or Infinity)." };
    }
    if (!allowNegative && raw < 0) {
      return { ok: false, error: "Negative values are not allowed." };
    }
    if (!allowZero && raw === 0) {
      return { ok: false, error: "Value must be greater than zero." };
    }
    if (options?.min !== undefined && raw < options.min) {
      return { ok: false, error: `Value must be at least ${options.min}.` };
    }
    if (options?.max !== undefined && raw > options.max) {
      return { ok: false, error: `Value must not exceed ${options.max}.` };
    }
    return { ok: true, value: raw };
  }

  if (typeof raw !== "string") {
    return { ok: false, error: "Invalid numeric input type." };
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return required
      ? { ok: false, error: "This value is required." }
      : { ok: true, value: null };
  }

  if (trimmed.includes(",")) {
    return {
      ok: false,
      error: "Do not type commas. Use plain digits and a period for decimals (e.g. 1500.05).",
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      error: "Spaces are not allowed inside numbers.",
    };
  }

  const pattern = allowNegative ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
  if (!pattern.test(trimmed)) {
    return {
      ok: false,
      error: "Enter a valid number using digits and a period for decimals (e.g. 1500.05).",
    };
  }

  if (options?.maxDecimals !== undefined && trimmed.includes(".")) {
    const decimals = trimmed.split(".")[1] || "";
    if (decimals.length > options.maxDecimals) {
      return {
        ok: false,
        error: `Maximum ${options.maxDecimals} decimal place(s) allowed.`,
      };
    }
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: "Number is out of valid range." };
  }

  if (!allowNegative && parsed < 0) {
    return { ok: false, error: "Negative values are not allowed." };
  }

  if (!allowZero && parsed === 0) {
    return { ok: false, error: "Value must be greater than zero." };
  }

  if (options?.min !== undefined && parsed < options.min) {
    return { ok: false, error: `Value must be at least ${options.min}.` };
  }

  if (options?.max !== undefined && parsed > options.max) {
    return { ok: false, error: `Value must not exceed ${options.max}.` };
  }

  return { ok: true, value: parsed };
}

/**
 * Converts a committed numeric value to an unformatted plain string for editing.
 * Returns "" for null/undefined/NaN.
 */
export function formatPlainDraft(
  value: number | null | undefined,
  decimalScale?: number
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  if (decimalScale !== undefined && decimalScale >= 0) {
    // Preserve exact precision up to decimalScale without trailing zeroes if unnecessary,
    // or fixed if it's an exact decimal representation
    const factor = Math.pow(10, decimalScale);
    const rounded = Math.round(value * factor) / factor;
    return String(rounded);
  }
  return String(value);
}

/**
 * Safely converts unknown database or payload values into a finite JS number.
 * Never accepts grouped/comma-formatted display strings.
 */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes(",")) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
