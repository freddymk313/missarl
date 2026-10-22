import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-primary">
        <FileQuestion className="size-8" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">
        Erreur 404
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Page introuvable
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className={cn(
            buttonVariants({ size: "default" }),
            "gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}