"use client";

import { useState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveFirmwareVersion } from "@/lib/actions/trackers";
import {
  createFirmwareVersionSchema,
  type FirmwareVersionValues,
} from "@/lib/validations/firmware-version";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
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
import type { FirmwareVersion } from "@/types/trackers";
import {
  CancelButton,
  ErrorNotice,
  Panel,
  dialogContentClassName,
  dialogFooterClassName,
} from "./feedback";
import { applyServerErrors, controlClassName } from "@/components/form/form-controls";

const FIELDS = ["model", "latestVersion"] as const;
const EMPTY_VALUES: FirmwareVersionValues = { model: "", latestVersion: "" };

/**
 * Lists the latest firmware per model and saves a new release
 * (POST /v1/firmware-versions). Picking a row fills the form to update it.
 */
export default function FirmwareVersions({
  versions,
  trigger,
}: {
  versions: FirmwareVersion[];
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger: React.ReactElement;
}) {
  const t = useTranslations("Trackers.firmwareVersions");
  const tCommon = useTranslations("Trackers.common");
  const [open, setOpen] = useState(false);

  const {
    register,
    reset,
    setError,
    setFocus,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FirmwareVersionValues>({
    resolver: zodResolver(
      createFirmwareVersionSchema((key) => t(`errors.${key}`)),
    ),
    defaultValues: EMPTY_VALUES,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset(EMPTY_VALUES);
  }

  function edit(version: FirmwareVersion) {
    reset({ model: version.model, latestVersion: version.latestVersion });
    setFocus("latestVersion", { shouldSelect: true });
  }

  async function onSubmit(values: FirmwareVersionValues) {
    const result = await saveFirmwareVersion(values);
    // Stay open so several models can be updated in a row.
    if (result.ok) reset(EMPTY_VALUES);
    else applyServerErrors(result, FIELDS, setError);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />

      <DialogContent
        className={`${dialogContentClassName} max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg`}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-foreground-2">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h4 className="text-sm text-foreground-2">{t("current")}</h4>
          {versions.length === 0 ? (
            <Panel className="text-sm text-muted">{t("empty")}</Panel>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li key={version.id}>
                  <Panel className="flex items-center justify-between gap-3 py-2 pe-2">
                    <span className="min-w-0 truncate text-sm">
                      {version.model}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        dir="ltr"
                        className="font-mono font-semibold tabular-nums"
                      >
                        {version.latestVersion}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("editLabel", { model: version.model })}
                        className="text-foreground-2 hover:bg-card-2 hover:text-foreground"
                        onClick={() => edit(version)}
                      >
                        <Pencil />
                      </Button>
                    </span>
                  </Panel>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <h4 className="text-sm text-foreground-2">{t("formTitle")}</h4>

          {errors.root?.server && (
            <ErrorNotice message={errors.root.server.message} />
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <LabeledField
              id="fw-model"
              label={t("model")}
              error={errors.model}
              required
            >
              <Input
                autoComplete="off"
                list="fw-models"
                placeholder="Teltonika FMC650"
                className={controlClassName}
                {...fieldA11yProps("fw-model", errors.model)}
                {...register("model")}
              />
              <datalist id="fw-models">
                {versions.map((version) => (
                  <option key={version.id} value={version.model} />
                ))}
              </datalist>
            </LabeledField>

            <LabeledField
              id="fw-version"
              label={t("version")}
              error={errors.latestVersion}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="03.29.09"
                className={`${controlClassName} font-mono`}
                {...fieldA11yProps("fw-version", errors.latestVersion)}
                {...register("latestVersion")}
              />
            </LabeledField>
          </div>

          <DialogFooter className={dialogFooterClassName}>
            <CancelButton>{tCommon("close")}</CancelButton>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
