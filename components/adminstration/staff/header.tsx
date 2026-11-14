import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import RoleFilter from "./role-filter";
import StaffForm from "./staff-form";

export default function Header() {
  const t = useTranslations("Staff");

  return (
    <section className="flex flex-wrap items-center justify-between gap-3">
      <RoleFilter />

      <StaffForm
        trigger={
          <Button type="button" size="lg">
            <Plus />
            {t("addMember")}
          </Button>
        }
      />
    </section>
  );
}
