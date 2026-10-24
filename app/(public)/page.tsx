import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import {
  imageRegistry,
  partners,
  sectors,
  services,
  steps,
} from "@/app/config/content";
import { siteConfig } from "@/app/config/site";
import { ImageWithFallback } from "@/components/home/image-with-fallback";
import { serviceIcons } from "@/components/home/icons";

const commitments = [
  "Deliver on time",
  "Quality without compromise",
  "Competitive pricing",
  "Products aligned with international quality and safety standards",
];
const sectorImages = {
  mine: imageRegistry.hero,
  industry: imageRegistry.technician,
  construction: imageRegistry.construction,
} as const;

export default function Home() {
  return (
    <>
      <section className="relative isolate min-h-[650px] overflow-hidden bg-[var(--navy-dark)] text-white">
        <div className="hero-image">
          <ImageWithFallback
            src={imageRegistry.hero.url}
            alt={imageRegistry.hero.alt}
            priority
          />
          <div className="hero-overlay" />
        </div>
        <div className="site-container hero-content flex min-h-[650px] items-center py-20">
          <div className="max-w-3xl">
            <p className="kicker text-accent before:bg-accent">
              MARC INGINEERING SERVICES SARL
            </p>
            <h1 className="display-heading mt-5 max-w-3xl">
              Engineering and industrial supply in DRC
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Plumbing, electromechanics, mining equipment, materials and safety
              supplies: one partner from quotation request to delivery.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/contact#devis" className="button button-accent">
                Request a quote <ArrowRight className="size-4" />
              </Link>
              <Link href="/services" className="button button-outline-light">
                Our services
              </Link>
            </div>
          </div>
        </div>
        <div className="site-container relative z-10 -mb-16">
          <div className="max-w-md bg-accent p-6 text-accent-foreground shadow-xl sm:p-8">
            <p className="text-xl font-extrabold leading-tight">
              Six areas of expertise, one point of contact.
            </p>
            <Link
              href="/services"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
            >
              Explore our services <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="*border-b bg-white">
        <div className="site-container grid gap-6 py-24 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.25fr]">
          <div className="flex gap-4">
            <span className="icon-circle">
              <Phone className="size-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
                Quick contact
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {siteConfig.phones[0]}
                <br />
                {siteConfig.phones[1]}
              </p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {siteConfig.email}
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="icon-circle">
              <MapPin className="size-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-bronze">
                Our location
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                Lubumbashi
                <br />
                Haut-Katanga, DRC
              </p>
            </div>
          </div>
          <div className="border-l border-border pl-6 text-sm leading-7 text-muted-foreground sm:col-span-2 lg:col-span-1">
            We supply equipment, parts and technical support for industrial
            companies, mining operations and construction projects.
          </div>
        </div>
      </section>

      <section className="bg-secondary py-24">
        <div className="site-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker justify-center">What we supply</p>
            <h2 className="section-heading mt-4">
              Practical expertise for demanding environments
            </h2>
            <p className="mt-4 text-muted-foreground">
              A focused range of engineering services, equipment and supplies
              for sites that need dependable execution.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => {
              const Icon =
                serviceIcons[service.icon as keyof typeof serviceIcons];
              return (
                <article
                  key={service.id}
                  className={`card-lift group p-7 ${index === 0 ? "bg-primary text-white" : ""}`}
                >
                  <span
                    className={`icon-badge ${index === 0 ? "bg-accent" : ""}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-xl font-extrabold">
                    {service.title}
                  </h3>
                  <div
                    className={`my-5 h-px w-12 ${index === 0 ? "bg-accent" : "bg-border"}`}
                  />
                  <p
                    className={`text-sm leading-7 ${index === 0 ? "text-white/75" : "text-muted-foreground"}`}
                  >
                    {service.short}
                  </p>
                  <Link
                    href={`/services#${service.id}`}
                    className={`mt-6 inline-flex items-center gap-3 text-sm font-bold ${index === 0 ? "text-accent" : "text-primary"}`}
                  >
                    Learn more{" "}
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:translate-x-1">
                      <ChevronRight className="size-4" />
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="site-container grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="kicker">About MIS SARL</p>
            <h2 className="section-heading mt-4">
              Technical supply with a clear sense of responsibility
            </h2>
            <p className="mt-5 leading-8 text-muted-foreground">
              MARC INGINEERING SERVICES SARL is a limited liability company
              based in Lubumbashi, Democratic Republic of the Congo. We provide
              reliable engineering, industrial and technical services across
              plumbing, electrical works, mining machinery, automation,
              construction and safety equipment.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {commitments.map((item) => (
                <div key={item} className="check-item">
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Link href="/a-propos" className="button button-primary mt-9">
              Discover our company <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            <div className="image-frame mt-12">
              <ImageWithFallback
                src={imageRegistry.technician.url}
                alt={imageRegistry.technician.alt}
              />
            </div>
            <div className="image-frame">
              <ImageWithFallback
                src={imageRegistry.pipes.url}
                alt={imageRegistry.pipes.alt}
              />
            </div>
            <span className="absolute -bottom-5 left-1/2 size-24 -translate-x-1/2 bg-accent" />
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2">
        <div className="image-frame min-h-[420px] rounded-none">
          <ImageWithFallback
            src={imageRegistry.transformer.url}
            alt={imageRegistry.transformer.alt}
          />
        </div>
        <div className="flex items-center bg-primary py-20 text-white">
          <div className="site-container max-w-xl lg:mx-0 lg:pl-16">
            <p className="kicker text-accent before:bg-accent">
              Direction and purpose
            </p>
            <h2 className="section-heading mt-4">
              A partner for safe and efficient operations
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-lg font-extrabold text-accent">Our vision</p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  To become a reference partner in multidisciplinary engineering
                  and industrial supply in Central Africa, recognized for
                  reliability, technical expertise and high standards of safety
                  and service.
                </p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-accent">
                  Our mission
                </p>
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

      <section className="bg-secondary py-24">
        <div className="site-container">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="kicker">Our method</p>
              <h2 className="section-heading mt-4">From request to delivery</h2>
            </div>
            <Link href="/contact#devis" className="button button-outline">
              Start a conversation <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="border-t-2 border-accent bg-white p-7"
              >
                <p className="text-4xl font-extrabold text-primary/15">
                  {step.number}
                </p>
                <h3 className="mt-3 font-extrabold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="site-container">
          <div className="max-w-2xl">
            <p className="kicker">Sectors served</p>
            <h2 className="section-heading mt-4">
              Equipment and support where work happens
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {sectors.map((sector) => (
              <Link href="/services" key={sector.title} className="group">
                <div className="image-frame">
                  <ImageWithFallback
                    src={
                      sectorImages[sector.image as keyof typeof sectorImages]
                        .url
                    }
                    alt={
                      sectorImages[sector.image as keyof typeof sectorImages]
                        .alt
                    }
                  />
                </div>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-bronze">
                  {sector.title}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-primary">
                  {sector.text}
                </h3>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Explore{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-24">
        <div className="site-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="kicker">Brands and suppliers</p>
              <h2 className="section-heading mt-4">
                A network built around availability
              </h2>
            </div>
            <Link
              href="/services#partners"
              className="text-sm font-bold text-primary underline underline-offset-4"
            >
              View partner details
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {partners.map((partner) => (
              <div key={partner.name} className="card-lift p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-extrabold text-primary">
                    {partner.name}
                  </h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-bronze">
                    {partner.country}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {partner.detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 border-l-2 border-accent pl-4 text-sm leading-7 text-muted-foreground">
            The brands mentioned belong to their respective owners and are
            listed for identification only. MARC INGINEERING SERVICES SARL
            operates as an independent, non-exclusive distributor and is not a
            representative of original manufacturers.
          </p>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[var(--navy-dark)] py-24 text-white">
        <div className="hero-image">
          <ImageWithFallback
            src={imageRegistry.warehouse.url}
            alt={imageRegistry.warehouse.alt}
          />
          <div className="hero-overlay" />
        </div>
        <div className="site-container relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="kicker text-accent before:bg-accent">
              Let’s discuss your requirements
            </p>
            <h2 className="section-heading mt-4 max-w-xl">
              A practical response starts with the right conversation.
            </h2>
          </div>
          <Link href="/contact#devis" className="button button-accent">
            Request a quote <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="site-container grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div className="bg-accent p-8 text-accent-foreground lg:p-10">
            <p className="kicker text-accent-foreground before:bg-accent-foreground/40">
              Quick contact
            </p>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight">
              Tell us what you need.
            </h2>
            <p className="mt-4 text-sm leading-7">
              Share your references, quantities and delivery requirements. We
              will respond with a clear quotation.
            </p>
            <div className="mt-9 grid gap-4 text-sm font-semibold">
              <a
                href={`tel:${siteConfig.phones[0].replace(/\s/g, "")}`}
                className="flex gap-3"
              >
                <Phone className="size-5" />
                {siteConfig.phones[0]}
              </a>
              <a href={`mailto:${siteConfig.email}`} className="flex gap-3">
                <Mail className="size-5" />
                {siteConfig.email}
              </a>
            </div>
          </div>
          <div className="border border-border p-8 lg:p-10">
            <p className="kicker">Request a quotation</p>
            <h2 className="section-heading mt-4">
              Let’s start with the essentials
            </h2>
            <p className="mt-3 text-muted-foreground">
              Use the contact form and our team will review your request.
            </p>
            <Link href="/contact#devis" className="button button-primary mt-8">
              Open contact form <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
