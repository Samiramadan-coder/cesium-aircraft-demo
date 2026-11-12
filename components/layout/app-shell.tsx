"use client";

import { useState } from "react";
import type { CurrentUser } from "@/types/user";
import type { AirportWeather } from "@/types/weather";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppShell({
  user,
  weather,
  hasUnreadNotifications,
  children,
}: {
  user: CurrentUser;
  weather: AirportWeather;
  hasUnreadNotifications: boolean;
  children: React.ReactNode;
}) {
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
