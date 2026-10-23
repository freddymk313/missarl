import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center bg-background">
      {/* Small Precision Kicker */}
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
        Erreur 404
      </p>

      {/* Clean Headline */}
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Page introuvable
      </h1>

      {/* Concise Description */}
      <p className="mt-3 max-w-sm mx-auto text-sm leading-relaxed text-muted-foreground">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>

      {/* Simple Text Link */}
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}