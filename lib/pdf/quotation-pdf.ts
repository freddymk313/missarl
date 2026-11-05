// ============================================================================
// Professional Quotation PDF Generator — MIS SARL
// Pixel-perfect reproduction of RFQ-KICO-14319 OQ quotation template.
// Server-side PDF composition using pdf-lib.
// ============================================================================

import {
  PDFDocument,
  StandardFonts,
  rgb,
  RGB,
  PDFFont,
  PDFPage,
} from "pdf-lib";
import { QuotationPdfData } from "./quotation-data";

// ── Colors matching the reference template ────────────────────────────────────
const BLACK: RGB = rgb(0, 0, 0);
const WHITE: RGB = rgb(1, 1, 1);
const BRIGHT_YELLOW: RGB = rgb(1, 0.949, 0); // #FFF200 - Table header & Grand Total
const PALE_YELLOW: RGB = rgb(1, 0.957, 0.827); // #FFF4D3 - TOTAL column tint
const RED_TEXT: RGB = rgb(0.82, 0.1, 0.1); // #D11A1A - Customer & Delivery in red
const TEXT_MUTED: RGB = rgb(0.35, 0.35, 0.35);

// ── Page Geometry (ISO A4: 595.28 x 841.89 points) ──────────────────────────
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 32;
const MARGIN_RIGHT = 32;
const MARGIN_BOTTOM = 30;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 531.28 pt

// Table column widths (total = 531 pt)
const COL_W = {
  item: 28, // N°
  brand: 115, // BRAND
  qty: 35, // QTY
  um: 35, // U/M
  desc: 180, // DESCRIPTIONS
  unitPrice: 65, // Unit Price
  total: 73, // TOTAL
};

