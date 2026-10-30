"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen bg-card text-foreground">
      {/* Left Column: Login Form */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:max-w-xl xl:max-w-2xl bg-card">
        {/* Top bar with back to public site link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Retour au site public</span>
          </Link>
          <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
            Lubumbashi, RDC
          </span>
        </div>

        {/* Form Container */}
        <div className="mx-auto w-full max-w-md py-10">
          {/* Logo Tile */}
          <div className="mb-6 flex items-center gap-3">
            <div className="inline-flex items-center justify-center rounded-2xl border border-border/80 bg-card p-3 shadow-2xs">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={130}
                height={45}
                priority
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold tracking-wider text-primary uppercase">
                MIS SARL
              </span>
              <span className="text-[10px] text-muted-foreground">
                Portail Opérationnel
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Connexion à l&apos;espace interne
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Veuillez saisir vos identifiants pour accéder aux devis, commandes et opérations.
            </p>
          </div>

          {/* Accessible Error Alert */}
          {state?.error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Adresse email professionnelle <span className="text-destructive">*</span>
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
                  defaultValue="admin@missarl.com"
                  placeholder="nom@missarl.com"
                  className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-foreground"
                >
                  Mot de passe <span className="text-destructive">*</span>
                </label>
              </div>
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
                  defaultValue="Password123!"
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <span>Se connecter à l&apos;espace</span>
                )}
              </button>
            </div>
          </form>

          {/* Seed accounts testing guide */}
          <div className="mt-6 rounded-xl border border-border/80 bg-secondary/50 p-3.5 text-[11px] text-muted-foreground">
            <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
              <Shield className="size-3.5 text-primary" />
              <span>Comptes de démonstration :</span>
            </p>
            <div className="space-y-0.5 tabular-nums text-[11px]">
              <p>• <span className="font-semibold text-foreground">admin@missarl.com</span> (Super Administrateur)</p>
              <p>• <span className="font-semibold text-foreground">commercial@missarl.com</span> (Admin Commercial)</p>
              <p>• <span className="font-semibold text-foreground">collecteur@missarl.com</span> (Collecteur de Prix)</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 border-t border-border/80 pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Mot de passe oublié ? Contactez votre administrateur.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="text-center sm:text-left text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.shortName} SARL. Tous droits réservés.
        </div>
      </div>

      {/* Right Column: Navy Hero Banner (hidden below lg) */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground overflow-hidden">
        {/* Background photo under overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero.webp"
            alt="Opérations industrielles MIS SARL"
            fill
            priority
            className="object-cover opacity-25 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/40" />
        </div>

        {/* Top badge */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-accent" />
            Portail Métier Intégré
          </span>
        </div>

        {/* Middle statement & bullet points */}
        <div className="relative z-10 max-w-lg space-y-6">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight text-white">
            Ingénierie, fourniture industrielle et logistique minière en RDC
          </h2>
          <p className="text-xs text-primary-foreground/80 leading-relaxed">
            Plateforme centralisée assurant le chiffrage précis des devis miniers, le suivi des commandes d&apos;achat et la traçabilité des livraisons sur site.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-4 shrink-0 text-accent mt-0.5" />
              <p className="text-xs text-primary-foreground/90 font-medium">
                Fourniture certifiée pour le secteur minier et manufacturier au Haut-Katanga et Lualaba.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-4 shrink-0 text-accent mt-0.5" />
              <p className="text-xs text-primary-foreground/90 font-medium">
                Traçabilité rigoureuse des proformas, bons de commande (PO) et relevés de compte en USD.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-4 shrink-0 text-accent mt-0.5" />
              <p className="text-xs text-primary-foreground/90 font-medium">
                Conformité fiscale stricte (TVA 16 %) et distribution directe aux comptoirs industriels.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom company info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-primary-foreground/70 border-t border-primary-foreground/15 pt-4">
          <span>{siteConfig.legal.rccm}</span>
          <span>{siteConfig.location.display.fr}</span>
        </div>
      </div>
    </main>
  );
}
