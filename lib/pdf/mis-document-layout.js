"use strict";
// ============================================================================
// MIS SARL Document PDF Layout & Visual Identity
// Standardized ISO A4 dimensions, colors, typographic hierarchy,
// header, customer box, signatures block, and banking footer.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMPANY_WEBSITE = exports.CONTENT_WIDTH = exports.RIGHT_EDGE = exports.MARGIN_LEFT = exports.PAGE_HEIGHT = exports.PAGE_WIDTH = exports.BORDER_WIDTH = exports.LIGHT_GRAY = exports.RED_TEXT = exports.SOFT_BLUE = exports.PALE_YELLOW = exports.BRIGHT_YELLOW = exports.WHITE = exports.BLACK = void 0;
exports.resolveCompanyWebsite = resolveCompanyWebsite;
exports.getDefaultCompanyInfo = getDefaultCompanyInfo;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.wrapText = wrapText;
exports.drawDocumentHeader = drawDocumentHeader;
exports.drawCustomerSection = drawCustomerSection;
exports.drawSignaturesSection = drawSignaturesSection;
exports.drawBankingFooter = drawBankingFooter;
const pdf_lib_1 = require("pdf-lib");
const site_1 = require("@/app/config/site");
const number_format_1 = require("@/lib/number-format");
// ── Colors matching MIS SARL approved visual identity ────────────────────────
exports.BLACK = (0, pdf_lib_1.rgb)(0, 0, 0);
exports.WHITE = (0, pdf_lib_1.rgb)(1, 1, 1);
exports.BRIGHT_YELLOW = (0, pdf_lib_1.rgb)(1, 1, 0); // #FFFF00 - Table Header & Grand Total
exports.PALE_YELLOW = (0, pdf_lib_1.rgb)(1, 0.949, 0.8); // #FFF2CC - TOTAL column & Sub Total
exports.SOFT_BLUE = (0, pdf_lib_1.rgb)(0.608, 0.761, 0.902); // #9BC2E6 - TVA cell
exports.RED_TEXT = (0, pdf_lib_1.rgb)(1, 0, 0); // #FF0000 - Customer & Delivery terms
exports.LIGHT_GRAY = (0, pdf_lib_1.rgb)(0.92, 0.92, 0.92);
exports.BORDER_WIDTH = 0.6; // Matches exact 0.6 pt line width from reference PDF
// ── Page Geometry (ISO A4: 595.32 x 841.92 points) ──────────────────────────
exports.PAGE_WIDTH = 595.32;
exports.PAGE_HEIGHT = 841.92;
exports.MARGIN_LEFT = 51.48;
exports.RIGHT_EDGE = 542.86;
exports.CONTENT_WIDTH = exports.RIGHT_EDGE - exports.MARGIN_LEFT; // 491.38 pt
exports.DEFAULT_COMPANY_WEBSITE = "https://missarl.vercel.app/";
function resolveCompanyWebsite(company) {
    const raw = company?.website;
    return typeof raw === "string" && raw.trim()
        ? raw.trim()
        : exports.DEFAULT_COMPANY_WEBSITE;
}
function getDefaultCompanyInfo() {
    return {
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
        website: exports.DEFAULT_COMPANY_WEBSITE,
        bankInfo: "BANK name : FIRST BANK RDC SA | SWIFT code : BICDCDKI | RIB: 00014 - 25000 – 2032105587015 | Branch : LUBUMBASHI/R.D.Congo",
    };
}
/**
 * Currency formatter using MIS SARL US convention:
 * e.g. "$ 1,500.00", "$ 25,070.94", "-$ 214.64".
 */
function formatCurrency(amount) {
    return (0, number_format_1.formatUSD)(amount);
}
/**
 * Date formatter matching MIS SARL reference:
 * DD/MM/YYYY
 */
