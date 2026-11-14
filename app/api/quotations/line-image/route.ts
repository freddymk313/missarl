// ============================================================================
// API Route: POST /api/quotations/line-image
// Server-side Vercel Blob upload for optional quotation line brand/product images.
// ============================================================================

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getQuotationById, checkQuotationEligibility } from "@/lib/db/quotations";
import {
  ALLOWED_QUOTATION_IMAGE_MIME_TYPES,
  MAX_QUOTATION_IMAGE_BYTES,
  QUOTATION_IMAGE_PATH_PREFIX,
  detectImageFormatFromBytes,
  getBlobReadWriteToken,
  type AllowedQuotationImageMimeType,
} from "@/lib/blob";

function isExtensionMatchingMime(
  filename: string,
  mimeType: AllowedQuotationImageMimeType
): boolean {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const ext = filename.slice(dotIdx).toLowerCase();
  if (mimeType === "image/png") return ext === ".png";
  if (mimeType === "image/jpeg") return ext === ".jpg" || ext === ".jpeg";
  return false;
}

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  // 2. Authorize only SUPER_ADMIN and ADMIN
  if (!permissions.canManageQuotations(session.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Vous n'avez pas les droits pour téléverser une image." },
      { status: 403 }
    );
  }

  // 3. Ensure Vercel Blob server configuration is present (never fall back to mock storage)
  const blobToken = getBlobReadWriteToken();
  if (!blobToken) {
    console.error("[Blob Upload] BLOB_READ_WRITE_TOKEN manquant dans l'environnement serveur.");
    return NextResponse.json(
      { error: "Configuration Vercel Blob manquante." },
      { status: 500 }
    );
  }

  // 4. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Aucun fichier sélectionné." },
      { status: 400 }
    );
  }

  // 5. Verify authorized quotation workflow (if editing an existing quotation)
  const quotationIdRaw = formData.get("quotationId");
  if (typeof quotationIdRaw === "string" && quotationIdRaw.trim().length > 0) {
    const quotation = await getQuotationById(quotationIdRaw.trim());
    if (!quotation) {
      return NextResponse.json(
        { error: "Devis introuvable." },
        { status: 404 }
      );
    }
    const eligibility = await checkQuotationEligibility(quotation.id, quotation.status);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason || "Modification de ce devis non autorisée." },
        { status: 403 }
      );
    }
  }

  // 6. Validate uploaded file existence
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json(
      { error: "Aucun fichier sélectionné." },
      { status: 400 }
    );
  }

  // 7. Enforce maximum upload size (4 MB)
  if (fileEntry.size > MAX_QUOTATION_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse (4 MB maximum)." },
      { status: 413 }
    );
  }

  // 8. Validate declared MIME type & extension
  const declaredMime = fileEntry.type as AllowedQuotationImageMimeType;
  if (!ALLOWED_QUOTATION_IMAGE_MIME_TYPES.includes(declaredMime)) {
    return NextResponse.json(
      { error: "Format d'image non accepté." },
      { status: 400 }
    );
  }

  if (fileEntry.name && !isExtensionMatchingMime(fileEntry.name, declaredMime)) {
    return NextResponse.json(
      { error: "Format d'image non accepté." },
      { status: 400 }
    );
  }

  // 9. Validate actual image binary signature (magic bytes)
  let bytes: Uint8Array;
  try {
    const buffer = await fileEntry.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } catch (err) {
    console.error("[Blob Upload] Lecture du fichier échouée:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Échec du téléversement de l'image." },
      { status: 400 }
    );
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json(
      { error: "Aucun fichier sélectionné." },
      { status: 400 }
    );
  }

  if (bytes.byteLength > MAX_QUOTATION_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse (4 MB maximum)." },
      { status: 413 }
    );
  }

  const detectedMime = detectImageFormatFromBytes(bytes);
  if (!detectedMime || detectedMime !== declaredMime) {
    return NextResponse.json(
      { error: "Format d'image non accepté." },
      { status: 400 }
    );
  }

  // 10. Upload to existing PUBLIC Vercel Blob store with unique pathname
  const extension = detectedMime === "image/png" ? "png" : "jpg";
  const pathname = `${QUOTATION_IMAGE_PATH_PREFIX}${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(pathname, Buffer.from(bytes), {
      access: "public",
      addRandomSuffix: true,
      contentType: detectedMime,
      token: blobToken,
    });

    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType || detectedMime,
        size: bytes.byteLength,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[Blob Upload] Échec lors de l'envoi vers Vercel Blob:",
      err instanceof Error ? err.message : "Erreur inconnue"
    );
    return NextResponse.json(
      { error: "Échec du téléversement de l'image." },
      { status: 500 }
    );
  }
}
