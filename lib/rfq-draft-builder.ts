// ============================================================================
// Pure Helpers for Grouping Review Rows & Reconstructing Original RFQ Order
// ============================================================================

import type {
  CatalogueCandidate,
  MatchedRFQLine,
  QuotationDraftLineInput,
  RFQMatchStatus,
} from "@/lib/rfq-import-types";

export const REVIEW_GROUP_ORDER: RFQMatchStatus[] = [
  "NEW",
  "POSSIBLE_MATCH",
  "MATCHED",
  "NEEDS_REVIEW",
];

export interface EditableRFQReviewLine {
  sourceLineNumber: number;
  pageNumber: number | null;
  status: RFQMatchStatus;
  confidence: "high" | "medium" | "low";
  rawUnit: string | null;
  extractionNotes: string | null;
  needsReviewReason: string | null;
  unitMatchWarning: string | null;
  candidates: CatalogueCandidate[];
  // User-editable fields in Stage 3
  designation: string;
  description: string;
  quantity: number | null;
  unitCode: string; // "" if unmapped until user selects one
  // Resolution state
  resolutionMode: "LINK_EXISTING" | "CREATE_NEW";
  linkedItemId: string | null;
  linkedSkuRef: string | null;
  linkedDesignation: string | null;
  possibleMatchConfirmed: boolean;
  addToCatalog: boolean;
  supplyPrice: string;
  quotedPrice: string;
  includedInQuote: boolean;
  createdInSession?: boolean;
  createdSupplyPrice?: number | null;
  createdQuotedPrice?: number | null;
  createError: string | null;
  duplicateSuggestion: {
    id: string;
    skuRef: string;
    designation: string | null;
    description: string;
    unitCode: string | null;
  } | null;
}

export function createInitialReviewLines(
  matchedLines: MatchedRFQLine[]
): EditableRFQReviewLine[] {
  return [...matchedLines]
    .sort((a, b) => a.sourceLineNumber - b.sourceLineNumber)
    .map((line) => {
      const hasLinked = line.status === "MATCHED" && line.matchedItem !== null;
      const defaultCandidate =
        line.matchedItem ?? line.candidates[0] ?? null;

      let resolutionMode: "LINK_EXISTING" | "CREATE_NEW" = "CREATE_NEW";
      let linkedItemId: string | null = null;
      let linkedSkuRef: string | null = null;
      let linkedDesignation: string | null = null;

      if (hasLinked && line.matchedItem) {
        resolutionMode = "LINK_EXISTING";
        linkedItemId = line.matchedItem.itemId;
        linkedSkuRef = line.matchedItem.skuRef;
        linkedDesignation = line.matchedItem.designation;
      } else if (line.status === "POSSIBLE_MATCH" && defaultCandidate) {
        resolutionMode = "LINK_EXISTING";
        linkedItemId = defaultCandidate.itemId;
        linkedSkuRef = defaultCandidate.skuRef;
        linkedDesignation = defaultCandidate.designation;
      } else if (line.status === "NEEDS_REVIEW" && line.matchedItem) {
        resolutionMode = "LINK_EXISTING";
        linkedItemId = line.matchedItem.itemId;
        linkedSkuRef = line.matchedItem.skuRef;
        linkedDesignation = line.matchedItem.designation;
      }

      return {
        sourceLineNumber: line.sourceLineNumber,
        pageNumber: line.pageNumber,
        status: line.status,
        confidence: line.confidence,
        rawUnit: line.rawUnit,
        extractionNotes: line.extractionNotes,
        needsReviewReason: line.needsReviewReason,
        unitMatchWarning: line.unitMatchWarning,
        candidates: line.candidates,
        designation: line.extractedDesignation,
        description: line.extractedDescription,
        quantity: line.quantity,
        unitCode: line.normalizedUnitCode ?? "",
        resolutionMode,
        linkedItemId,
        linkedSkuRef,
        linkedDesignation,
        possibleMatchConfirmed: line.status !== "POSSIBLE_MATCH",
        addToCatalog: line.status === "NEW",
        supplyPrice: "",
        quotedPrice: "",
        includedInQuote: true,
        createdInSession: false,
        createdSupplyPrice: null,
        createdQuotedPrice: null,
        createError: null,
        duplicateSuggestion: null,
      };
    });
}

/**
 * Groups lines into the strict 4-bucket UI order (NEW -> POSSIBLE_MATCH ->
 * MATCHED -> NEEDS_REVIEW) while keeping each bucket sorted by sourceLineNumber ASC.
 */
export function groupReviewLinesByStatus(
  lines: EditableRFQReviewLine[]
): Record<RFQMatchStatus, EditableRFQReviewLine[]> {
  const grouped: Record<RFQMatchStatus, EditableRFQReviewLine[]> = {
    NEW: [],
    POSSIBLE_MATCH: [],
    MATCHED: [],
    NEEDS_REVIEW: [],
  };

  const sorted = [...lines].sort(
    (a, b) => a.sourceLineNumber - b.sourceLineNumber
  );

  for (const line of sorted) {
    grouped[line.status].push(line);
  }

  return grouped;
}

