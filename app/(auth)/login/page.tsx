"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/app/config/site";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulation d'authentification
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Precision Kicker & Heading */}
        {/* <p className="kicker mt-6 justify-center">Espace d&apos;administration</p> */}
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Connexion
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Espace d&apos;administration {siteConfig.shortName} Service SARL.
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border border-border bg-white p-7 sm:p-10 rounded-xl">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-extrabold uppercase tracking-wider text-primary"
              >
                Adresse email *
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@entreprise.com"
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
                <a
                  href="#"
                  className="text-xs font-semibold text-primary hover:text-accent transition-colors"
                >
                  Oublié ?
                </a>
              </div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-field pl-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="size-4 rounded border-input accent-[var(--primary)] cursor-pointer"
                />
                <span>Se souvenir de moi</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="button button-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </div>
          </form>

          {/* Footer de sécurité B2B */}
          <div className="mt-8 border-t border-border pt-4 text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              Accès sécurisé réservé au personnel autorisé
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}