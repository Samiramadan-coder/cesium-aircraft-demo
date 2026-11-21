"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
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
import type { CameraNudge } from "@/types/aircraft";

/** Held down, a button repeats after this delay, then at this interval. */
const HOLD_DELAY_MS = 350;
const HOLD_INTERVAL_MS = 120;
/** Each repeat is a fraction of a full press, so holding moves smoothly. */
const HOLD_STEP = 0.35;

function NavButton({
  label,
  nudge,
  onNudge,
  children,
}: {
  label: string;
  nudge: CameraNudge;
  onNudge: (nudge: CameraNudge) => void;
  children: ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  const start = () => {
    stop();
    onNudge(nudge);
    const repeat = () => {
      onNudge({
        zoom: (nudge.zoom ?? 0) * HOLD_STEP,
        rotate: (nudge.rotate ?? 0) * HOLD_STEP,
      });
      timer.current = setTimeout(repeat, HOLD_INTERVAL_MS);
    };
    timer.current = setTimeout(repeat, HOLD_DELAY_MS);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            aria-label={label}
            className="size-9 touch-none select-none"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            // Keyboard (Enter / Space): pointer presses are handled above.
            onClick={(event) => {
              if (event.detail === 0) onNudge(nudge);
            }}
            onContextMenu={(event) => event.preventDefault()}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="inline-start">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Zoom in / out and turn the view left / right, over the map. */
export function MapNavControls({
  onNudge,
}: {
  onNudge: (nudge: CameraNudge) => void;
}) {
  const t = useTranslations("AircraftControls");

  return (
    <TooltipProvider delay={300}>
      <Card className="flex-col items-center gap-0.5 bg-card/80 p-1 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70">
        <NavButton label={t("zoomIn")} nudge={{ zoom: 1 }} onNudge={onNudge}>
          <Plus />
        </NavButton>
        <NavButton label={t("zoomOut")} nudge={{ zoom: -1 }} onNudge={onNudge}>
          <Minus />
        </NavButton>
        <Separator className="my-0.5 w-5" />
        <NavButton
          label={t("rotateLeft")}
          nudge={{ rotate: -1 }}
          onNudge={onNudge}
        >
          <RotateCcw />
        </NavButton>
        <NavButton
          label={t("rotateRight")}
          nudge={{ rotate: 1 }}
          onNudge={onNudge}
        >
          <RotateCw />
        </NavButton>
      </Card>
    </TooltipProvider>
  );
}
