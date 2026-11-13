import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StaffForm from "./staff-form";

export default function Header() {
  const t = useTranslations("Staff");

  return (
    <section className="flex flex-wrap items-center justify-end gap-3">
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
