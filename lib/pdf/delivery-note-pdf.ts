// ============================================================================
// Professional Delivery Note (Bon de Livraison) PDF Generator — MIS SARL
// Pixel-perfect document matching corporate visual identity.
// Contains NO financial or pricing figures.
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
  BORDER_WIDTH,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  RIGHT_EDGE,
  CONTENT_WIDTH,
  formatDate,
  wrapText,
  drawDocumentHeader,
  drawCustomerSection,
  drawSignaturesSection,
  drawBankingFooter,
} from "./mis-document-layout";
import type { DeliveryNotePdfData } from "./delivery-note-data";

// Table column widths for Delivery Note (total = 491.38 pt)
const COL_W = {
  item: 28.34,
  qty: 45.00,
  um: 45.00,
  desc: 250.00,
  obs: 123.04,
};

// Column X coordinates
const COL_X = {
  item: MARGIN_LEFT,
  qty: MARGIN_LEFT + COL_W.item,
  um: MARGIN_LEFT + COL_W.item + COL_W.qty,
  desc: MARGIN_LEFT + COL_W.item + COL_W.qty + COL_W.um,
  obs: MARGIN_LEFT + COL_W.item + COL_W.qty + COL_W.um + COL_W.desc,
};

export async function generateDeliveryNotePdf(
  data: DeliveryNotePdfData,
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
    title: "BON DE LIVRAISON",
    dateText: formatDate(data.deliveryDate),
    logoImage,
    company: data.company,
    fontRegular,
    fontBold,
  });

  drawCustomerSection(page1, {
    clientName: data.client.name,
    clientCode: data.client.code,
    referenceLabel: "BL N°",
    referenceValue: data.blNumber,
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
    { title: "QTY", col: "qty", align: "center" },
    { title: "U/M", col: "um", align: "center" },
    { title: "DESCRIPTIONS", col: "desc", align: "left" },
    { title: "OBSERVATION", col: "obs", align: "left" },
  ] as const;

  for (const h of headers) {
    const colX = COL_X[h.col];
    const colW = COL_W[h.col];
    const textW = fontBold.widthOfTextAtSize(h.title, 8.04);

    let tx = colX + 4;
    if (h.align === "center") {
      tx = colX + (colW - textW) / 2;
    }

    page1.drawText(h.title, {
      x: tx,
      y: 651.7,
      size: 8.04,
      font: fontBold,
      color: BLACK,
    });
  }

  // 3. TABLE ROWS & PAGINATION
  let currentPage = page1;
  let currentTableTopY = headerTopY;
  let currentY = headerBottomY;
  let currentRowBoundaries: number[] = [headerBottomY];

  const PAGE1_BOTTOM_LIMIT = 59.78;
  const PAGE_CONT_TOP_Y = 787.32;
  const SIGNATURES_REQUIRED_HEIGHT = 120; // height needed for signatures below table

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];

    const descLines = wrapText(line.description, fontRegular, 8.04, COL_W.desc - 6);
    const obsLines = wrapText(line.observation || "", fontRegular, 8.04, COL_W.obs - 6);
    const maxLineCount = Math.max(1, descLines.length, obsLines.length);
    const rowHeight = maxLineCount === 1 ? 16.0 : Math.max(16.0, (maxLineCount - 1) * 9.84 + 14.8);

    const isLastItem = i === data.lines.length - 1;
    const requiredBottomSpace = isLastItem
      ? PAGE1_BOTTOM_LIMIT + SIGNATURES_REQUIRED_HEIGHT
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

    // Background is white for all cells in BL
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: rowBottom,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: WHITE,
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

    // Qty Delivered
    const qtyStr = Number.isInteger(line.quantityDelivered)
      ? String(line.quantityDelivered)
      : line.quantityDelivered.toFixed(2).replace(".", ",");
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
        x: COL_X.desc + 4,
        y: dY,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
      });
      dY -= 9.84;
    }

    // Observation
    let oY = rowTop - 10.3;
    for (const ol of obsLines) {
      currentPage.drawText(ol, {
        x: COL_X.obs + 4,
        y: oY,
        size: 8.04,
        font: fontRegular,
        color: BLACK,
      });
      oY -= 9.84;
    }

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
      COL_X.qty,
      COL_X.um,
      COL_X.desc,
      COL_X.obs,
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

  // 5. CARRIER METADATA (IF PRESENT)
  let sigY = currentY - 26;
  if (data.carrierName || data.notes) {
    const metaParts = [];
    if (data.carrierName) metaParts.push(`Transporteur : ${data.carrierName}`);
    if (data.notes) metaParts.push(`Notes : ${data.notes}`);
    const metaStr = metaParts.join(" — ");
    currentPage.drawText(metaStr, {
      x: MARGIN_LEFT,
      y: currentY - 14,
      size: 7.32,
      font: fontRegular,
      color: BLACK,
    });
    sigY = currentY - 32;
  }

  // 6. SIGNATURES SECTION
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
    carrierInfo: {
      driverName: data.driverName,
      vehiclePlate: data.vehiclePlate,
      receiverName: data.receiverName,
    },
  });

  // 7. BANKING FOOTER
  drawBankingFooter(pages, data.company.bankInfo, fontRegular);

  return await doc.save();
}
