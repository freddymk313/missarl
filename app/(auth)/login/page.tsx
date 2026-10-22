"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/app/config/site";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simuler un appel d'authentification
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-muted/40 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="flex justify-center">
          <div className="rounded-2xl bg-white p-3 shadow-md">
            <Image
              src={siteConfig.logo}
              alt={`Logo ${siteConfig.name}`}
              width={160}
              height={136}
              priority
              className="h-14 w-auto object-contain"
            />
          </div>
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Espace d&apos;administration
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Connectez-vous pour gérer les devis et les commandes
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border bg-card px-6 py-8 shadow-sm sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Adresse email
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
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
                  className="block w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Mot de passe
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
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
                  className="block w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="size-4 rounded border-input text-primary focus:ring-ring"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-muted-foreground"
                >
                  Se souvenir de moi
                </label>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t pt-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-accent" />
              Accès réservé aux membres autorisés de {siteConfig.shortName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
