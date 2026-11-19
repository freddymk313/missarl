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
  selectedForCreate: boolean;
  includedInQuote: boolean;
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
        selectedForCreate: line.status === "NEW",
        includedInQuote: true,
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
      error: "Sélectionnez au moins une ligne à inclure dans le devis.",
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
      lineIssues.push("désignation/description manquante");
    }
    if (line.quantity === null || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      lineIssues.push("quantité invalide");
    }
    if (!line.unitCode.trim()) {
      lineIssues.push("unité non sélectionnée");
    }
    if (
      line.status === "POSSIBLE_MATCH" &&
      line.resolutionMode === "LINK_EXISTING" &&
      !line.possibleMatchConfirmed
    ) {
      lineIssues.push("correspondance à confirmer");
    }

    if (lineIssues.length > 0) {
      blocking.push(line.sourceLineNumber);
      if (reasons.length < 3) {
        reasons.push(`Ligne #${line.sourceLineNumber} (${lineIssues.join(", ")})`);
      }
    }
  }

  if (blocking.length > 0) {
    return {
      ok: false,
      error: `Veuillez corriger les lignes bloquantes avant de préparer le devis : ${reasons.join(" ; ")}${
        blocking.length > 3 ? ` (+${blocking.length - 3} autres)` : ""
      }.`,
      blockingLineNumbers: blocking,
    };
  }

  return { ok: true };
}

/**
 * Builds QuotationWizard initial draft lines strictly ordered by original RFQ
 * `sourceLineNumber ASC`, always starting with selling unitPrice = 0.
 */
export function buildOrderedQuotationDraftLines(
  lines: EditableRFQReviewLine[]
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

      return {
        itemId:
          line.resolutionMode === "LINK_EXISTING" && line.linkedItemId
            ? line.linkedItemId
            : undefined,
        description: combinedDescription,
        unit: line.unitCode.trim(),
        quantity: line.quantity ?? 1,
        unitPrice: 0,
        supplyPrice: 0,
        discountPercent: 0,
        commissionPercent: null,
        brand: "",
        brandImageUrl: null,
      };
    });
}
