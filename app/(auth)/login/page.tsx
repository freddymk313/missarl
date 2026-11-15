"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-card text-foreground">
      {/* Colonne Gauche : Formulaire Épuré */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-28">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo & En-tête */}
          <div className="space-y-6">
            <div>
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={1200}
                height={400}
                priority
                className="h-18 sm:h-22 w-auto object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Bon retour !
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connectez-vous pour accéder à la gestion des cotations, bons de
                commande et opérations commerciales.
              </p>
            </div>
          </div>

          {/* Message d'erreur */}
          {state?.error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl bg-destructive/10 p-3.5 text-xs font-semibold text-destructive border border-destructive/25"
            >
              <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-foreground mb-1.5"
              >
                Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Entrez votre adresse email"
                  className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-foreground mb-1.5"
              >
                Mot de passe <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Entrez votre mot de passe"
                  className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Ligne Se souvenir / Aide */}
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="size-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="font-semibold text-foreground">
                  Rester connecté
                </span>
              </label>
              <span className="text-[11px] font-medium text-muted-foreground">
                Accès interne sécurisé
              </span>
            </div>

            {/* Bouton Principal */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Connexion en
                    cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </button>
            </div>
          </form>

          {/* Note de bas de formulaire */}
          <p className="text-center text-[11px] text-muted-foreground pt-4 border-t border-border">
            Un problème d&apos;accès ? Contactez la direction administrative de{" "}
            <span className="font-bold text-primary">MIS SARL</span>.
          </p>
        </div>
      </div>

      {/* Colonne Droite : Panneau Géométrique Industriel aux couleurs de l'app */}
      <div className="hidden lg:grid grid-cols-3 grid-rows-3 relative bg-navy-dark overflow-hidden select-none">
        {/* Bloc 1 : Arcs géométriques bleu profond */}
        <div className="relative bg-primary/90 overflow-hidden flex items-end justify-center">
          <div className="w-full h-3/4 rounded-t-full bg-navy-dark/60" />
        </div>

        {/* Bloc 2 : Losanges accent or/jaune + barres techniques */}
        <div className="relative bg-navy-dark p-8 flex flex-col justify-between border-l border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="size-5 rotate-45 bg-accent inline-block" />
            <span className="size-5 rotate-45 bg-amber-300/80 inline-block" />
          </div>
          <div className="space-y-2.5">
            <div className="h-2 w-3/4 rounded-full bg-accent/80" />
            <div className="flex gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="h-4 w-1 bg-white/30 rounded-full" />
              ))}
            </div>
            <div className="h-1.5 w-1/2 rounded-full bg-primary" />
          </div>
        </div>

        {/* Bloc 3 : Cube isométrique / Grille technique */}
        <div className="relative bg-primary/75 overflow-hidden flex items-center justify-center">
          <div className="size-36 rotate-45 border-4 border-accent/40 bg-navy-dark/40 flex items-center justify-center">
            <div className="size-20 border-2 border-white/20" />
          </div>
          {/* Points décoratifs */}
          <div className="absolute top-6 left-6 grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="size-1 rounded-full bg-white/40" />
            ))}
          </div>
        </div>

        {/* Bloc 4 : Triangle industriel & étoile/engrenage or */}
        <div className="relative bg-primary p-8 flex flex-col justify-between border-t border-white/5">
          <div className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-b-[38px] border-b-accent/90" />
          <div className="self-end">
            <svg
              viewBox="0 0 100 100"
              className="size-20 text-accent fill-current"
            >
              <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" />
            </svg>
          </div>
        </div>

        {/* Bloc 5 : Centre identitaire MIS SARL */}
        <div className="relative bg-navy-dark/95 p-8 flex flex-col justify-center items-start border border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">
            {/* MIS SARL · RDC */}
          </span>
          <h2 className="text-lg xl:text-xl font-black text-white leading-snug">
            {/* Ingénierie &amp; Fourniture Industrielle */}
          </h2>
          <p className="text-[11px] text-white/65 mt-2 leading-relaxed">
            {/* Gestion des cotations minières, commandes et suivi financier. */}
          </p>
          <div className="flex gap-2 mt-5">
            <span className="size-2.5 rounded-full bg-accent" />
            <span className="size-2.5 rounded-full bg-white/30" />
            <span className="size-2.5 rounded-full bg-white/30" />
            <span className="size-2.5 rounded-full bg-white/30" />
          </div>
        </div>

        {/* Bloc 6 : Rayons & quart de cercle */}
        <div className="relative bg-primary/85 overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 120 120"
            className="size-32 text-accent/70 stroke-current"
            fill="none"
            strokeWidth="2.5"
          >
            <line x1="60" y1="60" x2="60" y2="10" />
            <line x1="60" y1="60" x2="95" y2="25" />
            <line x1="60" y1="60" x2="110" y2="60" />
            <line x1="60" y1="60" x2="25" y2="25" />
            <line x1="60" y1="60" x2="10" y2="60" />
          </svg>
        </div>

        {/* Bloc 7 : Bloc géométrique sobre */}
        <div className="relative bg-primary/95 p-8 flex items-center justify-center border-t border-white/5">
          <div className="size-28 rounded-2xl bg-accent/90 shadow-lg flex items-center justify-center">
            <div className="size-12 rounded-xl bg-navy-dark" />
          </div>
        </div>

        {/* Bloc 8 : Quart de cercle sombre & lignes */}
        <div className="relative bg-navy-dark overflow-hidden flex items-end justify-end p-6 border-l border-white/5">
          <div className="absolute -bottom-16 -right-16 size-56 rounded-full border-[18px] border-primary" />
          <div className="relative z-10 text-right">
            <p className="text-[10px] font-mono text-white/50">
              {/* Lubumbashi · Haut-Katanga */}
            </p>
          </div>
        </div>

        {/* Bloc 9 : Grille de points or & forme courbe */}
        <div className="relative bg-primary/80 p-8 flex flex-col justify-between items-end overflow-hidden">
          <div className="w-32 h-16 rounded-b-full bg-navy-dark/70 -mt-8" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-accent/80"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}