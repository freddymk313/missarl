"use strict";
// ============================================================================
// Quotation Shared Utilities (Safe for both Server and Client Components)
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQuotationEditable = isQuotationEditable;
function isQuotationEditable(status) {
    return (status === "DRAFT" ||
        status === "SUBMITTED" ||
        status === "EXPIRED" ||
        status === "REJECTED");
}
