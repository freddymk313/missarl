// ============================================================================
// Professional Sales Invoice PDF Generator — MIS SARL
// Server-side PDF composition matching approved corporate visual identity.
// ============================================================================

import {
  PDFDocument,
  StandardFonts,
  PDFPage,
  PDFImage,
} from "pdf-lib";
import {
  BLACK,
  WHITE,
  BRIGHT_YELLOW,
  PALE_YELLOW,
  SOFT_BLUE,
  BORDER_WIDTH,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  RIGHT_EDGE,
  CONTENT_WIDTH,
  formatCurrency,
  formatDate,
  formatDateTime,
  wrapText,
  drawDocumentHeader,
  drawCustomerSection,
  drawSignaturesSection,
  drawBankingFooter,
} from "./mis-document-layout";
import type { InvoicePdfData } from "./invoice-data";

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
  item: MARGIN_LEFT,
  brand: MARGIN_LEFT + COL_W.item,
  qty: MARGIN_LEFT + COL_W.item + COL_W.brand,
  um: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty,
  desc: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um,
  unitPrice: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc,
  total: MARGIN_LEFT + COL_W.item + COL_W.brand + COL_W.qty + COL_W.um + COL_W.desc + COL_W.unitPrice,
};

export async function generateInvoicePdf(
  data: InvoicePdfData,
  logoBuffer?: Buffer | null,
  sealBuffer?: Buffer | null,
  signatureBuffer?: Buffer | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed images safely
  let logoImage: PDFImage | null = null;
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

  let sealImage: PDFImage | null = null;
  if (sealBuffer && sealBuffer.length > 0) {
    try {
      sealImage = await doc.embedPng(sealBuffer);
    } catch {
      sealImage = null;
    }
  }

  let signatureImage: PDFImage | null = null;
  if (signatureBuffer && signatureBuffer.length > 0) {
    try {
      signatureImage = await doc.embedPng(signatureBuffer);
    } catch {
      signatureImage = null;
    }
  }

  const pages: PDFPage[] = [];

  interface PageTableInfo {
    page: PDFPage;
    pageIndex: number;
    startY: number;
    endY: number;
    rowBoundaries: number[];
  }
  const pageTables: PageTableInfo[] = [];

  function addNewPage(): { page: PDFPage; pageIndex: number } {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    return { page, pageIndex: pages.length - 1 };
  }

  // 1. PAGE 1 INITIALIZATION
  const { page: page1 } = addNewPage();

  drawDocumentHeader(page1, {
    title: "FACTURE",
    dateText: formatDateTime(data.issueDate),
    logoImage,
    company: data.company,
    fontRegular,
    fontBold,
  });

  drawCustomerSection(page1, {
    clientName: data.client.name,
    clientCode: data.client.code,
    referenceLabel: "FACTURE N°",
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
    x: MARGIN_LEFT,
    y: headerBottomY,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: BRIGHT_YELLOW,
  });

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

  // 3. TABLE BODY ROWS & PAGINATION
  let currentPage = page1;
  let currentTableTopY = headerTopY;
  let currentY = headerBottomY;
  let currentRowBoundaries: number[] = [headerBottomY];

  const PAGE1_BOTTOM_LIMIT = 59.78;
  const PAGE_CONT_TOP_Y = 787.32;
  const TOTALS_AND_SIGS_HEIGHT = 18 * 3 + 115; // 3 rows of totals + signatures block

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];

    const descLines = wrapText(line.description, fontRegular, 8.04, COL_W.desc - 4);
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

    // Item Number
    const itemStr = String(line.lineNumber);
    const itemW = fontRegular.widthOfTextAtSize(itemStr, 8.04);
    currentPage.drawText(itemStr, {
      x: COL_X.item + (COL_W.item - itemW) / 2,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Brand
    if (line.brand) {
      const brandLines = wrapText(line.brand, fontRegular, 8.04, COL_W.brand - 4);
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

    // Qty
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

    // U/M
    const umStr = line.unit || "EA";
    const umW = fontRegular.widthOfTextAtSize(umStr, 8.04);
    currentPage.drawText(umStr, {
      x: COL_X.um + (COL_W.um - umW) / 2,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Descriptions
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

    // Unit Price
    const upStr = formatCurrency(line.unitPrice);
    const upW = fontRegular.widthOfTextAtSize(upStr, 8.04);
    currentPage.drawText(upStr, {
      x: COL_X.unitPrice + COL_W.unitPrice - upW - 3,
      y: textBaseY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    // Line Total
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

  // 4. DRAW CRISP TABLE BORDERS
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

  // TVA 16%
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

  // GRAND TOTAL
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

  // Totals Grid Borders
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

  // 6. SIGNATURES SECTION
  let sigY = grandY - 26;
  if (sigY < 135) {
    const { page: sigPage } = addNewPage();
    currentPage = sigPage;
    sigY = PAGE_CONT_TOP_Y - 20;
  }

  drawSignaturesSection(currentPage, {
    y: sigY,
    sealImage,
    signatureImage,
    fontRegular,
    fontBold,
  });

  // 7. BANKING FOOTER
  drawBankingFooter(pages, data.company.bankInfo, fontRegular);

  return await doc.save();
}
