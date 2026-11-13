"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionFailure } from "@/lib/api/errors";

// The theme's popover/muted colors are light; match the dark cards instead.
export const controlClassName =
  "w-full border-border bg-card-2/60 text-foreground placeholder:text-muted/70 hover:bg-card-2 aria-invalid:border-danger";
const selectContentClassName = "bg-card text-foreground ring-border";
const selectItemClassName =
  "focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

export type SelectItemOption = { value: string; label: string };

/** Plain options whose label is the value itself. */
export function toItems(values: readonly string[]): SelectItemOption[] {
  return values.map((value) => ({ value, label: value }));
}

/** A labeled, required select bound to a react-hook-form field. */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  id = name,
  label,
  items,
  onChange,
  className,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  /** Defaults to `name`; set it when two forms on a page share field names. */
  id?: string;
  label: string;
  items: SelectItemOption[];
  /** Runs after the value changes, with the previous and new values. */
  onChange?: (previous: string, next: string) => void;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <LabeledField
          id={id}
          label={label}
          error={error}
          required
          className={className}
        >
          <Select
            items={items}
            value={field.value as string}
            onValueChange={(value: string | null) => {
              const next = value ?? "";
              const previous = String(field.value ?? "");
              field.onChange(next);
              onChange?.(previous, next);
            }}
          >
            <SelectTrigger
              {...fieldA11yProps(id, error)}
              ref={field.ref}
              onBlur={field.onBlur}
              className={controlClassName}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              {items.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={selectItemClassName}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LabeledField>
      )}
    />
  );
}

/**
 * Puts a failed action's field errors on the matching fields (focusing the
 * first one); anything else goes to `root.server`.
 */
export function applyServerErrors<T extends FieldValues>(
  failure: ActionFailure,
  fields: readonly FieldPath<T>[],
  setError: UseFormSetError<T>,
) {
  let shownOnField = false;
  for (const [field, message] of Object.entries(failure.fieldErrors ?? {})) {
    if ((fields as readonly string[]).includes(field)) {
      setError(
        field as FieldPath<T>,
        { message },
        { shouldFocus: !shownOnField },
      );
      shownOnField = true;
    }
  }
  if (!shownOnField) setError("root.server", { message: failure.message });
}
