export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  const styles: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", label: "Brouillon" },
    SUBMITTED: { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "Soumis" },
    VALIDATED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Validé" },
    CONFIRMED: { bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", label: "Confirmé" },
    PENDING: { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "En attente" },
    PARTIALLY_DELIVERED: { bg: "bg-purple-50 text-purple-700 border-purple-200", text: "text-purple-700", label: "Livré partiel" },
    COMPLETED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Clôturé" },
    ISSUED: { bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", label: "Émise" },
    PARTIALLY_PAID: { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "Payée partiel" },
    PAID: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Payée intégral" },
    OVERDUE: { bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", label: "Échue" },
    RECORDED: { bg: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", label: "Enregistré" },
    RECONCILED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Rapproché" },
    EXPIRED: { bg: "bg-slate-100 text-slate-500 border-slate-200", text: "text-slate-500", label: "Expiré" },
    REJECTED: { bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", label: "Rejeté" },
    CANCELLED: { bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", label: "Annulé" },
  };

  const current = styles[normalized] || {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-700",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${current.bg}`}
    >
      {current.label}
    </span>
  );
}
