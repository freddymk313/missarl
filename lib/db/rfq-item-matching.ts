// ============================================================================
// Designation & Description ONLY Catalogue Matching Engine for RFQ Import
// STRICT PRIVACY & DOMAIN RULE:
// Compares ONLY `items.designation` and `items.description` on active items.
// NEVER uses MPN, client codes, supplier codes, SKU, `item_identifiers`,
// `supplier_offers`, brands, or supplier/quoted prices for matching.
// ============================================================================

import { sql } from "@/lib/db";
import type { UnitRecord } from "@/lib/db/items";
import {
  normalizeUnitFromCatalog,
  type CatalogueCandidate,
  type CatalogueItemSummary,
  type ExtractedRFQ,
  type MatchedRFQLine,
  type RFQAnalysisSummary,
  type RFQMatchStatus,
} from "@/lib/rfq-import-types";

const MAX_CANDIDATES_PER_LINE = 3;
const MATCHED_THRESHOLD = 0.84;
const POSSIBLE_MATCH_THRESHOLD = 0.45;
const AMBIGUITY_MARGIN = 0.08;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.94;

const ABBREVIATION_MAP: Record<string, string> = {
  disj: "disjoncteur",
  interr: "interrupteur",
  int: "interrupteur",
  elect: "electrique",
  elec: "electrique",
  temp: "temperature",
  press: "pression",
  transm: "transmetteur",
  capt: "capteur",
  pce: "piece",
  pcs: "piece",
  mm2: "mm2",
  triph: "triphase",
  monoph: "monophase",
  inox: "inoxydable",
  galv: "galvanise",
  alim: "alimentation",
  psu: "alimentation",
  auto: "automatique",
  man: "manuel",
  hyd: "hydraulique",
  pneum: "pneumatique",
  std: "standard",
  assy: "assembly",
  brg: "bearing",
  cyl: "cylinder",
  conn: "connector",
  cbl: "cable",
};

const STOP_WORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "un",
  "une",
  "et",
  "ou",
  "en",
  "avec",
  "pour",
  "sur",
  "par",
  "the",
  "and",
  "for",
  "with",
  "of",
  "to",
  "in",
  "a",
  "an",
]);

export function normalizeTextForMatching(input: string | null | undefined): string {
  if (!input) return "";
  const stripped = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(?<!\d)\.(?!\d)/g, " ")
    .replace(/[\/\\_,\-\(\)\[\]\{\};:+"'°]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!stripped) return "";

  return stripped
    .split(" ")
    .map((tok) => ABBREVIATION_MAP[tok] || tok)
    .join(" ")
    .trim();
}

function tokenizeNormalized(normalized: string): string[] {
  if (!normalized) return [];
  return normalized
    .split(" ")
    .filter((tok) => tok.length > 0 && !STOP_WORDS.has(tok));
}

function damerauOneOrTwoEditMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  const maxDist = Math.min(a.length, b.length) >= 7 ? 2 : 1;
  if (Math.abs(a.length - b.length) > maxDist) return false;

  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[a.length][b.length] <= maxDist;
}

function buildTrigrams(text: string): Map<string, number> {
  const padded = `  ${text} `;
  const map = new Map<string, number>();
  for (let i = 0; i <= padded.length - 3; i++) {
    const tri = padded.slice(i, i + 3);
    map.set(tri, (map.get(tri) || 0) + 1);
  }
  return map;
}

function trigramDiceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const mapA = buildTrigrams(a);
  const mapB = buildTrigrams(b);

  let totalA = 0;
  let totalB = 0;
  let intersection = 0;

  for (const count of mapA.values()) totalA += count;
  for (const count of mapB.values()) totalB += count;

  for (const [tri, countA] of mapA.entries()) {
    const countB = mapB.get(tri);
    if (countB) {
      intersection += Math.min(countA, countB);
    }
  }

  if (totalA + totalB === 0) return 0;
  return (2 * intersection) / (totalA + totalB);
}

function fuzzyTokenSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const uniqueA = Array.from(new Set(tokensA));
  const uniqueB = Array.from(new Set(tokensB));

  let matchedA = 0;
  for (const ta of uniqueA) {
    let best = 0;
    for (const tb of uniqueB) {
      if (ta === tb) {
        best = 1;
        break;
      }
      if (damerauOneOrTwoEditMatch(ta, tb)) {
        best = Math.max(best, 0.85);
      } else if (
        ta.length >= 4 &&
        tb.length >= 4 &&
        (tb.startsWith(ta) || ta.startsWith(tb))
      ) {
        best = Math.max(best, 0.72);
      }
    }
    matchedA += best;
  }

  let matchedB = 0;
  for (const tb of uniqueB) {
    let best = 0;
    for (const ta of uniqueA) {
      if (tb === ta) {
        best = 1;
        break;
      }
      if (damerauOneOrTwoEditMatch(tb, ta)) {
        best = Math.max(best, 0.85);
      } else if (
        ta.length >= 4 &&
        tb.length >= 4 &&
        (tb.startsWith(ta) || ta.startsWith(tb))
      ) {
        best = Math.max(best, 0.72);
      }
    }
    matchedB += best;
  }

  const precision = matchedA / uniqueA.length;
  const recall = matchedB / uniqueB.length;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function scorePair(
  extDesignation: string,
  extDescription: string,
  catItem: CatalogueItemSummary
): { score: number; reason: string } {
  const normExtDes = normalizeTextForMatching(extDesignation);
  const normExtDesc = normalizeTextForMatching(extDescription);
  const normExtCombined = normalizeTextForMatching(
    `${extDesignation} ${extDescription}`
  );

  const normCatDes = normalizeTextForMatching(catItem.designation);
  const normCatDesc = normalizeTextForMatching(catItem.description);
  const normCatCombined = normalizeTextForMatching(
    `${catItem.designation || ""} ${catItem.description || ""}`
  );

  if (!normExtCombined || !normCatCombined) {
    return { score: 0, reason: "" };
  }

  // Exact normalized text match
  if (
    (normExtDes && normCatDes && normExtDes === normCatDes && (!normExtDesc || !normCatDesc || normExtDesc === normCatDesc)) ||
    normExtCombined === normCatCombined
  ) {
    return {
      score: 1,
      reason: "Correspondance exacte sur désignation et description",
    };
  }

  // Designation-to-designation score (weight 0.45 when both present)
  const desTri = normExtDes && normCatDes ? trigramDiceSimilarity(normExtDes, normCatDes) : 0;
  const desTok =
    normExtDes && normCatDes
      ? fuzzyTokenSimilarity(tokenizeNormalized(normExtDes), tokenizeNormalized(normCatDes))
      : 0;
  const designationScore = 0.45 * desTri + 0.55 * desTok;

  // Combined (designation + description) score
  const combTri = trigramDiceSimilarity(normExtCombined, normCatCombined);
  const combTok = fuzzyTokenSimilarity(
    tokenizeNormalized(normExtCombined),
    tokenizeNormalized(normCatCombined)
  );
  const combinedScore = 0.4 * combTri + 0.6 * combTok;

  // Description-only overlap score
  const descScore =
    normExtDesc && normCatDesc
      ? 0.4 * trigramDiceSimilarity(normExtDesc, normCatDesc) +
        0.6 * fuzzyTokenSimilarity(tokenizeNormalized(normExtDesc), tokenizeNormalized(normCatDesc))
      : combinedScore;

  // Containment boost when the shorter normalized combined phrase is a full substring
  let containmentBonus = 0;
  if (
    normExtCombined.length >= 12 &&
    normCatCombined.length >= 12 &&
    (normCatCombined.includes(normExtCombined) ||
      normExtCombined.includes(normCatCombined))
  ) {
    const ratio =
      Math.min(normExtCombined.length, normCatCombined.length) /
      Math.max(normExtCombined.length, normCatCombined.length);
    containmentBonus = 0.14 * ratio;
  }

  const rawScore = Math.min(
    0.99,
    Math.max(
      combinedScore + containmentBonus,
      0.45 * designationScore + 0.35 * descScore + 0.2 * combinedScore + containmentBonus
    )
  );

  const score = Math.round(rawScore * 1000) / 1000;

  let reason = "Similarité combinée désignation + description";
  if (designationScore >= 0.85 && descScore >= 0.75) {
    reason = "Désignation et description très proches";
  } else if (designationScore >= 0.8) {
    reason = "Désignation similaire dans le catalogue";
  } else if (descScore >= 0.7) {
    reason = "Description technique similaire";
  }

  return { score, reason };
}

/**
 * Loads ONLY active catalogue items with ONLY the 5 fields permitted for matching:
 * id, sku_ref (display only), designation, description, unit_code.
 * Does NOT fetch MPNs, client/supplier codes, supplier offers, brands, or prices.
 */
export async function getActiveCatalogueSummariesForMatching(): Promise<
  CatalogueItemSummary[]
> {
  const rows = await sql`
    SELECT
      id,
      sku_ref as "skuRef",
      designation,
      description,
      unit_code as "unitCode"
    FROM items
    WHERE is_active = TRUE
    ORDER BY designation ASC
  `;

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    skuRef: String(row.skuRef || row.sku || ""),
    designation:
      row.designation != null ? String(row.designation) : null,
    description: String(row.description ?? row.designation ?? ""),
    unitCode: row.unitCode != null ? String(row.unitCode) : null,
  }));
}

