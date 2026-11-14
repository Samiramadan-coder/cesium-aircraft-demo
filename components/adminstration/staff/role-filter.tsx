"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransition } from "react";
import { useQueryStates } from "nuqs";
import { useTranslations } from "next-intl";
import { controlClassName } from "@/components/form/form-controls";
import { ROLE_FILTERS, staffSearchParams } from "@/lib/search-params/staff";

const ALL = "all";

export default function RoleFilter() {
  const t = useTranslations("Staff");
  const roles = useTranslations("Header.roles");
  const [isPending, startTransition] = useTransition();
  const [{ role }, setParams] = useQueryStates(staffSearchParams, {
    shallow: false,
    startTransition,
  });

  const items = [
    { value: ALL, label: t("allRoles") },
    ...ROLE_FILTERS.map((value) => ({ value, label: roles(value) })),
  ];

  return (
    <Select
      items={items}
      value={role ?? ALL}
      onValueChange={(value: string | null) => {
        const next = ROLE_FILTERS.find((r) => r === value) ?? null;
        setParams({ role: next });
      }}
    >
      <SelectTrigger
        aria-label={t("role")}
        aria-busy={isPending}
        className={`${controlClassName} w-44 data-[size=default]:h-9`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-card text-foreground ring-border">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="focus:bg-card-2 focus:text-foreground"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
