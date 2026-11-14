"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateZone } from "@/lib/actions/zones";
import { toFlightZone } from "@/lib/aircraft/live-tracking";
import { createZoneSchema, type ZoneValues } from "@/lib/validations/zone";
import {
  BOUNDARY_FIELDS,
  toPayload,
  toValues,
  zoneFieldPaths,
} from "@/lib/zones/form-values";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  applyServerErrors,
  controlClassName,
} from "@/components/form/form-controls";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/trackers/feedback";
import { Input } from "@/components/ui/input";
import type { FlightZone } from "@/types/aircraft";
import type { LatLon, TrackedZone } from "@/types/tracking";
import BoundaryFields from "./boundary-fields";

export type BoundaryPreview = { zone: FlightZone | null; vertices: LatLon[] };

const isLat = (value: number) => Number.isFinite(value) && Math.abs(value) <= 90;
const isLon = (value: number) =>
  Number.isFinite(value) && Math.abs(value) <= 180;

/**
 * The zone as the form currently describes it, for the live map. Points still
 * being typed (empty or out of range) are left out instead of breaking it.
 */
function toPreview(
  zone: TrackedZone,
  type: ZoneValues["type"],
  points: LatLon[],
  center: LatLon,
  radiusMeters: number,
): BoundaryPreview {
  const valid = points.filter((p) => isLat(p.lat) && isLon(p.lon));
  const centerValid = isLat(center.lat) && isLon(center.lon);
  const draft: TrackedZone = {
    ...zone,
    type,
    points: valid,
    center: centerValid ? center : null,
    radiusMeters: radiusMeters > 0 ? radiusMeters : null,
  };
  return {
    zone: toFlightZone(draft),
    vertices: type === "polygon" ? valid : centerValid ? [center] : [],
  };
}

/**
 * Edits the zone's points (or centre and radius) beside the map; every change
 * is drawn on the map right away and saved with PATCH on "Save".
 */
export default function BoundaryEditor({
  zone,
  onPreview,
  onDone,
}: {
  zone: TrackedZone;
  onPreview: (preview: BoundaryPreview) => void;
  /** Closes the editor, after saving or cancelling. */
  onDone: () => void;
}) {
  const t = useTranslations("Zones");
  const [otherError, setOtherError] = useState(false);

  const {
    control,
    register,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ZoneValues>({
    resolver: zodResolver(createZoneSchema((key) => t(`form.errors.${key}`))),
    defaultValues: toValues(zone),
  });

  const [type, points, center, radiusMeters] = useWatch({
    control,
    name: ["type", "points", "center", "radiusMeters"],
  });

  // useWatch hands back new arrays on each render; compare by content so the
  // map only redraws when a value really changed.
  const key = JSON.stringify([type, points, center, radiusMeters]);
  const preview = useMemo(
    () => toPreview(zone, type, points, center, radiusMeters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zone, key],
  );

  useEffect(() => {
    onPreview(preview);
  }, [preview, onPreview]);

  async function onSubmit(values: ZoneValues) {
    setOtherError(false);
    const result = await updateZone(zone.id, toPayload(values, zone));
    if (result.ok) onDone();
    else applyServerErrors(result, zoneFieldPaths(values), setError);
  }

  /** A saved field that isn't shown here failed validation (e.g. old data). */
  function onInvalid(invalid: typeof errors) {
    setOtherError(
      Object.keys(invalid).some((field) => !BOUNDARY_FIELDS.includes(field)),
    );
  }

  const serverError =
    errors.root?.server?.message ??
    // A server error on a field this panel doesn't show.
    Object.entries(errors).find(
      ([field, error]) =>
        !BOUNDARY_FIELDS.includes(field) && field !== "root" && error?.message,
    )?.[1]?.message;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:self-start"
    >
      <div className="space-y-1">
        <h2 className="font-semibold text-foreground">
          {t("boundaryEditor.title")}
        </h2>
        <p className="text-xs text-foreground-2">
          {t("boundaryEditor.description")}
        </p>
      </div>

      {serverError && <ErrorNotice message={serverError} />}
      {otherError && !serverError && (
        <ErrorNotice message={t("boundaryEditor.otherFieldsInvalid")} />
      )}

      <div className="max-h-[calc(100dvh-26rem)] min-h-40 overflow-y-auto">
        <BoundaryFields
          control={control}
          register={register}
          errors={errors}
          holesCount={zone.holes?.length}
          idPrefix="boundary-"
          compact
        />
      </div>

      <LabeledField
        id="boundary-summary"
        label={t("form.summary")}
        error={errors.summary}
        required
      >
        <Input
          autoComplete="off"
          placeholder={t("form.summaryEditPlaceholder")}
          className={controlClassName}
          {...fieldA11yProps("boundary-summary", errors.summary)}
          {...register("summary")}
        />
      </LabeledField>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          className="border-border bg-card text-foreground hover:bg-card-2"
          onClick={onDone}
        >
          {t("boundaryEditor.cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {t("form.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
