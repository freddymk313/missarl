// ============================================================================
// API Route: GET & POST /api/quotations/line-image
// In-memory blob upload/retrieval for optional quotation line brand/product images.
// ============================================================================

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getQuotationById, checkQuotationEligibility } from "@/lib/db/quotations";
import {
  ALLOWED_QUOTATION_IMAGE_MIME_TYPES,
  MAX_QUOTATION_IMAGE_BYTES,
  QUOTATION_IMAGE_PATH_PREFIX,
  detectImageFormatFromBytes,
  getMockBlob,
  putMockBlob,
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

export async function GET(request: NextRequest) {
  const pathParam = request.nextUrl.searchParams.get("path");
  if (!pathParam || !pathParam.startsWith(QUOTATION_IMAGE_PATH_PREFIX)) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  const entry = getMockBlob(pathParam);
  if (!entry) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(entry.bytes), {
    status: 200,
    headers: {
      "Content-Type": entry.contentType,
      "Content-Length": String(entry.bytes.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
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

  // 3. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Aucun fichier sélectionné." },
      { status: 400 }
    );
  }

  // 4. Verify authorized quotation workflow (if editing an existing quotation)
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

  // 5. Validate uploaded file existence
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json(
      { error: "Aucun fichier sélectionné." },
      { status: 400 }
    );
  }

  // 6. Enforce maximum upload size (4 MB)
  if (fileEntry.size > MAX_QUOTATION_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse (4 MB maximum)." },
      { status: 413 }
    );
  }

  // 7. Validate declared MIME type & extension
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

  // 8. Validate actual image binary signature (magic bytes)
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

  // 9. Store in in-memory Map blob stub with unique pathname
  const extension = detectedMime === "image/png" ? "png" : "jpg";
  const pathname = `${QUOTATION_IMAGE_PATH_PREFIX}${crypto.randomUUID()}.${extension}`;
  const blob = putMockBlob(pathname, bytes, detectedMime);

  return NextResponse.json(
    {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: bytes.byteLength,
    },
    { status: 200 }
  );
}
