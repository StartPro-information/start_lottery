"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  AlignEffect,
  DealEffect,
  MotionEffect,
  Participant,
  Phase,
  RevealEffect,
  ScatterEffect,
} from "./draw-stage.types";
import useDrawTimeline from "./use-draw-timeline";
import useCardFlow from "./use-card-flow";
import useStageScheduler from "./use-stage-scheduler";
import useDealFlow from "./use-deal-flow";
import useStageGeometry from "./use-stage-geometry";
import useStageLayout from "./use-stage-layout";
import { buildCards } from "./draw-stage.utils";
import useCanvasStage from "./use-canvas-stage";
import useHostAudio from "./use-host-audio";
import useMotionSession from "./use-motion-session";

export default function DrawStage({
  phase,
  participants,
  shuffleKey,
  requiredFields,
  onDealComplete,
  stopSignal,
  isLocked,
  drawCount,
  roundPrizeLabel,
  winnerIds,
  selectedWinnerIds,
  onToggleWinner,
  exitActive,
  exitNonce,
  exitedWinnerIds,
  demotedWinnerIds,
  dealEffect,
  scatterEffect,
  alignEffect,
  motionEffect,
  revealEffect,
  soundEnabled,
  onStopAnimationComplete,
}: {
  phase: Phase;
  participants: Participant[];
  shuffleKey: number;
  requiredFields: string[];
  onDealComplete?: () => void;
  stopSignal?: number;
  isLocked?: boolean | null;
  drawCount?: number;
  roundPrizeLabel?: string;
  winnerIds?: string[];
  selectedWinnerIds?: string[];
  onToggleWinner?: (id: string) => void;
  exitActive?: boolean;
  exitNonce?: number;
  exitedWinnerIds?: string[];
  demotedWinnerIds?: string[];
  dealEffect: DealEffect;
  scatterEffect: ScatterEffect;
  alignEffect: AlignEffect;
  motionEffect: MotionEffect;
  revealEffect: RevealEffect;
  soundEnabled: boolean;
  onStopAnimationComplete?: () => void;
}) {
  const { stageRef, cloudRef, layout, cloudBounds } = useStageLayout(participants.length);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopAnimReportedRef = useRef(false);
  const maxCards = participants.length || 180;
  const cards = useMemo(
    () => buildCards(participants, requiredFields, maxCards),
    [participants, requiredFields, maxCards],
  );

  const shuffled = useMemo(() => {
    const copy = [...cards];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [cards, shuffleKey]);

  const {
    capacity,
    batchSize,
    totalBatches,
    dotSize,
    useDots,
    dotLayout,
    dotMatrix,
    alignLimit,
    scatterLimit,
    grid,
    compactGrid,
    compactCardW,
    compactCardH,
  } = useStageGeometry({
    layout,
    cardsLength: cards.length,
    shuffledLength: shuffled.length,
  });
  const { alignStep, alignCount, stageToken, autoStopNonce } = useStageScheduler({
    phase,
    shuffleKey,
    alignLimit,
    shuffledLength: shuffled.length,
    stopSignal,
    manualStop: typeof stopSignal === "number",
  });
  const { batchKey, clearing, visibleCards } = useDealFlow({
    phase,
    shuffleKey,
    batchSize,
    totalBatches,
    shuffled,
    onDealComplete,
  });
  const { activeCards, alignCards, dotGrid, randomPositions } = useCardFlow({
    phase,
    shuffled,
    visibleCards,
    alignLimit,
    scatterLimit,
    alignCount,
    dotLayout,
    dotMatrix,
    dotSize,
    useDots,
    shuffleKey,
    capacity,
    layout,
    winnerIds,
  });

  const motionEnabled = phase === "align" && alignStep === "move";
  const { session: motionSession, sessionId: motionSessionId } = useMotionSession({
    enabled: motionEnabled,
    shuffleKey,
    alignCards,
    alignCount,
    alignLimit,
    dotGrid,
    compactGrid,
    layout,
    dotSize,
    useDots,
    randomPositions,
    targetCount: drawCount,
    winnerIds,
  });

  const {
    alignStep: timelineAlignStep,
    motionPositions,
    motionScales,
    motionAlphas,
    motionRotations,
    motionTilts,
    winnerIndexes,
    frozenPositions,
    revealStep,
  } = useDrawTimeline({
    phase,
    stopSignal,
    alignStep,
    alignCount,
    motionEffect,
    motionSession,
    motionSessionId,
    stageToken,
    autoStopNonce,
  });

  useHostAudio({
    enabled: soundEnabled,
    phase,
    alignStep: timelineAlignStep,
    revealStep,
    winnerCount: winnerIndexes.length,
    dealCount: activeCards.length,
    dealBatchKey: batchKey,
    stopSignal,
  });

  const { onCanvasClick } = useCanvasStage({
    canvasRef,
    stageRef,
    onToggleWinner,
    phase,
    alignStep: timelineAlignStep,
    revealStep,
    clearing,
    activeCards,
    alignCards,
    grid,
    compactGrid,
    dotGrid,
    randomPositions,
    motionPositions,
    motionScales,
    motionAlphas,
    motionRotations,
    motionTilts,
    frozenPositions,
    winnerIndexes,
    selectedWinnerIds,
    exitedWinnerIds,
    demotedWinnerIds,
    exitActive,
    exitNonce,
    useDots,
    dotSize,
    compactCardW,
    compactCardH,
    capacity,
    layout,
    cloudBounds,
    batchKey,
    roundPrizeLabel,
    drawCount,
    motionEffect,
    dealEffect,
    scatterEffect,
    alignEffect,
    revealEffect,
  });

  useEffect(() => {
    if (phase !== "align") {
      stopAnimReportedRef.current = false;
      return;
    }
    const isFinal =
      revealStep === "arrange" || (winnerIndexes.length <= 1 && revealStep === "grow");
    if (isFinal && !stopAnimReportedRef.current) {
      stopAnimReportedRef.current = true;
      onStopAnimationComplete?.();
    }
  }, [phase, revealStep, winnerIndexes.length, onStopAnimationComplete]);

  return (
    <div className={`host-stage ${useDots ? "host-stage--dot" : ""}`} ref={stageRef}>
      <div className="stage-grid" aria-hidden />
      <div className="stage-glow" aria-hidden />
      <canvas className="card-canvas" ref={canvasRef} onClick={onCanvasClick} />
      <div className="stage-header">
        <div className="stage-status-row">
          <span className="stage-status-text">{phase === "align" ? "\u62bd\u53d6\u4e2d" : "\u51c6\u5907\u5c31\u7eea"}</span>
          <span className="stage-status-text">
            {isLocked === null ? "\u9501\u5b9a\u4e2d\u2026" : isLocked ? "\u5df2\u9501\u5b9a" : "\u672a\u9501\u5b9a"}
          </span>
        </div>
      </div>
      <div className="card-cloud" ref={cloudRef} />
    </div>
  );
}
