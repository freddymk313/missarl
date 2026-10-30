"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] bg-card text-foreground">
      {/* Left Column: Login Form */}
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-18 max-w-xl mx-auto w-full">
        {/* Top Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="size-3.5" />
            <span>Retour au site public</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="bg-card p-2.5 rounded-xl border border-border shadow-2xs inline-flex">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={120}
                height={40}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-primary tracking-tight">{siteConfig.shortName}</p>
              <p className="text-[10px] text-muted-foreground">Portail Métier Interne</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="my-8">
          <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Connexion à l&apos;espace interne
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Veuillez saisir vos identifiants pour accéder à la gestion commerciale et au catalogue.
            </p>
          </div>

          {state?.error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl bg-destructive/10 p-3.5 text-xs font-semibold text-destructive border border-destructive/25"
            >
              <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-foreground mb-1.5"
              >
                Adresse email professionnelle
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
                  className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-foreground"
                >
                  Mot de passe
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
                  className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Connexion en cours...
                  </>
                ) : (
                  "Se connecter à l'espace"
                )}
              </button>
            </div>
          </form>

          {/* Test Accounts Box */}
          <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-3.5 text-xs text-muted-foreground">
            <p className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent-foreground" /> Comptes de test disponibles :
            </p>
            <ul className="space-y-1 text-[11px]">
              <li>• <span className="font-semibold text-foreground">admin@missarl.com</span> (Super Administrateur)</li>
              <li>• <span className="font-semibold text-foreground">commercial@missarl.com</span> (Admin Commercial)</li>
              <li>• <span className="font-semibold text-foreground">collecteur@missarl.com</span> (Collecteur de Prix)</li>
              <li className="pt-0.5 text-muted-foreground">Mot de passe pour tous : <strong className="text-foreground font-bold">Password123!</strong></li>
            </ul>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-border pt-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            Mot de passe oublié ? Contactez votre administrateur.
          </p>
        </div>
      </div>

      {/* Right Column: Navy Brand Hero Panel (hidden below lg) */}
      <div className="hidden lg:flex flex-col justify-between relative bg-navy-dark text-white p-12 xl:p-16 overflow-hidden">
        {/* Background Image with Dark Navy Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/mining.webp"
            alt="Opérations industrielles MIS SARL"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-navy-dark/88 backdrop-blur-2xs" />
        </div>

        {/* Brand Kicker Top */}
        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            MARC INGINEERING SERVICES SARL
          </span>
        </div>

        {/* Mission Content Center */}
        <div className="relative z-10 max-w-lg space-y-5">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight text-white">
            L&apos;ingénierie et la fourniture industrielle de référence en RDC
          </h2>
          <p className="text-xs xl:text-sm text-white/80 leading-relaxed">
            Une plateforme interne conçue pour le chiffrage précis des devis miniers, l&apos;exécution des bons de commande et la transparence financière.
          </p>

          <div className="pt-2 space-y-3">
            <div className="flex items-start gap-3 text-xs text-white/90">
              <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
              <span>Fourniture certifiée : robinetterie industrielle, électromécanique et équipements de sécurité</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-white/90">
              <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
              <span>Agrément officiel ARSP Certificat N° 17046 pour la sous-traitance privée en RDC</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-white/90">
              <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
              <span>Enregistrement légal RCCM CD/LSH/RCCM/26-B-00277 au siège de Lubumbashi</span>
            </div>
          </div>
        </div>

        {/* Location Footer Bottom */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/60 border-t border-white/10 pt-4">
          <span>Lubumbashi · Haut-Katanga · RDC</span>
          <span>Portail professionnel v1.0</span>
        </div>
      </div>
    </main>
  );
}
