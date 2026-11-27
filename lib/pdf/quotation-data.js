"use strict";
// ============================================================================
// Quotation PDF Data Service — MIS SARL
// Retrieves all data needed for PDF generation from Neon PostgreSQL.
// NEVER exposes supplier prices, commissions or exchange rates to output.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchQuotationLineImage = fetchQuotationLineImage;
exports.getQuotationPdfData = getQuotationPdfData;
const quotations_1 = require("@/lib/db/quotations");
const site_1 = require("@/app/config/site");
const blob_1 = require("@/lib/blob");
const mis_document_layout_1 = require("./mis-document-layout");
async function fetchQuotationLineImage(rawUrl, lineNumber) {
    if (!rawUrl || !rawUrl.trim())
        return null;
    const urlCheck = (0, blob_1.validateQuotationBlobImageUrl)(rawUrl);
    if (!urlCheck.valid) {
        console.warn(`[Quotation PDF Line ${lineNumber}] Image URL validation rejected:`, urlCheck.error);
        return null;
    }
    const mockPathname = (0, blob_1.extractMockBlobPathname)(urlCheck.url);
    if (mockPathname) {
        const entry = (0, blob_1.getMockBlob)(mockPathname);
        if (!entry) {
            console.warn(`[Quotation PDF Line ${lineNumber}] In-memory mock image not found:`, mockPathname);
            return null;
        }
        return { bytes: entry.bytes, mimeType: entry.contentType };
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await fetch(urlCheck.url, {
                method: "GET",
                redirect: "follow",
                signal: AbortSignal.timeout(30000),
                cache: "no-store",
            });
            if (!res.ok) {
                console.warn(`[Quotation PDF Line ${lineNumber}] Image fetch failed with HTTP ${res.status} (${res.statusText})`);
                return null;
            }
            const contentLengthHeader = res.headers.get("content-length");
            if (contentLengthHeader) {
                const declaredSize = Number(contentLengthHeader);
                if (Number.isFinite(declaredSize) && declaredSize > blob_1.MAX_QUOTATION_IMAGE_BYTES) {
                    console.warn(`[Quotation PDF Line ${lineNumber}] Image exceeds max allowed size via Content-Length (${declaredSize} bytes).`);
                    return null;
                }
            }
            const arrayBuffer = await res.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            if (bytes.byteLength === 0 || bytes.byteLength > blob_1.MAX_QUOTATION_IMAGE_BYTES) {
                console.warn(`[Quotation PDF Line ${lineNumber}] Downloaded image size invalid (${bytes.byteLength} bytes).`);
                return null;
            }
            const detectedMime = (0, blob_1.detectImageFormatFromBytes)(bytes);
            if (!detectedMime) {
                console.warn(`[Quotation PDF Line ${lineNumber}] Downloaded bytes failed JPEG/PNG magic signature check.`);
                return null;
            }
            return { bytes, mimeType: detectedMime };
        }
        catch (err) {
            if (attempt === 2) {
                console.warn(`[Quotation PDF Line ${lineNumber}] Failed to fetch line brand image after 2 attempts:`, err instanceof Error ? err.message : "Unknown error");
                return null;
            }
        }
    }
    return null;
}
/**
 * Retrieves and structures quotation data for PDF generation.
 * Uses ONLY the persisted quotation snapshots — never recalculates from supplier data.
 */
async function getQuotationPdfData(quotationId) {
    const record = await (0, quotations_1.getQuotationById)(quotationId);
    if (!record)
        return null;
    // Company info matching MIS SARL reference template (RFQ-KICO-14319 OQ)
    const company = {
        name: "MARC INGINEERING SERVICE SARL",
        rccm: site_1.siteConfig.legal.rccm || "CD/LSH/RCCM/26.B-00277",
        impotNumber: "A2609081A",
        address: `${site_1.siteConfig.address.line}, ${site_1.siteConfig.address.country}`,
        city: `${site_1.siteConfig.address.city}, ${site_1.siteConfig.address.region}`,
        country: site_1.siteConfig.address.country,
        phones: site_1.siteConfig.phones && site_1.siteConfig.phones.length > 0
            ? [...site_1.siteConfig.phones]
            : ["+243 992224458", "+243 900041696"],
        email: site_1.siteConfig.email || "messarl2023@gmail.com",
        website: mis_document_layout_1.DEFAULT_COMPANY_WEBSITE,
        bankInfo: "BANK name : FIRST BANK RDC SA | SWIFT code : BICDCDKI | RIB: 00014 - 25000 – 2032105587015 | Branch : LUBUMBASHI/R.D.Congo",
        logoPath: "/images/logo.png",
    };
    // Client info from database record
    const client = {
        name: record.clientName ?? "Unknown Customer",
        code: record.clientCode ?? "",
        email: record.clientEmail ?? null,
        phone: record.clientPhone ?? null,
        billingAddress: record.clientBillingAddress ?? null,
        taxId: null,
    };
    // Map line items — snapshot values only, never supplier data
    const lines = await Promise.all((record.items ?? []).map(async (item) => {
        const fetchedImage = await fetchQuotationLineImage(item.brandImageUrl, item.lineNumber);
        const trimmedBrand = item.brand?.trim() ? item.brand.trim() : null;
        return {
            lineNumber: item.lineNumber,
            brand: trimmedBrand,
            brandImageBytes: fetchedImage?.bytes ?? null,
            brandImageMimeType: fetchedImage?.mimeType ?? null,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice, // unit_price_snapshot
            discountPercent: item.discountPercent ?? 0,
            lineSubtotal: item.lineSubtotal,
        };
    }));
    const rec = record;
    const rawRfq = record.clientRfqNumber ??
        rec.client_rfq_number ??
        rec.rfqNumber ??
        rec.rfq ??
        null;
    const clientRfqNumber = typeof rawRfq === "string" ? rawRfq.trim() : null;
    return {
        company,
        client,
        reference: record.internalReference,
        clientRfqNumber,
        rfqNumber: clientRfqNumber,
        docType: record.docType,
        documentDate: record.documentDate,
        validityDate: record.validityDate,
        currency: record.currency,
        paymentTerms: record.paymentTerms,
        deliveryLeadTime: record.deliveryLeadTime,
        notes: record.notes,
        status: record.status,
        lines,
        // Persisted totals
        subtotal: record.subtotal,
        vatRate: record.vatRate,
        vatAmount: record.vatAmount,
        total: record.total,
        createdByName: record.createdByName ?? null,
    };
}
