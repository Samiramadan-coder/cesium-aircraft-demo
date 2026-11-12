"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { CurrentUser } from "@/types/user";
import type { AirportWeather } from "@/types/weather";

type AppShellProps = {
  user: CurrentUser;
  weather: AirportWeather;
  hasUnreadNotifications: boolean;
  children: React.ReactNode;
};

/** Sidebar + header frame around every signed-in page. */
export function AppShell({
  user,
  weather,
  hasUnreadNotifications,
  children,
}: AppShellProps) {
  // Mobile only; on large screens the sidebar is always shown.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          weather={weather}
          hasUnreadNotifications={hasUnreadNotifications}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        {/* `relative` so full-bleed pages (the live map) can fill it. */}
        <main className="relative min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
