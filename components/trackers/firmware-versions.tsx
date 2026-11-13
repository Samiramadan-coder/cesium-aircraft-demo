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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FirmwareVersion } from "@/types/trackers";

const controlClassName =
  "w-full border-border bg-card-2/60 text-foreground placeholder:text-muted/70 hover:bg-card-2 aria-invalid:border-danger";

const FIELDS = ["model", "latestVersion"] as const;
const EMPTY: FirmwareVersionValues = { model: "", latestVersion: "" };

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
    defaultValues: EMPTY,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset(EMPTY);
  }

  function edit(version: FirmwareVersion) {
    reset({ model: version.model, latestVersion: version.latestVersion });
    setFocus("latestVersion", { shouldSelect: true });
  }

  async function onSubmit(values: FirmwareVersionValues) {
    const result = await saveFirmwareVersion(values);

    if (result.ok) {
      // Stay open so several models can be updated in a row.
      reset(EMPTY);
      return;
    }

    let shownOnField = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(
          field as (typeof FIELDS)[number],
          { message },
          { shouldFocus: !shownOnField },
        );
        shownOnField = true;
      }
    }
    if (!shownOnField) setError("root.server", { message: result.message });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-card text-foreground sm:max-w-lg *:data-[slot=dialog-close]:text-foreground-2">
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
            <p className="rounded-lg border border-border bg-card-2/40 p-3 text-sm text-muted">
              {t("empty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card-2/40 py-2 ps-3 pe-2"
                >
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
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            >
              {errors.root.server.message}
            </p>
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

          <DialogFooter className="border-border bg-card-2/40">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="border-border bg-card text-foreground hover:bg-card-2"
                />
              }
            >
              {t("close")}
            </DialogClose>
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
