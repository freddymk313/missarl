import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { navigation, services } from "@/app/config/content";
import { siteConfig } from "@/app/config/site";

export function Footer() {
  return (
    <footer className="bg-[var(--navy-dark)] text-white">
      <div className="site-container grid gap-12 py-16 md:grid-cols-[1.4fr_0.8fr_1.2fr_1fr] lg:py-20">
        <div>
          <span className="logo-tile inline-flex">
            <Image
              src={siteConfig.logo}
              alt={siteConfig.name}
              width={160}
              height={136}
              className="h-14 w-auto object-contain"
            />
          </span>
          <p className="mt-6 max-w-xs text-sm leading-7 text-white/65">
            Industrial engineering, equipment supply and technical support for
            companies, industrial sites and mining operations.
          </p>
        </div>
        <div>
          <p className="footer-heading">Explore</p>
          <div className="mt-5 grid gap-3">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="footer-link">
                {item.label}
              </Link>
            ))}
            <Link href="/mentions-legales" className="footer-link">
              Legal notice
            </Link>
          </div>
        </div>
        <div>
          <p className="footer-heading">Services</p>
          <div className="mt-5 grid gap-3">
            {services.map((item) => (
              <Link
                key={item.id}
                href={`/services#${item.id}`}
                className="footer-link"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="footer-heading">Contact</p>
          <div className="mt-5 grid gap-4 text-sm text-white/70">
            <a
              href={`tel:${siteConfig.phones[0].replace(/\s/g, "")}`}
              className="flex gap-3"
            >
              <Phone className="mt-0.5 size-4 shrink-0 text-accent" />
              {siteConfig.phones[0]}
              <br />
              {siteConfig.phones[1]}
            </a>
            <a href={`mailto:${siteConfig.email}`} className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent" />
              {siteConfig.email}
            </a>
            <span className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              Lubumbashi, Haut-Katanga, DRC
            </span>
          </div>
        </div>
      </div>

      <div className="site-container border-t border-white/10">
        <div className=" flex flex-col gap-3 py-5 md:py-8 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © 2026 MARC INGINEERING SERVICES SARL.{" "}
            <Link
              href="https://nordevagency.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-white"
            >
              Designed by Nordev Agency
            </Link>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/mentions-legales" className="hover:text-white">
              Legal notice
            </Link>
            <span>RCCM: {siteConfig.legal.rccm}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
