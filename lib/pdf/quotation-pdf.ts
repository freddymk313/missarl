// ============================================================================
// Professional Quotation PDF Generator — MIS SARL
// Pixel-perfect reproduction of RFQ-KICO-14425 OQ reference template.
// Server-side PDF composition using pdf-lib.
// ============================================================================

import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFFont,
  PDFPage,
} from "pdf-lib";
import type { RGB } from "pdf-lib";
import type { QuotationPdfData } from "./quotation-data";

// ── Colors matching RFQ-KICO-14425 OQ exactly ─────────────────────────────────
const BLACK: RGB = rgb(0, 0, 0);
const WHITE: RGB = rgb(1, 1, 1);
const BRIGHT_YELLOW: RGB = rgb(1, 1, 0); // #FFFF00 - Pure yellow (Table Header & Grand Total)
const PALE_YELLOW: RGB = rgb(1, 0.949, 0.8); // #FFF2CC - Pale Yellow (TOTAL column & Sub Total)
const SOFT_BLUE: RGB = rgb(0.608, 0.761, 0.902); // #9BC2E6 - Soft Blue (TVA cell)
const RED_TEXT: RGB = rgb(1, 0, 0); // #FF0000 - Vibrant red for Customer & Delivery terms
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
  unitPrice:
    MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc,
  total:
    MARGIN_LEFT +
    COL_W.item +
    COL_W.brand +
    COL_W.qty +
    COL_W.um +
    COL_W.desc +
    COL_W.unitPrice,
};

/**
 * Currency formatter matching RFQ-KICO-14425 OQ:
 * Begins with $, no thousands space, comma for decimals (e.g. $61,25, $25070,94).
 */
function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split(".");
  return `${isNegative ? "-" : ""}$${parts[0]},${parts[1]}`;
}

/**
 * Date formatter matching RFQ-KICO-14425 OQ:
 * DD/MM/YYYY (e.g. 07/11/2026).
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "07/11/2026";
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
 * Wraps text into lines that do not exceed maxWidth points.
 */