export function matchExtractedRFQItems(input: {
  extracted: ExtractedRFQ;
  catalogueItems: CatalogueItemSummary[];
  units: UnitRecord[];
}): { lines: MatchedRFQLine[]; summary: RFQAnalysisSummary } {
  const { extracted, catalogueItems, units } = input;

  // Deterministic preservation of original extraction order
  const orderedSource = [...extracted.items].sort(
    (a, b) => a.sourceLineNumber - b.sourceLineNumber
  );

  const lines: MatchedRFQLine[] = orderedSource.map((item) => {
    const normalizedUnitCode = normalizeUnitFromCatalog(item.rawUnit, units);
    const unitMatchWarning =
      item.rawUnit && !normalizedUnitCode
        ? `Unit "${item.rawUnit}" not recognized in catalog. Please select a valid unit.`
        : !item.rawUnit
        ? "Unit missing from RFQ document. Please select a unit."
        : null;

    // Score strictly against designation & description only
    const scoredCandidates: CatalogueCandidate[] = [];
    for (const catItem of catalogueItems) {
      const { score, reason } = scorePair(
        item.designation,
        item.description,
        catItem
      );
      if (score >= 0.25) {
        scoredCandidates.push({
          itemId: catItem.id,
          skuRef: catItem.skuRef,
          designation: catItem.designation,
          description: catItem.description,
          unitCode: catItem.unitCode,
          score,
          matchReason: reason,
        });
      }
    }

    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.slice(0, MAX_CANDIDATES_PER_LINE);
    const best = topCandidates[0] ?? null;
    const second = topCandidates[1] ?? null;

    // Check explicit NEEDS_REVIEW reasons
    const reviewReasons: string[] = [];
    if (!item.designation.trim() && !item.description.trim()) {
      reviewReasons.push("Missing designation and description");
    }
    if (item.confidence === "low") {
      reviewReasons.push("Low extraction confidence");
    }
    if (item.quantity === null || item.quantity <= 0) {
      reviewReasons.push("Missing or invalid quantity");
    }
    if (item.rawUnit && !normalizedUnitCode) {
      reviewReasons.push(`Non-standard unit "${item.rawUnit}"`);
    }

    let status: RFQMatchStatus;
    let matchedItem: CatalogueCandidate | null = null;
    let needsReviewReason: string | null =
      reviewReasons.length > 0 ? reviewReasons.join(" • ") : null;

    if (reviewReasons.length > 0) {
      status = "NEEDS_REVIEW";
      if (
        best &&
        best.score >= MATCHED_THRESHOLD &&
        (!second || best.score - second.score >= AMBIGUITY_MARGIN)
      ) {
        matchedItem = best;
      }
    } else if (best && best.score >= MATCHED_THRESHOLD) {
      const isAmbiguous =
        second !== null && best.score - second.score < AMBIGUITY_MARGIN;
      if (isAmbiguous) {
        status = "POSSIBLE_MATCH";
        needsReviewReason =
          "Multiple catalog items have very similar designations.";
      } else {
        status = "MATCHED";
        matchedItem = best;
      }
    } else if (best && best.score >= POSSIBLE_MATCH_THRESHOLD) {
      status = "POSSIBLE_MATCH";
    } else {
      status = "NEW";
    }

    return {
      sourceLineNumber: item.sourceLineNumber,
      pageNumber: item.pageNumber,
      extractedDesignation: item.designation,
      extractedDescription: item.description,
      quantity: item.quantity,
      rawUnit: item.rawUnit,
      normalizedUnitCode,
      unitMatchWarning,
      confidence: item.confidence,
      extractionNotes: item.extractionNotes,
      status,
      needsReviewReason,
      matchedItem,
      candidates: topCandidates,
    };
  });

  const summary: RFQAnalysisSummary = {
    total: lines.length,
    newCount: lines.filter((l) => l.status === "NEW").length,
    possibleMatchCount: lines.filter((l) => l.status === "POSSIBLE_MATCH").length,
    matchedCount: lines.filter((l) => l.status === "MATCHED").length,
    needsReviewCount: lines.filter((l) => l.status === "NEEDS_REVIEW").length,
  };

  return { lines, summary };
}

/**
 * Rechecks active catalogue items right before bulk creation using ONLY
 * `items.designation` and `items.description` to prevent near-duplicate inserts.
 */
export function findDesignationDescriptionDuplicates(
  inputs: Array<{
    sourceLineNumber: number;
    designation: string;
    description: string;
  }>,
  catalogueItems: CatalogueItemSummary[]
): Map<number, CatalogueItemSummary> {
  const duplicates = new Map<number, CatalogueItemSummary>();

  for (const input of inputs) {
    let bestItem: CatalogueItemSummary | null = null;
    let bestScore = 0;

    for (const catItem of catalogueItems) {
      const { score } = scorePair(
        input.designation,
        input.description,
        catItem
      );
      if (score >= DUPLICATE_SIMILARITY_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestItem = catItem;
      }
    }

    if (bestItem) {
      duplicates.set(input.sourceLineNumber, bestItem);
    }
  }

  return duplicates;
}
