"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useForm,
  type FieldError,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
} from "@/lib/actions/alerts";
import {
  acknowledgeAlertSchema,
  createAssignAlertSchema,
  resolveAlertSchema,
  type AcknowledgeAlertValues,
  type AssignAlertValues,
  type ResolveAlertValues,
} from "@/lib/validations/alert-actions";
import {
  FormSelect,
  applyServerErrors,
  controlClassName,
} from "@/components/form/form-controls";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CancelButton,
  ErrorNotice,
  Panel,
  dialogContentClassName,
  dialogFooterClassName,
} from "@/components/trackers/feedback";
import { ALERT_RESOLUTIONS, type Alert } from "@/types/alerts";
import type { StaffMember } from "@/types/user";
import { useAlertType } from "./shared";

type DialogProps = {
  alert: Alert;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Dialog shell shared by the three alert actions. */
function ActionDialog({
  alert,
  open,
  onOpenChange,
  title,
  submitLabel,
  isSubmitting,
  disabled,
  serverError,
  onSubmit,
  children,
}: DialogProps & {
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  disabled?: boolean;
  serverError?: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  children: React.ReactNode;
}) {
  const alertType = useAlertType();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogContentClassName} sm:max-w-md`}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-foreground-2">
              {alertType(alert)} · {alert.title}
            </DialogDescription>
          </DialogHeader>

          {serverError && <ErrorNotice message={serverError} />}

          {children}

          <DialogFooter className={dialogFooterClassName}>
            <CancelButton />
            <Button type="submit" disabled={isSubmitting || disabled}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** An optional note textarea. */
function NoteField({
  id,
  label,
  placeholder,
  error,
  registration,
}: {
  id: string;
  label: string;
  placeholder: string;
  error: FieldError | undefined;
  /** `register("note")` */
  registration: UseFormRegisterReturn;
}) {
  return (
    <LabeledField id={id} label={label} error={error}>
      <Textarea
        rows={3}
        placeholder={placeholder}
        className={`${controlClassName} min-h-20 resize-y`}
        {...fieldA11yProps(id, error)}
        {...registration}
      />
    </LabeledField>
  );
}

export function AcknowledgeAlert({ alert, open, onOpenChange }: DialogProps) {
  const t = useTranslations("Alerts.acknowledgeDialog");

  const {
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcknowledgeAlertValues>({
    resolver: zodResolver(acknowledgeAlertSchema),
    defaultValues: { note: "" },
  });

  // Start fresh on every open.
  useEffect(() => {
    if (open) reset({ note: "" });
  }, [open, reset]);

  async function onSubmit({ note }: AcknowledgeAlertValues) {
    const result = await acknowledgeAlert(alert.id, { note: note || undefined });
    if (result.ok) onOpenChange(false);
    else applyServerErrors(result, ["note"], setError);
  }

  return (
    <ActionDialog
      alert={alert}
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      submitLabel={t("submit")}
      isSubmitting={isSubmitting}
      serverError={errors.root?.server?.message}
      onSubmit={handleSubmit(onSubmit)}
    >
      <NoteField
        id="acknowledge-note"
        label={t("note")}
        placeholder={t("notePlaceholder")}
        error={errors.note}
        registration={register("note")}
      />
    </ActionDialog>
  );
}

export function AssignAlert({
  alert,
  staff,
  open,
  onOpenChange,
}: DialogProps & { staff: StaffMember[] }) {
  const t = useTranslations("Alerts.assignDialog");

  const {
    control,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssignAlertValues>({
    resolver: zodResolver(createAssignAlertSchema(t("errors.userRequired"))),
    defaultValues: { userId: "" },
  });

  // The current assignee when the API sends one, else nobody.
  const currentId =
    alert.assignedTo && typeof alert.assignedTo === "object"
      ? String(alert.assignedTo.id)
      : "";

  useEffect(() => {
    if (open) reset({ userId: currentId });
  }, [open, currentId, reset]);

  async function onSubmit({ userId }: AssignAlertValues) {
    const result = await assignAlert(alert.id, { userId: Number(userId) });
    if (result.ok) onOpenChange(false);
    else applyServerErrors(result, ["userId"], setError);
  }

  return (
    <ActionDialog
      alert={alert}
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      submitLabel={t("submit")}
      isSubmitting={isSubmitting}
      disabled={staff.length === 0}
      serverError={errors.root?.server?.message}
      onSubmit={handleSubmit(onSubmit)}
    >
      {staff.length === 0 ? (
        <Panel className="py-2.5 text-sm text-foreground-2">
          {t("noStaff")}
        </Panel>
      ) : (
        <FormSelect
          control={control}
          name="userId"
          id="assign-userId"
          label={t("staff")}
          items={staff.map((member) => ({
            value: String(member.id),
            label: member.name,
          }))}
        />
      )}
    </ActionDialog>
  );
}

export function ResolveAlert({ alert, open, onOpenChange }: DialogProps) {
  const t = useTranslations("Alerts.resolveDialog");
  const tResolution = useTranslations("Alerts.resolutions");

  const defaults: ResolveAlertValues = {
    resolution: ALERT_RESOLUTIONS[0],
    note: "",
  };

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResolveAlertValues>({
    resolver: zodResolver(resolveAlertSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) reset({ resolution: ALERT_RESOLUTIONS[0], note: "" });
  }, [open, reset]);

  async function onSubmit({ resolution, note }: ResolveAlertValues) {
    const result = await resolveAlert(alert.id, {
      resolution,
      note: note || undefined,
    });
    if (result.ok) onOpenChange(false);
    else applyServerErrors(result, ["resolution", "note"], setError);
  }

  return (
    <ActionDialog
      alert={alert}
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      submitLabel={t("submit")}
      isSubmitting={isSubmitting}
      serverError={errors.root?.server?.message}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormSelect
        control={control}
        name="resolution"
        id="resolve-resolution"
        label={t("resolution")}
        items={ALERT_RESOLUTIONS.map((value) => ({
          value,
          label: tResolution(value),
        }))}
      />
      <NoteField
        id="resolve-note"
        label={t("note")}
        placeholder={t("notePlaceholder")}
        error={errors.note}
        registration={register("note")}
      />
    </ActionDialog>
  );
}
