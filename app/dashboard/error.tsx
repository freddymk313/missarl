"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error internally if needed
  }, [error]);

  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-xs max-w-xl mx-auto my-12">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        Une erreur inattendue est survenue
      </h2>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        L&apos;opération demandée n&apos;a pas pu aboutir. Veuillez réessayer ou contacter l&apos;administrateur si le problème persiste.
      </p>

      {error?.message && (
        <div className="mt-4 rounded-xl border border-border/80 bg-secondary/50 p-3 text-[11px] font-mono text-muted-foreground max-w-md truncate">
          {error.message}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          onClick={() => reset()}
          className="h-9 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold"
        >
          <RefreshCw className="size-3.5" />
          <span>Réessayer</span>
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary/60"
        >
          <LayoutDashboard className="size-3.5" />
          <span>Tableau de bord</span>
        </Link>
      </div>
    </div>
  );
}

