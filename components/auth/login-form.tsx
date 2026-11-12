"use client";

import {
  Eye,
  Lock,
  Mail,
  EyeOff,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";

import {
  authFieldClasses,
  iconClassName,
  inputClassName,
} from "@/constants/auth";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { login } from "@/lib/actions/auth";
import { CALLBACK_URL_PARAM } from "@/lib/auth-routes";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLoginSchema, type LoginValues } from "@/lib/validations/auth";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";

export function LoginForm() {
  const t = useTranslations("LoginPage");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginValues>({
    resolver: zodResolver(createLoginSchema((key) => t(`errors.${key}`))),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: LoginValues) {
    // Read on submit instead of useSearchParams(), which would need a
    // Suspense boundary on this statically rendered page
    const callbackUrl = new URLSearchParams(window.location.search).get(
      CALLBACK_URL_PARAM,
    );
    // Redirects on success, so this only returns a failure
    const failure = await login(values, callbackUrl);
    // A redirect can resolve the call with no result
    if (!failure) return;

    let shownOnField = false;
    for (const [field, message] of Object.entries(failure.fieldErrors ?? {})) {
      if (field === "email" || field === "password") {
        setError(field, { message }, { shouldFocus: !shownOnField });
        shownOnField = true;
      }
    }
    if (failure.message && !shownOnField) {
      setError("root.server", { message: failure.message });
    }
  }

  // Keep the button busy while the success redirect is in flight
  const busy = isSubmitting || (isSubmitSuccessful && !errors.root);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      {errors.root?.server && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          {errors.root.server.message}
        </p>
      )}

      <LabeledField
        id="email"
        label={t("email")}
        error={errors.email}
        {...authFieldClasses}
      >
        <div className="relative">
          <Mail className={iconClassName} />
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            className={inputClassName}
            {...fieldA11yProps("email", errors.email)}
            {...register("email")}
          />
        </div>
      </LabeledField>

      <LabeledField
        id="password"
        label={t("password")}
        error={errors.password}
        {...authFieldClasses}
      >
        <div className="relative">
          <Lock className={iconClassName} />
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(inputClassName, "pe-11")}
            {...fieldA11yProps("password", errors.password)}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
            className="absolute inset-e-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted/70 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </LabeledField>

      <Button
        type="submit"
        disabled={busy}
        className="mt-2 h-11 rounded-lg bg-primary text-sm font-semibold tracking-wide text-primary-foreground shadow-[0_8px_24px_-8px] shadow-primary/50 hover:bg-primary/90"
      >
        {busy ? (
          <>
            <LoaderCircle className="animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            {t("submit")}
            <ArrowRight className="rtl:rotate-180" />
          </>
        )}
      </Button>
    </form>
  );
}
