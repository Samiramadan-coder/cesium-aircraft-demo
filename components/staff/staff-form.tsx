"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addStaffMember } from "@/lib/actions/staff";
import {
  STAFF_LOCALES,
  STAFF_ROLES,
  createStaffSchema,
  type StaffValues,
} from "@/lib/validations/staff";
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
  "name",
  "email",
  "password",
  "role",
  "locale",
] as const satisfies readonly (keyof StaffValues)[];

const DEFAULT_VALUES: StaffValues = {
  name: "",
  email: "",
  password: "",
  role: STAFF_ROLES[0],
  locale: STAFF_LOCALES[0],
};

/** Add-staff dialog, opened from `trigger`. */
export default function StaffForm({
  trigger,
}: {
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger: React.ReactElement;
}) {
  const t = useTranslations("Staff");
  const roles = useTranslations("Header.roles");
  const [open, setOpenState] = useState(false);

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffValues>({
    resolver: zodResolver(
      createStaffSchema((key) => t(`addDialog.errors.${key}`)),
    ),
    defaultValues: DEFAULT_VALUES,
  });

  const roleItems = STAFF_ROLES.map((value) => ({
    value,
    label: roles(value),
  }));
  const localeItems = STAFF_LOCALES.map((value) => ({
    value,
    label: t(`languages.${value}`),
  }));

  function setOpen(next: boolean) {
    // Every add starts from an empty form.
    if (next) reset(DEFAULT_VALUES);
    setOpenState(next);
  }

  async function onSubmit(values: StaffValues) {
    const result = await addStaffMember(values);
    if (result.ok) setOpen(false);
    else applyServerErrors(result, FIELDS, setError);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />

      <DialogContent
        className={`${dialogContentClassName} max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl`}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledField
              id="name"
              label={t("addDialog.name")}
              error={errors.name}
              required
              className="sm:col-span-2"
            >
              <Input
                autoComplete="off"
                placeholder="Mona Al Suwaidi"
                className={controlClassName}
                {...fieldA11yProps("name", errors.name)}
                {...register("name")}
              />
            </LabeledField>

            <LabeledField
              id="email"
              label={t("addDialog.email")}
              error={errors.email}
              required
            >
              <Input
                type="email"
                autoComplete="off"
                dir="ltr"
                placeholder="name@emiratesfalcons.ae"
                className={controlClassName}
                {...fieldA11yProps("email", errors.email)}
                {...register("email")}
              />
            </LabeledField>

            <LabeledField
              id="password"
              label={t("addDialog.password")}
              error={errors.password}
              required
            >
              <Input
                type="password"
                autoComplete="new-password"
                dir="ltr"
                className={controlClassName}
                {...fieldA11yProps("password", errors.password)}
                {...register("password")}
              />
            </LabeledField>

            <FormSelect
              control={control}
              name="role"
              label={t("role")}
              items={roleItems}
            />

            <FormSelect
              control={control}
              name="locale"
              label={t("language")}
              items={localeItems}
            />
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
