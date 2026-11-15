"use client";

import type { ReactNode } from "react";
import {
  LandPlot,
  LocateFixed,
  Move3d,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
            aria-label={label}
            // Square, finger-sized icon buttons on phones.
            className="max-sm:size-9 max-sm:px-0"
            onClick={onClick}
          />
        }
      >
        {children}
        {/* Icon-only on phones so the bar fits on one line. */}
        <span className="max-sm:hidden">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}

type AircraftControlsProps = {
  cameraMode: CameraMode;
  paused: boolean;
  showAirfield: boolean;
  onShowAirfieldChange: (show: boolean) => void;
  onCameraModeChange: (mode: CameraMode) => void;
  onResetCamera: () => void;
  onPausedChange: (paused: boolean) => void;
};

export function AircraftControls({
  cameraMode,
  paused,
  showAirfield,
  onShowAirfieldChange,
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
          label={t("airfield")}
          hint={showAirfield ? t("hideAirfieldHint") : t("showAirfieldHint")}
          active={showAirfield}
          onClick={() => onShowAirfieldChange(!showAirfield)}
        >
          <LandPlot data-icon="inline-start" />
        </ControlButton>
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
      </Card>
    </TooltipProvider>
  );
}
