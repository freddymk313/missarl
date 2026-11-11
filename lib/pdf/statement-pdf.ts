// ============================================================================
// Professional Unpaid Invoices Statement PDF Generator — MIS SARL
// Server-side PDF generation matching official corporate reference:
// "RELEVE DE COMPTE & FACTURE NON PAYEE"
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
  RED_TEXT,
  BORDER_WIDTH,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  RIGHT_EDGE,
  CONTENT_WIDTH,
  formatDate,
} from "./mis-document-layout";
import type { UnpaidInvoicesStatementData, UnpaidInvoiceRow } from "./statement-data";

// ── Column Widths & Layout matching the reference PDF (Sum = 491.38 pt) ─────
const COL_W = {
  date: 62.0,
  normalizedInvoice: 138.0,
  orderNumber: 115.0,
  debit: 58.0,
  credit: 50.0,
  balance: 68.38,
};

const COL_X = {
  date: MARGIN_LEFT,
  normalizedInvoice: MARGIN_LEFT + COL_W.date,
  orderNumber: MARGIN_LEFT + COL_W.date + COL_W.normalizedInvoice,
  debit: MARGIN_LEFT + COL_W.date + COL_W.normalizedInvoice + COL_W.orderNumber,
  credit: MARGIN_LEFT + COL_W.date + COL_W.normalizedInvoice + COL_W.orderNumber + COL_W.debit,
  balance: MARGIN_LEFT + COL_W.date + COL_W.normalizedInvoice + COL_W.orderNumber + COL_W.debit + COL_W.credit,
};

/**
 * Format currency matching MIS SARL statement reference:
 * e.g. "$ 1 972,00", "$ 92,00", "$ 3 284,60"
 */
