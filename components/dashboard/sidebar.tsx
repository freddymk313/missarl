"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
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
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Plus,
  X,
} from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { UserSession, isRouteAllowed, ROLES } from "@/lib/permissions";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: UserSession;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavLeaf {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavGroup {
  groupTitle: string;
  collapsible?: boolean;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const navigationStructure: NavEntry[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    groupTitle: "Catalogue",
    items: [
      { href: "/dashboard/items", label: "Articles", icon: Package },
      { href: "/dashboard/suppliers", label: "Fournisseurs", icon: Truck },
    ],
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: Building2,
  },
  {
    groupTitle: "Ventes",
    collapsible: true,
    items: [
      { href: "/dashboard/quotes", label: "Devis", icon: FileSpreadsheet },
      { href: "/dashboard/orders", label: "Commandes (PO)", icon: ShoppingCart },
      { href: "/dashboard/invoices", label: "Factures", icon: Receipt },
      { href: "/dashboard/payments", label: "Paiements", icon: CreditCard },
      { href: "/dashboard/statements", label: "Relevés de compte", icon: FileText },
    ],
  },
  {
    groupTitle: "Administration",
    items: [
      { href: "/dashboard/users", label: "Utilisateurs", icon: Users },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

export function Sidebar({ user, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const roleMeta = ROLES[user.role] || { label: user.role, description: "" };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-navy-dark/40 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-[264px] flex-col border-r border-border bg-card text-foreground transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        {/* Mobile Header Logo & Close */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
          <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-2.5">
            <div className="bg-white p-1 rounded-md border border-border">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={28}
                height={28}
                className="h-5 w-auto object-contain"
              />
            </div>
            <span className="text-xs font-bold text-primary">{siteConfig.shortName}</span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 1. User Switcher Block at Top */}
        <div className="relative border-b border-border p-3">
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-secondary/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={userDropdownOpen}
          >
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs">
              {user.fullName.charAt(0).toUpperCase()}
              {/* Role badge dot */}
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
                  user.role === "SUPER_ADMIN"
                    ? "bg-accent"
                    : user.role === "ADMIN"
                    ? "bg-primary"
                    : "bg-success"
                )}
                title={roleMeta.label}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {user.fullName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {user.email}
              </p>
            </div>

            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform shrink-0",
                userDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* User Switcher Dropdown */}
          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-3 right-3 top-full z-40 mt-1 rounded-xl border border-border bg-popover p-1.5 shadow-lg text-popover-foreground animate-in fade-in-50 zoom-in-95">
                <div className="px-2.5 py-2 border-b border-border/80">
                  <p className="text-xs font-bold text-foreground">{user.fullName}</p>
                  <p className="text-[10px] font-semibold text-primary mt-0.5">
                    {roleMeta.label}
                  </p>
                </div>

                <div className="py-1">
                  {user.role === "SUPER_ADMIN" && (
                    <Link
                      href="/dashboard/settings"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onCloseMobile();
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <UserIcon className="size-3.5 text-muted-foreground" />
                      <span>Mon compte</span>
                    </Link>
                  )}

                  <form action={logoutAction} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="size-3.5" />
                      <span>Se déconnecter</span>
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 2. Search Input with Keyboard Shortcut Hint */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Rechercher..."
              className="h-9 w-full rounded-xl border border-border bg-secondary/50 pl-8 pr-8 text-xs placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/70">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* 3. Navigation List with 40px rows, 10px radius, collapsible groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 no-scrollbar">
          {navigationStructure.map((entry) => {
            // Standalone Leaf Item
            if ("href" in entry) {
              const allowed = isRouteAllowed(user.role, entry.href);
              if (!allowed) return null;

              if (
                searchFilter &&
                !entry.label.toLowerCase().includes(searchFilter.toLowerCase())
              ) {
                return null;
              }

              const Icon = entry.icon;
              const isActive = entry.exact
                ? pathname === entry.href
                : pathname.startsWith(entry.href);

              return (
                <div key={entry.href}>
                  <Link
                    href={entry.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "group relative flex h-10 items-center justify-between rounded-[10px] px-3 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-secondary text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span>{entry.label}</span>
                    </div>
                  </Link>
                </div>
              );
            }

            // Group with sub-items
            const group = entry as NavGroup;
            const allowedItems = group.items.filter((item) => {
              if (!isRouteAllowed(user.role, item.href)) return false;
              if (
                searchFilter &&
                !item.label.toLowerCase().includes(searchFilter.toLowerCase())
              ) {
                return false;
              }
              return true;
            });

            if (allowedItems.length === 0) return null;

            const isCollapsed = collapsedGroups[group.groupTitle] ?? false;

            return (
              <div key={group.groupTitle} className="space-y-1">
                <div
                  className="flex items-center justify-between px-3 py-1 cursor-pointer select-none text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  onClick={() => group.collapsible && toggleGroup(group.groupTitle)}
                >
                  <span>{group.groupTitle}</span>
                  {group.collapsible && (
                    <ChevronDown
                      className={cn(
                        "size-3 text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                  )}
                </div>

                {!isCollapsed && (
                  <div className="relative pl-3.5 space-y-0.5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/80">
                    {allowedItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          className={cn(
                            "group relative flex h-10 items-center justify-between rounded-[10px] px-3 text-xs font-semibold transition-all",
                            isActive
                              ? "bg-secondary text-primary font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          {isActive && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent"
                              aria-hidden="true"
                            />
                          )}
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                "size-4 shrink-0 transition-colors",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                              )}
                            />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 4. Promotional-style Card Pinned to the Bottom */}
        <div className="p-3 border-t border-border mt-auto">
          {user.role === "PRICE_COLLECTOR" ? (
            <div className="rounded-2xl bg-primary text-primary-foreground p-4 shadow-sm">
              <p className="text-xs font-bold leading-tight">Rechercher un article</p>
              <p className="text-[11px] text-primary-foreground/75 mt-1 leading-normal">
                Consultez les fiches techniques et prix catalogue en temps réel.
              </p>
              <Link
                href="/dashboard/items"
                onClick={onCloseMobile}
                className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-colors shadow-2xs"
              >
                <Search className="size-3.5" />
                <span>Ouvrir catalogue</span>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-primary text-primary-foreground p-4 shadow-sm">
              <p className="text-xs font-bold leading-tight">Nouveau devis</p>
              <p className="text-[11px] text-primary-foreground/75 mt-1 leading-normal">
                Répondez à une demande de prix (RFQ) en quelques minutes.
              </p>
              <Link
                href="/dashboard/quotes/new"
                onClick={onCloseMobile}
                className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-colors shadow-2xs"
              >
                <Plus className="size-3.5" />
                <span>Créer un devis</span>
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
