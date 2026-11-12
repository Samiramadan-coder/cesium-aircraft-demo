import { api } from "@/lib/api/client";
import { CurrentUser } from "@/types/user";
import { AirportWeather } from "@/types/weather";
import { Notifications } from "@/types/notifications";
import { AppShell } from "@/components/layout/app-shell";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, weather, notifications] = await Promise.all([
    api.get<CurrentUser>("/v1/auth/me"),
    api.get<AirportWeather>("/v1/weather/omef"),
    api.get<Notifications>("/v1/notifications"),
  ]);

  return (
    <AppShell
      user={user}
      weather={weather}
      hasUnreadNotifications={notifications.unreadCount > 0}
    >
      {children}
    </AppShell>
  );
}
