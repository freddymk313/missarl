import fs from "fs";
import path from "path";
import { getQuotations } from "@/lib/db/quotations";
import { createOrderFromQuotation, getOrderById } from "@/lib/db/orders";
import { createDeliveryBatch, getOrderAllocations, updateDeliveryNoteStatus, getDeliveryNotes } from "@/lib/db/delivery-notes";
import { getInvoicePdfData } from "@/lib/pdf/invoice-data";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { getDeliveryNotePdfData } from "@/lib/pdf/delivery-note-data";
import { generateDeliveryNotePdf } from "@/lib/pdf/delivery-note-pdf";

async function run() {
  console.log("=== 1. TEST PARTIAL PO CREATION ===");
  const quotes = await getQuotations({ status: "VALIDATED" });
  if (quotes.length === 0) {
    console.log("No validated quotations found.");
    return;
  }
  const quoteHeader = quotes[0];
  const { getQuotationById } = await import("@/lib/db/quotations");
  const quote = await getQuotationById(quoteHeader.id);
  if (!quote || !quote.items || quote.items.length === 0) {
    console.log("No items in quotation.");
    return;
  }
  console.log(`Using quotation: ${quote.internalReference} (${quote.id}) with ${quote.items.length} items`);

  // Pick first item and only accept half quantity
  const firstItem = quote.items[0];
  const halfQty = Math.max(1, Math.floor(firstItem.quantity / 2));
  console.log(`Accepting item 1: original qty=${firstItem.quantity}, accepted qty=${halfQty}`);

  const order = await createOrderFromQuotation({
    quotationId: quote.id,
    clientPoNumber: "PO/TEST/CHEMAF/001",
    selectedItems: [
      { quotationItemId: firstItem.id!, quantity: halfQty }
    ],
    userId: "usr-admin-001"
  });

  console.log(`Order created: ${order.orderNumber} (ID: ${order.id}) with total $${order.total}`);
  console.log(`Order lines count: ${order.items?.length}`);

  console.log("=== 2. TEST INITIAL ALLOCATIONS ===");
  let allocs = await getOrderAllocations(order.id);
  console.log("Allocations:", allocs);

  console.log("=== 3. TEST DELIVERY BATCH (BL + INVOICE) ===");
  const orderItemId = order.items![0].id;
  const batchRes = await createDeliveryBatch({
    orderId: order.id,
    deliveryDate: "2026-11-09",
    carrierName: "MIS LOGISTICS",
    driverName: "Kapinga Marc",
    vehiclePlate: "8472AB/05",
    receiverName: "Magasin Chemaf",
    notes: "Lot partiel n°1",
    items: [
      {
        orderItemId,
        quantity: halfQty,
        observation: "Colis 1/1 conforme"
      }
    ],
    userId: "usr-admin-001"
  });

  console.log(`Delivery note created: ${batchRes.deliveryNote.blNumber} (ID: ${batchRes.deliveryNote.id})`);
  console.log(`Linked invoice created: ${batchRes.invoiceNumber} (ID: ${batchRes.invoiceId})`);

  allocs = await getOrderAllocations(order.id);
  console.log("Allocations after batch:", allocs);

  console.log("=== 4. TEST BL STATUS: PREPARED -> IN_TRANSIT -> DELIVERED ===");
  let updatedBl = await updateDeliveryNoteStatus(batchRes.deliveryNote.id, "IN_TRANSIT", "usr-admin-001");
  console.log("BL Status:", updatedBl.status);

  updatedBl = await updateDeliveryNoteStatus(batchRes.deliveryNote.id, "DELIVERED", "usr-admin-001");
  console.log("BL Status:", updatedBl.status);

  const updatedOrder = await getOrderById(order.id);
  console.log("Order status after delivery:", updatedOrder?.status);

  allocs = await getOrderAllocations(order.id);
  console.log("Allocations after delivered:", allocs);

  console.log("=== 5. TEST INVOICE PDF GENERATION ===");
  const invPdfData = await getInvoicePdfData(batchRes.invoiceId);
  if (!invPdfData) throw new Error("Invoice PDF data not found");
  console.log(`Generating invoice PDF for ${invPdfData.invoiceNumber} (${invPdfData.lines.length} lines)...`);

  const logoBuf = fs.readFileSync(path.join(process.cwd(), "public/images/logo.png"));
  const sealBuf = fs.readFileSync(path.join(process.cwd(), "public/signature/sceau.png"));
  const sigBuf = fs.readFileSync(path.join(process.cwd(), "public/signature/signature.png"));

  const invPdfBytes = await generateInvoicePdf(invPdfData, logoBuf, sealBuf, sigBuf);
  console.log(`Invoice PDF generated successfully! Size: ${invPdfBytes.byteLength} bytes.`);
  fs.writeFileSync("/tmp/test-invoice.pdf", Buffer.from(invPdfBytes));

  console.log("=== 6. TEST DELIVERY NOTE PDF GENERATION ===");
  const blPdfData = await getDeliveryNotePdfData(batchRes.deliveryNote.id);
  if (!blPdfData) throw new Error("BL PDF data not found");
  console.log(`Generating BL PDF for ${blPdfData.blNumber} (${blPdfData.lines.length} lines)...`);

  const blPdfBytes = await generateDeliveryNotePdf(blPdfData, logoBuf, sealBuf, sigBuf);
  console.log(`BL PDF generated successfully! Size: ${blPdfBytes.byteLength} bytes.`);
  fs.writeFileSync("/tmp/test-bl.pdf", Buffer.from(blPdfBytes));

  console.log("=== ALL AUTOMATED TESTS PASSED SUCCESSFULLY! ===");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
