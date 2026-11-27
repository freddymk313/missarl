"use strict";
// ============================================================================
// Delivery Note (Bon de Livraison) PDF Data Service — MIS SARL
// Retrieves delivery note records and line snapshots.
// Contains NO financial or cost fields.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeliveryNotePdfData = getDeliveryNotePdfData;
const delivery_notes_1 = require("@/lib/db/delivery-notes");
const mis_document_layout_1 = require("./mis-document-layout");
async function getDeliveryNotePdfData(deliveryNoteId) {
    const record = await (0, delivery_notes_1.getDeliveryNoteById)(deliveryNoteId);
    if (!record)
        return null;
    const company = (0, mis_document_layout_1.getDefaultCompanyInfo)();
    const client = {
        name: record.clientName ?? "Unknown Customer",
        code: record.clientCode ?? "",
        email: record.clientEmail ?? null,
        phone: record.clientPhone ?? null,
        billingAddress: record.clientBillingAddress ?? null,
    };
    const lines = (record.items ?? []).map((item) => ({
        lineNumber: item.lineNumber,
        brand: item.brand ?? null,
        description: item.description,
        unit: item.unit,
        quantityDelivered: item.quantityDelivered,
        observation: item.observation ?? null,
    }));
    return {
        company,
        client,
        blNumber: record.blNumber,
        orderNumber: record.orderNumber ?? "",
        clientPoNumber: record.clientPoNumber ?? null,
        quotationReference: record.quotationReference ?? null,
        clientRfqNumber: record.clientRfqNumber ?? null,
        invoiceNumber: record.invoiceNumber ?? null,
        deliveryDate: record.deliveryDate,
        carrierName: record.carrierName,
        driverName: record.driverName,
        vehiclePlate: record.vehiclePlate,
        receiverName: record.receiverName,
        notes: record.notes,
        status: record.status,
        lines,
        createdByName: record.createdByName ?? null,
    };
}
