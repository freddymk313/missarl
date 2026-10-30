export function formatMoney(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "$ 0,00";
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [intStr, decStr] = fixed.split(".");
  // Space as thousands separator
  const spaced = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${isNegative ? "-" : ""}$ ${spaced},${decStr}`;
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateLong(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthShort(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase();
}

