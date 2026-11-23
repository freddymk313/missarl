"use client";

import React, { useState } from "react";
import { UserSession } from "@/lib/permissions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import {
  DashboardThemeProvider,
  type DashboardTheme,
} from "@/components/dashboard/dashboard-theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function DashboardShell({
  user,
  initialTheme = "light",
  children,
}: {
  user: UserSession;
  initialTheme?: DashboardTheme;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardThemeProvider initialTheme={initialTheme}>
      <div className="flex h-full w-full overflow-hidden bg-secondary/35 [[data-dashboard-theme=midnight]_&]:bg-transparent text-foreground selection:bg-accent/40 selection:text-foreground">
        {/* Skip link inside dashboard for keyboard navigation */}
        <a
          href="#dashboard-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-primary-foreground focus:shadow-md"
        >
          Passer au contenu principal
        </a>

        {/* Sidebar (264px persistent on desktop, off-canvas on mobile) */}
        <Sidebar
          user={user}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Column */}
        <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          <Topbar
            user={user}
            onOpenMobile={() => setMobileOpen(true)}
          />
          <main
            id="dashboard-main-content"
            tabIndex={-1}
            className="flex-1 min-h-0 p-3 sm:p-5 lg:p-8 overflow-y-auto outline-none"
          >
            {children}
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </DashboardThemeProvider>
  );
}