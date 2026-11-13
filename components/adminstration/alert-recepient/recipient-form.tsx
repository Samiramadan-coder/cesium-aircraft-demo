"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addNotificationRecipient } from "@/lib/actions/notification-recipients";
import {
  NOTIFICATION_CHANNELS,
  createNotificationRecipientSchema,
  type NotificationRecipientValues,
} from "@/lib/validations/notification-recipient";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  FormSelect,
  applyServerErrors,
  controlClassName,
} from "@/components/form/form-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CancelButton,
  ErrorNotice,
  dialogContentClassName,
  dialogFooterClassName,
} from "@/components/trackers/feedback";

const FIELDS = [
  "channel",
  "name",
  "destination",
] as const satisfies readonly (keyof NotificationRecipientValues)[];

const DEFAULT_VALUES: NotificationRecipientValues = {
  channel: NOTIFICATION_CHANNELS[0],
  name: "",
  destination: "",
};

/** Add-recipient dialog, opened from `trigger`. */
export default function RecipientForm({
  trigger,
}: {
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger: React.ReactElement;
}) {
  const t = useTranslations("AlertRecipients");
  const [open, setOpenState] = useState(false);

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NotificationRecipientValues>({
    resolver: zodResolver(
      createNotificationRecipientSchema((key) => t(`addDialog.errors.${key}`)),
    ),
    defaultValues: DEFAULT_VALUES,
  });

  const channel = useWatch({ control, name: "channel" });
  const isEmail = channel === "email";

  const channelItems = NOTIFICATION_CHANNELS.map((value) => ({
    value,
    label: t(`channels.${value}`),
  }));

  function setOpen(next: boolean) {
    // Every add starts from an empty form.
    if (next) reset(DEFAULT_VALUES);
    setOpenState(next);
  }

  async function onSubmit(values: NotificationRecipientValues) {
    const result = await addNotificationRecipient({
      ...values,
      name: values.name || null,
    });
    if (result.ok) setOpen(false);
    else applyServerErrors(result, FIELDS, setError);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />

      <DialogContent
        className={`${dialogContentClassName} max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg`}
      >
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("addDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-foreground-2">
              {t("addDialog.description")}
            </DialogDescription>
          </DialogHeader>

          {errors.root?.server && (
            <ErrorNotice message={errors.root.server.message} />
          )}

          <div className="grid gap-4">
            <LabeledField id="name" label={t("name")} error={errors.name}>
              <Input
                autoComplete="off"
                placeholder={t("addDialog.namePlaceholder")}
                className={controlClassName}
                {...fieldA11yProps("name", errors.name)}
                {...register("name")}
              />
            </LabeledField>

            <FormSelect
              control={control}
              name="channel"
              label={t("channel")}
              items={channelItems}
            />

            <LabeledField
              id="destination"
              label={isEmail ? t("addDialog.email") : t("addDialog.phone")}
              error={errors.destination}
              required
            >
              <Input
                type={isEmail ? "email" : "tel"}
                autoComplete="off"
                dir="ltr"
                placeholder={
                  isEmail ? "ops@emiratesfalcons.ae" : "+971 50 123 4567"
                }
                className={controlClassName}
                {...fieldA11yProps("destination", errors.destination)}
                {...register("destination")}
              />
            </LabeledField>
          </div>

          <DialogFooter className={dialogFooterClassName}>
            <CancelButton />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {t("addDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
