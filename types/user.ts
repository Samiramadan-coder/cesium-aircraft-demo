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

/** A row of `/v1/users`. */
export type StaffMember = Omit<CurrentUser, "id"> & { id: string };

/** Body of `POST /v1/users`. */
export type StaffPayload = Pick<
  StaffMember,
  "name" | "email" | "role" | "locale"
> & { password: string };
