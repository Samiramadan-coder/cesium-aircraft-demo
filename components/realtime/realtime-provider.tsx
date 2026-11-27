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
import type { AppNotification, Notifications } from "@/types/notifications";

/**
 * Realtime from Laravel Reverb, one connection for the whole app. Private
 * channels are authorized through app/api/broadcasting/auth (the browser
 * can't read the auth token, so Laravel is called from there).
 *
 * Without NEXT_PUBLIC_REVERB_APP_KEY nothing connects and pages fall back to
 * polling (see useRealtimeStatus); notifications are then polled here too.
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

/** While Reverb is unreachable, how often notifications are polled. */
const NOTIFICATION_POLL_MS = 10_000;
/** Older ones still reach the bell but don't pop up (e.g. after an outage). */
const TOAST_MAX_AGE_MS = 10 * 60_000;
/** At most this many toasts for notifications that arrive together. */
const MAX_TOASTS_AT_ONCE = 3;

const SEVERITY_RANK: Record<AppNotification["severity"], number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

/**
 * Notifications the client already has, so polling only reports new ones.
 * `newest` is the latest server `createdAt` seen; anything older that the
 * menu dropped (it keeps 20) isn't mistaken for new.
 */
type KnownNotifications = { ids: Set<string>; newest: number };

function createKnown(items: AppNotification[]): KnownNotifications {
  return {
    ids: new Set(items.map((item) => item.id)),
    newest: Math.max(0, ...items.map((item) => item.createdAt)),
  };
}

/** Toasts the newest few unread ones, with one sound (the most severe). */
function toastNew(items: AppNotification[]) {
  const recent = items
    .filter(
      (item) => !item.readAt && item.createdAt > Date.now() - TOAST_MAX_AGE_MS,
    )
    .slice(-MAX_TOASTS_AT_ONCE);
  if (!recent.length) return;
  const loudest = recent.reduce((a, b) =>
    SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] ? b : a,
  );
  for (const item of recent) {
    showNotificationToast(item, { silent: item !== loudest });
  }
}

const REALTIME_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_REVERB_APP_KEY);

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
  const { items, dispatch } = useNotifications();
  const [echo, setEcho] = useState<RealtimeEcho | null>(null);
  const [store] = useState(createStatusStore);
  const [known] = useState(() => createKnown(items));
  const status = useSyncExternalStore(
    store.subscribeStatus,
    store.getStatus,
    () => "off" as const,
  );

  /**
   * Fallback for the user channel: while Reverb is unreachable (or not
   * configured), poll notifications and raise the same toasts and sound.
   * Once connected, fetch once to catch what was missed meanwhile.
   */
  const fallback: "poll" | "catchUp" | null =
    status === "offline" || !REALTIME_CONFIGURED
      ? "poll"
      : status === "connected"
        ? "catchUp"
        : null;

  useEffect(() => {
    if (!fallback) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const { data } = (await response.json()) as Notifications;
        const fresh = data
          .filter(
            (item) => !known.ids.has(item.id) && item.createdAt >= known.newest,
          )
          .sort((a, b) => a.createdAt - b.createdAt);
        if (controller.signal.aborted || !fresh.length) return;
        for (const item of fresh) {
          known.ids.add(item.id);
          known.newest = Math.max(known.newest, item.createdAt);
          dispatch({ type: "added", item });
        }
        toastNew(fresh);
      } catch {
        // Offline or aborted: try again on the next round.
      } finally {
        if (fallback === "poll" && !controller.signal.aborted) {
          timer = setTimeout(check, NOTIFICATION_POLL_MS);
        }
      }
    }
    void check();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fallback, known, dispatch]);

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
        if (known.ids.has(item.id)) return; // already polled
        known.ids.add(item.id);
        known.newest = Math.max(known.newest, item.createdAt);
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
  }, [userId, dispatch, store, known]);

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
