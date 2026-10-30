import Link from "next/link";
import { FileQuestion, LayoutDashboard } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center shadow-xs max-w-lg mx-auto my-12">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-4 border border-border/60">
        <FileQuestion className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        Page ou Ressource Introuvable
      </h2>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-sm">
        Le document, l&apos;article ou le dossier client recherché n&apos;existe pas ou a été déplacé.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
        >
          <LayoutDashboard className="size-3.5" />
          <span>Tableau de bord</span>
        </Link>
      </div>
    </div>
  );
}
