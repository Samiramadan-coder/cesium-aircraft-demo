import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import StatusCard from "@/components/common/status-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** `getFlightReplay` got a 404: the id doesn't match any flight. */
export default function NotFound() {
  const t = useTranslations("Flights.details");

  return (
    <div className="p-4 sm:p-6">
      <StatusCard
        icon={SearchX}
        tone="muted"
        title={t("notFound.title")}
        description={<p>{t("notFound.description")}</p>}
      >
        <Link href="/flights" className={buttonVariants({ size: "lg" })}>
          {t("back")}
        </Link>
      </StatusCard>
    </div>
  );
}
