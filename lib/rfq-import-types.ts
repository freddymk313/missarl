// ============================================================================
// Shared Types & Pure Helpers for the Gemini-Powered RFQ Import Assistant
// ============================================================================

import type { UnitRecord } from "@/lib/db/items";

export type RFQExtractionConfidence = "high" | "medium" | "low";

export interface ExtractedRFQItem {
  sourceLineNumber: number;
  pageNumber: number | null;
  designation: string;
  description: string;
  quantity: number | null;
  rawUnit: string | null;
  confidence: RFQExtractionConfidence;
  extractionNotes: string | null;
}

export interface ExtractedRFQ {
  clientRfqReference: string | null;
  documentTitle: string | null;
  totalExtractedItems: number;
  items: ExtractedRFQItem[];
}

export interface CatalogueItemSummary {
  id: string;
  skuRef: string;
  designation: string | null;
  description: string;
  unitCode: string | null;
}

export interface CatalogueCandidate {
  itemId: string;
  skuRef: string;
  designation: string | null;
  description: string;
  unitCode: string | null;
  score: number;
  matchReason: string;
}

export type RFQMatchStatus =
  | "NEW"
  | "POSSIBLE_MATCH"
  | "MATCHED"
  | "NEEDS_REVIEW";

export interface MatchedRFQLine {
  sourceLineNumber: number;
  pageNumber: number | null;
  extractedDesignation: string;
  extractedDescription: string;
  quantity: number | null;
  rawUnit: string | null;
  normalizedUnitCode: string | null;
  unitMatchWarning: string | null;
  confidence: RFQExtractionConfidence;
  extractionNotes: string | null;
  status: RFQMatchStatus;
  needsReviewReason: string | null;
  matchedItem: CatalogueCandidate | null;
  candidates: CatalogueCandidate[];
}

export interface RFQAnalysisSummary {
  total: number;
  newCount: number;
  possibleMatchCount: number;
  matchedCount: number;
  needsReviewCount: number;
}

export type RFQProviderName = "gemini" | "openrouter";

export interface RFQAnalysisResponse {
  success: true;
  model: string;
  provider: RFQProviderName;
  fallbackAttempted: boolean;
  clientId: string;
  clientRfqReference: string | null;
  documentTitle: string | null;
  totalExtractedItems: number;
  summary: RFQAnalysisSummary;
  lines: MatchedRFQLine[];
  units: UnitRecord[];
}

export interface QuotationDraftLineInput {
  itemId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  supplyPrice: number;
  discountPercent: number;
  commissionPercent: number | null;
  brand: string;
  brandImageUrl: string | null;
}

export interface BulkCreateImportedItemInput {
  sourceLineNumber: number;
  designation: string;
  description: string;
  unitCode: string;
  supplyPrice?: number | null;
  quotedPrice?: number | null;
}

export interface BulkCreateImportedItemSuccess {
  sourceLineNumber: number;
  item: {
    id: string;
    skuRef: string;
    designation: string;
    description: string;
    unitCode: string;
    supplyPrice: number | null;
    quotedPrice: number | null;
  };
}

export interface BulkCreateImportedItemFailure {
  sourceLineNumber: number;
  error: string;
  duplicateItem?: CatalogueItemSummary;
}

export interface BulkCreateImportedItemsResult {
  success: boolean;
  createdItems: BulkCreateImportedItemSuccess[];
  failures: BulkCreateImportedItemFailure[];
  error?: string;
}

/**
 * Validates and normalizes an optional USD catalog price.
 * - Empty string, null, or undefined -> null (no price configured)
 * - Explicit 0 -> 0
 * - Negative, NaN, Infinity, or non-numeric input -> validation error
 */
