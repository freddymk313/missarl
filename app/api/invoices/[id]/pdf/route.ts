// ============================================================================
// API Route: GET /api/invoices/[id]/pdf
// Generates and streams a professional sales invoice PDF using pdf-lib.
// Supports:  ?disposition=inline  (preview — default)
//            ?disposition=attachment (download)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getInvoicePdfData } from "@/lib/pdf/invoice-data";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";

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

  // 2. Authorise — only SUPER_ADMIN and ADMIN may access invoice PDFs
  if (!permissions.canManageInvoices(session.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Vous n'avez pas les droits pour générer ce document." },
      { status: 403 }
    );
  }

  // 3. Resolve route parameter
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Identifiant de la facture manquant." },
      { status: 400 }
    );
  }

  // 4. Retrieve invoice data
  let pdfData;
  try {
    pdfData = await getInvoicePdfData(id);
  } catch (err) {
    console.error("[PDF] Erreur lors de la récupération de la facture:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de la facture." },
      { status: 500 }
    );
  }

  if (!pdfData) {
    return NextResponse.json(
      { error: "Facture introuvable." },
      { status: 404 }
    );
  }

  if (!pdfData.lines || pdfData.lines.length === 0) {
    return NextResponse.json(
      { error: "Cette facture ne contient aucun article. PDF non génératable." },
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
    pdfBytes = await generateInvoicePdf(pdfData, logoBuffer, sealBuffer, signatureBuffer);
  } catch (err) {
    console.error("[PDF] Erreur lors de la génération du PDF de la facture:", err);
    return NextResponse.json(
      { error: "Échec de la génération du PDF. Veuillez réessayer." },
      { status: 500 }
    );
  }

  // 7. Build safe filename: MIS-FAC-YYYY-NNN.pdf
  const safeRef = pdfData.invoiceNumber
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
