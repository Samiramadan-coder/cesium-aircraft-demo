import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import StatusCard from "@/components/common/status-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** No zone has this id (deleted, or a bad link). */
export default function NotFound() {
  const t = useTranslations("Zones.details");

  return (
    <div className="p-4 sm:p-6">
      <StatusCard
        icon={SearchX}
        tone="muted"
        title={t("notFound.title")}
        description={<p>{t("notFound.description")}</p>}
      >
        <Link href="/zones" className={buttonVariants({ size: "lg" })}>
          {t("back")}
        </Link>
      </StatusCard>
    </div>
  );
}
