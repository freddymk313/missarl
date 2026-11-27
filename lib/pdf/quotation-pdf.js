"use strict";
// ============================================================================
// Professional Quotation PDF Generator — MIS SARL
// Pixel-perfect reproduction of RFQ-KICO-14425 OQ reference template.
// Server-side PDF composition using pdf-lib.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuotationPdf = generateQuotationPdf;
const pdf_lib_1 = require("pdf-lib");
const number_format_1 = require("@/lib/number-format");
const mis_document_layout_1 = require("./mis-document-layout");
// ── Colors matching RFQ-KICO-14425 OQ exactly ─────────────────────────────────
const BLACK = (0, pdf_lib_1.rgb)(0, 0, 0);
const WHITE = (0, pdf_lib_1.rgb)(1, 1, 1);
const BRIGHT_YELLOW = (0, pdf_lib_1.rgb)(1, 1, 0); // #FFFF00 - Pure yellow (Table Header & Grand Total)
const PALE_YELLOW = (0, pdf_lib_1.rgb)(1, 0.949, 0.8); // #FFF2CC - Pale Yellow (TOTAL column & Sub Total)
const SOFT_BLUE = (0, pdf_lib_1.rgb)(0.608, 0.761, 0.902); // #9BC2E6 - Soft Blue (TVA cell)
const RED_TEXT = (0, pdf_lib_1.rgb)(1, 0, 0); // #FF0000 - Vibrant red for Customer & Delivery terms
const BORDER_WIDTH = 0.6; // Matches exact 0.6 pt line width from reference PDF
// ── Page Geometry (ISO A4: 595.32 x 841.92 points) ──────────────────────────
const PAGE_WIDTH = 595.32;
const PAGE_HEIGHT = 841.92;
const MARGIN_LEFT = 51.48;
const RIGHT_EDGE = 542.86;
const CONTENT_WIDTH = RIGHT_EDGE - MARGIN_LEFT; // 491.38 pt
// Table column widths matching RFQ-KICO-14425 OQ exactly (total = 491.38 pt)
const COL_W = {
    item: 28.34, // 51.48 -> 79.82
    brand: 129.75, // 79.82 -> 209.57
    qty: 36.48, // 209.57 -> 246.05
    um: 35.64, // 246.05 -> 281.69
    desc: 155.33, // 281.69 -> 437.02
    unitPrice: 49.56, // 437.02 -> 486.58
    total: 56.28, // 486.58 -> 542.86
};
// Column X coordinates
const COL_X = {
    item: MARGIN_LEFT,
    brand: MARGIN_LEFT + COL_W.item,
    qty: MARGIN_LEFT + COL_W.item + COL_W.brand,
    um: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty,
    desc: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um,
    unitPrice: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc,
    total: MARGIN_LEFT +
        COL_W.item +
        COL_W.brand +
        COL_W.qty +
        COL_W.um +
        COL_W.desc +
        COL_W.unitPrice,
};
/**
 * Currency formatter using MIS SARL US convention:
 * e.g. "$ 61.25", "$ 25,070.94", "-$ 214.64".
 */
function formatCurrency(amount) {
    return (0, number_format_1.formatUSD)(amount);
}
/**
 * Date formatter matching RFQ-KICO-14425 OQ:
 * DD/MM/YYYY (e.g. 07/11/2026).
 */
function formatDate(dateStr) {
    if (!dateStr)
        return "07/11/2026";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    catch {
        return dateStr;
    }
}
/**
 * Wraps text into lines that do not exceed maxWidth points.
 */
