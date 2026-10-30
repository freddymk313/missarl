"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Bell, HelpCircle, Phone, Mail, MapPin, ExternalLink, Shield } from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { UserSession } from "@/lib/permissions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface TopbarProps {
  user: UserSession;
  onOpenMobile: () => void;
}

export function Topbar({ user, onOpenMobile }: TopbarProps) {
  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user.role === "ADMIN"
        ? "Admin Commercial"
        : "Collecteur de Prix";
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="size-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary sm:text-sm tracking-tight truncate">
            {siteConfig.name}
          </span>
          <span className="hidden md:inline-block text-[10px] text-muted-foreground/80 px-2 py-0.5 rounded-md bg-secondary border border-border/60">
            {siteConfig.address.city} · {siteConfig.address.region}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
            <Shield className="size-2.5 text-primary" />
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Support & Assistance Button */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Aide & Assistance technique"
                aria-label="Aide et contact support"
              />
            }
          >
            <HelpCircle className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4 bg-card border-border shadow-lg">
            <h4 className="text-xs font-bold text-foreground">Support & Assistance</h4>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Besoin d&apos;assistance sur la plateforme commerciale MIS SARL ?
            </p>
            <div className="mt-3 space-y-2 border-t border-border/70 pt-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {siteConfig.phones[0]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5 text-primary shrink-0" />
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="font-semibold text-primary hover:underline truncate"
                >
                  {siteConfig.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {siteConfig.address.city}, {siteConfig.address.region}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-border/70 pt-2 text-right">
              <Link
                href="/dashboard/settings"
                className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Paramètres système <ExternalLink className="size-3" />
              </Link>
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="relative flex size-9 items-center justify-center rounded-xl border border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Notifications"
                aria-label="Notifications"
              />
            }
          >
            <Bell className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4 bg-card border-border shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <h4 className="text-xs font-bold text-foreground">Notifications</h4>
              <span className="text-[10px] text-muted-foreground">0 non lues</span>
            </div>
            <div className="py-6 text-center text-xs text-muted-foreground">
              <Bell className="size-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-medium text-foreground">Aucune notification</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Vous êtes à jour dans vos alertes opérationnelles.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
