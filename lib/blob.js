"use strict";
// ============================================================================
// In-Memory Blob Stub & URL Validation for Quotation Line Images
// Replaces @vercel/blob with an in-memory Map store for AI Studio preview.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_QUOTATION_IMAGE_ENDPOINT = exports.QUOTATION_IMAGE_PATH_PREFIX = exports.ALLOWED_QUOTATION_IMAGE_MIME_TYPES = exports.MAX_QUOTATION_IMAGE_BYTES = void 0;
exports.putMockBlob = putMockBlob;
exports.getMockBlob = getMockBlob;
exports.extractMockBlobPathname = extractMockBlobPathname;
exports.getBlobReadWriteToken = getBlobReadWriteToken;
exports.getConfiguredBlobStoreId = getConfiguredBlobStoreId;
exports.getExpectedBlobHostname = getExpectedBlobHostname;
exports.isAllowedBlobHostname = isAllowedBlobHostname;
exports.detectImageFormatFromBytes = detectImageFormatFromBytes;
exports.validateQuotationBlobImageUrl = validateQuotationBlobImageUrl;
exports.MAX_QUOTATION_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
exports.ALLOWED_QUOTATION_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
];
exports.QUOTATION_IMAGE_PATH_PREFIX = "quotation-line-images/";
exports.LOCAL_QUOTATION_IMAGE_ENDPOINT = "/api/quotations/line-image";
const globalForBlob = globalThis;
const mockBlobStore = globalForBlob.__misMockBlobStore ?? new Map();
if (!globalForBlob.__misMockBlobStore) {
    globalForBlob.__misMockBlobStore = mockBlobStore;
}
function putMockBlob(pathname, bytes, contentType) {
    mockBlobStore.set(pathname, { bytes: new Uint8Array(bytes), contentType });
    return {
        url: `${exports.LOCAL_QUOTATION_IMAGE_ENDPOINT}?path=${encodeURIComponent(pathname)}`,
        pathname,
        contentType,
    };
}
function getMockBlob(pathname) {
    return mockBlobStore.get(pathname) ?? null;
}
function extractMockBlobPathname(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith(exports.LOCAL_QUOTATION_IMAGE_ENDPOINT)) {
        return null;
    }
    try {
        const parsed = new URL(trimmed, "http://localhost");
        if (parsed.pathname !== exports.LOCAL_QUOTATION_IMAGE_ENDPOINT) {
            return null;
        }
        const pathParam = parsed.searchParams.get("path");
        if (!pathParam || !pathParam.startsWith(exports.QUOTATION_IMAGE_PATH_PREFIX)) {
            return null;
        }
        const lowerPath = pathParam.toLowerCase();
        if (!lowerPath.endsWith(".png") &&
            !lowerPath.endsWith(".jpg") &&
            !lowerPath.endsWith(".jpeg")) {
            return null;
        }
        return pathParam;
    }
    catch {
        return null;
    }
}
/**
 * Strips optional surrounding quotes and whitespace from an environment string.
 */
function cleanEnvString(val) {
    if (!val)
        return null;
    let trimmed = val.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
    }
    return trimmed.length > 0 ? trimmed : null;
}
/**
 * Reads BLOB_READ_WRITE_TOKEN from server environment.
 */
function getBlobReadWriteToken() {
    return cleanEnvString(process.env.BLOB_READ_WRITE_TOKEN);
}
/**
 * Extracts and normalizes the configured Blob store ID.
 */
function getConfiguredBlobStoreId() {
    const rawStoreId = cleanEnvString(process.env.BLOB_STORE_ID);
    if (rawStoreId) {
        let normalized = rawStoreId;
        if (normalized.startsWith("store_")) {
            normalized = normalized.slice("store_".length);
        }
        if (normalized)
            return normalized;
    }
    const token = getBlobReadWriteToken();
    if (token) {
        const parts = token.split("_");
        if (parts.length >= 4 && parts[0] === "vercel" && parts[1] === "blob" && parts[2] === "rw") {
            let storeId = parts[3]?.trim();
            if (storeId?.startsWith("store_")) {
                storeId = storeId.slice("store_".length);
            }
            if (storeId)
                return storeId;
        }
    }
    return null;
}
function getExpectedBlobHostname() {
    const storeId = getConfiguredBlobStoreId();
    if (!storeId)
        return null;
    return `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}
function isAllowedBlobHostname(hostname) {
    const storeId = getConfiguredBlobStoreId();
    if (!storeId)
        return false;
    const h = hostname.toLowerCase();
    const primaryExpected = `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
    const storePrefixedExpected = `store_${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
    return h === primaryExpected || h === storePrefixedExpected;
}
/**
 * Validates raw file bytes against known JPEG / PNG magic signatures.
 */
function detectImageFormatFromBytes(bytes) {
    if (!bytes || bytes.length < 8)
        return null;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a) {
        return "image/png";
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return "image/jpeg";
    }
    return null;
}
/**
 * Validates that a quotation line image URL is either a valid local mock blob
 * endpoint URL or an allowed HTTPS blob URL.
 */
function validateQuotationBlobImageUrl(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return { valid: false, error: "URL d'image vide." };
    }
    const mockPathname = extractMockBlobPathname(trimmed);
    if (mockPathname) {
        return {
            valid: true,
            url: `${exports.LOCAL_QUOTATION_IMAGE_ENDPOINT}?path=${encodeURIComponent(mockPathname)}`,
        };
    }
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("data:") || lower.startsWith("blob:")) {
        return {
            valid: false,
            error: "Les URLs locales (data: ou blob:) ne sont pas autorisées.",
        };
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch {
        return { valid: false, error: "L'URL de l'image est invalide." };
    }
    if (parsed.protocol !== "https:") {
        return {
            valid: false,
            error: "L'URL de l'image doit utiliser le protocole HTTPS.",
        };
    }
    if (parsed.username || parsed.password) {
        return { valid: false, error: "L'URL de l'image est invalide." };
    }
    if (parsed.port && parsed.port !== "443") {
        return { valid: false, error: "Port URL non autorisé." };
    }
    if (!isAllowedBlobHostname(parsed.hostname)) {
        const expectedHost = getExpectedBlobHostname();
        if (!expectedHost) {
            return {
                valid: false,
                error: "URL d'image non autorisée.",
            };
        }
        return {
            valid: false,
            error: `L'hôte de l'image (${parsed.hostname}) n'appartient pas au stockage configuré (${expectedHost}).`,
        };
    }
    if (!parsed.pathname.startsWith(`/${exports.QUOTATION_IMAGE_PATH_PREFIX}`)) {
        return {
            valid: false,
            error: "Chemin d'image non autorisé.",
        };
    }
    const lowerPath = parsed.pathname.toLowerCase();
    if (!lowerPath.endsWith(".png") &&
        !lowerPath.endsWith(".jpg") &&
        !lowerPath.endsWith(".jpeg")) {
        return {
            valid: false,
            error: "Extension d'image non acceptée.",
        };
    }
    return { valid: true, url: parsed.toString() };
}
