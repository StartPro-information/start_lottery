"use client";

import { useEffect, useState } from "react";
import type { Phase } from "./draw-stage.types";

export default function useAlignFlow({
  phase,
  shuffleKey,
  alignLimit,
  shuffledLength,
}: {
  phase: Phase;
  shuffleKey: number;
  alignLimit: number;
  shuffledLength: number;
}) {
  const [alignStep, setAlignStep] = useState<"none" | "shrink" | "align" | "move">("none");
  const [alignCount, setAlignCount] = useState(0);

  useEffect(() => {
    if (phase !== "align") {
      setAlignStep("none");
      setAlignCount(0);
      return;
    }
    setAlignCount(Math.min(shuffledLength, alignLimit));
    setAlignStep("shrink");
    const shrinkDuration = 1000;
    const pauseAfterShrink = 800;
    const alignDuration = 400;
    const pauseAfterAlign = 1000;
    const alignTimer = window.setTimeout(
      () => setAlignStep("align"),
      shrinkDuration + pauseAfterShrink,
    );
    const moveTimer = window.setTimeout(
      () => setAlignStep("move"),
      shrinkDuration + pauseAfterShrink + alignDuration + pauseAfterAlign,
    );
    return () => {
      window.clearTimeout(alignTimer);
      window.clearTimeout(moveTimer);
    };
  }, [phase, shuffleKey, alignLimit, shuffledLength]);

  return { alignStep, alignCount };
}
