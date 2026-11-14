import { createLoader, parseAsStringLiteral } from "nuqs/server";
import type { UserRole } from "@/types/user";

export const ROLE_FILTERS = [
  "super_admin",
  "operations",
  "engineer",
  "viewer",
] as const satisfies readonly UserRole[];

/** `?role=` on the staff page; missing or unknown means every role. */
export const staffSearchParams = {
  role: parseAsStringLiteral(ROLE_FILTERS),
};

export const loadStaffSearchParams = createLoader(staffSearchParams);
