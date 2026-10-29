"use client";

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
  ChevronRight,
  Shield,
  X,
} from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { UserSession, isRouteAllowed } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: UserSession;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/items",
    label: "Items",
    icon: Package,
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: Building2,
  },
  {
    href: "/dashboard/suppliers",
    label: "Suppliers",
    icon: Truck,
  },
  {
    href: "/dashboard/quotes",
    label: "Quotes",
    icon: FileSpreadsheet,
  },
  {
    href: "/dashboard/orders",
    label: "PO / Commandes",
    icon: ShoppingCart,
  },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: Receipt,
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    href: "/dashboard/statements",
    label: "Statements",
    icon: FileText,
  },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function Sidebar({ user, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const allowedNav = navItems.filter((item) =>
    isRouteAllowed(user.role, item.href),
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 border-r border-slate-800",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shrink-0">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={36}
                height={36}
                className="h-7 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-white leading-none">
                {siteConfig.shortName}
              </p>
              <p className="text-[10px] font-bold tracking-widest text-accent uppercase mt-1">
                Espace Gestion
              </p>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all",
                  isActive
                    ? "bg-accent text-slate-900 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive
                        ? "text-slate-900"
                        : "text-slate-400 group-hover:text-white",
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="size-3.5 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* User Identity Info at Bottom */}
        <div className="border-t border-slate-800 p-4">
          <div className="rounded-xl bg-slate-800/50 p-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent/20 text-accent font-bold text-xs shrink-0">
              <Shield className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-white truncate">
                {user.fullName}
              </p>
              <p className="text-[10px] font-semibold text-accent truncate">
                {user.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : user.role === "ADMIN"
                    ? "Admin Commercial"
                    : "Collecteur de Prix"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
