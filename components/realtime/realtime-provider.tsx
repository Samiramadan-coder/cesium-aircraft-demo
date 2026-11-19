"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useNotifications } from "@/components/notifications/notifications-provider";
import { showNotificationToast } from "@/components/notifications/notification-toast";
import { unlockNotificationSound } from "@/components/notifications/notification-sound";
import type { AppNotification } from "@/types/notifications";

/**
 * Realtime from Laravel Reverb, one connection for the whole app. Private
 * channels are authorized through app/api/broadcasting/auth (the browser
 * can't read the auth token, so Laravel is called from there).
 *
 * Without NEXT_PUBLIC_REVERB_APP_KEY nothing connects and pages fall back to
 * polling (see useRealtimeStatus).
 */

type RealtimeEcho = Echo<"reverb">;

/** "off" when realtime isn't configured. */
export type RealtimeStatus = "off" | "connecting" | "connected" | "offline";

type RealtimeContextValue = {
  echo: RealtimeEcho | null;
  subscribeStatus: (onChange: () => void) => () => void;
  getStatus: () => RealtimeStatus;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** "notification.created" on the user's private channel. */
type NotificationMessage = AppNotification & { type: string };

function toAppNotification(message: NotificationMessage): AppNotification {
  return {
    id: message.id,
    kind: message.kind,
    severity: message.severity,
    message: message.message,
    aircraftId: message.aircraftId,
    alertId: message.alertId,
    createdAt: message.createdAt,
    readAt: message.readAt,
  };
}

function createEcho(): RealtimeEcho | null {
  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  if (!key) return null;
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "https";
  const port = Number(
    process.env.NEXT_PUBLIC_REVERB_PORT ?? (scheme === "https" ? 443 : 80),
  );
  return new Echo({
    broadcaster: "reverb",
    key,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/api/broadcasting/auth",
    Pusher,
  });
}

function toStatus(state: string): RealtimeStatus {
  if (state === "connected") return "connected";
  if (state === "initialized" || state === "connecting") return "connecting";
  return "offline"; // unavailable, failed, disconnected
}

/** Connection state outside React state: only pages that read it re-render. */
function createStatusStore() {
  let current: RealtimeStatus = "off";
  const listeners = new Set<() => void>();
  return {
    set(next: RealtimeStatus) {
      if (current === next) return;
      current = next;
      for (const listener of listeners) listener();
    },
    subscribeStatus(onChange: () => void) {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    getStatus: () => current,
  };
}

export function RealtimeProvider({
  userId,
  children,
}: {
  userId: number;
  children: React.ReactNode;
}) {
  const { dispatch } = useNotifications();
  const [echo, setEcho] = useState<RealtimeEcho | null>(null);
  const [store] = useState(createStatusStore);

  useEffect(() => {
    const instance = createEcho();
    if (!instance) return;

    const connection = instance.connector.pusher.connection;
    const onStateChange = ({ current }: { current: string }) =>
      store.set(toStatus(current));
    connection.bind("state_change", onStateChange);
    store.set(toStatus(connection.state));

    // The bell in the header, on every page.
    const userChannel = `App.Models.User.${userId}`;
    instance
      .private(userChannel)
      .notification((message: NotificationMessage) => {
        const item = toAppNotification(message);
        dispatch({ type: "added", item });
        showNotificationToast(item);
      });
    // Sound needs a click or key press on the page first (browser rule).
    const stopUnlocking = unlockNotificationSound();

    // Connecting is a side effect; the instance is handed to children once
    // it exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEcho(instance);

    return () => {
      stopUnlocking();
      connection.unbind("state_change", onStateChange);
      instance.leave(userChannel);
      instance.disconnect();
      store.set("off");
      setEcho(null);
    };
  }, [userId, dispatch, store]);

  const value = useMemo(
    () => ({
      echo,
      subscribeStatus: store.subscribeStatus,
      getStatus: store.getStatus,
    }),
    [echo, store],
  );

  return <RealtimeContext value={value}>{children}</RealtimeContext>;
}

function useRealtime() {
  const value = use(RealtimeContext);
  if (!value) {
    throw new Error("useRealtime must be used inside RealtimeProvider");
  }
  return value;
}

/** Connection state, e.g. to poll while it isn't "connected". */
export function useRealtimeStatus(): RealtimeStatus {
  const { subscribeStatus, getStatus } = useRealtime();
  return useSyncExternalStore(subscribeStatus, getStatus, () => "off");
}

/**
 * Listens to events on a private channel while mounted, e.g.
 * `useChannelEvents("tracking", { "position.updated": onPosition })`.
 * Handlers may change between renders without resubscribing.
 */
export function useChannelEvents<
  T extends Record<string, (data: never) => void>,
>(channel: string, handlers: T) {
  const { echo } = useRealtime();
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const events = Object.keys(handlers).sort().join("|");

  useEffect(() => {
    if (!echo || !events) return;
    const subscription = echo.private(channel);
    const names = events.split("|");
    for (const name of names) {
      // A leading dot: the event's own name, not a Laravel class name.
      subscription.listen(`.${name}`, (data: never) =>
        latest.current[name]?.(data),
      );
    }
    return () => {
      for (const name of names) subscription.stopListening(`.${name}`);
      echo.leave(channel);
    };
  }, [echo, channel, events]);
}
