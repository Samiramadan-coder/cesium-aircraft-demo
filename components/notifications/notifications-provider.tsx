"use client";

import { createContext, use, useReducer, useTransition } from "react";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { AppNotification, Notifications } from "@/types/notifications";

/** How many notifications the header menu keeps. */
const MAX_ITEMS = 20;

type State = { items: AppNotification[]; unreadCount: number };

/**
 * Every change goes through here, so a realtime feed only has to dispatch
 * `added` (and `snapshot` after a reconnect) for the bell to update.
 */
export type NotificationEvent =
  | { type: "snapshot"; notifications: Notifications }
  | { type: "added"; item: AppNotification }
  | { type: "allRead"; readAt: number };

function reducer(state: State, event: NotificationEvent): State {
  switch (event.type) {
    case "snapshot":
      return {
        items: event.notifications.data.slice(0, MAX_ITEMS),
        unreadCount: event.notifications.unreadCount,
      };
    case "added": {
      // The same event can arrive twice (reconnect, snapshot race)
      if (state.items.some((item) => item.id === event.item.id)) return state;
      return {
        items: [event.item, ...state.items].slice(0, MAX_ITEMS),
        unreadCount: state.unreadCount + (event.item.readAt ? 0 : 1),
      };
    }
    case "allRead":
      return {
        items: state.items.map((item) =>
          item.readAt ? item : { ...item, readAt: event.readAt },
        ),
        unreadCount: 0,
      };
  }
}

type NotificationsContextValue = State & {
  dispatch: (event: NotificationEvent) => void;
  markAllRead: () => void;
  markingAllRead: boolean;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({
  initial,
  children,
}: {
  initial: Notifications;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    items: initial.data.slice(0, MAX_ITEMS),
    unreadCount: initial.unreadCount,
  });
  const [markingAllRead, startMarkAllRead] = useTransition();

  // Optimistic; on failure the previous state comes back
  function markAllRead() {
    if (state.unreadCount === 0) return;
    const previous = { data: state.items, unreadCount: state.unreadCount };
    dispatch({ type: "allRead", readAt: Date.now() });
    startMarkAllRead(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) dispatch({ type: "snapshot", notifications: previous });
    });
  }

  return (
    <NotificationsContext
      value={{ ...state, dispatch, markAllRead, markingAllRead }}
    >
      {children}
    </NotificationsContext>
  );
}

export function useNotifications() {
  const value = use(NotificationsContext);
  if (!value) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return value;
}
