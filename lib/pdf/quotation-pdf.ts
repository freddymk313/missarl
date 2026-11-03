// ============================================================================
// Professional Quotation PDF Generator — MIS SARL
// Pure server-side PDF composition using pdf-lib.
// Multi-page, A4, company branding, precise typography & financial tables.
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

// ── Colors ───────────────────────────────────────────────────────────────────
const NAVY: RGB = rgb(0.102, 0.227, 0.42); // #1A3A6B - Primary brand
const GOLD: RGB = rgb(0.784, 0.663, 0.29); // #C8A94A - Gold accent
const TEXT_DARK: RGB = rgb(0.08, 0.08, 0.15); // Deep dark
const TEXT_MUTED: RGB = rgb(0.38, 0.43, 0.5); // Secondary label text
const TEXT_LIGHT: RGB = rgb(0.55, 0.6, 0.68); // Tertiary / hint text
const BORDER_COLOR: RGB = rgb(0.78, 0.83, 0.89); // Table and box border
const ROW_ALT_BG: RGB = rgb(0.965, 0.975, 0.99); // Soft alternating row
const WHITE: RGB = rgb(1, 1, 1);
const SOFT_BLUE_BG: RGB = rgb(0.92, 0.95, 0.99);

// ── Page Geometry (A4 in points: 1 pt = 1/72 inch) ──────────────────────────
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 36;
const MARGIN_RIGHT = 36;
const MARGIN_BOTTOM = 45;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 523.28 pt

// Table column widths (total = 523 pt)
const COL_W = {
  num: 25,
  desc: 258,
  unit: 35,
  qty: 45,
  price: 75,
  total: 85,
};

