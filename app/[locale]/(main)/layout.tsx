import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/client";
import { CurrentUser, StaffMember } from "@/types/user";
import { AirportWeather } from "@/types/weather";
import { Notifications } from "@/types/notifications";
import { AppShell } from "@/components/layout/app-shell";
import { EngineersProvider } from "@/components/common/engineers-provider";

/**
 * Engineer names for the maintenance and tracker forms. A failure (e.g. a
 * role that can't list users) leaves the selects empty instead of breaking
 * every page.
 */
async function getEngineers(): Promise<string[]> {
  try {
    const users = await api.get<StaffMember[]>("/v1/users", {
      query: { role: "engineer" },
    });
    return users.map((user) => user.name);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[layout] Couldn't load engineers", error);
    return [];
  }
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, weather, notifications, engineers] = await Promise.all([
    api.get<CurrentUser>("/v1/auth/me"),
    api.get<AirportWeather>("/v1/weather/omef"),
    api.get<Notifications>("/v1/notifications"),
    getEngineers(),
  ]);

  return (
    <AppShell
      user={user}
      weather={weather}
      hasUnreadNotifications={notifications.unreadCount > 0}
    >
      <EngineersProvider engineers={engineers}>{children}</EngineersProvider>
    </AppShell>
  );
}
