"use client";

import { Menu, LogOut, ShieldCheck } from "lucide-react";
import { UserSession } from "@/lib/permissions";
import { logoutAction } from "@/actions/auth";

interface TopbarProps {
  user: UserSession;
  onOpenMobile: () => void;
}

export function Topbar({ user, onOpenMobile }: TopbarProps) {
  const roleBadges: Record<string, { label: string; bg: string; text: string }> = {
    SUPER_ADMIN: {
      label: "Super Admin",
      bg: "bg-amber-100 border-amber-300 text-amber-900",
      text: "text-amber-900",
    },
    ADMIN: {
      label: "Admin Commercial",
      bg: "bg-blue-100 border-blue-300 text-blue-900",
      text: "text-blue-900",
    },
    PRICE_COLLECTOR: {
      label: "Collecteur de Prix",
      bg: "bg-emerald-100 border-emerald-300 text-emerald-900",
      text: "text-emerald-900",
    },
  };

  const badge = roleBadges[user.role] || {
    label: user.role,
    bg: "bg-slate-100 border-slate-300 text-slate-800",
    text: "text-slate-800",
  };

  return (
    <header className="sticky top-0 z-30 flex h-18 w-full items-center justify-between border-b border-border bg-white px-4 sm:px-8 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <h2 className="text-sm font-extrabold text-primary sm:text-base tracking-tight">
            Système de Gestion Commerciale
          </h2>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Lubumbashi, Haut-Katanga · RDC
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Identity Chip */}
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-slate-50 px-3 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-white text-xs font-black">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold leading-tight text-primary truncate max-w-[140px]">
              {user.fullName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <span
            className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black border uppercase tracking-wider ${badge.bg}`}
          >
            <ShieldCheck className="size-3" />
            {badge.label}
          </span>
        </div>

        {/* Logout Button */}
        <form action={logoutAction}>
          <button
            type="submit"
            title="Se déconnecter"
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </form>
      </div>
    </header>
  );
}
