"use client";

import React, { useState } from "react";
import { Phone, Mail, MapPin, Globe } from "lucide-react";
import { siteConfig } from "@/app/config/site";

export function TopBar() {
  const [language, setLanguage] = useState<"fr" | "en">("en");

  return (
    <div className="bg-primary text-primary-foreground text-xs border-b border-white/10 select-none">
      <div className="mx-auto max-w-300 px-4 sm:px-6 h-9 sm:h-10 flex items-center justify-between">
        {/* Mobile-Only Contact Quick Action */}
        <div className="flex lg:hidden items-center gap-2 text-white/90">
          <a
            href={`tel:${siteConfig.phones[0].replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 font-medium hover:text-accent transition-colors"
          >
            <Phone className="size-3 text-accent shrink-0" />
            <span>{siteConfig.phones[0]}</span>
          </a>
        </div>

        {/* Desktop-Only Detailed Contact Info */}
        <div className="hidden lg:flex items-center gap-6 text-white/90">
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-accent shrink-0" />
            <span>{siteConfig.location.display[language]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 text-accent shrink-0" />
            <a
              href={`mailto:${siteConfig.email}`}
              className="hover:text-accent transition-colors"
            >
              {siteConfig.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-accent shrink-0" />
            <a
              href={`tel:${siteConfig.phones[0].replace(/\s/g, "")}`}
              className="hover:text-accent transition-colors"
            >
              {siteConfig.phones[0]}
            </a>
          </div>
        </div>

        {/* Right Side: Working hours (Desktop) & Language Switcher (Mobile + Desktop) */}
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="hidden lg:inline text-white/70">
            {language === "fr"
              ? "Lun - Sam : 08h00 - 17h00"
              : "Mon - Sat: 08:00 - 17:00"}
          </span>

          {/* Clean Bilingual Switcher */}
          <div className="flex items-center gap-1 bg-black/20 rounded-md px-2 py-0.5 border border-white/15">
            <Globe className="size-3 text-accent shrink-0" />
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              className={`text-[11px] font-semibold transition-colors px-1 rounded ${
                language === "fr"
                  ? "text-accent underline underline-offset-2"
                  : "text-white/70 hover:text-white"
              }`}
            >
              FR
            </button>
            <span className="text-white/30 text-[10px]">|</span>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`text-[11px] font-semibold transition-colors px-1 rounded ${
                language === "en"
                  ? "text-accent underline underline-offset-2"
                  : "text-white/70 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
