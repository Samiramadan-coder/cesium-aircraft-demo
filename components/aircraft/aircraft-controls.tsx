"use client";

import type { ReactNode } from "react";
import { LocateFixed, Move3d, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CameraMode } from "@/lib/aircraft/types";

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
  return (
    <TooltipProvider delay={300}>
      <Card className="flex-row items-center gap-1 bg-card/80 p-1.5 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70">
        <ControlButton
          label="Follow"
          hint="Follow aircraft — chase camera"
          active={cameraMode === "follow"}
          onClick={() => onCameraModeChange("follow")}
        >
          <LocateFixed data-icon="inline-start" />
        </ControlButton>
        <ControlButton
          label="Free"
          hint="Free camera — drag to pan, rotate and tilt"
          active={cameraMode === "free"}
          onClick={() => onCameraModeChange("free")}
        >
          <Move3d data-icon="inline-start" />
        </ControlButton>
        <ControlButton
          label="Reset"
          hint="Reset camera to the flight area overview"
          onClick={onResetCamera}
        >
          <RotateCcw data-icon="inline-start" />
        </ControlButton>
        <Separator orientation="vertical" className="mx-1 h-5 self-center" />
        <ControlButton
          label={paused ? "Resume" : "Pause"}
          hint={paused ? "Resume simulation" : "Pause simulation"}
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
