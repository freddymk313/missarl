// ============================================================================
// API Route: POST /api/quotes/rfq-import/analyze
// Server-side transient analysis of an uploaded customer RFQ (PDF, JPEG, PNG)
// via Google Gemini + designation/description catalogue matching.
// Document bytes stay strictly in memory and are NEVER stored or logged.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getClientById } from "@/lib/db/clients";
import { getUnits } from "@/lib/db/items";
import { logAudit } from "@/lib/db/audit";
import { validateRFQDocumentFile } from "@/lib/rfq-file-validation";
import {
  extractRFQWithGemini,
  RFQExtractionError,
} from "@/lib/gemini/rfq-extractor";
import {
  getActiveCatalogueSummariesForMatching,
  matchExtractedRFQItems,
} from "@/lib/db/rfq-item-matching";
import type { RFQAnalysisResponse } from "@/lib/rfq-import-types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  // 2. Authorize SUPER_ADMIN and ADMIN only (blocks PRICE_COLLECTOR)
  if (!permissions.canManageQuotations(session.role)) {
    return NextResponse.json(
      {
        error:
          "Accès refusé. Vous n'avez pas les droits pour importer une RFQ client.",
      },
      { status: 403 }
    );
  }

  // 3. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide : formulaire multipart attendu." },
      { status: 400 }
    );
  }

  // 4. Require explicit Gemini privacy acknowledgement
  const acknowledged = formData.get("acknowledged");
  if (acknowledged !== "true") {
    return NextResponse.json(
      {
        error:
          "Veuillez confirmer que ce document RFQ sera transmis à Google Gemini pour analyse temporaire.",
      },
      { status: 400 }
    );
  }

  // 5. Validate selected client
  const clientIdRaw = formData.get("clientId");
  const clientId = typeof clientIdRaw === "string" ? clientIdRaw.trim() : "";
  if (!clientId) {
    return NextResponse.json(
      { error: "Veuillez sélectionner un client destinataire." },
      { status: 400 }
    );
  }

  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json(
      { error: "Client sélectionné introuvable." },
      { status: 404 }
    );
  }

  // 6. Validate uploaded document file (PDF / JPEG / PNG <= 4 MB + magic bytes)
  const fileEntry = formData.get("file");
  const fileValidation = await validateRFQDocumentFile(fileEntry);
  if (!fileValidation.ok) {
    return NextResponse.json(
      { error: fileValidation.error },
      { status: fileValidation.status }
    );
  }

  // 7. Extract structured RFQ lines via Gemini (in memory only) & match against catalogue
  try {
    const { extracted, model } = await extractRFQWithGemini({
      bytes: fileValidation.bytes,
      mimeType: fileValidation.mimeType,
    });

    const [catalogueItems, units] = await Promise.all([
      getActiveCatalogueSummariesForMatching(),
      getUnits(),
    ]);

    const { lines, summary } = matchExtractedRFQItems({
      extracted,
      catalogueItems,
      units,
    });

    // Record metadata-only audit entry (never log file contents or item text)
    await logAudit({
      userId: session.id,
      action: "RFQ_IMPORT_ANALYZED",
      entityType: "QUOTATION",
      entityId: clientId,
      details: {
        mimeType: fileValidation.mimeType,
        sizeBytes: fileValidation.sizeBytes,
        model,
        totalExtractedItems: extracted.totalExtractedItems,
        matchedCount: summary.matchedCount,
        possibleMatchCount: summary.possibleMatchCount,
        newCount: summary.newCount,
        needsReviewCount: summary.needsReviewCount,
      },
    });

    const payload: RFQAnalysisResponse = {
      success: true,
      model,
      clientId: client.id,
      clientRfqReference: extracted.clientRfqReference,
      documentTitle: extracted.documentTitle,
      totalExtractedItems: extracted.totalExtractedItems,
      summary,
      lines,
      units,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    console.error("[RFQ Import Analyze] Erreur extraction:", err);
    if (err instanceof RFQExtractionError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        error:
          "Erreur inattendue lors de l'analyse du document RFQ. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}
