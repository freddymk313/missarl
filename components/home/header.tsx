"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { navigation } from "@/app/config/content";
import { siteConfig } from "@/app/config/site";
import { cn } from "@/lib/utils";
import { TopBar } from "./TopBar";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <>
      {/* <div className="hidden bg-[var(--navy-dark)] text-white lg:block">
        <div className="site-container flex h-9 items-center justify-between text-xs">
          <span>
            Lubumbashi · Haut-Katanga · Democratic Republic of the Congo
          </span>
          <div className="flex items-center gap-6">
            <span>{siteConfig.email}</span>
            <span>Mon–Fri · Business hours</span>
          </div>
        </div>
      </div> */}

      <TopBar />

      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 backdrop-blur-sm">
        <div className="site-container flex h-16 items-center justify-between gap-6 lg:h-20">
          <Link
            href="/"
            aria-label="MARC INGINEERING SERVICES SARL home"
            className="shrink-0"
          >
            <span className="logo-tile">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={140}
                height={120}
                priority
                className="h-11 w-auto object-contain lg:h-14"
              />
            </span>
          </Link>
          <nav
            className="hidden items-center gap-8 lg:flex"
            aria-label="Primary navigation"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link",
                  pathname === item.href && "nav-link-active",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <a
              href={`tel:${siteConfig.phones[0].replace(/\s/g, "")}`}
              className="flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <span className="icon-circle">
                <Phone className="size-4" />
              </span>
              {siteConfig.phones[0]}
            </a>
            <Link href="/contact#devis" className="button button-accent">
              Request a quote <ArrowRight className="size-4" />
            </Link>
          </div>
          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex size-11 items-center justify-center rounded-lg border border-border text-primary lg:hidden"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="mobile-menu lg:hidden">
            <nav
              className="site-container flex flex-col gap-2 py-6"
              aria-label="Mobile navigation"
            >
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mobile-nav-link",
                    pathname === item.href && "bg-secondary text-primary",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/contact#devis"
                className="button button-accent mt-4"
                onClick={() => setOpen(false)}
              >
                Request a quote <ArrowRight className="size-4" />
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
