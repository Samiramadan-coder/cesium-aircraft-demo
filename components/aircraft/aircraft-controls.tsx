"use client";

import type { ReactNode } from "react";
import {
  Languages,
  LocateFixed,
  Move3d,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleToggle } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CameraMode } from "@/types/aircraft";

function ControlButton({
  label,
  hint,
  active = false,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="sm"
            variant={active ? "default" : "ghost"}
            aria-pressed={active}
            onClick={onClick}
          />
        }
      >
        {children}
        {label}
      </TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}

/** Switches to the next locale, keeping the current page. */
function LocaleButton() {
  const t = useTranslations("LocaleSwitcher");
  const { next, switchLocale } = useLocaleToggle();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            lang={next}
            onClick={switchLocale}
          />
        }
      >
        <Languages data-icon="inline-start" />
        {t(`locales.${next}`)}
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("hint")}</TooltipContent>
    </Tooltip>
  );
}

type AircraftControlsProps = {
  cameraMode: CameraMode;
  paused: boolean;
  onCameraModeChange: (mode: CameraMode) => void;
  onResetCamera: () => void;
  onPausedChange: (paused: boolean) => void;
};

export function AircraftControls({
  cameraMode,
  paused,
  onCameraModeChange,
  onResetCamera,
  onPausedChange,
}: AircraftControlsProps) {
  const t = useTranslations("AircraftControls");

  return (
    <TooltipProvider delay={300}>
      <Card className="flex-row items-center gap-1 bg-card/80 p-1.5 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70">
        <ControlButton
          label={t("follow")}
          hint={t("followHint")}
          active={cameraMode === "follow"}
          onClick={() => onCameraModeChange("follow")}
        >
          <LocateFixed data-icon="inline-start" />
        </ControlButton>
        <ControlButton
          label={t("free")}
          hint={t("freeHint")}
          active={cameraMode === "free"}
          onClick={() => onCameraModeChange("free")}
        >
          <Move3d data-icon="inline-start" />
        </ControlButton>
        <ControlButton
          label={t("reset")}
          hint={t("resetHint")}
          onClick={onResetCamera}
        >
          <RotateCcw data-icon="inline-start" />
        </ControlButton>
        <Separator orientation="vertical" className="mx-1 h-5 self-center" />
        <ControlButton
          label={paused ? t("resume") : t("pause")}
          hint={paused ? t("resumeHint") : t("pauseHint")}
          onClick={() => onPausedChange(!paused)}
        >
          {paused ? (
            <Play data-icon="inline-start" />
          ) : (
            <Pause data-icon="inline-start" />
          )}
        </ControlButton>
        <Separator orientation="vertical" className="mx-1 h-5 self-center" />
        <LocaleButton />
      </Card>
    </TooltipProvider>
  );
}
