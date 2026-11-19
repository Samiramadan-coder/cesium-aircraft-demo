import type { LucideIcon } from "lucide-react";
import {
  Gauge,
  Hexagon,
  IdCard,
  Plane,
  Radio,
  Route,
  Satellite,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { Permission } from "@/types/user";

// Sidebar entries. `key` is the translation key under "Navigation.items"
// and the page namespace under "Pages"; paths are unprefixed (no locale).
export type NavItem = {
  key:
    | "live"
    | "flights"
    | "zones"
    | "alerts"
    | "trackers"
    | "engineHours"
    | "aircrafts"
    | "pilots"
    | "adminstration";
  href: string;
  icon: LucideIcon;
  /** Hidden from users without it; the page also guards itself. */
  permission?: Permission;
};

export type NavSection = {
  key: "flightTracking";
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "flightTracking",
    items: [
      { key: "live", href: "/", icon: Radio },
      { key: "flights", href: "/flights", icon: Route },
      { key: "zones", href: "/zones", icon: Hexagon },
      { key: "alerts", href: "/alerts", icon: TriangleAlert },
      { key: "trackers", href: "/trackers", icon: Satellite },
      { key: "engineHours", href: "/engine-hours", icon: Gauge },
      { key: "aircrafts", href: "/aircrafts", icon: Plane },
      { key: "pilots", href: "/pilots", icon: IdCard },
      {
        key: "adminstration",
        href: "/adminstration",
        icon: Users,
        permission: "manageUsers",
      },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/** The user's own page, opened from the header's account menu. */
export const PROFILE_PATH = "/profile";

/** Whether `href` is the current page; "/" only matches itself. */
export function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
