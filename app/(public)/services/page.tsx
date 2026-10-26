import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageBanner } from "@/components/home/page-banner";
import { ImageWithFallback } from "@/components/home/image-with-fallback";
import { imageRegistry, partners, services } from "@/app/config/content";
import { serviceIcons } from "@/components/home/icons";

const serviceImages = [
  imageRegistry.pipes,
  imageRegistry.welding,
  imageRegistry.transformer,
  imageRegistry.excavator,
  imageRegistry.construction,
  imageRegistry.safety,
];

export default function ServicesPage() {
  return (
    <>
      <PageBanner
        eyebrow="Our services"
        title="Technical supply for demanding sites"
        description="Six focused areas covering industrial plumbing, electromechanics, mining equipment, construction materials and safety supplies."
      />
      <section className="bg-white py-20">
        <div className="site-container max-w-3xl">
          <p className="kicker">A clear scope</p>
          <h2 className="section-heading mt-4">
            From individual components to site-ready support
          </h2>
          <p className="mt-5 leading-8 text-muted-foreground">
            We combine product sourcing with practical technical support. Each
            request starts with your references, quantities and delivery
            context, so the response can stay concrete.
          </p>
        </div>
      </section>
      <section className="bg-secondary pb-24">
        <div className="site-container grid gap-6">
          {services.map((service, index) => {
            const Icon =
              serviceIcons[service.icon as keyof typeof serviceIcons];
            const image = serviceImages[index];
            return (
              <article
                id={service.id}
                key={service.id}
                className="scroll-mt-24 grid overflow-hidden rounded-xl border border-border bg-white lg:grid-cols-2"
              >
                <div
                  className={`image-frame min-h-[300px] rounded-none ${index % 2 ? "lg:order-2" : ""}`}
                >
                  <ImageWithFallback src={image.url} alt={image.alt} />
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-12">
                  <span className="icon-badge">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-6 text-xs font-extrabold uppercase tracking-wider text-bronze">
                    0{index + 1} · Service area
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">
                    {service.title}
                  </h2>
                  <p className="mt-5 leading-8 text-muted-foreground">
                    {service.description}
                  </p>
                  <ul className="mt-6 grid gap-3">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="check-item text-sm">
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact#devis"
                    className="button button-primary mt-8 w-fit"
                  >
                    Request a quote <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section id="partners" className="scroll-mt-24 bg-white py-24">
        <div className="site-container">
          <div className="max-w-2xl">
            <p className="kicker">Partners and suppliers</p>
            <h2 className="section-heading mt-4">
              Access to established product categories
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {partners.map((partner) => (
              <div key={partner.name} className="card-lift p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-extrabold text-primary">
                    {partner.name}
                  </h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-bronze">
                    {partner.country}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
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
      <section className="bg-primary py-20 text-white">
        <div className="site-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="kicker text-accent before:bg-accent">
              Need a specific item?
            </p>
            <h2 className="section-heading mt-4">
              Send us the reference and quantity.
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