function formatStatementMoney(amount: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : currency;
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${isNegative ? "-" : ""}${symbol} ${intPart},${parts[1]}`;
}

export async function generateStatementPdf(
  data: UnpaidInvoicesStatementData,
  logoBuffer?: Buffer | null,
  sealBuffer?: Buffer | null,
  signatureBuffer?: Buffer | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed images safely with graceful fallback
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

  function addNewPage(): PDFPage {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    return page;
  }

  // ── Helper: Draw Document Header on a page ───────────────────────────────
  function drawStatementHeader(page: PDFPage, isFirstPage: boolean) {
    const { company } = data;

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

    // 3. Top Right Title: RELEVE DE COMPTE & / FACTURE NON PAYEE
    const titleLine1 = "RELEVE DE COMPTE &";
    const titleLine2 = "FACTURE NON PAYEE";
    const titleSize = 10.5;
    const title1W = fontBold.widthOfTextAtSize(titleLine1, titleSize);
    const title2W = fontBold.widthOfTextAtSize(titleLine2, titleSize);
    const maxTitleW = Math.max(title1W, title2W);
    const titleX = Math.max(400, RIGHT_EDGE - maxTitleW);

    page.drawText(titleLine1, {
      x: titleX,
      y: 748.0,
      size: titleSize,
      font: fontBold,
      color: BLACK,
    });

    page.drawText(titleLine2, {
      x: titleX,
      y: 734.0,
      size: titleSize,
      font: fontBold,
      color: BLACK,
    });

    // 4. Horizontal Separator below company header
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: 713.86,
      width: CONTENT_WIDTH,
      height: 1.32,
      color: BLACK,
    });

    // 5. Customer block (Page 1 only)
    if (isFirstPage) {
      page.drawText("Customer :", {
        x: MARGIN_LEFT,
        y: 694.0,
        size: 8.5,
        font: fontRegular,
        color: BLACK,
      });

      // Customer name in bold prominent red
      page.drawText(data.client.name.replace(/\r?\n/g, " "), {
        x: MARGIN_LEFT + 75.0,
        y: 694.0,
        size: 8.5,
        font: fontBold,
        color: RED_TEXT,
      });

      page.drawText("Customer ID :", {
        x: MARGIN_LEFT,
        y: 673.0,
        size: 8.5,
        font: fontRegular,
        color: BLACK,
      });

      if (data.client.code) {
        page.drawText(data.client.code, {
          x: MARGIN_LEFT + 75.0,
          y: 673.0,
          size: 8.5,
          font: fontRegular,
          color: BLACK,
        });
      }
    }
  }

  // ── Helper: Draw Table Header ─────────────────────────────────────────────
  function drawTableHeader(page: PDFPage, topY: number): number {
    const headerHeight = 18.0;
    const yBottom = topY - headerHeight;

    const headers = [
      { col: "date", label: "DATE FACTURE", x: COL_X.date, w: COL_W.date },
      { col: "normalizedInvoice", label: "NUMERO FACTURE NORMALISEE", x: COL_X.normalizedInvoice, w: COL_W.normalizedInvoice },
      { col: "orderNumber", label: "NUMERO COMMANDE", x: COL_X.orderNumber, w: COL_W.orderNumber },
      { col: "debit", label: "DEBIT", x: COL_X.debit, w: COL_W.debit },
      { col: "credit", label: "CREDIT", x: COL_X.credit, w: COL_W.credit },
      { col: "balance", label: "BALANCE", x: COL_X.balance, w: COL_W.balance },
    ];

    for (const h of headers) {
      // Cell background: Bright Yellow
      page.drawRectangle({
        x: h.x,
        y: yBottom,
        width: h.w,
        height: headerHeight,
        color: BRIGHT_YELLOW,
        borderWidth: BORDER_WIDTH,
        borderColor: BLACK,
      });

      // Centered label in bold black
      const labelW = fontBold.widthOfTextAtSize(h.label, 7.2);
      const labelX = h.x + (h.w - labelW) / 2;
      const labelY = yBottom + 5.5;

      page.drawText(h.label, {
        x: labelX,
        y: labelY,
        size: 7.2,
        font: fontBold,
        color: BLACK,
      });
    }

    return yBottom;
  }

  // ── Helper: Draw Single Data Row ──────────────────────────────────────────
  function drawDataRow(
    page: PDFPage,
    row: UnpaidInvoiceRow,
    topY: number,
    rowHeight: number
  ): number {
    const yBottom = topY - rowHeight;
    const textY = yBottom + (rowHeight - 7.5) / 2 + 1.5;

    // 1. DATE FACTURE (centered)
    page.drawRectangle({
      x: COL_X.date,
      y: yBottom,
      width: COL_W.date,
      height: rowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const dateFormatted = formatDate(row.issueDate);
    const dateW = fontRegular.widthOfTextAtSize(dateFormatted, 7.5);
    page.drawText(dateFormatted, {
      x: COL_X.date + (COL_W.date - dateW) / 2,
      y: textY,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });

    // 2. NUMERO FACTURE NORMALISEE (centered)
    page.drawRectangle({
      x: COL_X.normalizedInvoice,
      y: yBottom,
      width: COL_W.normalizedInvoice,
      height: rowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const normText = row.normalizedInvoiceNumber ? row.normalizedInvoiceNumber.trim() : "—";
    const normW = fontRegular.widthOfTextAtSize(normText, 7.2);
    page.drawText(normText, {
      x: COL_X.normalizedInvoice + (COL_W.normalizedInvoice - normW) / 2,
      y: textY,
      size: 7.2,
      font: fontRegular,
      color: BLACK,
    });

    // 3. NUMERO COMMANDE (centered)
    page.drawRectangle({
      x: COL_X.orderNumber,
      y: yBottom,
      width: COL_W.orderNumber,
      height: rowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const poText = row.clientPoNumber && row.clientPoNumber.trim() ? row.clientPoNumber.trim() : "—";
    const poW = fontRegular.widthOfTextAtSize(poText, 7.2);
    page.drawText(poText, {
      x: COL_X.orderNumber + (COL_W.orderNumber - poW) / 2,
      y: textY,
      size: 7.2,
      font: fontRegular,
      color: BLACK,
    });

    // 4. DEBIT (right-aligned)
    page.drawRectangle({
      x: COL_X.debit,
      y: yBottom,
      width: COL_W.debit,
      height: rowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const debitText = formatStatementMoney(row.debit, row.currency);
    const debitW = fontRegular.widthOfTextAtSize(debitText, 7.5);
    page.drawText(debitText, {
      x: COL_X.debit + COL_W.debit - debitW - 4.0,
      y: textY,
      size: 7.5,
      font: fontRegular,
      color: BLACK,
    });

    // 5. CREDIT (centered dash if zero, right-aligned if > 0)
    page.drawRectangle({
      x: COL_X.credit,
      y: yBottom,
      width: COL_W.credit,
      height: rowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    if (row.credit > 0) {
      const creditText = formatStatementMoney(row.credit, row.currency);
      const creditW = fontRegular.widthOfTextAtSize(creditText, 7.5);
      page.drawText(creditText, {
        x: COL_X.credit + COL_W.credit - creditW - 4.0,
        y: textY,
        size: 7.5,
        font: fontRegular,
        color: BLACK,
      });
    } else {
      const dashText = "-";
      const dashW = fontRegular.widthOfTextAtSize(dashText, 8.0);
      page.drawText(dashText, {
        x: COL_X.credit + (COL_W.credit - dashW) / 2,
        y: textY,
        size: 8.0,
        font: fontRegular,
        color: BLACK,
      });
    }

    // 6. BALANCE (pale yellow background, right-aligned bold text)
    page.drawRectangle({
      x: COL_X.balance,
      y: yBottom,
      width: COL_W.balance,
      height: rowHeight,
      color: PALE_YELLOW,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const balanceText = formatStatementMoney(row.balance, row.currency);
    const balanceW = fontBold.widthOfTextAtSize(balanceText, 7.5);
    page.drawText(balanceText, {
      x: COL_X.balance + COL_W.balance - balanceW - 4.0,
      y: textY,
      size: 7.5,
      font: fontBold,
      color: BLACK,
    });

    return yBottom;
  }

  // ── Helper: Draw Totals Row ───────────────────────────────────────────────
  function drawTotalsRow(page: PDFPage, topY: number): number {
    const totalRowHeight = 20.0;
    const yBottom = topY - totalRowHeight;
    const textY = yBottom + 6.0;

    // In the reference PDF, the area under DATE, NUMERO FACTURE, NUMERO COMMANDE
    // is empty (unbordered or blank), while DEBIT, CREDIT, BALANCE have bordered total cells.

    // 1. DEBIT Total Box
    page.drawRectangle({
      x: COL_X.debit,
      y: yBottom,
      width: COL_W.debit,
      height: totalRowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const totalDebitStr = formatStatementMoney(data.totalDebit, data.currency);
    const debitW = fontBold.widthOfTextAtSize(totalDebitStr, 7.5);
    page.drawText(totalDebitStr, {
      x: COL_X.debit + COL_W.debit - debitW - 4.0,
      y: textY,
      size: 7.5,
      font: fontBold,
      color: BLACK,
    });

    // 2. CREDIT Total Box (Blank with border, or total if credit exists)
    page.drawRectangle({
      x: COL_X.credit,
      y: yBottom,
      width: COL_W.credit,
      height: totalRowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    if (data.totalCredit > 0) {
      const totalCreditStr = formatStatementMoney(data.totalCredit, data.currency);
      const creditW = fontBold.widthOfTextAtSize(totalCreditStr, 7.5);
      page.drawText(totalCreditStr, {
        x: COL_X.credit + COL_W.credit - creditW - 4.0,
        y: textY,
        size: 7.5,
        font: fontBold,
        color: BLACK,
      });
    }

    // 3. BALANCE Total Box
    page.drawRectangle({
      x: COL_X.balance,
      y: yBottom,
      width: COL_W.balance,
      height: totalRowHeight,
      color: WHITE,
      borderWidth: BORDER_WIDTH,
      borderColor: BLACK,
    });
    const totalBalanceStr = formatStatementMoney(data.totalBalance, data.currency);
    const balanceW = fontBold.widthOfTextAtSize(totalBalanceStr, 7.5);
    page.drawText(totalBalanceStr, {
      x: COL_X.balance + COL_W.balance - balanceW - 4.0,
      y: textY,
      size: 7.5,
      font: fontBold,
      color: BLACK,
    });

    return yBottom;
  }

  // ── Helper: Draw Signature & Stamp Block ──────────────────────────────────
  function drawSignatureBlock(page: PDFPage, topY: number) {
    // Exactly matches the reference PDF:
    // "Fait à Lubumbashi, le [DATE]"
    // "Direction Générale"
    // Followed by the stamp (sceau) on the left and signature on the right
    const sigX = 390.0;
    const dateText = `Fait à Lubumbashi, le ${data.generationDate}`;

    page.drawText(dateText, {
      x: sigX,
      y: topY,
      size: 8.04,
      font: fontRegular,
      color: BLACK,
    });

    page.drawText("Direction Générale", {
      x: sigX + 18.0,
      y: topY - 14.0,
      size: 8.5,
      font: fontBold,
      color: BLACK,
    });

    // Stamp: ~62x62 pt, placed below Direction Générale on the left
    const stampY = topY - 84.0;
    if (sealImage) {
      page.drawImage(sealImage, {
        x: sigX - 45.0,
        y: stampY,
        width: 62.0,
        height: 62.0,
      });
    }

    // Signature: ~78x42 pt, overlapping stamp on the right
    if (signatureImage) {
      page.drawImage(signatureImage, {
        x: sigX + 15.0,
        y: stampY + 14.0,
        width: 78.0,
        height: 42.0,
      });
    }
  }

  // ── DOCUMENT COMPOSITION & PAGINATION ─────────────────────────────────────
  let currentPage = addNewPage();
  drawStatementHeader(currentPage, true);

  let currentY = 648.0; // Starting Y coordinate for table header
  currentY = drawTableHeader(currentPage, currentY);

  const rowHeight = 22.0;
  const bottomMargin = 140.0; // Leaves space for totals & signature

  if (data.invoices.length === 0) {
    // Clean Empty State Row
    const emptyRowHeight = 32.0;
    const yBottom = currentY - emptyRowHeight;

    pageDrawEmptyRow: {
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: yBottom,
        width: CONTENT_WIDTH,
        height: emptyRowHeight,
        color: WHITE,
        borderWidth: BORDER_WIDTH,
        borderColor: BLACK,
      });

      const emptyMsg = "Aucune facture impayée pour ce client sur la période sélectionnée.";
      const msgW = fontRegular.widthOfTextAtSize(emptyMsg, 8.5);
      currentPage.drawText(emptyMsg, {
        x: MARGIN_LEFT + (CONTENT_WIDTH - msgW) / 2,
        y: yBottom + 11.5,
        size: 8.5,
        font: fontRegular,
        color: BLACK,
      });
    }

    currentY = yBottom;
    // Draw Totals ($0,00)
    currentY = drawTotalsRow(currentPage, currentY - 10.0);
    // Draw Signature
    drawSignatureBlock(currentPage, currentY - 35.0);
  } else {
    // Render invoice rows with pagination
    for (let i = 0; i < data.invoices.length; i++) {
      const invoice = data.invoices[i];

      // Check if row fits on current page
      if (currentY - rowHeight < bottomMargin) {
        currentPage = addNewPage();
        drawStatementHeader(currentPage, false);
        currentY = 700.0;
        currentY = drawTableHeader(currentPage, currentY);
      }

      currentY = drawDataRow(currentPage, invoice, currentY, rowHeight);
    }

    // Spacing before totals row
    currentY -= 8.0;

    // Check if totals row and signature fit
    if (currentY - 20.0 - 90.0 < 40.0) {
      currentPage = addNewPage();
      drawStatementHeader(currentPage, false);
      currentY = 700.0;
    }

    // Draw Totals row
    currentY = drawTotalsRow(currentPage, currentY);

    // Draw Signature block
    drawSignatureBlock(currentPage, currentY - 35.0);
  }

  return await doc.save();
}
