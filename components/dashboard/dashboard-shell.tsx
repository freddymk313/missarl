"use client";

import * as React from "react";
import { UserSession } from "@/lib/permissions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

export interface DashboardShellProps {
  user: UserSession;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-secondary/35 text-foreground antialiased selection:bg-accent/30 selection:text-foreground">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-primary-foreground focus:shadow-md focus:outline-none"
      >
        Passer au contenu principal
      </a>

      {/* Desktop Sidebar (lg+) */}
      <div className="hidden lg:block lg:shrink-0 sticky top-0 h-screen">
        <Sidebar user={user} />
      </div>

      {/* Mobile / Tablet Off-canvas Sheet (< lg) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-r border-border bg-card"
        >
          <Sidebar
            user={user}
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar user={user} onOpenMobile={() => setMobileOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
