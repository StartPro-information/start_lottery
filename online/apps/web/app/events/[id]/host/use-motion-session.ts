"use client";

import { useEffect, useRef, useState } from "react";
import type { CardItem, Layout, Position } from "./draw-stage.types";

type MotionSessionInput = {
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

export default function useMotionSession({
  enabled,
  ...input
}: { enabled: boolean } & MotionSessionInput) {
  const latestRef = useRef<MotionSessionInput>(input);
  const sessionRef = useRef<MotionSessionInput | null>(null);
  const [sessionId, setSessionId] = useState(0);
  const prevEnabledRef = useRef(false);

  useEffect(() => {
    latestRef.current = input;
  }, [
    input.shuffleKey,
    input.alignCards,
    input.alignCount,
    input.alignLimit,
    input.dotGrid,
    input.compactGrid,
    input.layout,
    input.dotSize,
    input.useDots,
    input.randomPositions,
    input.targetCount,
    input.winnerIds,
  ]);

  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      sessionRef.current = latestRef.current;
      setSessionId((value) => value + 1);
    } else if (!enabled) {
      sessionRef.current = null;
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  return {
    session: sessionRef.current ?? latestRef.current,
    sessionId,
  };
}
