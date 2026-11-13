import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn, initials } from "@/lib/utils";
import type { StaffMember, UserRole } from "@/types/user";

const ROLE_STYLES: Record<UserRole, string> = {
  super_admin: "border-primary/40 bg-primary/10 text-primary",
  operations: "border-success/40 bg-success/10 text-success",
  engineer: "border-border bg-card-2/60 text-foreground",
  viewer: "border-border bg-card-2/40 text-foreground-2",
};

const PERMISSIONS = [
  "manageFleet",
  "manageOperations",
  "manageMaintenance",
  "manageUsers",
] as const satisfies readonly (keyof StaffMember["permissions"])[];

export default function DataPreview({ staff }: { staff: StaffMember[] }) {
  const t = useTranslations("Staff");
  const roles = useTranslations("Header.roles");

  if (staff.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="ps-4 text-foreground">
              {t("member")}
            </TableHead>
            <TableHead className="text-foreground">{t("role")}</TableHead>
            <TableHead className="text-foreground">
              {t("permissions")}
            </TableHead>
            <TableHead className="pe-4 text-foreground">
              {t("language")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => {
            const granted = PERMISSIONS.filter(
              (key) => member.permissions[key],
            );

            return (
              <TableRow
                key={member.id}
                className="border-border hover:bg-card-2/50"
              >
                <TableCell className="ps-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm" className="after:border-border">
                      <AvatarFallback className="bg-card-2 text-[10px] text-muted">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {member.name}
                      </p>
                      <p
                        dir="ltr"
                        className="text-start text-xs text-foreground-2"
                      >
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5",
                      ROLE_STYLES[member.role] ?? ROLE_STYLES.viewer,
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {roles.has(member.role) ? roles(member.role) : member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {granted.length === 0 ? (
                    <span className="text-foreground-2">
                      {t("noPermissions")}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {granted.map((key) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="border-border bg-card-2/40 text-foreground-2"
                        >
                          {t(`permissionLabels.${key}`)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="pe-4 text-foreground-2">
                  {t(`languages.${member.locale}`)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
