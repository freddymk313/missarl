// ============================================================================
// Quotation Shared Utilities (Safe for both Server and Client Components)
// ============================================================================

export function isQuotationEditable(
  status?: string | null
): boolean {
  return (
    status === "DRAFT" ||
    status === "SUBMITTED" ||
    status === "EXPIRED" ||
    status === "REJECTED"
  );
}