export function validateOptionalCatalogPrice(
  raw: unknown,
  fieldLabel: string
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, value: null };
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return { ok: false, error: `${fieldLabel} invalide.` };
    }
    if (raw < 0) {
      return {
        ok: false,
        error: `${fieldLabel} ne peut pas être négatif.`,
      };
    }
    return { ok: true, value: Math.round(raw * 10000) / 10000 };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return { ok: true, value: null };
    }
    const normalized = trimmed.replace(/\s+/g, "").replace(",", ".");
    if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
      return {
        ok: false,
        error: `${fieldLabel} doit être un nombre valide en USD.`,
      };
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return { ok: false, error: `${fieldLabel} invalide.` };
    }
    if (parsed < 0) {
      return {
        ok: false,
        error: `${fieldLabel} ne peut pas être négatif.`,
      };
    }
    return { ok: true, value: Math.round(parsed * 10000) / 10000 };
  }

  return { ok: false, error: `${fieldLabel} invalide.` };
}

const KNOWN_UNIT_SYNONYMS: Record<string, string> = {
  EA: "EA",
  EACH: "EA",
  PC: "EA",
  PCS: "EA",
  PCE: "EA",
  PCES: "EA",
  PIECE: "EA",
  PIECES: "EA",
  UN: "EA",
  UNIT: "EA",
  UNITS: "EA",
  UNITE: "EA",
  UNITES: "EA",
  NO: "EA",
  NOS: "EA",
  NR: "EA",
  U: "EA",
  M: "M",
  MT: "M",
  MTR: "M",
  MTRS: "M",
  METER: "M",
  METERS: "M",
  METRE: "M",
  METRES: "M",
  ML: "M",
  KG: "KG",
  KGS: "KG",
  KILO: "KG",
  KILOS: "KG",
  KILOGRAM: "KG",
  KILOGRAMS: "KG",
  KILOGRAMME: "KG",
  KILOGRAMMES: "KG",
  L: "L",
  LT: "L",
  LTR: "L",
  LTRS: "L",
  LITER: "L",
  LITERS: "L",
  LITRE: "L",
  LITRES: "L",
  SET: "SET",
  SETS: "SET",
  ENS: "SET",
  ENSEMBLE: "SET",
  ENSEMBLES: "SET",
  KIT: "KIT",
  KITS: "KIT",
  ROLL: "ROLL",
  ROLLS: "ROLL",
  RL: "ROLL",
  ROULEAU: "ROLL",
  ROULEAUX: "ROLL",
  BOX: "BOX",
  BOXES: "BOX",
  BX: "BOX",
  CTN: "BOX",
  CARTON: "BOX",
  CARTONS: "BOX",
  BOITE: "BOX",
  BOITES: "BOX",
  PAIR: "PAIR",
  PAIRS: "PAIR",
  PR: "PAIR",
  PAIRE: "PAIR",
  PAIRES: "PAIR",
};

function cleanUnitToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

/**
 * Normalizes an extracted RFQ unit against the MIS SARL `units` reference table.
 * Returns a valid `units.code` when unambiguously matched, or `null` if missing
 * or unknown so the user must verify/select it manually (never silently replaced).
 */
export function normalizeUnitFromCatalog(
  rawUnit: string | null | undefined,
  units: UnitRecord[]
): string | null {
  if (!rawUnit || !rawUnit.trim()) return null;
  const cleaned = cleanUnitToken(rawUnit);
  if (!cleaned) return null;

  const availableCodes = new Set(units.map((u) => u.code.toUpperCase()));

  // 1. Direct match against code, aliases, or labelFr in units table
  for (const unit of units) {
    if (cleanUnitToken(unit.code) === cleaned) {
      return unit.code;
    }
    if (cleanUnitToken(unit.labelFr) === cleaned) {
      return unit.code;
    }
    for (const alias of unit.aliases || []) {
      if (cleanUnitToken(alias) === cleaned) {
        return unit.code;
      }
    }
  }

  // 2. Unambiguous French/English engineering synonyms mapped to existing unit codes
  const mapped = KNOWN_UNIT_SYNONYMS[cleaned];
  if (mapped && availableCodes.has(mapped.toUpperCase())) {
    const exactUnit = units.find(
      (u) => u.code.toUpperCase() === mapped.toUpperCase()
    );
    return exactUnit ? exactUnit.code : mapped;
  }

  return null;
}