function wrapText(
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

export async function generateQuotationPdf(
  data: QuotationPdfData,
  logoBuffer?: Buffer | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Helvetica standard fonts (Arial metric-compatible in PDF standards)
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed logo image if available
  let logoImage = null;
  if (logoBuffer && logoBuffer.length > 0) {
    try {
      logoImage = await doc.embedPng(logoBuffer);
    } catch {
      try {
        logoImage = await doc.embedJpg(logoBuffer);
      } catch {
        logoImage = null;
      }
    }
  }

  const pages: PDFPage[] = [];

  // Track page-level table bounds for rendering grid borders cleanly
  interface PageTableInfo {
    page: PDFPage;
    pageIndex: number;
    startY: number;
    endY: number;
    rowBoundaries: number[]; // Y coordinates of bottom of each row
  }
  const pageTables: PageTableInfo[] = [];

  function addNewPage(): { page: PDFPage; pageIndex: number } {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    const pageIndex = pages.length - 1;
    return { page, pageIndex };
  }

  // Start Page 1
  const { page: page1 } = addNewPage();

  // ── 1. HEADER SECTION (PAGE 1) ─────────────────────────────────────────────
  // Logo dimensions and position matching reference PDF (width 60.24, height 53.42 at x=51.48, y=734.74)
  const logoW = 60.24;
  const logoH = 53.42;
  const logoX = MARGIN_LEFT;
  const logoY = 734.74;

  if (logoImage) {
    page1.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  }

  // Company Details (X = 117.26)
  const companyX = 117.26;

  page1.drawText(data.company.name, {
    x: companyX + 0.48,
    y: 776.64,
    size: 10.5,
    font: fontBold,
    color: BLACK,
  });

  const addressLine =
    data.company.address ||
    "Commune et Ville de Lubumbashi, République Démocratique du Congo";
  page1.drawText(addressLine, {
    x: companyX,
    y: 765.84,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page1.drawText(`Télephone : ${data.company.phones.join(" / ")}`, {
    x: companyX,
    y: 755.5,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page1.drawText(`E-mail : ${data.company.email}`, {
    x: companyX,
    y: 745.66,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page1.drawText(`RCCM : ${data.company.rccm}`, {
    x: companyX,
    y: 735.58,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  page1.drawText(`Impot N° : ${data.company.impotNumber || "A2609081A"}`, {
    x: companyX,
    y: 724.9,
    size: 7.32,
    font: fontRegular,
    color: BLACK,
  });

  // Top Right: Date
  page1.drawText("Date:", {
    x: 465.94,
    y: 775.92,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  page1.drawText(formatDate(data.documentDate), {
    x: 501.34,
    y: 775.92,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  // Top Right: Document Title (QUOTATION / PROFORMA)
  const docTitle = data.docType === "PROFORMA" ? "PROFORMA" : "QUOTATION";
  page1.drawText(docTitle, {
    x: 439.18,
    y: 744.7,
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
  // Row 1 (y = 696.8)
  page1.drawText("Customer  : ", {
    x: 53.16,
    y: 696.94,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  // Customer Name in Red Bold
  page1.drawText(data.client.name.replace(/\r?\n/g, " "), {
    x: 117.38,
    y: 696.7,
    size: 8.04,
    font: fontBold,
    color: RED_TEXT,
  });

  // REF N°
  page1.drawText("REF N°", {
    x: 438.94,
    y: 697.18,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  page1.drawText(data.reference, {
    x: 488.5,
    y: 697.18,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  // Row 2 (y = 675.5)
  page1.drawText("Customer ID : ", {
    x: 53.16,
    y: 676.3,
    size: 8.04,
    font: fontRegular,
    color: BLACK,
  });

  if (data.client.code) {
    page1.drawText(data.client.code, {
      x: 117.38,
      y: 676.3,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });
  }

  // RFQ Client Number (right-aligned on Row 2, immediately below Customer / REF N° row)
  const d = data as unknown as Record<string, unknown>;
  const rfqRaw =
    data.clientRfqNumber ||
    data.rfqNumber ||
    d.client_rfq_number ||
    d.rfq;
  const rfqText =
    typeof rfqRaw === "string" && rfqRaw.trim() ? rfqRaw.trim() : null;

  if (rfqText) {
    const rfqW = fontRegular.widthOfTextAtSize(rfqText, 8.04);
    // Right-align with the reference number (matching x=460.30 in reference PDF)
    const rightMarginX = 538.56;
    const rfqX = rightMarginX - rfqW;
    page1.drawText(rfqText, {
      x: rfqX,
      y: 676.3,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });
  }

  // ── 3. ITEMS TABLE DEFINITION ─────────────────────────────────────────────
  // Header on Page 1:
  // Top: 659.26, Bottom: 648.34, Height: 10.92 pt
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
  ] as const;

  for (const h of headers) {
    const colX = COL_X[h.col];
    const colW = COL_W[h.col];
    const textW = fontBold.widthOfTextAtSize(h.title, 8.04);

    let tx = colX + 2;
    if (h.align === "center") {
      tx = colX + (colW - textW) / 2;
    } else if (h.align === "right") {
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
  let currentTableTopY = headerTopY; // includes header for page 1 borders
  let currentY = headerBottomY;
  let currentRowBoundaries: number[] = [headerBottomY]; // header bottom is first boundary

  const PAGE1_BOTTOM_LIMIT = 59.78;
  const PAGE_CONT_TOP_Y = 787.32;
  const TOTALS_SECTION_HEIGHT = 18 * 3 + 40; // 3 rows of 18 pt + delivery terms

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];

    // Description lines wrapped to column width with 4pt margin
    const descLines = wrapText(
      line.description,
      fontRegular,
      8.04,
      COL_W.desc - 4
    );

    // Exact row height calculation matching reference PDF:
    // 1 line = 16.0 pt, 2 lines = 24.6 pt, 3 lines = 34.5 pt, 4 lines = 41.3 pt
    const lineCount = Math.max(1, descLines.length);
    const rowHeight =
      lineCount === 1
        ? 16.0
        : Math.max(16.0, (lineCount - 1) * 9.84 + 14.8);

    // Check pagination requirement
    const isLastItem = i === data.lines.length - 1;
    const requiredBottomSpace = isLastItem
      ? PAGE1_BOTTOM_LIMIT + TOTALS_SECTION_HEIGHT
      : PAGE1_BOTTOM_LIMIT;

    if (currentY - rowHeight < requiredBottomSpace) {
      // Save current page table info for grid drawing
      pageTables.push({
        page: currentPage,
        pageIndex: pages.indexOf(currentPage),
        startY: currentTableTopY,
        endY: currentY,
        rowBoundaries: [...currentRowBoundaries],
      });

      // Advance to Next Page
      const newPageInfo = addNewPage();
      currentPage = newPageInfo.page;
      currentTableTopY = PAGE_CONT_TOP_Y;
      currentY = PAGE_CONT_TOP_Y;
      currentRowBoundaries = [];
    }

    const rowTop = currentY;
    const rowBottom = currentY - rowHeight;

    // 1. Draw Cell Backgrounds:
    // Columns 1-6 are white
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: rowBottom,
      width: CONTENT_WIDTH - COL_W.total,
      height: rowHeight,
      color: WHITE,
    });

    // Column 7 (TOTAL) has PALE_YELLOW background
    currentPage.drawRectangle({
      x: COL_X.total,
      y: rowBottom,
      width: COL_W.total,
      height: rowHeight,
      color: PALE_YELLOW,
    });

    // 2. Draw Cell Texts (font size 8.04):
    // Vertical alignment: aligned with bottom line of description
    const textBaseY = rowBottom + 4.5;

    // Column 1: ITEM (centered)
    const itemStr = String(line.lineNumber);
    const itemW = fontRegular.widthOfTextAtSize(itemStr, 8.04);
    currentPage.drawText(itemStr, {
      x: COL_X.item + (COL_W.item - itemW) / 2,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Column 2: BRAND (left-aligned)
    if (line.brand) {
      const brandLines = wrapText(
        line.brand,
        fontRegular,
        8.04,
        COL_W.brand - 4
      );
      let bY = rowTop - 10.3;
      for (const bl of brandLines) {
        currentPage.drawText(bl, {
          x: COL_X.brand + 3,
          y: bY,
          size: 8.04,
          font: fontRegular,
          color: BLACK,
        });
        bY -= 9.84;
      }
    }

    // Column 3: QTY (centered)
    const qtyStr = Number.isInteger(line.quantity)
      ? String(line.quantity)
      : line.quantity.toFixed(2).replace(".", ",");
    const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 8.04);
    currentPage.drawText(qtyStr, {
      x: COL_X.qty + (COL_W.qty - qtyW) / 2,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Column 4: U/M (centered)
    const umStr = line.unit || "EA";
    const umW = fontRegular.widthOfTextAtSize(umStr, 8.04);
    currentPage.drawText(umStr, {
      x: COL_X.um + (COL_W.um - umW) / 2,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Column 5: DESCRIPTIONS (top-aligned, line spacing 9.84 pt)
    let dY = rowTop - 10.3;
    for (const dl of descLines) {
      currentPage.drawText(dl, {
        x: COL_X.desc + 2,
        y: dY,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
      });
      dY -= 9.84;
    }

    // Column 6: Unit Price (right-aligned)
    const upStr = formatCurrency(line.unitPrice);
    const upW = fontRegular.widthOfTextAtSize(upStr, 8.04);
    currentPage.drawText(upStr, {
      x: COL_X.unitPrice + COL_W.unitPrice - upW - 3,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Column 7: TOTAL (right-aligned)
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

  // Push final page table info
  pageTables.push({
    page: currentPage,
    pageIndex: pages.indexOf(currentPage),
    startY: currentTableTopY,
    endY: currentY,
    rowBoundaries: [...currentRowBoundaries],
  });

  // ── 4. DRAW CRISP TABLE BORDERS FOR ALL PAGES ─────────────────────────────
  // Drawing full lines reproduces the exact 0.6 pt solid borders without overlaps
  for (const pt of pageTables) {
    const { page, startY, endY, rowBoundaries } = pt;

    // Top border of table
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: startY - BORDER_WIDTH,
      width: CONTENT_WIDTH,
      height: BORDER_WIDTH,
      color: BLACK,
    });

    // Horizontal borders for each row
    for (const bY of rowBoundaries) {
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: bY,
        width: CONTENT_WIDTH,
        height: BORDER_WIDTH,
        color: BLACK,
      });
    }

    // Vertical borders across the page table height
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
  // Matches exact layout from reference PDF:
  // - Sub Total: Pale Yellow value cell, unbordered label
  // - TVA: Soft Blue value cell, unbordered label
  // - GRAND TOTAL: Bright Yellow value cell, unbordered label
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

  // Row 2: TVA
  const vatY = subY - totRowH;
  currentPage.drawRectangle({
    x: totX,
    y: vatY,
    width: totW,
    height: totRowH,
    color: SOFT_BLUE,
  });
  const vatLabel = `TVA ${data.vatRate}%`;
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

  // Grid borders around the totals value cells:
  // Horizontal borders:
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
  // Vertical borders for the totals column:
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
  const leadTimeText = `Délais de livraison : ${data.deliveryLeadTime || "EX-STOCK"}`;
  const leadTimeY = totalsBottom - 28.8;
  currentPage.drawText(leadTimeText, {
    x: 330.67,
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
