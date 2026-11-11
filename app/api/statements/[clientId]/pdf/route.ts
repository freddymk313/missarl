// ============================================================================
// API Route: GET /api/statements/[clientId]/pdf
// Generates and streams the official "RELEVE DE COMPTE & FACTURE NON PAYEE" PDF
// Supports:  ?disposition=inline  (preview — default)
//            ?disposition=attachment (download)
//            ?startDate=YYYY-MM-DD
//            ?endDate=YYYY-MM-DD
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getUnpaidInvoicesStatement } from "@/lib/pdf/statement-data";
import { generateStatementPdf } from "@/lib/pdf/statement-pdf";
import { getClientById } from "@/lib/db/clients";

function readFileBuffer(publicSubpath: string): Buffer | null {
  try {
    const fullPath = path.join(process.cwd(), "public", publicSubpath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  // 1. Authenticate — require a valid session
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  // 2. Authorize — only SUPER_ADMIN and ADMIN may access statement PDFs
  if (!permissions.canViewStatements(session.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Vous n'avez pas les droits pour générer ce document." },
      { status: 403 }
    );
  }

  // 3. Resolve and validate route parameter
  const { clientId } = await params;
  if (!clientId || typeof clientId !== "string" || clientId.trim() === "") {
    return NextResponse.json(
      { error: "Identifiant du client manquant ou invalide." },
      { status: 400 }
    );
  }

  // Check client existence
  try {
    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json(
        { error: "Client introuvable." },
        { status: 404 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Client introuvable." },
      { status: 404 }
    );
  }

  // 4. Validate query parameters
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate")?.trim() || undefined;
  const endDate = url.searchParams.get("endDate")?.trim() || undefined;

  // Basic date validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (startDate && !dateRegex.test(startDate)) {
    return NextResponse.json(
      { error: "Format de date de début invalide (attendu: AAAA-MM-JJ)." },
      { status: 400 }
    );
  }
  if (endDate && !dateRegex.test(endDate)) {
    return NextResponse.json(
      { error: "Format de date de fin invalide (attendu: AAAA-MM-JJ)." },
      { status: 400 }
    );
  }
  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json(
      { error: "La date de début ne peut pas être postérieure à la date de fin." },
      { status: 400 }
    );
  }

  // 5. Retrieve unpaid invoices statement data
  let statementData;
  try {
    statementData = await getUnpaidInvoicesStatement(clientId, startDate, endDate);
  } catch (err) {
    console.error("[Statement PDF] Erreur lors de la récupération des données:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des factures impayées du client." },
      { status: 500 }
    );
  }

  if (!statementData) {
    return NextResponse.json(
      { error: "Données du relevé indisponibles." },
      { status: 500 }
    );
  }

  // 6. Load corporate visual assets safely
  const logoBuffer = readFileBuffer(path.join("images", "logo.png"));
  const sealBuffer = readFileBuffer(path.join("signature", "sceau.png"));
  const signatureBuffer = readFileBuffer(path.join("signature", "signature.png"));

  // 7. Generate PDF server-side using pdf-lib
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateStatementPdf(
      statementData,
      logoBuffer,
      sealBuffer,
      signatureBuffer
    );
  } catch (err) {
    console.error("[Statement PDF] Erreur lors de la génération du PDF:", err);
    return NextResponse.json(
      { error: "Échec de la génération du PDF du relevé. Veuillez réessayer." },
      { status: 500 }
    );
  }

  // 8. Build safe filename: MIS_RELEVE_IMPAYE_CODE_YYYY-MM-DD.pdf
  const safeClientCode = (statementData.client.code || "CLIENT")
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .toUpperCase();
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `MIS_RELEVE_IMPAYE_${safeClientCode}_${dateStr}.pdf`;

  // 9. Disposition: inline (preview) vs attachment (download)
  const disposition =
    url.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";

  // 10. Return PDF stream
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