function formatDate(dateStr) {
    if (!dateStr)
        return new Date().toLocaleDateString("fr-FR");
    const trimmed = dateStr.trim();
    // Check if it already starts with DD/MM/YYYY (with optional time after)
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (ddmmyyyyMatch) {
        const day = ddmmyyyyMatch[1].padStart(2, "0");
        const month = ddmmyyyyMatch[2].padStart(2, "0");
        const year = ddmmyyyyMatch[3];
        return `${day}/${month}/${year}`;
    }
    // Check ISO format YYYY-MM-DD (with optional time after)
    const yyyymmddMatch = trimmed.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (yyyymmddMatch) {
        const year = yyyymmddMatch[1];
        const month = yyyymmddMatch[2].padStart(2, "0");
        const day = yyyymmddMatch[3].padStart(2, "0");
        return `${day}/${month}/${year}`;
    }
    try {
        const d = new Date(trimmed);
        if (isNaN(d.getTime()))
            return trimmed.split(" ")[0] || trimmed;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    catch {
        return trimmed.split(" ")[0] || trimmed;
    }
}
/**
 * Date & Time formatter:
 * DD/MM/YYYY HH:mm:ss
 */
function formatDateTime(dateStr) {
    if (!dateStr)
        return new Date().toLocaleDateString("fr-FR");
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return formatDate(dateStr);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        const secs = String(d.getSeconds()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
    }
    catch {
        return formatDate(dateStr);
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
 * Draws the standard MIS SARL Corporate Header on Page 1.
 */
function drawDocumentHeader(page, options) {
    const company = options.company || getDefaultCompanyInfo();
    const { fontRegular, fontBold, title, dateText, logoImage } = options;
    // 1. Logo
    const logoW = 60.24;
    const logoH = 53.42;
    const logoX = exports.MARGIN_LEFT;
    const logoY = 738.0;
    if (logoImage) {
        page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoW,
            height: logoH,
        });
    }
    // 2. Company Details
    const companyX = 117.26;
    const websiteUrl = resolveCompanyWebsite(company);
    page.drawText(company.name, {
        x: companyX + 0.48,
        y: 781.5,
        size: 10.5,
        font: fontBold,
        color: exports.BLACK,
    });
    const addressLine = company.address ||
        "Town and City of Lubumbashi, Democratic Republic of the Congo";
    page.drawText(addressLine, {
        x: companyX,
        y: 771.6,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(`Phone : ${company.phones.join(" / ")}`, {
        x: companyX,
        y: 762.4,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(`E-mail : ${company.email}`, {
        x: companyX,
        y: 753.2,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(`RCCM : ${company.rccm}`, {
        x: companyX,
        y: 744.0,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(`NIF N° : ${company.impotNumber || "A2609081A"}`, {
        x: companyX,
        y: 734.8,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(`Website : ${websiteUrl}`, {
        x: companyX,
        y: 725.6,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    // 3. Top Right: Date (clean DD/MM/YYYY, right-aligned to RIGHT_EDGE without time or overflow)
    const cleanDate = formatDate(dateText);
    const dateW = fontRegular.widthOfTextAtSize(cleanDate, 8.04);
    const dateValX = exports.RIGHT_EDGE - dateW;
    const dateLabel = "Date:";
    const dateLabelW = fontRegular.widthOfTextAtSize(dateLabel, 8.04);
    const dateLabelX = dateValX - dateLabelW - 8.0;
    page.drawText(dateLabel, {
        x: dateLabelX,
        y: 775.92,
        size: 8.04,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(cleanDate, {
        x: dateValX,
        y: 775.92,
        size: 8.04,
        font: fontRegular,
        color: exports.BLACK,
    });
    // 4. Top Right: Document Title
    const titleW = fontBold.widthOfTextAtSize(title, 10.08);
    const offsetLeft = 36.5; // 👈 Augmente cette valeur pour aller plus à gauche (ex: 10 à 30)
    const titleX = Math.max(390, exports.RIGHT_EDGE - titleW - offsetLeft);
    page.drawText(title, {
        x: titleX,
        y: 744.7,
        size: 10.08,
        font: fontBold,
        color: exports.BLACK,
    });
    // 5. Divider Line below Header
    page.drawRectangle({
        x: exports.MARGIN_LEFT,
        y: 713.86,
        width: exports.CONTENT_WIDTH,
        height: 1.32,
        color: exports.BLACK,
    });
}
/**
 * Draws the Customer and Reference Section on Page 1.
 */
function drawCustomerSection(page, options) {
    const { clientName, clientCode, referenceLabel, referenceValue, clientPoNumber, clientRfqNumber, fontRegular, fontBold, } = options;
    // Row 1 (y = 696.8)
    page.drawText("Customer  : ", {
        x: 53.16,
        y: 696.94,
        size: 8.04,
        font: fontRegular,
        color: exports.BLACK,
    });
    // Customer Name in Bold Red
    page.drawText(clientName.replace(/\r?\n/g, " "), {
        x: 117.38,
        y: 696.7,
        size: 8.04,
        font: fontBold,
        color: exports.RED_TEXT,
    });
    // Reference label & value (calés proprement à droite sans éloignement ni chevauchement)
    const refValW = fontRegular.widthOfTextAtSize(referenceValue, 8.04);
    const refValX = exports.RIGHT_EDGE - refValW;
    const refLabelW = fontRegular.widthOfTextAtSize(referenceLabel, 8.04);
    const refLabelX = Math.max(380, refValX - refLabelW - 10);
    page.drawText(referenceLabel, {
        x: refLabelX,
        y: 697.18,
        size: 8.04,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText(referenceValue, {
        x: refValX,
        y: 697.18,
        size: 8.04,
        font: fontRegular,
        color: exports.BLACK,
    });
    // Row 2 (y = 676.3)
    page.drawText("Customer ID : ", {
        x: 53.16,
        y: 676.3,
        size: 8.04,
        font: fontRegular,
        color: exports.BLACK,
    });
    if (clientCode) {
        page.drawText(clientCode, {
            x: 117.38,
            y: 676.3,
            size: 8.04,
            font: fontRegular,
            color: exports.BLACK,
        });
    }
    // Row 2 Right: PO and/or RFQ Number (guaranteed never exceeding right margin)
    const rightParts = [];
    if (clientPoNumber && clientPoNumber.trim()) {
        rightParts.push(`PO N° : ${clientPoNumber.trim()}`);
    }
    if (clientRfqNumber && clientRfqNumber.trim()) {
        rightParts.push(`RFQ : ${clientRfqNumber.trim()}`);
    }
    if (rightParts.length > 0) {
        const rightStr = rightParts.join(" | ");
        let fontSize = 8.04;
        let rightW = fontRegular.widthOfTextAtSize(rightStr, fontSize);
        const maxAvailableWidth = exports.RIGHT_EDGE - 210; // ~332 pt available on the right of Customer ID
        // Dynamically scale down font if text is unusually long
        if (rightW > maxAvailableWidth) {
            fontSize = Math.max(6.5, (maxAvailableWidth / rightW) * fontSize);
            rightW = fontRegular.widthOfTextAtSize(rightStr, fontSize);
        }
        const rightX = exports.RIGHT_EDGE - rightW;
        page.drawText(rightStr, {
            x: rightX,
            y: 676.3,
            size: fontSize,
            font: fontRegular,
            color: exports.BLACK,
        });
    }
}
/**
 * Draws the Double Signatures Section (Reception & Livraison with Seal and Signature).
 */
function drawSignaturesSection(page, options) {
    const { y, sealImage, signatureImage, fontRegular, fontBold, carrierInfo } = options;
    const sectionHeight = 85.0;
    const colWidth = 230.0;
    const leftX = exports.MARGIN_LEFT;
    const rightX = exports.RIGHT_EDGE - colWidth;
    // 1. Left: RECEIPT (centered title above box)
    const recTitle = "SIGNATURE FOR RECEIPT";
    const recTitleW = fontBold.widthOfTextAtSize(recTitle, 8.04);
    const recTitleX = leftX + (colWidth - recTitleW) / 2;
    page.drawText(recTitle, {
        x: recTitleX,
        y: y,
        size: 8.04,
        font: fontBold,
        color: exports.BLACK,
    });
    // Border rectangle for reception signature area
    page.drawRectangle({
        x: leftX,
        y: y - sectionHeight,
        width: colWidth,
        height: sectionHeight - 12,
        borderWidth: exports.BORDER_WIDTH,
        borderColor: exports.BLACK,
        color: exports.WHITE,
    });
    const recName = carrierInfo?.receiverName ? `Name : ${carrierInfo.receiverName}` : "Name : ......................................................";
    page.drawText(recName, {
        x: leftX + 8,
        y: y - 24,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText("Date : ......... / ......... / 20......", {
        x: leftX + 8,
        y: y - 38,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    page.drawText("Signature & Stamp :", {
        x: leftX + 8,
        y: y - 52,
        size: 7.32,
        font: fontRegular,
        color: exports.BLACK,
    });
    // 2. Right: DELIVERY (centered title above box)
    const livTitle = "SIGNATURE FOR DELIVERY";
    const livTitleW = fontBold.widthOfTextAtSize(livTitle, 8.04);
    const livTitleX = rightX + (colWidth - livTitleW) / 2;
    page.drawText(livTitle, {
        x: livTitleX,
        y: y,
        size: 8.04,
        font: fontBold,
        color: exports.BLACK,
    });
    // Border rectangle for delivery signature area
    page.drawRectangle({
        x: rightX,
        y: y - sectionHeight,
        width: colWidth,
        height: sectionHeight - 12,
        borderWidth: exports.BORDER_WIDTH,
        borderColor: exports.BLACK,
        color: exports.WHITE,
    });
    if (carrierInfo?.driverName || carrierInfo?.vehiclePlate) {
        const drv = carrierInfo.driverName ? `Driver : ${carrierInfo.driverName}` : "";
        const plt = carrierInfo.vehiclePlate ? `Plate : ${carrierInfo.vehiclePlate}` : "";
        const drvLine = [drv, plt].filter(Boolean).join(" | ");
        page.drawText(drvLine, {
            x: rightX + 8,
            y: y - 24,
            size: 7.0,
            font: fontRegular,
            color: exports.BLACK,
        });
    }
    // Stamp and Signature inside right box
    // Seal: ~62x62 pt, Signature: ~75x40 pt
    const stampBoxY = y - sectionHeight + 5;
    if (sealImage) {
        const sealW = 68.0;
        const sealH = 68.0;
        page.drawImage(sealImage, {
            x: rightX + colWidth - sealW - 38,
            y: stampBoxY - 3,
            width: sealW,
            height: sealH,
        });
    }
    if (signatureImage) {
        const sigW = 88.0;
        const sigH = 48.0;
        page.drawImage(signatureImage, {
            x: rightX + 38,
            y: stampBoxY + 12,
            width: sigW,
            height: sigH,
        });
    }
    page.drawText("For Marc Ingineering Service SARL", {
        x: rightX + 12,
        y: y - sectionHeight + 3,
        size: 6.8,
        font: fontBold,
        color: exports.BLACK,
    });
}
/**
 * Draws Banking Footer on every page.
 */
function drawBankingFooter(pages, bankText, fontRegular) {
    const bankFontSize = 7.0;
    const bankW = fontRegular.widthOfTextAtSize(bankText, bankFontSize);
    const bankX = Math.max(exports.MARGIN_LEFT, (exports.PAGE_WIDTH - bankW) / 2);
    for (const p of pages) {
        p.drawText(bankText, {
            x: bankX,
            y: 40.8,
            size: bankFontSize,
            font: fontRegular,
            color: exports.BLACK,
        });
    }
}
