"use client";

import { createContext, useContext } from "react";
import type { CurrentUser, Permission } from "@/types/user";

type Permissions = CurrentUser["permissions"];

const NONE: Permissions = {
  manageFleet: false,
  manageOperations: false,
  manageMaintenance: false,
  manageUsers: false,
};

// Defaults to nothing allowed, so a component rendered outside the
// provider never shows controls the user can't use
const PermissionsContext = createContext<Permissions>(NONE);

/** Shares the signed-in user's permissions with client components. */
export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: Permissions;
  children: React.ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={{ ...NONE, ...permissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

/** All of the signed-in user's permissions. */
export function usePermissions(): Permissions {
  return useContext(PermissionsContext);
}

/** Whether the signed-in user has `permission`. */
export function usePermission(permission: Permission): boolean {
  return useContext(PermissionsContext)[permission];
}

/**
 * Renders `children` only when the user has `permission`. Usable from
 * server components too, e.g. around an "Add" button.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return usePermission(permission) ? children : fallback;
}
