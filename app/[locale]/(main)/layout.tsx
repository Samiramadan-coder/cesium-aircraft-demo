import { api } from "@/lib/api/client";
import { AirportWeather } from "@/types/weather";
import { unstable_rethrow } from "next/navigation";
import { Notifications } from "@/types/notifications";
import { StaffMember } from "@/types/user";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";
import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { EngineersProvider } from "@/components/common/engineers-provider";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { NotificationToaster } from "@/components/notifications/notification-toast";

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

/**
 * Airport weather for the header badge. It comes from an outside provider
 * (503 when unreachable or switched off), so a failure renders the badge's
 * fallback instead of breaking every page.
 */
async function getWeather(): Promise<AirportWeather | null> {
  try {
    return await api.get<AirportWeather>("/v1/weather/omef");
  } catch (error) {
    unstable_rethrow(error);
    console.error("[layout] Couldn't load weather", error);
    return null;
  }
}

const NO_NOTIFICATIONS: Notifications = { data: [], unreadCount: 0 };

/**
 * Initial notifications. A failure starts the menu empty; realtime pushes
 * still arrive through the RealtimeProvider.
 */
async function getNotifications(): Promise<Notifications> {
  try {
    return await api.get<Notifications>("/v1/notifications");
  } catch (error) {
    unstable_rethrow(error);
    console.error("[layout] Couldn't load notifications", error);
    return NO_NOTIFICATIONS;
  }
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only the current user is required; the other loaders never reject.
  const [user, weather, notifications, engineers] = await Promise.all([
    getCurrentUser(),
    getWeather(),
    getNotifications(),
    getEngineers(),
  ]);

  return (
    <PermissionsProvider permissions={user.permissions}>
      <NotificationsProvider initial={notifications}>
        <RealtimeProvider userId={user.id}>
          <AppShell user={user} weather={weather}>
            <EngineersProvider engineers={engineers}>
              {children}
            </EngineersProvider>
          </AppShell>
          <NotificationToaster />
        </RealtimeProvider>
      </NotificationsProvider>
    </PermissionsProvider>
  );
}
