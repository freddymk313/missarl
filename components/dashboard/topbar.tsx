"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  HelpCircle,
  Bell,
  Phone,
  Mail,
  MapPin,
  LayoutDashboard,
  Package,
  Building2,
  Truck,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  FileText,
  Users,
  Settings,
  ChevronRight,
} from "lucide-react";
import { UserSession, ROLES } from "@/lib/permissions";
import { siteConfig } from "@/app/config/site";

interface TopbarProps {
  user: UserSession;
  onOpenMobile: () => void;
}

// Maps pathnames to icon and title
const pageTitleMap: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  "/dashboard": { title: "Tableau de bord", icon: LayoutDashboard },
  "/dashboard/items": { title: "Articles & Tarifs", icon: Package },
  "/dashboard/suppliers": { title: "Fournisseurs", icon: Truck },
  "/dashboard/clients": { title: "Clients & Partenaires", icon: Building2 },
  "/dashboard/quotes": { title: "Devis & Proformas", icon: FileSpreadsheet },
  "/dashboard/quotes/new": { title: "Nouveau Devis", icon: FileSpreadsheet },
  "/dashboard/orders": { title: "Commandes Clients (PO)", icon: ShoppingCart },
  "/dashboard/invoices": { title: "Factures de Vente", icon: Receipt },
  "/dashboard/payments": { title: "Paiements Reçus", icon: CreditCard },
  "/dashboard/statements": { title: "Relevés de Compte", icon: FileText },
  "/dashboard/users": { title: "Gestion des Utilisateurs", icon: Users },
  "/dashboard/settings": { title: "Paramètres Système", icon: Settings },
};

export function Topbar({ user, onOpenMobile }: TopbarProps) {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Find matching title or prefix
  let currentMeta = pageTitleMap[pathname];
  if (!currentMeta) {
    const matchingKey = Object.keys(pageTitleMap).find(
      (k) => k !== "/dashboard" && pathname.startsWith(k)
    );
    currentMeta = matchingKey ? pageTitleMap[matchingKey] : { title: "Espace Gestion", icon: LayoutDashboard };
  }

  const PageIcon = currentMeta.icon;
  const roleMeta = ROLES[user.role] || { label: user.role, description: "" };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="size-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex size-7 items-center justify-center rounded-lg bg-secondary text-primary shrink-0 border border-border/60">
            <PageIcon className="size-4" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
            {currentMeta.title}
          </h2>
        </div>
      </div>

      {/* Right side icon buttons in rounded light-tinted squares */}
      <div className="flex items-center gap-2">
        {/* Help Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setHelpOpen(!helpOpen);
              setNotifOpen(false);
            }}
            className="flex size-9 items-center justify-center rounded-xl bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Aide et assistance"
          >
            <HelpCircle className="size-4" />
          </button>

          {helpOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setHelpOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-popover p-4 shadow-lg text-popover-foreground z-50 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-center gap-2 pb-2.5 border-b border-border">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <HelpCircle className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Support & Assistance</p>
                    <p className="text-[10px] text-muted-foreground">{siteConfig.shortName} SARL</p>
                  </div>
                </div>

                <div className="py-2.5 space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="leading-tight text-[11px]">
                      {siteConfig.address.city}, {siteConfig.address.region}, {siteConfig.address.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="size-3.5 text-primary shrink-0" />
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="text-[11px] font-semibold text-primary hover:underline truncate"
                    >
                      {siteConfig.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="size-3.5 text-primary shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">
                      {siteConfig.phones[0]}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex justify-end">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setHelpOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <span>Voir les paramètres</span>
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setHelpOpen(false);
            }}
            className="flex size-9 items-center justify-center rounded-xl bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-popover p-4 shadow-lg text-popover-foreground z-50 animate-in fade-in-50 zoom-in-95 text-center">
                <div className="flex items-center justify-between pb-2 border-b border-border text-left">
                  <p className="text-xs font-bold text-foreground">Notifications</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">0 nouvelle</span>
                </div>
                <div className="py-6">
                  <p className="text-xs text-muted-foreground">Aucune notification pour le moment.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Identity Chip on Right (Header) */}
        <div className="ml-1 hidden sm:flex items-center gap-2 pl-2 border-l border-border/80">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-2xs">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold text-foreground leading-tight truncate max-w-[120px]">
              {user.fullName}
            </p>
            <span className="inline-block text-[10px] font-semibold text-primary leading-tight">
              {roleMeta.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
