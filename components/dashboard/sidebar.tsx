"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  FileText,
  Users,
  Settings,
  ChevronDown,
  Search,
  LogOut,
  User,
  Plus,
} from "lucide-react";
import { UserSession, isRouteAllowed } from "@/lib/permissions";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Map actual dashboard route hrefs to permission check paths
function toPermissionPath(href: string): string {
  if (href.startsWith("/dashboard/items")) return "/dashboard/articles";
  if (href.startsWith("/dashboard/users")) return "/dashboard/utilisateurs";
  if (href.startsWith("/dashboard/settings")) return "/dashboard/parametres";
  return href;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavGroup {
  title?: string;
  collapsible?: boolean;
  items: NavItem[];
}

const NAV_STRUCTURE: NavGroup[] = [
  {
    items: [
      {
        href: "/dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Catalogue",
    items: [
      {
        href: "/dashboard/items",
        label: "Articles",
        icon: Package,
      },
      {
        href: "/dashboard/suppliers",
        label: "Fournisseurs",
        icon: Truck,
      },
    ],
  },
  {
    items: [
      {
        href: "/dashboard/clients",
        label: "Clients",
        icon: Building2,
      },
    ],
  },
  {
    title: "Ventes",
    collapsible: true,
    items: [
      {
        href: "/dashboard/quotes",
        label: "Devis",
        icon: FileSpreadsheet,
      },
      {
        href: "/dashboard/orders",
        label: "Commandes (PO)",
        icon: ShoppingCart,
      },
      {
        href: "/dashboard/invoices",
        label: "Factures",
        icon: Receipt,
      },
      {
        href: "/dashboard/payments",
        label: "Paiements",
        icon: CreditCard,
      },
      {
        href: "/dashboard/statements",
        label: "Relevés de compte",
        icon: FileText,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/dashboard/users",
        label: "Utilisateurs",
        icon: Users,
      },
      {
        href: "/dashboard/settings",
        label: "Paramètres",
        icon: Settings,
      },
    ],
  },
];

export interface SidebarProps {
  user: UserSession;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ user, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const roleDotClass =
    user.role === "SUPER_ADMIN"
      ? "bg-accent"
      : user.role === "ADMIN"
        ? "bg-primary"
        : "bg-success";

  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user.role === "ADMIN"
        ? "Commercial"
        : "Collecteur";

  // Filter groups where at least one item is allowed
  const filteredGroups = NAV_STRUCTURE.map((group) => {
    const allowedItems = group.items.filter((item) =>
      isRouteAllowed(user.role, toPermissionPath(item.href))
    );
    return { ...group, items: allowedItems };
  }).filter((group) => group.items.length > 0);

  const isQuotingAllowed =
    user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  return (
    <aside
      className={cn(
        "flex h-full w-[264px] flex-col justify-between border-r border-border bg-card text-card-foreground select-none",
        className
      )}
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Logo Tile */}
        <div className="flex items-center gap-3 px-2 py-1">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-2xs">
              M
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-primary">
                MIS SARL
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Logistique & Fournitures
              </span>
            </div>
          </Link>
        </div>

        {/* User Switcher Block */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-secondary/50 p-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="size-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                    {user.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
                    roleDotClass
                  )}
                  title={roleLabel}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-transform" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56 p-1.5">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
              Connecté en tant que
            </DropdownMenuLabel>
            <div className="px-2 py-1.5 mb-1 bg-secondary/60 rounded-md">
              <p className="text-xs font-bold text-foreground truncate">{user.fullName}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2"
              onClick={() => {
                onNavigate?.();
              }}
            >
              <User className="size-3.5 text-muted-foreground" />
              <Link href="/dashboard/settings" className="w-full">
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logoutAction} className="w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>Se déconnecter</span>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value) {
                router.push(
                  `/dashboard/items?q=${encodeURIComponent(
                    e.currentTarget.value
                  )}`
                );
                onNavigate?.();
              }
            }}
            className="h-9 w-full rounded-xl border border-border/70 bg-secondary/30 pl-8 pr-11 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border/70 bg-card px-1 py-0.5 text-[9px] font-semibold text-muted-foreground">
            ⌘F
          </kbd>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-4 overflow-y-auto pr-1">
          {filteredGroups.map((group, groupIdx) => {
            const isGroupCollapsed = group.title
              ? !!collapsedGroups[group.title]
              : false;

            return (
              <div key={group.title || `group-${groupIdx}`} className="flex flex-col gap-1">
                {group.title && (
                  <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    <span>{group.title}</span>
                    {group.collapsible && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title!)}
                        className="rounded p-0.5 hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn(
                            "size-3 transition-transform duration-200",
                            isGroupCollapsed && "-rotate-90"
                          )}
                        />
                      </button>
                    )}
                  </div>
                )}

                {!isGroupCollapsed && (
                  <div
                    className={cn(
                      "flex flex-col gap-0.5",
                      group.title && "relative pl-2 ml-2 border-l border-border/70"
                    )}
                  >
                    {group.items.map((item) => {
                      const isActive = item.exact
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(item.href + "/");

                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group relative flex h-10 items-center justify-between rounded-xl px-3 text-xs font-semibold transition-all",
                            isActive
                              ? "bg-secondary text-primary font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={cn(
                                "size-4 shrink-0 transition-colors",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {/* Active nav indicator bar (3px gold accent) */}
                          {isActive && (
                            <span
                              className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-accent"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promotional / Action Card */}
      <div className="p-4 pt-0">
        {isQuotingAllowed ? (
          <div className="relative overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm">
            <h4 className="text-xs font-bold tracking-tight">Nouveau devis</h4>
            <p className="mt-1 text-[11px] text-primary-foreground/80 leading-snug">
              Répondez à une demande de prix (RFQ) en quelques minutes.
            </p>
            <Link
              href="/dashboard/quotes/new"
              onClick={onNavigate}
              className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground shadow-2xs hover:bg-accent/90 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Créer un devis</span>
            </Link>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm">
            <h4 className="text-xs font-bold tracking-tight">Catalogue</h4>
            <p className="mt-1 text-[11px] text-primary-foreground/80 leading-snug">
              Consultez les caractéristiques et tarifs en vigueur.
            </p>
            <Link
              href="/dashboard/items"
              onClick={onNavigate}
              className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground shadow-2xs hover:bg-accent/90 transition-colors"
            >
              <Search className="size-3.5" />
              <span>Rechercher un article</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
