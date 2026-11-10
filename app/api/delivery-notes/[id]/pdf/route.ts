// ============================================================================
// API Route: GET /api/delivery-notes/[id]/pdf
// Generates and streams a professional Delivery Note (Bon de Livraison) PDF.
// Supports:  ?disposition=inline  (preview — default)
//            ?disposition=attachment (download)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getDeliveryNotePdfData } from "@/lib/pdf/delivery-note-data";
import { generateDeliveryNotePdf } from "@/lib/pdf/delivery-note-pdf";

function readFileBuffer(relativePath: string): Buffer | null {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
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

  // 2. Authorise — only SUPER_ADMIN and ADMIN may access delivery note PDFs
  if (!permissions.canManageDeliveryNotes(session.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Vous n'avez pas les droits pour générer ce document." },
      { status: 403 }
    );
  }

  // 3. Resolve route parameter
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Identifiant du bon de livraison manquant." },
      { status: 400 }
    );
  }

  // 4. Retrieve delivery note data
  let pdfData;
  try {
    pdfData = await getDeliveryNotePdfData(id);
  } catch (err) {
    console.error("[PDF] Erreur lors de la récupération du bon de livraison:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données du bon de livraison." },
      { status: 500 }
    );
  }

  if (!pdfData) {
    return NextResponse.json(
      { error: "Bon de livraison introuvable." },
      { status: 404 }
    );
  }

  if (!pdfData.lines || pdfData.lines.length === 0) {
    return NextResponse.json(
      { error: "Ce bon de livraison ne contient aucun article. PDF non génératable." },
      { status: 422 }
    );
  }

  // 5. Load assets
  const logoBuffer = readFileBuffer(path.join("public", "images", "logo.png"));
  const sealBuffer = readFileBuffer(path.join("public", "signature", "sceau.png"));
  const signatureBuffer = readFileBuffer(path.join("public", "signature", "signature.png"));

  // 6. Generate PDF
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateDeliveryNotePdf(pdfData, logoBuffer, sealBuffer, signatureBuffer);
  } catch (err) {
    console.error("[PDF] Erreur lors de la génération du PDF du bon de livraison:", err);
    return NextResponse.json(
      { error: "Échec de la génération du PDF. Veuillez réessayer." },
      { status: 500 }
    );
  }

  // 7. Build safe filename: MIS-BL-YYYY-NNN.pdf
  const safeRef = pdfData.blNumber
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
  const filename = `${safeRef}.pdf`;

  // 8. Disposition: inline (preview) vs attachment (download)
  const url = new URL(request.url);
  const disposition =
    url.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";

  // 9. Return PDF response
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Content-Length": String(pdfBytes.byteLength),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
