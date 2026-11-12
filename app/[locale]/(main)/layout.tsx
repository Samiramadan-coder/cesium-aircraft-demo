import { AppShell } from "@/components/layout/app-shell";
import {
  MOCK_AIRPORT_WEATHER,
  MOCK_CURRENT_USER,
  MOCK_HAS_UNREAD_NOTIFICATIONS,
} from "@/lib/mock/header-data";

export default function Layout({ children }: { children: React.ReactNode }) {
  // TODO: load these from the backend once the endpoints exist.
  return (
    <AppShell
      user={MOCK_CURRENT_USER}
      weather={MOCK_AIRPORT_WEATHER}
      hasUnreadNotifications={MOCK_HAS_UNREAD_NOTIFICATIONS}
    >
      {children}
    </AppShell>
  );
}
