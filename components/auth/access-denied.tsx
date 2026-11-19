import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";
import StatusCard from "@/components/common/status-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Shown instead of a page the user's role doesn't allow. */
export default function AccessDenied() {
  const t = useTranslations("Permissions.denied");

  return (
    <div className="p-4 sm:p-6">
      <StatusCard
        icon={ShieldX}
        tone="muted"
        title={t("title")}
        description={<p>{t("description")}</p>}
      >
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          {t("back")}
        </Link>
      </StatusCard>
    </div>
  );
}
