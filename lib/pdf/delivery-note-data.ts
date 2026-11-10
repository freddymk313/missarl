// ============================================================================
// Delivery Note (Bon de Livraison) PDF Data Service — MIS SARL
// Retrieves delivery note records and line snapshots.
// Contains NO financial or cost fields.
// ============================================================================

import { getDeliveryNoteById, DeliveryNoteRecord } from "@/lib/db/delivery-notes";
import { getDefaultCompanyInfo, CompanyInfo } from "./mis-document-layout";

export interface DeliveryNoteLineForPdf {
  lineNumber: number;
  brand?: string | null;
  description: string;
  unit: string;
  quantityDelivered: number;
  observation?: string | null;
}

export interface DeliveryNotePdfData {
  company: CompanyInfo;
  client: {
    name: string;
    code: string;
    email: string | null;
    phone: string | null;
    billingAddress: string | null;
  };
  blNumber: string;
  orderNumber: string;
  clientPoNumber: string | null;
  quotationReference: string | null;
  clientRfqNumber: string | null;
  invoiceNumber: string | null;
  deliveryDate: string;
  carrierName: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
  receiverName: string | null;
  notes: string | null;
  status: string;
  lines: DeliveryNoteLineForPdf[];
  createdByName: string | null;
}

export async function getDeliveryNotePdfData(
  deliveryNoteId: string
): Promise<DeliveryNotePdfData | null> {
  const record: DeliveryNoteRecord | null = await getDeliveryNoteById(deliveryNoteId);
  if (!record) return null;

  const company = getDefaultCompanyInfo();

  const client = {
    name: record.clientName ?? "Client inconnu",
    code: record.clientCode ?? "",
    email: (record as unknown as Record<string, unknown>).clientEmail as string ?? null,
    phone: (record as unknown as Record<string, unknown>).clientPhone as string ?? null,
    billingAddress: (record as unknown as Record<string, unknown>).clientBillingAddress as string ?? null,
  };

  const lines: DeliveryNoteLineForPdf[] = (record.items ?? []).map((item) => ({
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
