"use strict";
// ============================================================================
// Invoice PDF Data Service — MIS SARL
// Retrieves invoice records and snapshots for professional PDF generation.
// Strictly prevents leakage of internal costs, suppliers or commissions.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoicePdfData = getInvoicePdfData;
const invoices_1 = require("@/lib/db/invoices");
const mis_document_layout_1 = require("./mis-document-layout");
async function getInvoicePdfData(invoiceId) {
    const record = await (0, invoices_1.getInvoiceById)(invoiceId);
    if (!record)
        return null;
    const company = (0, mis_document_layout_1.getDefaultCompanyInfo)();
    const client = {
        name: record.clientName ?? "Unknown Customer",
        code: record.clientCode ?? "",
        email: record.clientEmail ?? null,
        phone: record.clientPhone ?? null,
        billingAddress: record.clientBillingAddress ?? null,
        taxId: record.clientTaxId ?? null,
    };
    const lines = (record.items ?? []).map((item) => ({
        lineNumber: item.lineNumber,
        brand: item.brand ?? null,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        lineSubtotal: item.lineSubtotal,
        lineTotal: item.lineSubtotal,
    }));
    return {
        company,
        client,
        invoiceNumber: record.invoiceNumber,
        orderNumber: record.orderNumber ?? null,
        clientPoNumber: record.clientPoNumber ?? null,
        quotationReference: record.quotationReference ?? null,
        clientRfqNumber: record.clientRfqNumber ?? null,
        deliveryNoteNumber: record.deliveryNoteNumber ?? null,
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        currency: record.currency,
        paymentTerms: record.paymentTerms,
        notes: record.notes,
        status: record.status,
        lines,
        subtotal: record.subtotal,
        vatRate: record.vatRate,
        vatAmount: record.vatAmount,
        total: record.total,
        paidAmount: record.paidAmount,
        balanceDue: record.balanceDue,
        createdByName: record.createdByName ?? null,
    };
}
