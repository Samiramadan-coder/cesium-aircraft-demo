"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUp, Plane, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FieldError } from "react-hook-form";
import { cn } from "cn";
import { PHOTO_TYPES } from "@/lib/validations/aircraft";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import { Button } from "@/components/ui/button";

/**
 * Photo picker with a preview. `value` is a newly picked file (null keeps the
 * aircraft's current photo, `currentUrl`); the form uploads it after saving.
 */
export default function PhotoField({
  value,
  onChange,
  onBlur,
  currentUrl,
  color,
  error,
  className,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  onBlur?: () => void;
  currentUrl: string | null;
  /** The aircraft's color, behind the placeholder icon. */
  color?: string;
  error?: FieldError;
  className?: string;
}) {
  const t = useTranslations("Aircrafts.form");
  const inputRef = useRef<HTMLInputElement>(null);
  // The picked file's object URL, made when it's picked. Only shown while it
  // is still the form's value (a reset clears the value, not this state).
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(
    null,
  );
  const pickedUrl = value && picked?.file === value ? picked.url : null;

  // Frees the last URL when the dialog closes.
  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked.url);
    },
    [picked],
  );

  function pick(file: File | null) {
    setPicked(file ? { file, url: URL.createObjectURL(file) } : null);
    onChange(file);
  }
  const previewUrl = pickedUrl ?? currentUrl;

  function clear() {
    pick(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <LabeledField id="photo" label={t("photo")} error={error} className={className}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border",
            error && "border-danger",
          )}
          style={previewUrl ? undefined : { backgroundColor: color }}
        >
          {previewUrl ? (
            // A local object URL or the API's URL, so not next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={t("photoPreview")}
              className="size-full object-cover"
            />
          ) : (
            <Plane className="size-7 text-foreground" />
          )}
        </div>

        <div className="grid min-w-0 gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_TYPES.join(",")}
            className="sr-only"
            {...fieldA11yProps("photo", error)}
            onBlur={onBlur}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <ImageUp />
              {previewUrl ? t("changePhoto") : t("choosePhoto")}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-foreground-2 hover:bg-card-2 hover:text-foreground"
              >
                <X />
                {t("removePhoto")}
              </Button>
            )}
          </div>

          <p className="truncate text-xs text-foreground-2">
            {value ? value.name : t("photoHint")}
          </p>
        </div>
      </div>
    </LabeledField>
  );
}