function wrapText(text, font, fontSize, maxWidth) {
    if (!text)
        return [""];
    const rawParagraphs = text.split(/\r?\n/);
    const resultLines = [];
    for (const paragraph of rawParagraphs) {
        if (!paragraph.trim()) {
            resultLines.push("");
            continue;
        }
        const words = paragraph.split(" ");
        let currentLine = "";
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width <= maxWidth) {
                currentLine = testLine;
            }
            else {
                if (currentLine) {
                    resultLines.push(currentLine);
                    currentLine = word;
                }
                else {
                    resultLines.push(word);
                    currentLine = "";
                }
            }
        }
        if (currentLine) {
            resultLines.push(currentLine);
        }
    }
    return resultLines;
}
/**
 * Wraps brand text into lines that do not exceed maxWidth points,
 * breaking overly long single tokens cleanly so they never cross cell borders.
 */
function wrapBrandText(text, font, fontSize, maxWidth) {
    const initial = wrapText(text, font, fontSize, maxWidth);
    const safeLines = [];
    for (const line of initial) {
        if (font.widthOfTextAtSize(line, fontSize) <= maxWidth) {
            safeLines.push(line);
            continue;
        }
        let chunk = "";
        for (const ch of line) {
            const candidate = chunk + ch;
            if (chunk && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
                safeLines.push(chunk);
                chunk = ch;
            }
            else {
                chunk = candidate;
            }
        }
        if (chunk)
            safeLines.push(chunk);
    }
    return safeLines.length > 0 ? safeLines : [""];
}
async function embedQuotationBrandImage(doc, line) {
    if (!line.brandImageBytes || line.brandImageBytes.length === 0)
        return null;
    const bytes = line.brandImageBytes;
    if (line.brandImageMimeType === "image/png") {
        try {
            return await doc.embedPng(bytes);
        }
        catch (err) {
            console.warn(`[Quotation PDF Line ${line.lineNumber}] embedPng failed, attempting embedJpg fallback:`, err instanceof Error ? err.message : err);
            try {
                return await doc.embedJpg(bytes);
            }
            catch (err2) {
                console.error(`[Quotation PDF Line ${line.lineNumber}] Failed to embed image as PNG or JPG:`, err2 instanceof Error ? err2.message : err2);
                return null;
            }
        }
    }
    if (line.brandImageMimeType === "image/jpeg") {
        try {
            return await doc.embedJpg(bytes);
        }
        catch (err) {
            console.warn(`[Quotation PDF Line ${line.lineNumber}] embedJpg failed, attempting embedPng fallback:`, err instanceof Error ? err.message : err);
            try {
                return await doc.embedPng(bytes);
            }
            catch (err2) {
                console.error(`[Quotation PDF Line ${line.lineNumber}] Failed to embed image as JPG or PNG:`, err2 instanceof Error ? err2.message : err2);
                return null;
            }
        }
    }
    try {
        return await doc.embedPng(bytes);
    }
    catch {
        try {
            return await doc.embedJpg(bytes);
        }
        catch (err) {
            console.error(`[Quotation PDF Line ${line.lineNumber}] Failed to embed image with unknown mime:`, err instanceof Error ? err.message : err);
            return null;
        }
    }
}
async function generateQuotationPdf(data, logoBuffer) {
    const doc = await pdf_lib_1.PDFDocument.create();
    // Helvetica standard fonts (Arial metric-compatible in PDF standards)
    const fontRegular = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    // Embed logo image if available
    let logoImage = null;
    if (logoBuffer && logoBuffer.length > 0) {
        try {
            logoImage = await doc.embedPng(logoBuffer);
        }
        catch {
            try {
                logoImage = await doc.embedJpg(logoBuffer);
            }
            catch {
                logoImage = null;
            }
        }
    }
    const pages = [];
    const pageTables = [];
    function addNewPage() {
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        pages.push(page);
        const pageIndex = pages.length - 1;
        return { page, pageIndex };
    }
    // Start Page 1
    const { page: page1 } = addNewPage();
    // ── 1. HEADER SECTION (PAGE 1) ─────────────────────────────────────────────
    const logoW = 60.24;
    const logoH = 53.42;
    const logoX = MARGIN_LEFT;
    const logoY = 738.0;
    if (logoImage) {
        page1.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoW,
            height: logoH,
        });
    }
    // Company Details (X = 117.26) — spaced cleanly with breathing room above divider (y = 713.86)
    const companyX = 117.26;
    const websiteUrl = (0, mis_document_layout_1.resolveCompanyWebsite)(data.company);
    page1.drawText(data.company.name, {
        x: companyX + 0.48,
        y: 781.5,
        size: 10.5,
        font: fontBold,
        color: BLACK,
    });
    const addressLine = data.company.address ||
        "Town and City of Lubumbashi, Democratic Republic of the Congo";
    page1.drawText(addressLine, {
        x: companyX,
        y: 771.6,
        size: 7.32,
        font: fontRegular,
        color: BLACK,
    });
    page1.drawText(`Phone : ${data.company.phones.join(" / ")}`, {
        x: companyX,
        y: 762.4,
        size: 7.32,
        font: fontRegular,
        color: BLACK,
    });
    page1.drawText(`E-mail : ${data.company.email}`, {
        x: companyX,
        y: 753.2,
        size: 7.32,
        font: fontRegular,
        color: BLACK,
    });
    page1.drawText(`RCCM : ${data.company.rccm}`, {
        x: companyX,
        y: 744.0,
        size: 7.32,
        font: fontRegular,
        color: BLACK,
    });
    page1.drawText(`NIF N° : ${data.company.impotNumber || "A2609081A"}`, {
        x: companyX,
        y: 734.8,
        size: 7.32,
        font: fontRegular,
        color: BLACK,
    });
    // Website right after NIF N° with clean space above divider line (y = 713.86)
    page1.drawText(`Website : ${websiteUrl}`, {
        x: companyX,
        y: 725.6,
        size: 7.32,
        font: fontRegular,
        color: BLACK,
    });
    // Top Right: Date
    page1.drawText("Date:", {
        x: 465.94,
        y: 778.0,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    page1.drawText(formatDate(data.documentDate), {
        x: 501.34,
        y: 778.0,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    // Top Right: Document Title (QUOTATION / PROFORMA)
    const docTitle = data.docType === "PROFORMA" ? "PROFORMA" : "QUOTATION";
    page1.drawText(docTitle, {
        x: 439.18,
        y: 746.5,
        size: 10.08,
        font: fontBold,
        color: BLACK,
    });
    // Divider Line below Header (thickness 1.32 pt)
    page1.drawRectangle({
        x: MARGIN_LEFT,
        y: 713.86,
        width: CONTENT_WIDTH,
        height: 1.32,
        color: BLACK,
    });
    // ── 2. CUSTOMER & REFERENCE SECTION ───────────────────────────────────────
    const row1Y = 695.0;
    page1.drawText("Customer  : ", {
        x: 53.16,
        y: row1Y,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    // Customer Name in Red Bold
    page1.drawText(data.client.name.replace(/\r?\n/g, " "), {
        x: 117.38,
        y: row1Y,
        size: 8.04,
        font: fontBold,
        color: RED_TEXT,
    });
    // REF N°
    page1.drawText("REF N°", {
        x: 438.94,
        y: row1Y,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    page1.drawText(data.reference, {
        x: 488.5,
        y: row1Y,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    const row2Y = 673.0;
    page1.drawText("Customer ID : ", {
        x: 53.16,
        y: row2Y,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    if (data.client.code) {
        page1.drawText(data.client.code, {
            x: 117.38,
            y: row2Y,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
    }
    // RFQ Client Number (right-aligned on Row 2)
    const d = data;
    const rfqRaw = data.clientRfqNumber ||
        data.rfqNumber ||
        d.client_rfq_number ||
        d.rfq;
    const rfqText = typeof rfqRaw === "string" && rfqRaw.trim() ? rfqRaw.trim() : null;
    if (rfqText) {
        const rfqW = fontRegular.widthOfTextAtSize(rfqText, 8.04);
        const rightMarginX = 538.56;
        const rfqX = rightMarginX - rfqW;
        page1.drawText(rfqText, {
            x: rfqX,
            y: row2Y,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
    }
    // ── 3. ITEMS TABLE DEFINITION ─────────────────────────────────────────────
    const headerTopY = 659.26;
    const headerBottomY = 648.34;
    const headerHeight = headerTopY - headerBottomY;
    // Background for Header
    page1.drawRectangle({
        x: MARGIN_LEFT,
        y: headerBottomY,
        width: CONTENT_WIDTH,
        height: headerHeight,
        color: BRIGHT_YELLOW,
    });
    // Header Titles
    const headers = [
        { title: "ITEM", col: "item", align: "center" },
        { title: "BRAND", col: "brand", align: "center" },
        { title: "QTY", col: "qty", align: "center" },
        { title: "U/M", col: "um", align: "center" },
        { title: "DESCRIPTIONS", col: "desc", align: "left" },
        { title: "Unit Price", col: "unitPrice", align: "right" },
        { title: "TOTAL", col: "total", align: "center" },
    ];
    for (const h of headers) {
        const colX = COL_X[h.col];
        const colW = COL_W[h.col];
        const textW = fontBold.widthOfTextAtSize(h.title, 8.04);
        let tx = colX + 2;
        if (h.align === "center") {
            tx = colX + (colW - textW) / 2;
        }
        else if (h.align === "right") {
            tx = colX + colW - textW - 3;
        }
        page1.drawText(h.title, {
            x: tx,
            y: 651.7,
            size: 8.04,
            font: fontBold,
            color: BLACK,
        });
    }
    // Page 1 table begins under header
    let currentPage = page1;
    let currentTableTopY = headerTopY;
    let currentY = headerBottomY;
    let currentRowBoundaries = [headerBottomY];
    const PAGE1_BOTTOM_LIMIT = 59.78;
    const PAGE_CONT_TOP_Y = 787.32;
    const TOTALS_SECTION_HEIGHT = 18 * 3 + 40;
    const BRAND_IMG_MAX_W = COL_W.brand - 6;
    const BRAND_IMG_MAX_H = 160.0;
    for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        const descLines = wrapText(line.description, fontRegular, 8.04, COL_W.desc - 4);
        const descLineCount = Math.max(1, descLines.length);
        const descHeight = descLineCount === 1
            ? 16.0
            : Math.max(16.0, (descLineCount - 1) * 9.84 + 14.8);
        const brandText = line.brand?.trim() ? line.brand.trim().toUpperCase() : null;
        const embeddedBrandImg = await embedQuotationBrandImage(doc, line);
        let drawImgW = 0;
        let drawImgH = 0;
        if (embeddedBrandImg && embeddedBrandImg.width > 0 && embeddedBrandImg.height > 0) {
            const scale = Math.min(BRAND_IMG_MAX_W / embeddedBrandImg.width, BRAND_IMG_MAX_H / embeddedBrandImg.height);
            drawImgW = embeddedBrandImg.width * scale;
            drawImgH = embeddedBrandImg.height * scale;
        }
        const BRAND_FONT_SIZE = 8.04;
        const BRAND_LINE_HEIGHT = 9.84;
        const brandLines = brandText
            ? wrapBrandText(brandText, fontBold, BRAND_FONT_SIZE, COL_W.brand - 8)
            : [];
        let brandVisualHeight = 16.0;
        if (embeddedBrandImg && brandLines.length > 0) {
            const totalBlockH = drawImgH + 5.0 + brandLines.length * BRAND_LINE_HEIGHT;
            brandVisualHeight = Math.max(16.0, totalBlockH + 7.0);
        }
        else if (embeddedBrandImg) {
            brandVisualHeight = Math.max(16.0, drawImgH + 9.0);
        }
        else if (brandLines.length > 0) {
            brandVisualHeight =
                brandLines.length === 1
                    ? 16.0
                    : Math.max(16.0, (brandLines.length - 1) * BRAND_LINE_HEIGHT + 16.0);
        }
        const rowHeight = Math.max(descHeight, brandVisualHeight);
        const isLastItem = i === data.lines.length - 1;
        const requiredBottomSpace = isLastItem
            ? PAGE1_BOTTOM_LIMIT + TOTALS_SECTION_HEIGHT
            : PAGE1_BOTTOM_LIMIT;
        if (currentY - rowHeight < requiredBottomSpace) {
            pageTables.push({
                page: currentPage,
                pageIndex: pages.indexOf(currentPage),
                startY: currentTableTopY,
                endY: currentY,
                rowBoundaries: [...currentRowBoundaries],
            });
            const newPageInfo = addNewPage();
            currentPage = newPageInfo.page;
            currentTableTopY = PAGE_CONT_TOP_Y;
            currentY = PAGE_CONT_TOP_Y;
            currentRowBoundaries = [];
        }
        const rowTop = currentY;
        const rowBottom = currentY - rowHeight;
        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: rowBottom,
            width: CONTENT_WIDTH - COL_W.total,
            height: rowHeight,
            color: WHITE,
        });
        currentPage.drawRectangle({
            x: COL_X.total,
            y: rowBottom,
            width: COL_W.total,
            height: rowHeight,
            color: PALE_YELLOW,
        });
        const textBaseY = rowBottom + 4.5;
        // Column 1: ITEM
        const itemStr = String(line.lineNumber);
        const itemW = fontRegular.widthOfTextAtSize(itemStr, 8.04);
        currentPage.drawText(itemStr, {
            x: COL_X.item + (COL_W.item - itemW) / 2,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
        // Column 2: BRAND
        if (embeddedBrandImg && brandLines.length > 0) {
            const brandTopY = textBaseY + (brandLines.length - 1) * BRAND_LINE_HEIGHT + 7.5;
            const spaceAboveBrand = Math.max(0, (rowTop - 3.0) - brandTopY);
            const imgY = brandTopY + Math.max(2.0, (spaceAboveBrand - drawImgH) / 2);
            const imgX = COL_X.brand + (COL_W.brand - drawImgW) / 2;
            currentPage.drawImage(embeddedBrandImg, {
                x: imgX,
                y: imgY,
                width: drawImgW,
                height: drawImgH,
            });
            brandLines.forEach((bl, idx) => {
                const blW = fontBold.widthOfTextAtSize(bl, BRAND_FONT_SIZE);
                const blX = COL_X.brand + (COL_W.brand - blW) / 2;
                const lineY = textBaseY + (brandLines.length - 1 - idx) * BRAND_LINE_HEIGHT;
                currentPage.drawText(bl, {
                    x: blX,
                    y: lineY,
                    size: BRAND_FONT_SIZE,
                    font: fontBold,
                    color: RED_TEXT,
                });
            });
        }
        else if (embeddedBrandImg) {
            const imgX = COL_X.brand + (COL_W.brand - drawImgW) / 2;
            const imgY = rowBottom + (rowHeight - drawImgH) / 2;
            currentPage.drawImage(embeddedBrandImg, {
                x: imgX,
                y: imgY,
                width: drawImgW,
                height: drawImgH,
            });
        }
        else if (brandLines.length > 0) {
            brandLines.forEach((bl, idx) => {
                const blW = fontBold.widthOfTextAtSize(bl, BRAND_FONT_SIZE);
                const blX = COL_X.brand + (COL_W.brand - blW) / 2;
                const lineY = textBaseY + (brandLines.length - 1 - idx) * BRAND_LINE_HEIGHT;
                currentPage.drawText(bl, {
                    x: blX,
                    y: lineY,
                    size: BRAND_FONT_SIZE,
                    font: fontBold,
                    color: RED_TEXT,
                });
            });
        }
        // Column 3: QTY
        const qtyStr = (0, number_format_1.formatQuantity)(line.quantity, 0, 2);
        const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 8.04);
        currentPage.drawText(qtyStr, {
            x: COL_X.qty + (COL_W.qty - qtyW) / 2,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
        // Column 4: U/M
        const umStr = line.unit || "EA";
        const umW = fontRegular.widthOfTextAtSize(umStr, 8.04);
        currentPage.drawText(umStr, {
            x: COL_X.um + (COL_W.um - umW) / 2,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
        // Column 5: DESCRIPTIONS
        for (let idx = 0; idx < descLines.length; idx++) {
            const dl = descLines[idx];
            const lineY = textBaseY + (descLines.length - 1 - idx) * 9.84;
            currentPage.drawText(dl, {
                x: COL_X.desc + 2,
                y: lineY,
                size: 8.04,
                font: fontRegular,
                color: BLACK,
            });
        }
        // Column 6: Unit Price
        const upStr = formatCurrency(line.unitPrice);
        const upW = fontRegular.widthOfTextAtSize(upStr, 8.04);
        currentPage.drawText(upStr, {
            x: COL_X.unitPrice + COL_W.unitPrice - upW - 3,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
        // Column 7: TOTAL
        const totStr = formatCurrency(line.lineSubtotal);
        const totW = fontRegular.widthOfTextAtSize(totStr, 8.04);
        currentPage.drawText(totStr, {
            x: COL_X.total + COL_W.total - totW - 3,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: BLACK,
        });
        currentY = rowBottom;
        currentRowBoundaries.push(currentY);
    }
    pageTables.push({
        page: currentPage,
        pageIndex: pages.indexOf(currentPage),
        startY: currentTableTopY,
        endY: currentY,
        rowBoundaries: [...currentRowBoundaries],
    });
    // ── 4. DRAW CRISP TABLE BORDERS FOR ALL PAGES ─────────────────────────────
    for (const pt of pageTables) {
        const { page, startY, endY, rowBoundaries } = pt;
        page.drawRectangle({
            x: MARGIN_LEFT,
            y: startY - BORDER_WIDTH,
            width: CONTENT_WIDTH,
            height: BORDER_WIDTH,
            color: BLACK,
        });
        for (const bY of rowBoundaries) {
            page.drawRectangle({
                x: MARGIN_LEFT,
                y: bY,
                width: CONTENT_WIDTH,
                height: BORDER_WIDTH,
                color: BLACK,
            });
        }
        const vHeight = startY - endY;
        const vLinesX = [
            COL_X.item,
            COL_X.brand,
            COL_X.qty,
            COL_X.um,
            COL_X.desc,
            COL_X.unitPrice,
            COL_X.total,
            RIGHT_EDGE - BORDER_WIDTH,
        ];
        for (const vx of vLinesX) {
            page.drawRectangle({
                x: vx,
                y: endY,
                width: BORDER_WIDTH,
                height: vHeight,
                color: BLACK,
            });
        }
    }
    // ── 5. TOTALS SECTION (BELOW TABLE ON FINAL PAGE) ──────────────────────────
    const totRowH = 18.0;
    const totX = COL_X.total;
    const totW = COL_W.total;
    const totalsBottom = currentY - totRowH * 3;
    // Row 1: Sub Total
    const subY = currentY - totRowH;
    currentPage.drawRectangle({
        x: totX,
        y: subY,
        width: totW,
        height: totRowH,
        color: PALE_YELLOW,
    });
    const subLabel = "Sub Total";
    const subLabelW = fontRegular.widthOfTextAtSize(subLabel, 8.04);
    currentPage.drawText(subLabel, {
        x: totX - subLabelW - 4,
        y: subY + 5.2,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    const subValStr = formatCurrency(data.subtotal);
    const subValW = fontRegular.widthOfTextAtSize(subValStr, 8.04);
    currentPage.drawText(subValStr, {
        x: totX + totW - subValW - 3,
        y: subY + 5.2,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    // Row 2: VAT
    const vatY = subY - totRowH;
    currentPage.drawRectangle({
        x: totX,
        y: vatY,
        width: totW,
        height: totRowH,
        color: SOFT_BLUE,
    });
    const vatLabel = `VAT ${data.vatRate}%`;
    const vatLabelW = fontRegular.widthOfTextAtSize(vatLabel, 8.04);
    currentPage.drawText(vatLabel, {
        x: totX - vatLabelW - 4,
        y: vatY + 5.2,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
    });
    const vatValStr = formatCurrency(data.vatAmount);
    const vatValW = fontBold.widthOfTextAtSize(vatValStr, 8.04);
    currentPage.drawText(vatValStr, {
        x: totX + totW - vatValW - 3,
        y: vatY + 5.2,
        size: 8.04,
        font: fontBold,
        color: BLACK,
    });
    // Row 3: GRAND TOTAL
    const grandY = vatY - totRowH;
    currentPage.drawRectangle({
        x: totX,
        y: grandY,
        width: totW,
        height: totRowH,
        color: BRIGHT_YELLOW,
    });
    const grandLabel = "GRAND TOTAL";
    const grandLabelW = fontBold.widthOfTextAtSize(grandLabel, 8.04);
    currentPage.drawText(grandLabel, {
        x: totX - grandLabelW - 4,
        y: grandY + 5.2,
        size: 8.04,
        font: fontBold,
        color: BLACK,
    });
    const grandValStr = formatCurrency(data.total);
    const grandValW = fontBold.widthOfTextAtSize(grandValStr, 8.04);
    currentPage.drawText(grandValStr, {
        x: totX + totW - grandValW - 3,
        y: grandY + 5.2,
        size: 8.04,
        font: fontBold,
        color: BLACK,
    });
    // Grid borders around the totals value cells
    currentPage.drawRectangle({
        x: totX,
        y: subY,
        width: totW,
        height: BORDER_WIDTH,
        color: BLACK,
    });
    currentPage.drawRectangle({
        x: totX,
        y: vatY,
        width: totW,
        height: BORDER_WIDTH,
        color: BLACK,
    });
    currentPage.drawRectangle({
        x: totX,
        y: grandY,
        width: totW,
        height: BORDER_WIDTH,
        color: BLACK,
    });
    currentPage.drawRectangle({
        x: totX,
        y: grandY,
        width: BORDER_WIDTH,
        height: totRowH * 3,
        color: BLACK,
    });
    currentPage.drawRectangle({
        x: RIGHT_EDGE - BORDER_WIDTH,
        y: grandY,
        width: BORDER_WIDTH,
        height: totRowH * 3,
        color: BLACK,
    });
    // ── 6. DELIVERY TERMS (RED BOLD TEXT UNDER TOTALS) ─────────────────────────
    const leadTimeText = `LEAD TIMES : ${data.deliveryLeadTime || "EX-STOCK"}`;
    const leadTimeY = totalsBottom - 28.8;
    currentPage.drawText(leadTimeText, {
        x: 265,
        y: leadTimeY,
        size: 8.76,
        font: fontBold,
        color: RED_TEXT,
    });
    // ── 7. BANKING FOOTER (CONSISTENT ON EVERY PAGE) ───────────────────────────
    const bankText = data.company.bankInfo;
    const bankFontSize = 7.0;
    const bankW = fontRegular.widthOfTextAtSize(bankText, bankFontSize);
    const bankX = (PAGE_WIDTH - bankW) / 2;
    for (const p of pages) {
        p.drawText(bankText, {
            x: bankX,
            y: 40.8,
            size: bankFontSize,
            font: fontRegular,
            color: BLACK,
        });
    }
    return await doc.save();
}
