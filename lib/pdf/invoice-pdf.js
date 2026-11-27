"use strict";
// ============================================================================
// Professional Sales Invoice PDF Generator — MIS SARL
// Server-side PDF composition matching approved corporate visual identity.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const pdf_lib_1 = require("pdf-lib");
const number_format_1 = require("@/lib/number-format");
const mis_document_layout_1 = require("./mis-document-layout");
// Table column widths (total = 491.38 pt)
const COL_W = {
    item: 28.34,
    brand: 129.75,
    qty: 36.48,
    um: 35.64,
    desc: 155.33,
    unitPrice: 49.56,
    total: 56.28,
};
// Column X coordinates
const COL_X = {
    item: mis_document_layout_1.MARGIN_LEFT,
    brand: mis_document_layout_1.MARGIN_LEFT + COL_W.item,
    qty: mis_document_layout_1.MARGIN_LEFT + COL_W.item + COL_W.brand,
    um: mis_document_layout_1.MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty,
    desc: mis_document_layout_1.MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um,
    unitPrice: mis_document_layout_1.MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc,
    total: mis_document_layout_1.MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc + COL_W.unitPrice,
};
async function generateInvoicePdf(data, logoBuffer, sealBuffer, signatureBuffer) {
    const doc = await pdf_lib_1.PDFDocument.create();
    const fontRegular = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    // Embed images safely
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
    let sealImage = null;
    if (sealBuffer && sealBuffer.length > 0) {
        try {
            sealImage = await doc.embedPng(sealBuffer);
        }
        catch {
            sealImage = null;
        }
    }
    let signatureImage = null;
    if (signatureBuffer && signatureBuffer.length > 0) {
        try {
            signatureImage = await doc.embedPng(signatureBuffer);
        }
        catch {
            signatureImage = null;
        }
    }
    const pages = [];
    const pageTables = [];
    function addNewPage() {
        const page = doc.addPage([mis_document_layout_1.PAGE_WIDTH, mis_document_layout_1.PAGE_HEIGHT]);
        pages.push(page);
        return { page, pageIndex: pages.length - 1 };
    }
    // 1. PAGE 1 INITIALIZATION
    const { page: page1 } = addNewPage();
    (0, mis_document_layout_1.drawDocumentHeader)(page1, {
        title: "INVOICE",
        dateText: (0, mis_document_layout_1.formatDate)(data.issueDate),
        logoImage,
        company: data.company,
        fontRegular,
        fontBold,
    });
    (0, mis_document_layout_1.drawCustomerSection)(page1, {
        clientName: data.client.name,
        clientCode: data.client.code,
        referenceLabel: "INV N°",
        referenceValue: data.invoiceNumber,
        clientPoNumber: data.clientPoNumber,
        clientRfqNumber: data.clientRfqNumber,
        fontRegular,
        fontBold,
    });
    // 2. ITEMS TABLE HEADER
    const headerTopY = 659.26;
    const headerBottomY = 648.34;
    const headerHeight = headerTopY - headerBottomY;
    page1.drawRectangle({
        x: mis_document_layout_1.MARGIN_LEFT,
        y: headerBottomY,
        width: mis_document_layout_1.CONTENT_WIDTH,
        height: headerHeight,
        color: mis_document_layout_1.BRIGHT_YELLOW,
    });
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
            color: mis_document_layout_1.BLACK,
        });
    }
    // 3. TABLE BODY ROWS & PAGINATION
    let currentPage = page1;
    let currentTableTopY = headerTopY;
    let currentY = headerBottomY;
    let currentRowBoundaries = [headerBottomY];
    const PAGE1_BOTTOM_LIMIT = 59.78;
    const PAGE_CONT_TOP_Y = 787.32;
    const TOTALS_AND_SIGS_HEIGHT = 18 * 3 + 115; // 3 rows of totals + signatures block
    for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        const descLines = (0, mis_document_layout_1.wrapText)(line.description, fontRegular, 8.04, COL_W.desc - 4);
        const lineCount = Math.max(1, descLines.length);
        const rowHeight = lineCount === 1 ? 16.0 : Math.max(16.0, (lineCount - 1) * 9.84 + 14.8);
        const isLastItem = i === data.lines.length - 1;
        const requiredBottomSpace = isLastItem
            ? PAGE1_BOTTOM_LIMIT + TOTALS_AND_SIGS_HEIGHT
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
        // Draw Cell Backgrounds
        currentPage.drawRectangle({
            x: mis_document_layout_1.MARGIN_LEFT,
            y: rowBottom,
            width: mis_document_layout_1.CONTENT_WIDTH - COL_W.total,
            height: rowHeight,
            color: mis_document_layout_1.WHITE,
        });
        currentPage.drawRectangle({
            x: COL_X.total,
            y: rowBottom,
            width: COL_W.total,
            height: rowHeight,
            color: mis_document_layout_1.PALE_YELLOW,
        });
        const textBaseY = rowBottom + 4.5;
        // Item Number
        const itemStr = String(line.lineNumber);
        const itemW = fontRegular.widthOfTextAtSize(itemStr, 8.04);
        currentPage.drawText(itemStr, {
            x: COL_X.item + (COL_W.item - itemW) / 2,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: mis_document_layout_1.BLACK,
        });
        // Brand
        if (line.brand) {
            const brandLines = (0, mis_document_layout_1.wrapText)(line.brand, fontRegular, 8.04, COL_W.brand - 4);
            let bY = rowTop - 10.3;
            for (const bl of brandLines) {
                currentPage.drawText(bl, {
                    x: COL_X.brand + 3,
                    y: bY,
                    size: 8.04,
                    font: fontRegular,
                    color: mis_document_layout_1.BLACK,
                });
                bY -= 9.84;
            }
        }
        // Qty
        const qtyStr = (0, number_format_1.formatQuantity)(line.quantity, 0, 2);
        const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 8.04);
        currentPage.drawText(qtyStr, {
            x: COL_X.qty + (COL_W.qty - qtyW) / 2,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: mis_document_layout_1.BLACK,
        });
        // U/M
        const umStr = line.unit || "EA";
        const umW = fontRegular.widthOfTextAtSize(umStr, 8.04);
        currentPage.drawText(umStr, {
            x: COL_X.um + (COL_W.um - umW) / 2,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: mis_document_layout_1.BLACK,
        });
        // Descriptions
        let dY = rowTop - 10.3;
        for (const dl of descLines) {
            currentPage.drawText(dl, {
                x: COL_X.desc + 2,
                y: dY,
                size: 8.04,
                font: fontRegular,
                color: mis_document_layout_1.BLACK,
            });
            dY -= 9.84;
        }
        // Unit Price
        const upStr = (0, mis_document_layout_1.formatCurrency)(line.unitPrice);
        const upW = fontRegular.widthOfTextAtSize(upStr, 8.04);
        currentPage.drawText(upStr, {
            x: COL_X.unitPrice + COL_W.unitPrice - upW - 3,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: mis_document_layout_1.BLACK,
        });
        // Line Total
        const totStr = (0, mis_document_layout_1.formatCurrency)(line.lineSubtotal);
        const totW = fontRegular.widthOfTextAtSize(totStr, 8.04);
        currentPage.drawText(totStr, {
            x: COL_X.total + COL_W.total - totW - 3,
            y: textBaseY,
            size: 8.04,
            font: fontRegular,
            color: mis_document_layout_1.BLACK,
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
    // 4. DRAW CRISP TABLE BORDERS
    for (const pt of pageTables) {
        const { page, startY, endY, rowBoundaries } = pt;
        page.drawRectangle({
            x: mis_document_layout_1.MARGIN_LEFT,
            y: startY - mis_document_layout_1.BORDER_WIDTH,
            width: mis_document_layout_1.CONTENT_WIDTH,
            height: mis_document_layout_1.BORDER_WIDTH,
            color: mis_document_layout_1.BLACK,
        });
        for (const bY of rowBoundaries) {
            page.drawRectangle({
                x: mis_document_layout_1.MARGIN_LEFT,
                y: bY,
                width: mis_document_layout_1.CONTENT_WIDTH,
                height: mis_document_layout_1.BORDER_WIDTH,
                color: mis_document_layout_1.BLACK,
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
            mis_document_layout_1.RIGHT_EDGE - mis_document_layout_1.BORDER_WIDTH,
        ];
        for (const vx of vLinesX) {
            page.drawRectangle({
                x: vx,
                y: endY,
                width: mis_document_layout_1.BORDER_WIDTH,
                height: vHeight,
                color: mis_document_layout_1.BLACK,
            });
        }
    }
    // 5. TOTALS SECTION
    const totRowH = 18.0;
    const totX = COL_X.total;
    const totW = COL_W.total;
    // Sub Total
    const subY = currentY - totRowH;
    currentPage.drawRectangle({
        x: totX,
        y: subY,
        width: totW,
        height: totRowH,
        color: mis_document_layout_1.PALE_YELLOW,
    });
    const subLabel = "Sub Total";
    const subLabelW = fontRegular.widthOfTextAtSize(subLabel, 8.04);
    currentPage.drawText(subLabel, {
        x: totX - subLabelW - 4,
        y: subY + 5.2,
        size: 8.04,
        font: fontRegular,
        color: mis_document_layout_1.BLACK,
    });
    const subValStr = (0, mis_document_layout_1.formatCurrency)(data.subtotal);
    const subValW = fontRegular.widthOfTextAtSize(subValStr, 8.04);
    currentPage.drawText(subValStr, {
        x: totX + totW - subValW - 3,
        y: subY + 5.2,
        size: 8.04,
        font: fontRegular,
        color: mis_document_layout_1.BLACK,
    });
    // VAT
    const vatY = subY - totRowH;
    currentPage.drawRectangle({
        x: totX,
        y: vatY,
        width: totW,
        height: totRowH,
        color: mis_document_layout_1.SOFT_BLUE,
    });
    const vatLabel = `VAT ${data.vatRate}%`;
    const vatLabelW = fontRegular.widthOfTextAtSize(vatLabel, 8.04);
    currentPage.drawText(vatLabel, {
        x: totX - vatLabelW - 4,
        y: vatY + 5.2,
        size: 8.04,
        font: fontRegular,
        color: mis_document_layout_1.BLACK,
    });
    const vatValStr = (0, mis_document_layout_1.formatCurrency)(data.vatAmount);
    const vatValW = fontBold.widthOfTextAtSize(vatValStr, 8.04);
    currentPage.drawText(vatValStr, {
        x: totX + totW - vatValW - 3,
        y: vatY + 5.2,
        size: 8.04,
        font: fontBold,
        color: mis_document_layout_1.BLACK,
    });
    // GRAND TOTAL
    const grandY = vatY - totRowH;
    currentPage.drawRectangle({
        x: totX,
        y: grandY,
        width: totW,
        height: totRowH,
        color: mis_document_layout_1.BRIGHT_YELLOW,
    });
    const grandLabel = "GRAND TOTAL";
    const grandLabelW = fontBold.widthOfTextAtSize(grandLabel, 8.04);
    currentPage.drawText(grandLabel, {
        x: totX - grandLabelW - 4,
        y: grandY + 5.2,
        size: 8.04,
        font: fontBold,
        color: mis_document_layout_1.BLACK,
    });
    const grandValStr = (0, mis_document_layout_1.formatCurrency)(data.total);
    const grandValW = fontBold.widthOfTextAtSize(grandValStr, 8.04);
    currentPage.drawText(grandValStr, {
        x: totX + totW - grandValW - 3,
        y: grandY + 5.2,
        size: 8.04,
        font: fontBold,
        color: mis_document_layout_1.BLACK,
    });
    // Totals Grid Borders
    currentPage.drawRectangle({
        x: totX,
        y: subY,
        width: totW,
        height: mis_document_layout_1.BORDER_WIDTH,
        color: mis_document_layout_1.BLACK,
    });
    currentPage.drawRectangle({
        x: totX,
        y: vatY,
        width: totW,
        height: mis_document_layout_1.BORDER_WIDTH,
        color: mis_document_layout_1.BLACK,
    });
    currentPage.drawRectangle({
        x: totX,
        y: grandY,
        width: totW,
        height: mis_document_layout_1.BORDER_WIDTH,
        color: mis_document_layout_1.BLACK,
    });
    currentPage.drawRectangle({
        x: totX,
        y: grandY,
        width: mis_document_layout_1.BORDER_WIDTH,
        height: totRowH * 3,
        color: mis_document_layout_1.BLACK,
    });
    currentPage.drawRectangle({
        x: mis_document_layout_1.RIGHT_EDGE - mis_document_layout_1.BORDER_WIDTH,
        y: grandY,
        width: mis_document_layout_1.BORDER_WIDTH,
        height: totRowH * 3,
        color: mis_document_layout_1.BLACK,
    });
    // 6. SIGNATURES SECTION
    let sigY = grandY - 26;
    if (sigY < 135) {
        const { page: sigPage } = addNewPage();
        currentPage = sigPage;
        sigY = PAGE_CONT_TOP_Y - 20;
    }
    (0, mis_document_layout_1.drawSignaturesSection)(currentPage, {
        y: sigY,
        sealImage,
        signatureImage,
        fontRegular,
        fontBold,
    });
    // 7. BANKING FOOTER
    (0, mis_document_layout_1.drawBankingFooter)(pages, data.company.bankInfo, fontRegular);
    return await doc.save();
}
