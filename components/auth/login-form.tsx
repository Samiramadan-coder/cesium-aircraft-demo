"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<
  Record<"email" | "password", "emailRequired" | "emailInvalid" | "passwordRequired">
>;

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!email) errors.email = "emailRequired";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "emailInvalid";
  if (!password) errors.password = "passwordRequired";
  return errors;
}

const inputClassName =
  "h-11 rounded-lg border-border bg-background/60 ps-10 text-base text-foreground placeholder:text-muted/50 focus-visible:border-primary focus-visible:ring-primary/20 aria-invalid:border-danger aria-invalid:ring-danger/20 md:text-sm dark:bg-background/60";

const iconClassName =
  "pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted/70";

export function LoginForm() {
  const t = useTranslations("LoginPage");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      // TODO: authenticate { email, password } against the auth API here.
      router.push("/");
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-xs tracking-[0.14em] text-foreground-2 uppercase rtl:tracking-normal"
        >
          {t("email")}
        </Label>
        <div className="relative">
          <Mail className={iconClassName} />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClassName}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-danger">
            {t(`errors.${errors.email}`)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-xs tracking-[0.14em] text-foreground-2 uppercase rtl:tracking-normal"
        >
          {t("password")}
        </Label>
        <div className="relative">
          <Lock className={iconClassName} />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={cn(inputClassName, "pe-11")}
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
        {errors.password && (
          <p id="password-error" className="text-xs text-danger">
            {t(`errors.${errors.password}`)}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 rounded-lg bg-primary text-sm font-semibold tracking-wide text-primary-foreground shadow-[0_8px_24px_-8px] shadow-primary/50 hover:bg-primary/90"
      >
        {pending ? (
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
