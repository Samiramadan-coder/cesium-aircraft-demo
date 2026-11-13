import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import RecipientForm from "./recipient-form";

export default function Header() {
  const t = useTranslations("AlertRecipients");

  return (
    <section className="flex flex-wrap items-center justify-end gap-3">
      <RecipientForm
        trigger={
          <Button type="button" size="lg">
            <Plus />
            {t("addRecipient")}
          </Button>
        }
      />
    </section>
  );
}