function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split(".");
  const intWithSpaces = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${isNegative ? "-" : ""}$${intWithSpaces},${parts[1]}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "03/11/2026 09:43";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
  // Handle explicit newlines first
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

  // Helvetica standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

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
  let currentPage!: PDFPage;
  let currentY: number = 0;

  function addNewPage(): PDFPage {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    currentPage = page;
    currentY = PAGE_HEIGHT - 32;
    return page;
  }

  // Draw table header row in bright yellow with black borders
  function drawTableHeader(page: PDFPage, y: number): number {
    const headerHeight = 17;
    const headerY = y - headerHeight;

    const columns = [
      { key: "item", title: "ITEM", width: COL_W.item, align: "center" },
      { key: "brand", title: "BRAND", width: COL_W.brand, align: "center" },
      { key: "qty", title: "QTY", width: COL_W.qty, align: "center" },
      { key: "um", title: "U/M", width: COL_W.um, align: "center" },
      { key: "desc", title: "DESCRIPTIONS", width: COL_W.desc, align: "left" },
      { key: "unitPrice", title: "Unit Price", width: COL_W.unitPrice, align: "center" },
      { key: "total", title: "TOTAL", width: COL_W.total, align: "center" },
    ];

    let x = MARGIN_LEFT;
    for (const col of columns) {
      // Cell background: Bright Yellow
      page.drawRectangle({
        x,
        y: headerY,
        width: col.width,
        height: headerHeight,
        color: BRIGHT_YELLOW,
        borderColor: BLACK,
        borderWidth: 0.75,
      });

      // Text
      const text = col.title;
      const textW = fontBold.widthOfTextAtSize(text, 7.5);
      let textX = x + 3;
      if (col.align === "center") {
        textX = x + (col.width - textW) / 2;
      } else if (col.align === "right") {
        textX = x + col.width - textW - 3;
      }

      page.drawText(text, {
        x: textX,
        y: headerY + 5,
        size: 7.5,
        font: fontBold,
        color: BLACK,
      });

      x += col.width;
    }

    return headerY;
  }

  // Start Page 1
  addNewPage();

  // ── 1. HEADER SECTION (MATCHING RFQ-KICO-14319 OQ) ────────────────────────
  const headerTopY = currentY;

  // Logo on Left
  const logoW = 46;
  const logoH = 46;
  if (logoImage) {
    currentPage.drawImage(logoImage, {
      x: MARGIN_LEFT,
      y: headerTopY - logoH + 4,
      width: logoW,
      height: logoH,
    });
  }

  // Company Details Block
  const textStartX = MARGIN_LEFT + (logoImage ? logoW + 8 : 0);
  let cY = headerTopY;

  currentPage.drawText(data.company.name, {
    x: textStartX,
    y: cY,
    size: 9.5,
    font: fontBold,
    color: BLACK,
  });
  cY -= 10.5;

  const companyLines = [
    "Commune et Ville de Lubumbashi, République",
    "Démocratique du Congo",
    `Télephone : ${data.company.phones.join(" / ")}`,
    `E-mail : ${data.company.email}`,
    `RCCM : ${data.company.rccm}`,
    `Impot N° : ${data.company.impotNumber || "A2609081A"}`,
  ];

  for (const line of companyLines) {
    currentPage.drawText(line, {
      x: textStartX,
      y: cY,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });
    cY -= 9.5;
  }

  // Top Right: Date
  const dateLabel = "Date";
  const dateValue = formatDate(data.documentDate);
  const rightEdge = MARGIN_LEFT + CONTENT_WIDTH;

  currentPage.drawText(dateLabel, {
    x: rightEdge - 150,
    y: headerTopY,
    size: 8,
    font: fontRegular,
    color: BLACK,
  });

  currentPage.drawText(dateValue, {
    x: rightEdge - 95,
    y: headerTopY,
    size: 8,
    font: fontRegular,
    color: BLACK,
  });

  // Top Right: Big "QUOTATION" Title
  const docTitle = data.docType === "PROFORMA" ? "PROFORMA" : "QUOTATION";
  const titleSize = 14;
  const titleW = fontBold.widthOfTextAtSize(docTitle, titleSize);
  currentPage.drawText(docTitle, {
    x: rightEdge - titleW,
    y: headerTopY - 48,
    size: titleSize,
    font: fontBold,
    color: BLACK,
  });

  // Solid Thick Black Horizontal Divider Line
  const dividerY = cY - 2;
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: dividerY },
    end: { x: rightEdge, y: dividerY },
    thickness: 2.0,
    color: BLACK,
  });

  // ── 2. CUSTOMER & REFERENCE SECTION ───────────────────────────────────────
  currentY = dividerY - 16;

  // Left side: Customer
  currentPage.drawText("Customer :", {
    x: MARGIN_LEFT,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: BLACK,
  });

  // Split customer name if needed into red lines
  const clientLines = data.client.name.split(/\r?\n| - | — /);
  let custNameY = currentY;
  for (const cl of clientLines) {
    currentPage.drawText(cl.trim(), {
      x: MARGIN_LEFT + 55,
      y: custNameY,
      size: 8.5,
      font: fontBold,
      color: RED_TEXT,
    });
    custNameY -= 11;
  }

  // Customer ID
  const custIdY = Math.min(currentY - 24, custNameY - 2);
  currentPage.drawText("Customer ID :", {
    x: MARGIN_LEFT,
    y: custIdY,
    size: 8.5,
    font: fontRegular,
    color: BLACK,
  });

  if (data.client.code) {
    currentPage.drawText(data.client.code, {
      x: MARGIN_LEFT + 65,
      y: custIdY,
      size: 8.5,
      font: fontRegular,
      color: BLACK,
    });
  }

  // Right side: REF N°
  currentPage.drawText("REF N°", {
    x: rightEdge - 150,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: BLACK,
  });

  currentPage.drawText(data.reference, {
    x: rightEdge - 95,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: BLACK,
  });

  // RFQ Client Number (right-aligned right above table)
  if (data.clientRfqNumber) {
    const rfqW = fontRegular.widthOfTextAtSize(data.clientRfqNumber, 8.5);
    currentPage.drawText(data.clientRfqNumber, {
      x: rightEdge - rfqW,
      y: custIdY,
      size: 8.5,
      font: fontRegular,
      color: BLACK,
    });
  }

  currentY = custIdY - 12;

  // ── 3. ITEMS TABLE ────────────────────────────────────────────────────────
  currentY = drawTableHeader(currentPage, currentY);

  const bottomThreshold = MARGIN_BOTTOM + 115; // Space for totals and footer

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];

    // Wrap description text
    const descLines = wrapText(
      line.description,
      fontRegular,
      7,
      COL_W.desc - 8
    );

    // Compute dynamic row height
    const baseLineCount = Math.max(descLines.length, 1);
    const rowHeight = Math.max(16, baseLineCount * 9 + 7);

    // Page break check
    if (currentY - rowHeight < bottomThreshold) {
      addNewPage();
      currentY = drawTableHeader(currentPage, currentY);
    }

    const rowY = currentY - rowHeight;

    // Draw all cells with explicit black borders
    let x = MARGIN_LEFT;

    // 1. ITEM
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.item,
      height: rowHeight,
      color: WHITE,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    const itemStr = String(line.lineNumber);
    const itemW = fontRegular.widthOfTextAtSize(itemStr, 7.5);
    currentPage.drawText(itemStr, {
      x: x + (COL_W.item - itemW) / 2,
      y: rowY + (rowHeight - 7.5) / 2,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });
    x += COL_W.item;

    // 2. BRAND
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.brand,
      height: rowHeight,
      color: WHITE,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    if (line.brand) {
      const brandLines = wrapText(line.brand, fontRegular, 7, COL_W.brand - 6);
      let bY = rowY + rowHeight - 9;
      for (const bl of brandLines) {
        currentPage.drawText(bl, {
          x: x + 4,
          y: bY,
          size: 7,
          font: fontRegular,
          color: BLACK,
        });
        bY -= 8.5;
      }
    }
    x += COL_W.brand;

    // 3. QTY
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.qty,
      height: rowHeight,
      color: WHITE,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    const qtyStr = Number.isInteger(line.quantity)
      ? String(line.quantity)
      : line.quantity.toFixed(2).replace(".", ",");
    const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 7.5);
    currentPage.drawText(qtyStr, {
      x: x + (COL_W.qty - qtyW) / 2,
      y: rowY + (rowHeight - 7.5) / 2,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });
    x += COL_W.qty;

    // 4. U/M
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.um,
      height: rowHeight,
      color: WHITE,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    const umStr = line.unit || "EA";
    const umW = fontRegular.widthOfTextAtSize(umStr, 7.5);
    currentPage.drawText(umStr, {
      x: x + (COL_W.um - umW) / 2,
      y: rowY + (rowHeight - 7.5) / 2,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });
    x += COL_W.um;

    // 5. DESCRIPTIONS
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.desc,
      height: rowHeight,
      color: WHITE,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    let dY = rowY + rowHeight - 9;
    for (const dl of descLines) {
      currentPage.drawText(dl, {
        x: x + 4,
        y: dY,
        size: 7,
        font: fontRegular,
        color: BLACK,
      });
      dY -= 8.5;
    }
    x += COL_W.desc;

    // 6. Unit Price
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.unitPrice,
      height: rowHeight,
      color: WHITE,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    const upStr = formatCurrency(line.unitPrice);
    const upW = fontRegular.widthOfTextAtSize(upStr, 7.5);
    currentPage.drawText(upStr, {
      x: x + COL_W.unitPrice - upW - 4,
      y: rowY + (rowHeight - 7.5) / 2,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });
    x += COL_W.unitPrice;

    // 7. TOTAL (PALE YELLOW BACKGROUND TINT)
    currentPage.drawRectangle({
      x,
      y: rowY,
      width: COL_W.total,
      height: rowHeight,
      color: PALE_YELLOW,
      borderColor: BLACK,
      borderWidth: 0.75,
    });
    const totStr = formatCurrency(line.lineSubtotal);
    const totW = fontRegular.widthOfTextAtSize(totStr, 7.5);
    currentPage.drawText(totStr, {
      x: x + COL_W.total - totW - 4,
      y: rowY + (rowHeight - 7.5) / 2,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });

    currentY = rowY;
  }

  // ── 4. TOTALS SECTION (UNDER UNIT PRICE & TOTAL COLUMNS) ───────────────────
  const totalsBoxX = MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc; // 425 pt
  const totalsLabelW = COL_W.unitPrice; // 65 pt
  const totalsValW = COL_W.total; // 73 pt
  const totRowH = 14;

  // Check if we need a new page for totals & footers
  if (currentY - 80 < MARGIN_BOTTOM + 20) {
    addNewPage();
    currentY = PAGE_HEIGHT - 32;
  }

  // 1. Sub Total Row
  let tY = currentY - totRowH;
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: tY,
    width: totalsLabelW,
    height: totRowH,
    color: WHITE,
    borderColor: BLACK,
    borderWidth: 0.75,
  });
  const subLabel = "Sub Total";
  const subLabelW = fontRegular.widthOfTextAtSize(subLabel, 7.5);
  currentPage.drawText(subLabel, {
    x: totalsBoxX + totalsLabelW - subLabelW - 4,
    y: tY + 4,
    size: 7.5,
    font: fontRegular,
    color: BLACK,
  });

  currentPage.drawRectangle({
    x: totalsBoxX + totalsLabelW,
    y: tY,
    width: totalsValW,
    height: totRowH,
    color: PALE_YELLOW,
    borderColor: BLACK,
    borderWidth: 0.75,
  });
  const subValStr = formatCurrency(data.subtotal);
  const subValW = fontRegular.widthOfTextAtSize(subValStr, 7.5);
  currentPage.drawText(subValStr, {
    x: totalsBoxX + totalsLabelW + totalsValW - subValW - 4,
    y: tY + 4,
    size: 7.5,
    font: fontRegular,
    color: BLACK,
  });

  // 2. TVA Row
  tY -= totRowH;
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: tY,
    width: totalsLabelW,
    height: totRowH,
    color: WHITE,
    borderColor: BLACK,
    borderWidth: 0.75,
  });
  const vatLabel = `TVA ${data.vatRate}%`;
  const vatLabelW = fontRegular.widthOfTextAtSize(vatLabel, 7.5);
  currentPage.drawText(vatLabel, {
    x: totalsBoxX + totalsLabelW - vatLabelW - 4,
    y: tY + 4,
    size: 7.5,
    font: fontRegular,
    color: BLACK,
  });

  currentPage.drawRectangle({
    x: totalsBoxX + totalsLabelW,
    y: tY,
    width: totalsValW,
    height: totRowH,
    color: PALE_YELLOW,
    borderColor: BLACK,
    borderWidth: 0.75,
  });
  const vatValStr = formatCurrency(data.vatAmount);
  const vatValW = fontRegular.widthOfTextAtSize(vatValStr, 7.5);
  currentPage.drawText(vatValStr, {
    x: totalsBoxX + totalsLabelW + totalsValW - vatValW - 4,
    y: tY + 4,
    size: 7.5,
    font: fontRegular,
    color: BLACK,
  });

  // 3. GRAND TOTAL Row (BRIGHT YELLOW BOTH CELLS)
  tY -= totRowH;
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: tY,
    width: totalsLabelW,
    height: totRowH,
    color: BRIGHT_YELLOW,
    borderColor: BLACK,
    borderWidth: 0.75,
  });
  const grandLabel = "GRAND TOTAL";
  const grandLabelW = fontBold.widthOfTextAtSize(grandLabel, 7.5);
  currentPage.drawText(grandLabel, {
    x: totalsBoxX + totalsLabelW - grandLabelW - 4,
    y: tY + 4,
    size: 7.5,
    font: fontBold,
    color: BLACK,
  });

  currentPage.drawRectangle({
    x: totalsBoxX + totalsLabelW,
    y: tY,
    width: totalsValW,
    height: totRowH,
    color: BRIGHT_YELLOW,
    borderColor: BLACK,
    borderWidth: 0.75,
  });
  const grandValStr = formatCurrency(data.total);
  const grandValW = fontBold.widthOfTextAtSize(grandValStr, 7.5);
  currentPage.drawText(grandValStr, {
    x: totalsBoxX + totalsLabelW + totalsValW - grandValW - 4,
    y: tY + 4,
    size: 7.5,
    font: fontBold,
    color: BLACK,
  });

  // ── 5. DELIVERY TERMS (CENTERED RED TEXT) ──────────────────────────────────
  const leadTimeText = `Délais de livraison : ${data.deliveryLeadTime || "EX-STOCK"}`;
  const leadTimeW = fontBold.widthOfTextAtSize(leadTimeText, 8.5);
  const leadTimeY = tY - 32;

  currentPage.drawText(leadTimeText, {
    x: (PAGE_WIDTH - leadTimeW) / 2,
    y: leadTimeY,
    size: 8.5,
    font: fontBold,
    color: RED_TEXT,
  });

  // ── 6. BANKING FOOTER AT BOTTOM OF ALL PAGES ──────────────────────────────
  const bankText = data.company.bankInfo;
  const bankW = fontRegular.widthOfTextAtSize(bankText, 6.5);

  for (const page of pages) {
    page.drawText(bankText, {
      x: (PAGE_WIDTH - bankW) / 2,
      y: 18,
      size: 6.5,
      font: fontRegular,
      color: BLACK,
    });
  }

  return await doc.save();
}
