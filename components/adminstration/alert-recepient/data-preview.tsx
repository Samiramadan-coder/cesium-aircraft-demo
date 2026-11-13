import { Mail, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import type {
  NotificationChannel,
  NotificationRecipient,
} from "@/types/notification-recipients";

const EMPTY = "—";

const CHANNELS: Record<
  NotificationChannel,
  { className: string; Icon: typeof Mail }
> = {
  sms: {
    className: "border-success/40 bg-success/10 text-success",
    Icon: MessageSquare,
  },
  email: {
    className: "border-primary/40 bg-primary/10 text-primary",
    Icon: Mail,
  },
};

export default function DataPreview({
  recipients,
}: {
  recipients: NotificationRecipient[];
}) {
  const t = useTranslations("AlertRecipients");

  if (recipients.length === 0) {
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
            <TableHead className="ps-4 text-foreground">{t("name")}</TableHead>
            <TableHead className="text-foreground">{t("channel")}</TableHead>
            <TableHead className="pe-4 text-foreground">
              {t("destination")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((recipient) => {
            const channel = CHANNELS[recipient.channel] ?? CHANNELS.sms;

            return (
              <TableRow
                key={recipient.id}
                className="border-border hover:bg-card-2/50"
              >
                <TableCell className="ps-4 font-medium text-foreground">
                  {recipient.name || EMPTY}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("gap-1.5", channel.className)}
                  >
                    <channel.Icon className="size-3" />
                    {t(`channels.${recipient.channel}`)}
                  </Badge>
                </TableCell>
                <TableCell className="pe-4">
                  <span
                    dir="ltr"
                    className={cn(
                      "text-foreground-2",
                      recipient.channel === "sms" && "tabular-nums",
                    )}
                  >
                    {recipient.destination}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
