/** Roles as returned by `/v1/users` and `/v1/auth/me`. */
export type UserRole = "super_admin" | "operations" | "engineer" | "viewer";

/** The signed-in user, as shown in the header. */
export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  locale: "en" | "ar";
  canManageFleet: boolean;
  permissions: {
    manageFleet: boolean;
    manageOperations: boolean;
    manageMaintenance: boolean;
    manageUsers: boolean;
  };
};

/**
 * What a user may change, from the login response and `/v1/auth/me`.
 * Everyone signed in can view every page except administration.
 * - manageFleet: aircraft, pilots, trackers and firmware versions
 * - manageOperations: zones, tracking settings, aerodrome, alerts and rules
 * - manageMaintenance: logging maintenance on engine hours
 * - manageUsers: the administration pages (staff, alert recipients)
 */
export type Permission = keyof CurrentUser["permissions"];

/** A row of `/v1/users`. */
export type StaffMember = Omit<CurrentUser, "id"> & { id: string };

/** Body of `POST /v1/users`. */
export type StaffPayload = Pick<
  StaffMember,
  "name" | "email" | "role" | "locale"
> & { password: string };
