"use client";

import { useEffect, useRef, useState } from "react";
import type { CardItem, Layout, MotionEffect, Phase, Position } from "./draw-stage.types";
import useMotionFlow from "./use-motion-flow";
import useRevealFlow from "./use-reveal-flow";

export default function useDrawTimeline({
  phase,
  stopSignal,
  alignStep,
  alignCount,
  motionEffect,
  motionSession,
  motionSessionId,
  stageToken,
  autoStopNonce,
}: {
  phase: Phase;
  stopSignal?: number;
  alignStep: "none" | "shrink" | "align" | "move";
  alignCount: number;
  motionEffect: MotionEffect;
  motionSession: {
    shuffleKey: number;
    alignCards: CardItem[];
    alignCount: number;
    alignLimit: number;
    dotGrid: Position[];
    compactGrid: Position[];
    layout: Layout;
    dotSize: number;
    useDots: boolean;
    randomPositions: Position[];
    targetCount?: number;
    winnerIds?: string[];
  };
  motionSessionId: number;
  stageToken: number;
  autoStopNonce: number;
}) {
  const lastAllowedPhaseRef = useRef<Phase>(phase);
  const [effectivePhase, setEffectivePhase] = useState<Phase>(phase);

  useEffect(() => {
    const previous = lastAllowedPhaseRef.current;
    let nextPhase = phase;
    if (phase === "align" && previous !== "scatter" && previous !== "align") {
      nextPhase = previous;
    }
    if (nextPhase !== previous) {
      lastAllowedPhaseRef.current = nextPhase;
    }
    setEffectivePhase(nextPhase);
  }, [phase]);

  const constrainedAlignStep = effectivePhase === "align" ? alignStep : "none";
  const constrainedAlignCount = effectivePhase === "align" ? alignCount : 0;

  const motion = useMotionFlow({
    phase: effectivePhase,
    alignStep: constrainedAlignStep,
    shuffleKey: motionSession.shuffleKey,
    alignCards: motionSession.alignCards,
    alignCount: constrainedAlignCount,
    alignLimit: motionSession.alignLimit,
    dotGrid: motionSession.dotGrid,
    compactGrid: motionSession.compactGrid,
    layout: motionSession.layout,
    dotSize: motionSession.dotSize,
    useDots: motionSession.useDots,
    randomPositions: motionSession.randomPositions,
    stopSignal,
    motionEffect,
    motionSessionId,
    stageToken,
    autoStopNonce,
  });

  const reveal = useRevealFlow({
    phase: effectivePhase,
    alignStep: constrainedAlignStep,
    stopSignal,
    stageToken,
    alignCards: motionSession.alignCards,
    alignCount: constrainedAlignCount,
    alignLimit: motionSession.alignLimit,
    frozenPositions: motion.frozenPositions,
    targetCount: motionSession.targetCount,
    winnerIds: motionSession.winnerIds,
  });

  return { alignStep, alignCount, ...motion, ...reveal };
}
