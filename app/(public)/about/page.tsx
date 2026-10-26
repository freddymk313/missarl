import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "@/components/home/image-with-fallback";
import { imageRegistry, team } from "@/app/config/content";
import { PageBanner } from "@/components/home/page-banner";

const commitments = [
  "Deliver on time",
  "Quality without compromise",
  "Competitive pricing",
  "Products aligned with international quality and safety standards",
];

export default function AboutPage() {
  return (
    <>
      {/* Banner de page uniforme */}
      <PageBanner
        eyebrow="About MIS SARL"
        title="Engineering grounded in practical delivery"
        description="A multidisciplinary company based in Lubumbashi, serving industrial, mining and construction needs."
      />

      {/* Presentation & Hero Image */}
      <section className="bg-white py-24">
        <div className="site-container grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="kicker">Who we are</p>
            <h2 className="section-heading mt-4">
              A dependable technical partner in Central Africa
            </h2>
            <p className="mt-6 leading-8 text-muted-foreground">
              MARC INGINEERING SERVICES SARL is a limited liability company
              based in Lubumbashi, Democratic Republic of the Congo. As a
              multidisciplinary company, we provide reliable engineering,
              industrial and technical solutions: plumbing, electrical works,
              mining machinery, automation, construction and safety equipment.
            </p>
            <p className="mt-5 leading-8 text-muted-foreground">
              Our objective is to play a leading role in supplying the
              materials, tools, machines and technical expertise companies need
              to operate as efficiently, safely and economically as possible.
            </p>
            <Link href="/contact#devis" className="button button-primary mt-8">
              Discuss a requirement <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="image-frame">
            <ImageWithFallback
              src={imageRegistry.warehouse.url}
              alt={imageRegistry.warehouse.alt}
            />
          </div>
        </div>
      </section>

      {/* Split Vision & Mission (Même style que la Homepage) */}
      <section className="grid lg:grid-cols-2">
        <div className="image-frame min-h-[440px] rounded-none">
          <ImageWithFallback
            src={imageRegistry.transformer.url}
            alt={imageRegistry.transformer.alt}
          />
        </div>
        <div className="flex items-center bg-primary px-6 py-20 text-white sm:px-12">
          <div className="max-w-xl">
            <p className="kicker text-accent before:bg-accent">
              Direction and purpose
            </p>
            <h2 className="section-heading mt-4">
              Built for useful, safe progress
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-lg font-extrabold text-accent">
                  Our vision
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  To become a reference partner in multidisciplinary engineering
                  and industrial supply in Central Africa, recognized for
                  reliability, technical expertise and high standards of safety
                  and service.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-accent">
                  Our mission
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  To equip companies, industrial sites and mining operations
                  with the technical solutions, equipment and qualified
                  expertise they need to build, operate and grow safely and
                  efficiently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitments */}
      <section className="bg-secondary py-24">
        <div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="kicker">Our commitments</p>
            <h2 className="section-heading mt-4">
              The standards we bring to every request
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {commitments.map((item) => (
              <div key={item} className="card-lift flex items-start gap-4 p-6">
                <span className="icon-circle size-9 shrink-0">
                  <Check className="size-4" />
                </span>
                <p className="font-bold leading-snug text-primary">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-white py-24">
        <div className="site-container">
          <div className="max-w-2xl">
            <p className="kicker">Our team</p>
            <h2 className="section-heading mt-4">
              Technical experience across disciplines
            </h2>
            <p className="mt-4 text-muted-foreground">
              The team brings together engineering, electrical, plumbing, human
              resources and automation capabilities.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <article key={member.name} className="card-lift p-6">
                <div className="flex size-16 items-center justify-center rounded-lg bg-primary text-xl font-extrabold text-accent">
                  {member.initials}
                </div>
                <h3 className="mt-6 text-lg font-extrabold text-primary">
                  {member.name}
                </h3>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-bronze">
                  {member.role}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {member.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Official Registrations (RCCM & ARSP) */}
      <section className="bg-secondary py-24">
        <div className="site-container">
          <div className="max-w-xl">
            <p className="kicker">Official credentials</p>
            <h2 className="section-heading mt-4">
              Compliance and statutory registration
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="card-lift border-l-4 border-l-accent p-7">
              <div className="flex items-center gap-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
                  Company registration
                </p>
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-primary">
                RCCM
              </h3>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                CD/LSH/RCCM/26-B-00277
              </p>
            </div>

            <div className="card-lift border-l-4 border-l-accent p-7">
              <div className="flex items-center gap-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
                  Subcontracting regulation
                </p>
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-primary">
                ARSP Registration
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Certificate no. 17046, Activity: Supply of goods and services, Issued June 29, 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call To Action */}
      <section className="bg-primary py-20 text-white">
        <div className="site-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="kicker text-accent before:bg-accent">
              Have a requirement?
            </p>
            <h2 className="section-heading mt-4">
              Let’s make the next step clear.
            </h2>
          </div>
          <Link href="/contact#devis" className="button button-accent">
            Request a quote <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}