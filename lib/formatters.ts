// ============================================================================
// Shared Formatters for MIS SARL (Currency in USD, French Dates)
// ============================================================================

/**
 * Formats monetary amounts in USD strictly like "$ 51 272,00"
 * (dollar sign with space, non-breaking space as thousands separator, comma decimal)
 */
export function formatUSD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "$ 0,00";
  }

  const fixed = Math.abs(amount).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const sign = amount < 0 ? "-" : "";
  return `${sign}$ ${formattedInt},${decPart}`;
}

/**
 * Formats dates in French standard (dd/mm/yyyy)
 */
export function formatFrenchDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats dates in readable French with short month (e.g. 24 oct. 2026)
 */
export function formatFrenchShortDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats dates in full French (e.g. 30 octobre 2026)
 */
export function formatFrenchLongDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Returns month chip data: uppercase month abbreviation and 2-digit day
 */
export function getCalendarChipData(dateInput?: string | Date): { month: string; day: string } {
  const d = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : dateInput) : new Date();
  const valid = !isNaN(d.getTime()) ? d : new Date();
  const month = valid.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase();
  const day = String(valid.getDate()).padStart(2, "0");
  return { month, day };
}
