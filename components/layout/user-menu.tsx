"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PROFILE_PATH } from "@/constants/navigation";
import { initials } from "@/lib/utils";
import type { CurrentUser } from "@/types/user";

const itemClass =
  "flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none select-none data-disabled:opacity-50 data-highlighted:bg-card-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-foreground-2";

/** Avatar, name and role; opens the Profile / Sign out menu. */
export function UserMenu({ user }: { user: CurrentUser }) {
  const t = useTranslations("Header");
  const role = t(`roles.${user.role}`);

  return (
    <Menu.Root>
      <Menu.Trigger
        className="group flex h-11 items-center gap-2.5 rounded-full border border-border bg-card-2/60 py-1 ps-1 pe-1 outline-none transition-colors hover:bg-card-2 focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-card-2 md:pe-3"
        aria-label={t("accountMenu", { name: user.name })}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          aria-hidden
        >
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 flex-col items-start text-start leading-tight md:flex">
          <span className="max-w-40 truncate text-sm font-semibold">
            {user.name}
          </span>
          <span className="max-w-40 truncate text-xs text-muted">{role}</span>
        </span>
        <ChevronDown
          className="hidden size-4 text-foreground-2 transition-transform group-data-popup-open:rotate-180 md:block"
          aria-hidden
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="min-w-48 origin-(--transform-origin) rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl shadow-black/40 outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.LinkItem
              closeOnClick
              render={<Link href={PROFILE_PATH} />}
              className={itemClass}
            >
              <User aria-hidden />
              {t("profile")}
            </Menu.LinkItem>
            {/* TODO: sign out (backend logout endpoint + clear the auth
                cookie, then go to the login page). Only closes the menu. */}
            <Menu.Item className={itemClass}>
              <LogOut aria-hidden />
              {t("signOut")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
