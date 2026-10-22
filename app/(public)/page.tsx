import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Cog,
  FileText,
  Flame,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Truck,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
// import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/app/config/site";

const strengths = [
  {
    title: "Réponse rapide à vos demandes de prix",
    text: "Vous nous envoyez votre RFQ, vous recevez un devis clair avec les délais de livraison.",
  },
  {
    title: "Des offres détaillées",
    text: "Références, quantités, prix unitaires, TVA et délais : tout est précisé dans chaque devis.",
  },
  {
    title: "Un suivi de bout en bout",
    text: "De la demande à la livraison puis à la facturation, vous gardez un seul interlocuteur.",
  },
];

const services = [
  {
    icon: Zap,
    title: "Automatisme et électricité",
    text: "Modules d’entrée/sortie, composants et équipements électriques pour vos installations.",
  },
  {
    icon: Cog,
    title: "Équipements et pièces industrielles",
    text: "Pièces de rechange et équipements pour la maintenance de vos machines.",
  },
  {
    icon: Flame,
    title: "Soudage, lubrification et consommables",
    text: "Matériel de soudage, flexibles, lubrifiants et consommables d’atelier.",
  },
  {
    icon: Package,
    title: "Fournitures générales et de bureau",
    text: "Approvisionnement de vos magasins et bureaux en articles courants.",
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Votre demande",
    text: "Envoyez-nous votre demande de prix (RFQ) par email ou WhatsApp.",
  },
  {
    icon: FileText,
    title: "Notre devis",
    text: "Nous recherchons les articles et vous répondons avec un devis détaillé.",
  },
  {
    icon: ClipboardCheck,
    title: "Votre commande",
    text: "Vous validez par votre bon de commande (PO).",
  },
  {
    icon: Truck,
    title: "Livraison et facture",
    text: "Nous livrons avec un bon de livraison et émettons la facture.",
  },
];

// À confirmer avec l’entreprise avant publication
const references = ["Kamoa Copper SA", "KICO"];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              Lubumbashi · RDC
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Équipements, pièces et ingénierie pour l’industrie et les mines
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
              {siteConfig.name} vous accompagne de la demande de prix à la
              livraison : produits sélectionnés, devis clairs, suivi rigoureux.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-accent text-accent-foreground hover:bg-accent/90"
                )}
              >
                Demander un devis
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/services"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                )}
              >
                Nos services
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-3xl bg-white p-6 shadow-2xl">
              <Image
                src={siteConfig.logo}
                alt={`Logo ${siteConfig.name}`}
                width={1196}
                height={1020}
                priority
                className="h-auto w-64 sm:w-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* POINTS FORTS */}
      <section className="border-b bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          {strengths.map((item) => (
            <div key={item.title}>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">Ce que nous fournissons</h2>
            <p className="mt-3 text-muted-foreground">
              Une gamme adaptée aux besoins de l’industrie, des sites miniers et
              des entreprises.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border bg-card p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              Voir tous nos services <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Comment ça marche</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="relative rounded-2xl border p-6">
                <span className="absolute right-5 top-4 text-4xl font-bold text-muted">
                  {i + 1}
                </span>
                <Icon className="mb-4 size-7 text-primary" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RÉFÉRENCES */}
      <section className="border-y bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Ils nous font confiance
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {references.map((name) => (
              <span
                key={name}
                className="rounded-full border bg-card px-5 py-2 font-semibold text-primary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Un besoin ? Parlons-en.
          </h2>
          <p className="mt-3 max-w-xl text-primary-foreground/80">
            Envoyez-nous votre demande de prix, nous vous répondons avec un
            devis détaillé.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/15 p-5">
              <Phone className="mb-3 size-5 text-accent" />
              {siteConfig.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="block hover:underline"
                >
                  {phone}
                </a>
              ))}
            </div>
            <a
              href={`mailto:${siteConfig.email}`}
              className="rounded-2xl border border-white/15 p-5 hover:bg-white/5"
            >
              <Mail className="mb-3 size-5 text-accent" />
              {siteConfig.email}
            </a>
            <a
              href={`https://wa.me/${siteConfig.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/15 p-5 hover:bg-white/5"
            >
              <MessageCircle className="mb-3 size-5 text-accent" />
              Écrire sur WhatsApp
            </a>
          </div>
          <div className="mt-8">
            <Link
              href="/contact"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-accent text-accent-foreground hover:bg-accent/90"
              )}
            >
              Nous contacter <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}