// ============================================================================
// MIS SARL Document PDF Layout & Visual Identity
// Standardized ISO A4 dimensions, colors, typographic hierarchy,
// header, customer box, signatures block, and banking footer.
// ============================================================================

import {
  PDFPage,
  PDFFont,
  PDFImage,
  rgb,
} from "pdf-lib";
import type { RGB } from "pdf-lib";
import { siteConfig } from "@/app/config/site";

// ── Colors matching MIS SARL approved visual identity ────────────────────────
export const BLACK: RGB = rgb(0, 0, 0);
export const WHITE: RGB = rgb(1, 1, 1);
export const BRIGHT_YELLOW: RGB = rgb(1, 1, 0); // #FFFF00 - Table Header & Grand Total
export const PALE_YELLOW: RGB = rgb(1, 0.949, 0.8); // #FFF2CC - TOTAL column & Sub Total
export const SOFT_BLUE: RGB = rgb(0.608, 0.761, 0.902); // #9BC2E6 - TVA cell
export const RED_TEXT: RGB = rgb(1, 0, 0); // #FF0000 - Customer & Delivery terms
export const LIGHT_GRAY: RGB = rgb(0.92, 0.92, 0.92);
export const BORDER_WIDTH = 0.6; // Matches exact 0.6 pt line width from reference PDF

// ── Page Geometry (ISO A4: 595.32 x 841.92 points) ──────────────────────────
export const PAGE_WIDTH = 595.32;
export const PAGE_HEIGHT = 841.92;
export const MARGIN_LEFT = 51.48;
export const RIGHT_EDGE = 542.86;
export const CONTENT_WIDTH = RIGHT_EDGE - MARGIN_LEFT; // 491.38 pt

export interface CompanyInfo {
  name: string;
  rccm: string;
  impotNumber: string;
  address: string;
  city: string;
  country: string;
  phones: string[];
  email: string;
  bankInfo: string;
}

export function getDefaultCompanyInfo(): CompanyInfo {
  return {
    name: "MARC INGINEERING SERVICE SARL",
    rccm: siteConfig.legal.rccm || "CD/LSH/RCCM/26.B-00277",
    impotNumber: "A2609081A",
    address: `${siteConfig.address.line}, ${siteConfig.address.country}`,
    city: `${siteConfig.address.city}, ${siteConfig.address.region}`,
    country: siteConfig.address.country,
    phones: siteConfig.phones && siteConfig.phones.length > 0
      ? [...siteConfig.phones]
      : ["+243 992224458", "+243 900041696"],
    email: siteConfig.email || "messarl2023@gmail.com",
    bankInfo:
      "BANK name : FIRST BANK RDC SA | SWIFT code : BICDCDKI | RIB: 00014 - 25000 – 2032105587015 | Branch : LUBUMBASHI/R.D.Congo",
  };
}

