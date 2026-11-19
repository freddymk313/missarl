// ============================================================================
// Server-Side Validation for Uploaded Customer RFQ Documents
// Supports PDF, JPEG, and PNG up to 4 MB with magic-byte verification.
// ============================================================================

export const MAX_RFQ_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

export const ALLOWED_RFQ_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedRFQMimeType = (typeof ALLOWED_RFQ_MIME_TYPES)[number];

export interface RFQFileValidationSuccess {
  ok: true;
  mimeType: AllowedRFQMimeType;
  bytes: Buffer;
  filename: string;
  sizeBytes: number;
}

export interface RFQFileValidationFailure {
  ok: false;
  status: 400 | 413;
  error: string;
}

export type RFQFileValidationResult =
  | RFQFileValidationSuccess
  | RFQFileValidationFailure;

export function detectRFQFileMimeFromBytes(
  bytes: Uint8Array
): AllowedRFQMimeType | null {
  if (bytes.length < 4) return null;

  // PDF signature: "%PDF-" (allow minor leading whitespace/BOM if small offset <= 16 bytes)
  for (let offset = 0; offset <= Math.min(16, bytes.length - 5); offset++) {
    if (
      bytes[offset] === 0x25 && // %
      bytes[offset + 1] === 0x50 && // P
      bytes[offset + 2] === 0x44 && // D
      bytes[offset + 3] === 0x46 && // F
      bytes[offset + 4] === 0x2d // -
    ) {
      return "application/pdf";
    }
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG signature: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  return null;
}

function isExtensionCompatible(
  filename: string,
  mimeType: AllowedRFQMimeType
): boolean {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return true; // allow extensionless uploads if MIME & magic bytes agree
  const ext = filename.slice(dotIdx).toLowerCase();
  if (mimeType === "application/pdf") return ext === ".pdf";
  if (mimeType === "image/png") return ext === ".png";
  if (mimeType === "image/jpeg") return ext === ".jpg" || ext === ".jpeg";
  return false;
}

export async function validateRFQDocumentFile(
  file: unknown
): Promise<RFQFileValidationResult> {
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      status: 400,
      error: "Aucun fichier sélectionné.",
    };
  }

  if (file.size > MAX_RFQ_FILE_BYTES) {
    return {
      ok: false,
      status: 413,
      error: "Fichier trop volumineux (4 MB maximum).",
    };
  }

  const declaredMime = (file.type || "").toLowerCase();
  if (
    declaredMime &&
    !ALLOWED_RFQ_MIME_TYPES.includes(declaredMime as AllowedRFQMimeType)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Format de document non supporté (PDF, JPEG ou PNG uniquement).",
    };
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Impossible de lire le fichier téléversé.",
    };
  }

  const bytes = Buffer.from(arrayBuffer);
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      status: 400,
      error: "Le fichier téléversé est vide.",
    };
  }

  if (bytes.byteLength > MAX_RFQ_FILE_BYTES) {
    return {
      ok: false,
      status: 413,
      error: "Fichier trop volumineux (4 MB maximum).",
    };
  }

  const detectedMime = detectRFQFileMimeFromBytes(bytes);
  if (!detectedMime) {
    return {
      ok: false,
      status: 400,
      error: "Format de document non supporté (signature PDF, JPEG ou PNG requise).",
    };
  }

  if (declaredMime && declaredMime !== detectedMime) {
    return {
      ok: false,
      status: 400,
      error: "Le contenu du fichier ne correspond pas au type déclaré.",
    };
  }

  const filename = file.name || "rfq-document";
  if (!isExtensionCompatible(filename, detectedMime)) {
    return {
      ok: false,
      status: 400,
      error: "L'extension du fichier ne correspond pas au format détecté.",
    };
  }

  return {
    ok: true,
    mimeType: detectedMime,
    bytes,
    filename,
    sizeBytes: bytes.byteLength,
  };
}
