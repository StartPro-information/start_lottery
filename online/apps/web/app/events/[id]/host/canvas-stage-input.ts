"use client";

import type { RefObject } from "react";
import type { RevealStep } from "./draw-stage.types";
import { clamp } from "./canvas-stage-helpers";

type HitTarget = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  canToggle: boolean;
};

type WheelInput = {
  clientX: number;
  clientY: number;
  deltaY: number;
  currentTarget: HTMLCanvasElement;
  preventDefault?: () => void;
};

export function getHitTarget(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  targets: HitTarget[],
) {
  if (!targets.length) return null;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  for (let i = targets.length - 1; i >= 0; i -= 1) {
    const target = targets[i];
    if (!target.canToggle) continue;
    if (x >= target.x && x <= target.x + target.w && y >= target.y && y <= target.y + target.h) {
      return target;
    }
  }
  return null;
}

export function handleWinnerWheel({
  event,
  area,
  revealStep,
  exitActive,
  winnerMaxScrollRef,
  winnerScrollRef,
}: {
  event: WheelInput;
  area: { x: number; y: number; w: number; h: number } | null;
  revealStep: RevealStep;
  exitActive: boolean;
  winnerMaxScrollRef: RefObject<number>;
  winnerScrollRef: RefObject<number>;
}) {
  if (!area) return;
  if (revealStep !== "arrange" || exitActive) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < area.x || x > area.x + area.w || y < area.y || y > area.y + area.h) return;
  const maxScroll = winnerMaxScrollRef.current;
  if (maxScroll <= 0) return;
  if (event.preventDefault) {
    event.preventDefault();
  }
  const next = clamp(winnerScrollRef.current + event.deltaY, 0, maxScroll);
  winnerScrollRef.current = next;
}
