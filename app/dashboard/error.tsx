"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
      <div className="size-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-4">
        <AlertTriangle className="size-7" />
      </div>

      <h1 className="text-xl font-black text-primary tracking-tight">
        Une erreur est survenue lors du chargement
      </h1>
      <p className="mt-1 text-xs text-muted-foreground max-w-md leading-relaxed">
        Impossible de charger les données commerciales. Veuillez vérifier votre connexion ou réactualiser la vue.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          <RotateCcw className="size-3.5" /> Réessayer
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors"
        >
          <Home className="size-3.5 text-muted-foreground" /> Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
