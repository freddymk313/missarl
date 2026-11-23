"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_THEME_STORAGE_KEY,
  type DashboardTheme,
} from "@/lib/dashboard-theme";

export { DASHBOARD_THEME_STORAGE_KEY, type DashboardTheme };

interface DashboardThemeContextValue {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  toggleTheme: () => void;
  portalContainer: HTMLElement | null;
}

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

const listeners = new Set<() => void>();

function emitThemeChange() {
  for (const listener of listeners) {
    listener();
  }
}

function mirrorThemeCookie(theme: DashboardTheme) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${DASHBOARD_THEME_STORAGE_KEY}=${theme}; path=/dashboard; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore cookie write errors
  }
}

export function readStoredDashboardTheme(): DashboardTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribeDashboardTheme(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DASHBOARD_THEME_STORAGE_KEY) {
      mirrorThemeCookie(readStoredDashboardTheme());
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeStoredDashboardTheme(next: DashboardTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage quota or private-mode errors
  }
  mirrorThemeCookie(next);
  emitThemeChange();
}

export function DashboardThemeProvider({
  initialTheme = "light",
  children,
}: {
  initialTheme?: DashboardTheme;
  children: React.ReactNode;
}) {
  const getServerSnapshot = useCallback(
    (): DashboardTheme => initialTheme,
    [initialTheme]
  );

  const theme = useSyncExternalStore(
    subscribeDashboardTheme,
    readStoredDashboardTheme,
    getServerSnapshot
  );
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const setTheme = useCallback((next: DashboardTheme) => {
    const normalized: DashboardTheme = next === "dark" ? "dark" : "light";
    writeStoredDashboardTheme(normalized);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = readStoredDashboardTheme();
    writeStoredDashboardTheme(current === "dark" ? "light" : "dark");
  }, []);

  // Keep /dashboard cookie mirrored to localStorage & sync DOM root strictly inside dashboard
  useEffect(() => {
    mirrorThemeCookie(theme);
    const root = document.getElementById("dashboard-theme-root");
    if (!root) return;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-dashboard-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-dashboard-theme", "light");
    }
  }, [theme]);

  const value = useMemo<DashboardThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      portalContainer,
    }),
    [theme, setTheme, toggleTheme, portalContainer]
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        id="dashboard-theme-root"
        data-dashboard-theme={theme}
        suppressHydrationWarning
        className={cn(
          "dashboard-theme fixed inset-0 flex h-full w-full overflow-hidden bg-background text-foreground antialiased transition-colors duration-150",
          theme === "dark" && "dark"
        )}
      >
        {children}
        <div
          id="dashboard-portal-root"
          ref={setPortalContainer}
          className="contents"
        />
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const ctx = useContext(DashboardThemeContext);
  if (!ctx) {
    return {
      theme: "light" as DashboardTheme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return {
    theme: ctx.theme,
    setTheme: ctx.setTheme,
    toggleTheme: ctx.toggleTheme,
  };
}

export function useDashboardPortalContainer(): HTMLElement | null {
  const ctx = useContext(DashboardThemeContext);
  return ctx?.portalContainer ?? null;
}
