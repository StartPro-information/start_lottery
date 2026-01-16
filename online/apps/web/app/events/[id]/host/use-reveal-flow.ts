"use client";

import { useEffect, useRef, useState } from "react";
import type { CardItem, Position, RevealStep } from "./draw-stage.types";

function getRandomInt(max: number) {
  if (max <= 0) return 0;
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export default function useRevealFlow({
  phase,
  alignStep,
  stopSignal,
  stageToken,
  alignCards,
  alignCount,
  alignLimit,
  frozenPositions,
  targetCount,
  winnerIds,
}: {
  phase: "idle" | "deal" | "dealt" | "scatter" | "align";
  alignStep: "none" | "shrink" | "align" | "move";
  stopSignal?: number;
  stageToken: number;
  alignCards: CardItem[];
  alignCount: number;
  alignLimit: number;
  frozenPositions: Position[];
  targetCount?: number;
  winnerIds?: string[];
}) {
  const [winnerIndexes, setWinnerIndexes] = useState<number[]>([]);
  const [revealStep, setRevealStep] = useState<RevealStep>("none");
  const revealStepRef = useRef(revealStep);
  const stopSignalRef = useRef(stopSignal ?? 0);
  const pendingStopRef = useRef<number | null>(null);
  const autoTriggeredRef = useRef(false);
  const revealTimer = useRef<number | null>(null);
  const growTimer = useRef<number | null>(null);
  const arrangeTimer = useRef<number | null>(null);
  const manualStop = typeof stopSignal === "number";

  useEffect(() => {
    revealStepRef.current = revealStep;
  }, [revealStep]);

  useEffect(() => {
    if (phase === "align" && alignStep === "move") return;
    setRevealStep("none");
    setWinnerIndexes([]);
    pendingStopRef.current = null;
    autoTriggeredRef.current = false;
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    if (growTimer.current) window.clearTimeout(growTimer.current);
    if (arrangeTimer.current) window.clearTimeout(arrangeTimer.current);
    revealTimer.current = null;
    growTimer.current = null;
    arrangeTimer.current = null;
  }, [phase, alignStep, stageToken]);

  const triggerReveal = () => {
    if (revealStepRef.current !== "none") return;
    const total = Math.max(1, Math.min(alignCount || alignCards.length, alignLimit));
    let resolvedIndexes: number[] = [];
    if (winnerIds && winnerIds.length > 0) {
      const winnerSet = new Set(winnerIds);
      resolvedIndexes = alignCards
        .map((card, index) => (winnerSet.has(card.id) ? index : null))
        .filter((value): value is number => value !== null)
        .filter((index) => index < total);
    }

    if (resolvedIndexes.length === 0) {
      const requestedWinners = targetCount && targetCount > 0 ? targetCount : 1;
      const winnerCount = Math.max(1, Math.min(total, requestedWinners));
      if (winnerCount === 1) {
        const pick = Math.min(total - 1, getRandomInt(total));
        resolvedIndexes = [pick];
      } else {
        const picks = new Set<number>();
        while (picks.size < winnerCount) {
          picks.add(getRandomInt(total));
        }
        resolvedIndexes = Array.from(picks);
      }
    }

    setWinnerIndexes(resolvedIndexes);
    const winnerCount = resolvedIndexes.length;
    const freezeDelay = 1500;
    const colorDelay = 1600;
    const arrangeDelay = 1900;
    revealTimer.current = window.setTimeout(() => {
      setRevealStep("selected");
      if (winnerCount <= 1) {
        growTimer.current = window.setTimeout(() => {
          setRevealStep("grow");
        }, colorDelay);
      } else {
        growTimer.current = window.setTimeout(() => {
          setRevealStep("grow");
          arrangeTimer.current = window.setTimeout(() => {
            setRevealStep("arrange");
          }, arrangeDelay);
        }, colorDelay);
      }
    }, freezeDelay);
  };

  useEffect(() => {
    if (manualStop) return;
    if (phase !== "align" || alignStep !== "move") return;
    if (autoTriggeredRef.current) return;
    if (revealStepRef.current !== "none") return;
    if (frozenPositions.length === 0) return;
    autoTriggeredRef.current = true;
    triggerReveal();
  }, [manualStop, phase, alignStep, frozenPositions.length, revealStep]);

  useEffect(() => {
    const current = stopSignal ?? 0;
    if (current === stopSignalRef.current) return;
    stopSignalRef.current = current;
    if (phase !== "align" || alignStep !== "move") {
      pendingStopRef.current = current;
      return;
    }
    pendingStopRef.current = current;
  }, [stopSignal, phase, alignStep]);

  useEffect(() => {
    if (pendingStopRef.current === null) return;
    if (phase !== "align" || alignStep !== "move") return;
    if (revealStepRef.current !== "none") {
      pendingStopRef.current = null;
      return;
    }
    if (frozenPositions.length === 0) return;
    pendingStopRef.current = null;
    triggerReveal();
  }, [phase, alignStep, frozenPositions.length, revealStep]);

  return {
    winnerIndexes,
    revealStep,
  };
}
