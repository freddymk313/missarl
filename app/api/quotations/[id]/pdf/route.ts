// ============================================================================
// API Route: GET /api/quotations/[id]/pdf
// Generates and streams a quotation PDF using pdf-lib.
// Supports:  ?disposition=inline  (preview — default)
//            ?disposition=attachment (download)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getQuotationPdfData } from "@/lib/pdf/quotation-data";
import { generateQuotationPdf } from "@/lib/pdf/quotation-pdf";

/**
 * Reads the MIS SARL logo from the filesystem buffer
 */
function getLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
    if (!fs.existsSync(logoPath)) return null;
    return fs.readFileSync(logoPath);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authenticate — require a valid session
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  // 2. Authorise — only SUPER_ADMIN and ADMIN may access quotation PDFs
  if (!permissions.canManageQuotations(session.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Vous n'avez pas les droits pour générer ce document." },
      { status: 403 }
    );
  }

  // 3. Resolve route parameter
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Identifiant du devis manquant." },
      { status: 400 }
    );
  }

  // 4. Retrieve quotation data from Neon PostgreSQL
  let pdfData;
  try {
    pdfData = await getQuotationPdfData(id);
  } catch (err) {
    console.error("[PDF] Erreur lors de la récupération du devis:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données du devis." },
      { status: 500 }
    );
  }

  if (!pdfData) {
    return NextResponse.json(
      { error: "Devis introuvable." },
      { status: 404 }
    );
  }

  // 5. Validate data integrity
  if (!pdfData.lines || pdfData.lines.length === 0) {
    return NextResponse.json(
      { error: "Ce devis ne contient aucun article. PDF non génératable." },
      { status: 422 }
    );
  }

  // 6. Load logo
  const logoBuffer = getLogoBuffer();

  // 7. Generate PDF
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateQuotationPdf(pdfData, logoBuffer);
  } catch (err) {
    console.error("[PDF] Erreur lors de la génération du PDF:", err);
    return NextResponse.json(
      { error: "Échec de la génération du PDF. Veuillez réessayer." },
      { status: 500 }
    );
  }

  // 8. Build safe filename: RFQ reference (with " OQ.pdf") or fallback to MIS-REF.pdf
  const rawRfq = (pdfData.clientRfqNumber ?? pdfData.rfqNumber ?? "").trim();
  let filename: string;

  if (rawRfq) {
    // Strip file extension if already included
    const strippedRfq = rawRfq.replace(/\.pdf$/i, "").trim();

    // Sanitize unsafe filename characters: / \ : * ? " < > | and control characters
    const safeRfq = strippedRfq
      .replace(/[/\\:*?"<>|\x00-\x1f\x7f]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    // If the RFQ doesn't already end with "OQ" (case-insensitive), append " OQ"
    const rfqWithOq = /oq$/i.test(safeRfq) ? safeRfq : `${safeRfq} OQ`;
    filename = `${rfqWithOq}.pdf`;
  } else {
    const safeRef = pdfData.reference
      .replace(/[^a-zA-Z0-9\-_]/g, "-")
      .replace(/-+/g, "-")
      .toUpperCase();
    filename = `MIS-${safeRef}.pdf`;
  }

  // 9. Disposition: inline (preview) vs attachment (download)
  const url = new URL(request.url);
  const disposition =
    url.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";

  // 10. Return PDF response
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(pdfBytes.byteLength),
      // Prevent caching — always generate fresh from DB
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
