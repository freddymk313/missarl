"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { loginAction } from "@/actions/auth";

export default function ConnexionPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="size-3.5" /> Retour au site public
        </Link>
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-xl shadow-xs border border-border">
            <Image
              src={siteConfig.logo}
              alt={siteConfig.name}
              width={140}
              height={50}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
          Espace de Gestion
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Portail professionnel interne {siteConfig.shortName} SARL
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border border-border bg-white p-7 sm:p-9 rounded-2xl shadow-sm">
          {state?.error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 p-3.5 text-xs font-semibold text-red-800 border border-red-200"
            >
              <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-extrabold uppercase tracking-wider text-primary"
              >
                Adresse email *
              </label>
              <div className="relative mt-1.5">
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
                  className="form-field pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-extrabold uppercase tracking-wider text-primary"
                >
                  Mot de passe *
                </label>
              </div>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  defaultValue="Password123!"
                  placeholder="••••••••"
                  className="form-field pl-10"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="button button-primary w-full disabled:opacity-70 disabled:cursor-not-allowed"
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

          {/* Development credentials box for testing */}
          <div className="mt-6 rounded-xl border border-border/80 bg-slate-50 p-3.5 text-[11px] text-muted-foreground">
            <p className="font-extrabold text-primary mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent" /> Comptes de test disponibles :
            </p>
            <ul className="space-y-1 font-mono text-[10px]">
              <li>• <span className="font-semibold text-slate-700">admin@missarl.com</span> (Super Admin)</li>
              <li>• <span className="font-semibold text-slate-700">commercial@missarl.com</span> (Admin Commercial)</li>
              <li>• <span className="font-semibold text-slate-700">collecteur@missarl.com</span> (Collecteur de Prix)</li>
              <li className="pt-0.5 text-slate-500">Mot de passe pour tous : <strong className="text-primary font-bold">Password123!</strong></li>
            </ul>
          </div>

          <div className="mt-5 border-t border-border pt-4 text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              Accès strictement réservé au personnel autorisé de MIS SARL
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
