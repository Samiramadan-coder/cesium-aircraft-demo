"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

/** Sidebar + header frame around every signed-in page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  // Mobile only; on large screens the sidebar is always shown.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
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
