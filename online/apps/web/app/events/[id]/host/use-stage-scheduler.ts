"use client";

import { useEffect, useRef, useState } from "react";
import type { Phase } from "./draw-stage.types";

export default function useStageScheduler({
  phase,
  shuffleKey,
  alignLimit,
  shuffledLength,
  stopSignal,
  manualStop,
}: {
  phase: Phase;
  shuffleKey: number;
  alignLimit: number;
  shuffledLength: number;
  stopSignal?: number;
  manualStop: boolean;
}) {
  const [alignStep, setAlignStep] = useState<"none" | "shrink" | "align" | "move">("none");
  const [alignCount, setAlignCount] = useState(0);
  const [stageToken, setStageToken] = useState(0);
  const [autoStopNonce, setAutoStopNonce] = useState(0);
  const tokenRef = useRef(0);
  const autoStopTimerRef = useRef<number | null>(null);
  const stopSignalRef = useRef(stopSignal ?? 0);

  useEffect(() => {
    if (phase !== "align") {
      setAlignStep("none");
      setAlignCount(0);
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      return;
    }

    const nextToken = tokenRef.current + 1;
    tokenRef.current = nextToken;
    setStageToken(nextToken);
    setAlignCount(Math.min(shuffledLength, alignLimit));
    setAlignStep("shrink");

    const shrinkDuration = 1000;
    const pauseAfterShrink = 800;
    const alignDuration = 400;
    const pauseAfterAlign = 1000;

    const alignTimer = window.setTimeout(() => {
      if (tokenRef.current !== nextToken) return;
      setAlignStep("align");
    }, shrinkDuration + pauseAfterShrink);
    const moveTimer = window.setTimeout(() => {
      if (tokenRef.current !== nextToken) return;
      setAlignStep("move");
      if (!manualStop) {
        if (autoStopTimerRef.current) {
          window.clearTimeout(autoStopTimerRef.current);
        }
        autoStopTimerRef.current = window.setTimeout(() => {
          if (tokenRef.current !== nextToken) return;
          setAutoStopNonce((value) => value + 1);
        }, 2000);
      }
    }, shrinkDuration + pauseAfterShrink + alignDuration + pauseAfterAlign);

    return () => {
      window.clearTimeout(alignTimer);
      window.clearTimeout(moveTimer);
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    };
  }, [phase, shuffleKey, alignLimit, shuffledLength, manualStop]);

  useEffect(() => {
    if (!manualStop) return;
    const current = stopSignal ?? 0;
    if (current === stopSignalRef.current) return;
    stopSignalRef.current = current;
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, [manualStop, stopSignal]);

  return { alignStep, alignCount, stageToken, autoStopNonce };
}