/**
 * Currency formatter matching MIS SARL reference:
 * Begins with $, no thousands space, comma for decimals (e.g. $61,25, $25070,94).
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split(".");
  return `${isNegative ? "-" : ""}$${parts[0]},${parts[1]}`;
}

/**
 * Date formatter matching MIS SARL reference:
 * DD/MM/YYYY
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toLocaleDateString("fr-FR");
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Date & Time formatter:
 * DD/MM/YYYY HH:mm:ss
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toLocaleDateString("fr-FR");
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return formatDate(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const secs = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
  } catch {
    return formatDate(dateStr);
  }
}

/**
 * Wraps text into lines that do not exceed maxWidth points.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  if (!text) return [""];
  const rawParagraphs = text.split(/\r?\n/);
  const resultLines: string[] = [];

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
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = word;
        } else {
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
export function drawDocumentHeader(
  page: PDFPage,
  options: {
    title: string;
    dateText: string;
    logoImage?: PDFImage | null;
    company?: CompanyInfo;
    fontRegular: PDFFont;
    fontBold: PDFFont;
  }
) {
  const company = options.company || getDefaultCompanyInfo();
  const { fontRegular, fontBold, title, dateText, logoImage } = options;

  // 1. Logo
  const logoW = 60.24;
  const logoH = 53.42;
  const logoX = MARGIN_LEFT;
  const logoY = 734.74;

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

  page.drawText(company.name, {
    x: companyX + 0.48,
    y: 776.64,
    size: 10.5,
    font: fontBold,
    color: BLACK,
  });

  const addressLine =
    company.address ||
    "Commune et Ville de Lubumbashi, République Démocratique du Congo";
  page.drawText(addressLine, {
    x: companyX,
    y: 765.84,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText(`Télephone : ${company.phones.join(" / ")}`, {
    x: companyX,
    y: 755.5,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText(`E-mail : ${company.email}`, {
    x: companyX,
    y: 745.66,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText(`RCCM : ${company.rccm}`, {
    x: companyX,
    y: 735.58,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText(`Impot N° : ${company.impotNumber || "A2609081A"}`, {
    x: companyX,
    y: 724.9,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  // 3. Top Right: Date
  page.drawText("Date:", {
    x: 439.18,
    y: 775.92,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText(dateText, {
    x: 468.0,
    y: 775.92,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  // 4. Top Right: Document Title
  const titleW = fontBold.widthOfTextAtSize(title, 10.08);
  const titleX = Math.max(420, RIGHT_EDGE - titleW);
  page.drawText(title, {
    x: titleX,
    y: 744.7,
    size: 10.08,
    font: fontBold,
    color: BLACK,
  });

  // 5. Divider Line below Header
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: 713.86,
    width: CONTENT_WIDTH,
    height: 1.32,
    color: BLACK,
  });
}

/**
 * Draws the Customer and Reference Section on Page 1.
 */