export function validateReviewLinesForQuote(
  lines: EditableRFQReviewLine[]
): { ok: true } | { ok: false; error: string; blockingLineNumbers: number[] } {
  const included = lines.filter((l) => l.includedInQuote);
  if (included.length === 0) {
    return {
      ok: false,
      error: "Select at least one line to include in the quote.",
      blockingLineNumbers: [],
    };
  }

  const blocking: number[] = [];
  const reasons: string[] = [];

  for (const line of [...included].sort(
    (a, b) => a.sourceLineNumber - b.sourceLineNumber
  )) {
    const lineIssues: string[] = [];
    if (!line.designation.trim() && !line.description.trim()) {
      lineIssues.push("missing designation/description");
    }
    if (line.quantity === null || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      lineIssues.push("invalid quantity");
    }
    if (!line.unitCode.trim()) {
      lineIssues.push("unit not selected");
    }
    if (
      line.status === "POSSIBLE_MATCH" &&
      line.resolutionMode === "LINK_EXISTING" &&
      !line.possibleMatchConfirmed
    ) {
      lineIssues.push("match needs confirmation");
    }

    if (lineIssues.length > 0) {
      blocking.push(line.sourceLineNumber);
      if (reasons.length < 3) {
        reasons.push(`Line #${line.sourceLineNumber} (${lineIssues.join(", ")})`);
      }
    }
  }

  if (blocking.length > 0) {
    return {
      ok: false,
      error: `Please correct blocking lines before preparing the quote: ${reasons.join(" ; ")}${
        blocking.length > 3 ? ` (+${blocking.length - 3} others)` : ""
      }.`,
      blockingLineNumbers: blocking,
    };
  }

  return { ok: true };
}

export interface RFQCatalogPrice {
  supplyPrice: number | null;
  quotedPrice?: number | null;
}

export interface ResolvedRFQQuotationPrices {
  supplyPrice: number;
  unitPrice: number;
  commissionPercent: number | null;
}

function isValidCatalogPrice(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Resolves quotation draft line pricing from MIS SARL catalogue prices:
 * - Priority 1 (Supplier Price present, including 0): purchase cost = supplyPrice,
 *   selling unitPrice = 0, commissionPercent = null (inherit global commission).
 * - Priority 2 (No Supplier Price, Quoted Price present, including 0): purchase cost = 0,
 *   selling unitPrice = quotedPrice, commissionPercent = 0 (direct selling price, no commission added).
 * - Priority 3 (Neither price present / unlinked): 0 / 0 / null.
 */
export function resolveRFQQuotationPrices(
  prices?: RFQCatalogPrice | null
): ResolvedRFQQuotationPrices {
  if (!prices) {
    return {
      supplyPrice: 0,
      unitPrice: 0,
      commissionPercent: null,
    };
  }

  if (isValidCatalogPrice(prices.supplyPrice)) {
    return {
      supplyPrice: prices.supplyPrice,
      unitPrice: 0,
      commissionPercent: null,
    };
  }

  if (isValidCatalogPrice(prices.quotedPrice)) {
    return {
      supplyPrice: 0,
      unitPrice: prices.quotedPrice,
      commissionPercent: 0,
    };
  }

  return {
    supplyPrice: 0,
    unitPrice: 0,
    commissionPercent: null,
  };
}

/**
 * Builds QuotationWizard initial draft lines strictly ordered by original RFQ
 * `sourceLineNumber ASC`, prefilling catalogue prices by MIS SARL priority rules.
 */
export function buildOrderedQuotationDraftLines(
  lines: EditableRFQReviewLine[],
  catalogPriceByItemId?: ReadonlyMap<string, RFQCatalogPrice>
): QuotationDraftLineInput[] {
  return [...lines]
    .filter((l) => l.includedInQuote)
    .sort((a, b) => a.sourceLineNumber - b.sourceLineNumber)
    .map((line) => {
      const des = line.designation.trim();
      const desc = line.description.trim();
      const combinedDescription =
        des && desc && des.toLowerCase() !== desc.toLowerCase()
          ? desc.toLowerCase().startsWith(des.toLowerCase())
            ? desc
            : `${des} — ${desc}`
          : desc || des;

      const linkedItemId =
        line.resolutionMode === "LINK_EXISTING" && line.linkedItemId
          ? line.linkedItemId
          : undefined;

      let catalogPrices: RFQCatalogPrice | null = null;
      if (linkedItemId) {
        const fromMap = catalogPriceByItemId?.get(linkedItemId) ?? null;
        if (line.createdInSession) {
          catalogPrices = {
            supplyPrice:
              line.createdSupplyPrice !== undefined
                ? line.createdSupplyPrice
                : (fromMap?.supplyPrice ?? null),
            quotedPrice:
              line.createdQuotedPrice !== undefined
                ? line.createdQuotedPrice
                : (fromMap?.quotedPrice ?? null),
          };
        } else {
          catalogPrices = fromMap;
        }
      }

      const resolvedPrices = resolveRFQQuotationPrices(catalogPrices);

      return {
        itemId: linkedItemId,
        description: combinedDescription,
        unit: line.unitCode.trim(),
        quantity: line.quantity ?? 1,
        unitPrice: resolvedPrices.unitPrice,
        supplyPrice: resolvedPrices.supplyPrice,
        discountPercent: 0,
        commissionPercent: resolvedPrices.commissionPercent,
        brand: "",
        brandImageUrl: null,
      };
    });
}