function formatNumber(amount: number): string {
  const parts = Math.abs(amount).toFixed(2).split(".");
  const intWithSpaces = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${intWithSpaces},${parts[1]}`;
}

function formatUSD(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "$ 0,00";
  const sign = amount < 0 ? "-" : "";
  return `${sign}$ ${formatNumber(amount)}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
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
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word exceeds width, force push
        lines.push(word);
        currentLine = "";
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export async function generateQuotationPdf(
  data: QuotationPdfData,
  logoBuffer?: Buffer | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Embed core Helvetica fonts
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

  const docTitle =
    data.docType === "PROFORMA" ? "FACTURE PROFORMA" : "DEVIS COMMERCIAL";

  // State tracker
  let currentPage!: PDFPage;
  let currentY: number = 0;
  const pages: PDFPage[] = [];

  function addNewPage(): PDFPage {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    currentPage = page;
    currentY = PAGE_HEIGHT - 36;
    return page;
  }

  // Draw table header
  function drawTableHeader(page: PDFPage, y: number): number {
    const headerHeight = 20;

    // Background bar
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: NAVY,
    });

    // Column titles
    let colX = MARGIN_LEFT;
    const titles = [
      { text: "N°", width: COL_W.num, align: "center" },
      { text: "DÉSIGNATION DE LA FOURNITURE", width: COL_W.desc, align: "left" },
      { text: "UNITÉ", width: COL_W.unit, align: "center" },
      { text: "QTÉ", width: COL_W.qty, align: "right" },
      { text: "P.U. HT (USD)", width: COL_W.price, align: "right" },
      { text: "TOTAL HT (USD)", width: COL_W.total, align: "right" },
    ];

    for (const col of titles) {
      const textWidth = fontBold.widthOfTextAtSize(col.text, 7.5);
      let textX = colX + 4;
      if (col.align === "center") {
        textX = colX + (col.width - textWidth) / 2;
      } else if (col.align === "right") {
        textX = colX + col.width - textWidth - 4;
      }

      page.drawText(col.text, {
        x: textX,
        y: y - 13,
        size: 7.5,
        font: fontBold,
        color: WHITE,
      });

      colX += col.width;
    }

    return y - headerHeight;
  }

  // Initial page
  addNewPage();

  // ── HEADER SECTION ────────────────────────────────────────────────────────
  const headerTopY = currentY;

  // 1. Logo
  if (logoImage) {
    const scaled = logoImage.scale(0.35);
    const logoW = Math.min(scaled.width, 100);
    const logoH = (scaled.height / scaled.width) * logoW;
    currentPage.drawImage(logoImage, {
      x: MARGIN_LEFT,
      y: headerTopY - logoH,
      width: logoW,
      height: logoH,
    });
  } else {
    currentPage.drawText(data.company.name, {
      x: MARGIN_LEFT,
      y: headerTopY - 14,
      size: 11,
      font: fontBold,
      color: NAVY,
    });
  }

  // 2. Company Details below / next to logo
  const companyInfoX = MARGIN_LEFT + (logoImage ? 110 : 0);
  let compY = headerTopY - 10;

  currentPage.drawText(data.company.name, {
    x: companyInfoX,
    y: compY,
    size: 9,
    font: fontBold,
    color: NAVY,
  });
  compY -= 11;

  const companyLines = [
    data.company.address,
    `${data.company.city} — ${data.company.country}`,
    `Tél : ${data.company.phones.join(" / ")}`,
    `Email : ${data.company.email}`,
    `RCCM : ${data.company.rccm}`,
  ];

  for (const cl of companyLines) {
    currentPage.drawText(cl, {
      x: companyInfoX,
      y: compY,
      size: 7,
      font: fontRegular,
      color: TEXT_MUTED,
    });
    compY -= 9;
  }

  // 3. Document Title & Big Reference (Right side)
  const titleBoxRight = MARGIN_LEFT + CONTENT_WIDTH;
  const titleWidth = fontBold.widthOfTextAtSize(docTitle, 18);
  currentPage.drawText(docTitle, {
    x: titleBoxRight - titleWidth,
    y: headerTopY - 16,
    size: 18,
    font: fontBold,
    color: NAVY,
  });

  // Reference Badge
  const refText = `RÉF : ${data.reference}`;
  const refWidth = fontBold.widthOfTextAtSize(refText, 9.5);
  const badgeW = refWidth + 16;
  const badgeH = 18;
  const badgeX = titleBoxRight - badgeW;
  const badgeY = headerTopY - 42;

  currentPage.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: NAVY,
  });

  currentPage.drawText(refText, {
    x: badgeX + 8,
    y: badgeY + 5,
    size: 9.5,
    font: fontBold,
    color: WHITE,
  });

  // Document status & currency
  const metaText = `Statut : ${data.status}   |   Devise : ${data.currency}`;
  const metaWidth = fontRegular.widthOfTextAtSize(metaText, 7.5);
  currentPage.drawText(metaText, {
    x: titleBoxRight - metaWidth,
    y: badgeY - 11,
    size: 7.5,
    font: fontRegular,
    color: TEXT_MUTED,
  });

  // Gold accent divider line
  const dividerY = Math.min(compY - 4, badgeY - 18);
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: dividerY },
    end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: dividerY },
    thickness: 1.5,
    color: GOLD,
  });

  currentY = dividerY - 10;

  // ── METADATA BOXES (Client & Document) ────────────────────────────────────
  const boxWidth = (CONTENT_WIDTH - 12) / 2;
  const boxHeight = 76;
  const boxY = currentY - boxHeight;

  // Box 1: Client Information
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 0.75,
  });

  // Box 1 Header
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: boxY + boxHeight - 16,
    width: boxWidth,
    height: 16,
    color: SOFT_BLUE_BG,
  });
  currentPage.drawText("CLIENT DESTINATAIRE", {
    x: MARGIN_LEFT + 8,
    y: boxY + boxHeight - 11,
    size: 7.5,
    font: fontBold,
    color: NAVY,
  });

  let clientY = boxY + boxHeight - 27;
  const clientNameLines = wrapText(data.client.name, fontBold, 8, boxWidth - 16);
  for (const line of clientNameLines) {
    currentPage.drawText(line, {
      x: MARGIN_LEFT + 8,
      y: clientY,
      size: 8,
      font: fontBold,
      color: TEXT_DARK,
    });
    clientY -= 10;
  }

  if (data.client.code) {
    currentPage.drawText(`Code : ${data.client.code}`, {
      x: MARGIN_LEFT + 8,
      y: clientY,
      size: 7,
      font: fontRegular,
      color: TEXT_MUTED,
    });
    clientY -= 9;
  }

  if (data.client.billingAddress) {
    const addrLines = wrapText(
      data.client.billingAddress,
      fontRegular,
      7,
      boxWidth - 16
    );
    for (const al of addrLines.slice(0, 2)) {
      currentPage.drawText(al, {
        x: MARGIN_LEFT + 8,
        y: clientY,
        size: 7,
        font: fontRegular,
        color: TEXT_MUTED,
      });
      clientY -= 9;
    }
  }

  // Box 2: Document Details
  const box2X = MARGIN_LEFT + boxWidth + 12;
  currentPage.drawRectangle({
    x: box2X,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 0.75,
  });

  currentPage.drawRectangle({
    x: box2X,
    y: boxY + boxHeight - 16,
    width: boxWidth,
    height: 16,
    color: SOFT_BLUE_BG,
  });
  currentPage.drawText("DÉTAILS DU DEVIS", {
    x: box2X + 8,
    y: boxY + boxHeight - 11,
    size: 7.5,
    font: fontBold,
    color: NAVY,
  });

  let docY = boxY + boxHeight - 27;
  const docFields = [
    { label: "Date d'émission :", val: formatDate(data.documentDate) },
    { label: "Date de validité :", val: formatDate(data.validityDate) },
    { label: "Réf. RFQ Client :", val: data.clientRfqNumber || "—" },
    { label: "Modalité de paiement :", val: data.paymentTerms || "30 jours fin de mois" },
  ];

  for (const f of docFields) {
    currentPage.drawText(f.label, {
      x: box2X + 8,
      y: docY,
      size: 7,
      font: fontBold,
      color: TEXT_MUTED,
    });
    const labelW = fontBold.widthOfTextAtSize(f.label, 7);
    currentPage.drawText(f.val, {
      x: box2X + 10 + labelW,
      y: docY,
      size: 7,
      font: fontRegular,
      color: TEXT_DARK,
    });
    docY -= 11;
  }

  currentY = boxY - 14;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  currentY = drawTableHeader(currentPage, currentY);

  const minRowH = 18;
  const bottomThreshold = MARGIN_BOTTOM + 120; // Space reserved for totals on last page

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];
    const isAlt = i % 2 !== 0;

    // Wrap item description
    const descLines = wrapText(
      line.description,
      fontRegular,
      7.5,
      COL_W.desc - 10
    );
    const rowHeight = Math.max(minRowH, descLines.length * 10 + 8);

    // Page break check
    if (currentY - rowHeight < bottomThreshold) {
      addNewPage();
      currentY = PAGE_HEIGHT - 36;
      currentY = drawTableHeader(currentPage, currentY);
    }

    const rowY = currentY - rowHeight;

    // Row background
    if (isAlt) {
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: rowY,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: ROW_ALT_BG,
      });
    }

    // Border line bottom
    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: rowY },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: rowY },
      thickness: 0.5,
      color: BORDER_COLOR,
    });

    let cellX = MARGIN_LEFT;

    // Col 1: N°
    const numStr = String(line.lineNumber);
    const numW = fontRegular.widthOfTextAtSize(numStr, 7.5);
    currentPage.drawText(numStr, {
      x: cellX + (COL_W.num - numW) / 2,
      y: rowY + rowHeight - 12,
      size: 7.5,
      font: fontRegular,
      color: TEXT_MUTED,
    });
    cellX += COL_W.num;

    // Col 2: Description
    let descY = rowY + rowHeight - 12;
    for (const dl of descLines) {
      currentPage.drawText(dl, {
        x: cellX + 4,
        y: descY,
        size: 7.5,
        font: fontRegular,
        color: TEXT_DARK,
      });
      descY -= 10;
    }

    if (line.discountPercent > 0) {
      currentPage.drawText(`(Remise accordée : ${line.discountPercent}%)`, {
        x: cellX + 4,
        y: descY,
        size: 6.5,
        font: fontOblique,
        color: GOLD,
      });
    }
    cellX += COL_W.desc;

    // Col 3: Unité
    const unitStr = line.unit || "Pce";
    const unitW = fontRegular.widthOfTextAtSize(unitStr, 7.5);
    currentPage.drawText(unitStr, {
      x: cellX + (COL_W.unit - unitW) / 2,
      y: rowY + rowHeight - 12,
      size: 7.5,
      font: fontRegular,
      color: TEXT_DARK,
    });
    cellX += COL_W.unit;

    // Col 4: Quantité
    const qtyStr = Number.isInteger(line.quantity)
      ? String(line.quantity)
      : line.quantity.toFixed(2).replace(".", ",");
    const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 7.5);
    currentPage.drawText(qtyStr, {
      x: cellX + COL_W.qty - qtyW - 4,
      y: rowY + rowHeight - 12,
      size: 7.5,
      font: fontBold,
      color: TEXT_DARK,
    });
    cellX += COL_W.qty;

    // Col 5: Prix Unitaire (Client price snapshot)
    const priceStr = formatUSD(line.unitPrice);
    const priceW = fontRegular.widthOfTextAtSize(priceStr, 7.5);
    currentPage.drawText(priceStr, {
      x: cellX + COL_W.price - priceW - 4,
      y: rowY + rowHeight - 12,
      size: 7.5,
      font: fontRegular,
      color: TEXT_DARK,
    });
    cellX += COL_W.price;

    // Col 6: Total Ligne HT
    const lineTotalStr = formatUSD(line.lineSubtotal);
    const totalW = fontBold.widthOfTextAtSize(lineTotalStr, 7.5);
    currentPage.drawText(lineTotalStr, {
      x: cellX + COL_W.total - totalW - 4,
      y: rowY + rowHeight - 12,
      size: 7.5,
      font: fontBold,
      color: NAVY,
    });

    currentY = rowY;
  }

  // ── FINANCIAL SUMMARY (TOTALS) ────────────────────────────────────────────
  // Check if enough space remains on page for totals, notes & signatures
  const summaryHeight = 160;
  if (currentY - summaryHeight < MARGIN_BOTTOM + 20) {
    addNewPage();
    currentY = PAGE_HEIGHT - 36;
  }

  currentY -= 12;

  const totalsBoxW = 210;
  const totalsBoxX = MARGIN_LEFT + CONTENT_WIDTH - totalsBoxW;
  const rowH = 17;

  // 1. Sous-total HT
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: currentY - rowH,
    width: totalsBoxW,
    height: rowH,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 0.5,
  });
  currentPage.drawText("SOUS-TOTAL BRUT HT :", {
    x: totalsBoxX + 8,
    y: currentY - 12,
    size: 7.5,
    font: fontBold,
    color: TEXT_MUTED,
  });
  const subtotalStr = formatUSD(data.subtotal);
  const subtotalW = fontBold.widthOfTextAtSize(subtotalStr, 7.5);
  currentPage.drawText(subtotalStr, {
    x: totalsBoxX + totalsBoxW - subtotalW - 8,
    y: currentY - 12,
    size: 7.5,
    font: fontBold,
    color: TEXT_DARK,
  });
  currentY -= rowH;

  // 2. TVA
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: currentY - rowH,
    width: totalsBoxW,
    height: rowH,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 0.5,
  });
  const vatLabel = `TVA COLLECTÉE (${data.vatRate}%) :`;
  currentPage.drawText(vatLabel, {
    x: totalsBoxX + 8,
    y: currentY - 12,
    size: 7.5,
    font: fontBold,
    color: TEXT_MUTED,
  });
  const vatStr = formatUSD(data.vatAmount);
  const vatW = fontBold.widthOfTextAtSize(vatStr, 7.5);
  currentPage.drawText(vatStr, {
    x: totalsBoxX + totalsBoxW - vatW - 8,
    y: currentY - 12,
    size: 7.5,
    font: fontBold,
    color: TEXT_DARK,
  });
  currentY -= rowH;

  // 3. TOTAL GÉNÉRAL TTC (Navy Highlight)
  const grandH = 22;
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: currentY - grandH,
    width: totalsBoxW,
    height: grandH,
    color: NAVY,
  });
  currentPage.drawText("TOTAL GÉNÉRAL TTC (USD) :", {
    x: totalsBoxX + 8,
    y: currentY - 15,
    size: 8.5,
    font: fontBold,
    color: WHITE,
  });
  const grandStr = formatUSD(data.total);
  const grandW = fontBold.widthOfTextAtSize(grandStr, 9.5);
  currentPage.drawText(grandStr, {
    x: totalsBoxX + totalsBoxW - grandW - 8,
    y: currentY - 15,
    size: 9.5,
    font: fontBold,
    color: GOLD,
  });
  currentY -= grandH;

  // ── COMMERCIAL TERMS & OBSERVATIONS ───────────────────────────────────────
  currentY -= 14;

  // Notes if present
  if (data.notes && data.notes.trim()) {
    const notesW = CONTENT_WIDTH;
    const noteLines = wrapText(data.notes, fontRegular, 7, notesW - 16);
    const notesBoxH = noteLines.length * 9 + 16;

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - notesBoxH,
      width: notesW,
      height: notesBoxH,
      color: SOFT_BLUE_BG,
      borderColor: BORDER_COLOR,
      borderWidth: 0.5,
    });

    currentPage.drawText("OBSERVATIONS & CONDITIONS PARTICULIÈRES :", {
      x: MARGIN_LEFT + 8,
      y: currentY - 10,
      size: 7,
      font: fontBold,
      color: NAVY,
    });

    let nY = currentY - 20;
    for (const nl of noteLines) {
      currentPage.drawText(nl, {
        x: MARGIN_LEFT + 8,
        y: nY,
        size: 7,
        font: fontRegular,
        color: TEXT_DARK,
      });
      nY -= 9;
    }

    currentY -= notesBoxH + 10;
  }

  // Terms Section (Paiement, Délai, Validité)
  const termsBoxW = (CONTENT_WIDTH - 16) / 3;
  const termsBoxH = 40;
  const termsY = currentY - termsBoxH;

  const termsBlocks = [
    {
      title: "CONDITIONS DE RÈGLEMENT",
      text: data.paymentTerms || "30 jours date de facture",
    },
    {
      title: "DÉLAI DE LIVRAISON",
      text: data.deliveryLeadTime || "Ex-stock / 2-3 semaines",
    },
    {
      title: "VALIDITÉ DE L'OFFRE",
      text: `Valable jusqu'au ${formatDate(data.validityDate)}`,
    },
  ];

  for (let t = 0; t < termsBlocks.length; t++) {
    const tb = termsBlocks[t];
    const tbX = MARGIN_LEFT + t * (termsBoxW + 8);

    currentPage.drawRectangle({
      x: tbX,
      y: termsY,
      width: termsBoxW,
      height: termsBoxH,
      color: WHITE,
      borderColor: BORDER_COLOR,
      borderWidth: 0.5,
    });

    currentPage.drawText(tb.title, {
      x: tbX + 6,
      y: termsY + termsBoxH - 11,
      size: 6.5,
      font: fontBold,
      color: NAVY,
    });

    const lines = wrapText(tb.text, fontRegular, 6.5, termsBoxW - 12);
    let lY = termsY + termsBoxH - 21;
    for (const l of lines.slice(0, 2)) {
      currentPage.drawText(l, {
        x: tbX + 6,
        y: lY,
        size: 6.5,
        font: fontRegular,
        color: TEXT_DARK,
      });
      lY -= 8.5;
    }
  }

  currentY = termsY - 14;

  // ── SIGNATURE & APPROVAL BLOCKS ───────────────────────────────────────────
  const sigBoxW = (CONTENT_WIDTH - 16) / 3;
  const sigBoxH = 50;
  const sigY = currentY - sigBoxH;

  const sigBlocks = [
    {
      header: "ÉTABLI PAR",
      detail: data.createdByName ? `Agent : ${data.createdByName}` : "MIS SARL Commercial",
    },
    {
      header: "CACHET & SIGNATURE MIS SARL",
      detail: "Direction Commerciale & Technique",
    },
    {
      header: "BON POUR ACCORD DU CLIENT",
      detail: "Date, signature & cachet de l'acheteur",
    },
  ];

  for (let s = 0; s < sigBlocks.length; s++) {
    const sb = sigBlocks[s];
    const sbX = MARGIN_LEFT + s * (sigBoxW + 8);

    currentPage.drawRectangle({
      x: sbX,
      y: sigY,
      width: sigBoxW,
      height: sigBoxH,
      color: WHITE,
      borderColor: BORDER_COLOR,
      borderWidth: 0.5,
    });

    currentPage.drawText(sb.header, {
      x: sbX + 6,
      y: sigY + sigBoxH - 11,
      size: 6.5,
      font: fontBold,
      color: NAVY,
    });

    currentPage.drawText(sb.detail, {
      x: sbX + 6,
      y: sigY + 8,
      size: 6,
      font: fontOblique,
      color: TEXT_LIGHT,
    });
  }

  // ── RUNNING FOOTER ON ALL PAGES ───────────────────────────────────────────
  const totalPages = pages.length;
  for (let p = 0; p < totalPages; p++) {
    const page = pages[p];
    const footerY = 22;

    page.drawLine({
      start: { x: MARGIN_LEFT, y: footerY + 12 },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: footerY + 12 },
      thickness: 0.5,
      color: BORDER_COLOR,
    });

    // Left: Company & RCCM
    page.drawText(`${data.company.name}  •  RCCM : ${data.company.rccm}`, {
      x: MARGIN_LEFT,
      y: footerY + 2,
      size: 6.5,
      font: fontRegular,
      color: TEXT_LIGHT,
    });

    // Center: Page X / Y
    const pageStr = `Page ${p + 1} / ${totalPages}`;
    const pageW = fontRegular.widthOfTextAtSize(pageStr, 6.5);
    page.drawText(pageStr, {
      x: (PAGE_WIDTH - pageW) / 2,
      y: footerY + 2,
      size: 6.5,
      font: fontRegular,
      color: TEXT_LIGHT,
    });

    // Right: Document reference
    const docRefStr = `Réf : ${data.reference}`;
    const docRefW = fontBold.widthOfTextAtSize(docRefStr, 6.5);
    page.drawText(docRefStr, {
      x: MARGIN_LEFT + CONTENT_WIDTH - docRefW,
      y: footerY + 2,
      size: 6.5,
      font: fontBold,
      color: NAVY,
    });
  }

  return await doc.save();
}
