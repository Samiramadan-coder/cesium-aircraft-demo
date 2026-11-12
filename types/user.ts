// TODO: align the roles with the backend once its user payload is known.
export type UserRole = "super_admin" | "admin" | "operator";

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