export function drawCustomerSection(
  page: PDFPage,
  options: {
    clientName: string;
    clientCode?: string | null;
    referenceLabel: string; // e.g. "REF N°" or "FACTURE N°" or "BL N°"
    referenceValue: string;
    clientPoNumber?: string | null;
    clientRfqNumber?: string | null;
    fontRegular: PDFFont;
    fontBold: PDFFont;
  }
) {
  const {
    clientName,
    clientCode,
    referenceLabel,
    referenceValue,
    clientPoNumber,
    clientRfqNumber,
    fontRegular,
    fontBold,
  } = options;

  // Row 1 (y = 696.8)
  page.drawText("Customer  : ", {
    x: 53.16,
    y: 696.94,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  // Customer Name in Bold Red
  page.drawText(clientName.replace(/\r?\n/g, " "), {
    x: 117.38,
    y: 696.7,
    size: 8.04,
    font: fontBold,
    color: RED_TEXT,
  });

  // Reference label & value
  page.drawText(referenceLabel, {
    x: 420.0,
    y: 697.18,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText(referenceValue, {
    x: 480.0,
    y: 697.18,
    size: 8.04,
    font: fontBold,
    color: BLACK,
  });

  // Row 2 (y = 676.3)
  page.drawText("Customer ID : ", {
    x: 53.16,
    y: 676.3,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  if (clientCode) {
    page.drawText(clientCode, {
      x: 117.38,
      y: 676.3,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });
  }

  // Row 2 Right: PO and/or RFQ Number
  const rightParts: string[] = [];
  if (clientPoNumber && clientPoNumber.trim()) {
    rightParts.push(`PO N° : ${clientPoNumber.trim()}`);
  }
  if (clientRfqNumber && clientRfqNumber.trim()) {
    rightParts.push(`RFQ : ${clientRfqNumber.trim()}`);
  }

  if (rightParts.length > 0) {
    const rightStr = rightParts.join(" | ");
    const rightW = fontBold.widthOfTextAtSize(rightStr, 8.04);
    const rightX = RIGHT_EDGE - rightW;
    page.drawText(rightStr, {
      x: Math.max(300, rightX),
      y: 676.3,
      size: 8.04,
      font: fontBold,
      color: BLACK,
    });
  }
}

/**
 * Draws the Double Signatures Section (Reception & Livraison with Seal and Signature).
 */
export function drawSignaturesSection(
  page: PDFPage,
  options: {
    y: number; // Top Y position of the signatures section
    sealImage?: PDFImage | null;
    signatureImage?: PDFImage | null;
    fontRegular: PDFFont;
    fontBold: PDFFont;
    carrierInfo?: {
      driverName?: string | null;
      vehiclePlate?: string | null;
      receiverName?: string | null;
    };
  }
) {
  const { y, sealImage, signatureImage, fontRegular, fontBold, carrierInfo } = options;
  const sectionHeight = 85.0;
  const colWidth = 230.0;
  const leftX = MARGIN_LEFT;
  const rightX = RIGHT_EDGE - colWidth;

  // 1. Left: RECEPTION
  page.drawText("SIGNATURE POUR LA RECEPTION", {
    x: leftX,
    y: y,
    size: 8.04,
    font: fontBold,
    color: BLACK,
  });

  // Border rectangle for reception signature area
  page.drawRectangle({
    x: leftX,
    y: y - sectionHeight,
    width: colWidth,
    height: sectionHeight - 12,
    borderWidth: BORDER_WIDTH,
    borderColor: BLACK,
    color: WHITE,
  });

  const recName = carrierInfo?.receiverName ? `Nom : ${carrierInfo.receiverName}` : "Nom : ......................................................";
  page.drawText(recName, {
    x: leftX + 8,
    y: y - 24,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText("Date : ......... / ......... / 20......", {
    x: leftX + 8,
    y: y - 38,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page.drawText("Signature & Cachet :", {
    x: leftX + 8,
    y: y - 52,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  // 2. Right: LIVRAISON
  page.drawText("SIGNATURE POUR LA LIVRAISON", {
    x: rightX,
    y: y,
    size: 8.04,
    font: fontBold,
    color: BLACK,
  });

  // Border rectangle for delivery signature area
  page.drawRectangle({
    x: rightX,
    y: y - sectionHeight,
    width: colWidth,
    height: sectionHeight - 12,
    borderWidth: BORDER_WIDTH,
    borderColor: BLACK,
    color: WHITE,
  });

  if (carrierInfo?.driverName || carrierInfo?.vehiclePlate) {
    const drv = carrierInfo.driverName ? `Chauffeur : ${carrierInfo.driverName}` : "";
    const plt = carrierInfo.vehiclePlate ? `Plaque : ${carrierInfo.vehiclePlate}` : "";
    const drvLine = [drv, plt].filter(Boolean).join(" | ");
    page.drawText(drvLine, {
      x: rightX + 8,
      y: y - 24,
      size: 7.0,
      font: fontRegular,
      color: BLACK,
    });
  }

  // Stamp and Signature inside right box
  // Seal: ~62x62 pt, Signature: ~75x40 pt
  const stampBoxY = y - sectionHeight + 5;
  if (sealImage) {
    const sealW = 60.0;
    const sealH = 60.0;
    page.drawImage(sealImage, {
      x: rightX + colWidth - sealW - 12,
      y: stampBoxY + 4,
      width: sealW,
      height: sealH,
    });
  }

  if (signatureImage) {
    const sigW = 75.0;
    const sigH = 38.0;
    page.drawImage(signatureImage, {
      x: rightX + 24,
      y: stampBoxY + 12,
      width: sigW,
      height: sigH,
    });
  }

  page.drawText("Pour Marc Ingineering Service SARL", {
    x: rightX + 8,
    y: y - sectionHeight + 3,
    size: 6.8,
    font: fontBold,
    color: BLACK,
  });
}

/**
 * Draws Banking Footer on every page.
 */
export function drawBankingFooter(
  pages: PDFPage[],
  bankText: string,
  fontRegular: PDFFont
) {
  const bankFontSize = 7.0;
  const bankW = fontRegular.widthOfTextAtSize(bankText, bankFontSize);
  const bankX = Math.max(MARGIN_LEFT, (PAGE_WIDTH - bankW) / 2);

  for (const p of pages) {
    p.drawText(bankText, {
      x: bankX,
      y: 40.8,
      size: bankFontSize,
      font: fontRegular,
      color: BLACK,
    });
  }
}
