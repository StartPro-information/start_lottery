"use client";

import type { RefObject } from "react";
import type {
  AlignEffect,
  CardItem,
  DealEffect,
  Layout,
  MotionEffect,
  Phase,
  Position,
  RevealEffect,
  RevealStep,
  ScatterEffect,
} from "./draw-stage.types";
import {
  ALIGN_MOVE_DURATION,
  DEAL_DURATION,
  EXIT_DURATION,
  REVEAL_DURATION,
  SHRINK_DURATION,
  clamp,
  ease,
  easeDeal,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "./canvas-stage-helpers";
import { computeWinnerLayout } from "./canvas-stage-layout";
import { drawWinnerBackdrop, drawWinnerTitleAndScroll } from "./canvas-stage-overlay";
import { drawCard, drawCompact, drawDot, drawToggle } from "./canvas-stage-render";
import { type ConfettiState, drawConfetti } from "./canvas-stage-confetti";

export type CanvasRenderInput = {
  phase: Phase;
  alignStep: "none" | "shrink" | "align" | "move";
  revealStep: RevealStep;
  clearing: boolean;
  activeCards: CardItem[];
  alignCards: CardItem[];
  grid: Position[];
  compactGrid: Position[];
  dotGrid: Position[];
  randomPositions: Position[];
  motionPositions: Position[];
  motionScales: number[];
  motionAlphas: number[];
  motionRotations: number[];
  motionTilts: number[];
  frozenPositions: Position[];
  winnerIndexes: number[];
  selectedWinnerIds?: string[];
  exitedWinnerIds?: string[];
  demotedWinnerIds?: string[];
  exitActive?: boolean;
  exitNonce?: number;
  useDots: boolean;
  dotSize: number;
  compactCardW: number;
  compactCardH: number;
  capacity: number;
  layout: Layout;
  cloudBounds: { minX: number; minY: number; width: number; height: number };
  batchKey: number;
  roundPrizeLabel?: string;
  drawCount?: number;
  motionEffect: MotionEffect;
  dealEffect: DealEffect;
  scatterEffect: ScatterEffect;
  alignEffect: AlignEffect;
  revealEffect: RevealEffect;
};

export type HitTarget = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  canToggle: boolean;
};

type ColorPalette = {
  ink: string;
  muted: string;
  accent: string;
  accentWarm: string;
};

type DrawConfig = {
  cardRadius: number;
  dotRadius: number;
  cardPaddingX: number;
  cardPaddingY: number;
  nameSize: number;
  compactNameSize: number;
  metaSize: number;
  subSize: number;
  nameSizeGrow: number;
  nameSizeArrange: number;
  metaSizeGrow: number;
};

export function renderCanvasFrame({
  now,
  ctx,
  canvas,
  data,
  drawConfig,
  palette,
  fontFamily,
  winnerAreaRef,
  winnerScrollRef,
  winnerMaxScrollRef,
  confettiRef,
  phaseStartRef,
  alignStepStartRef,
  revealStepStartRef,
  exitStartRef,
  dealStartRef,
  prevPhaseRef,
}: {
  now: number;
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  data: CanvasRenderInput;
  drawConfig: DrawConfig;
  palette: ColorPalette;
  fontFamily: string;
  winnerAreaRef: RefObject<{ x: number; y: number; w: number; h: number } | null>;
  winnerScrollRef: RefObject<number>;
  winnerMaxScrollRef: RefObject<number>;
  confettiRef: RefObject<ConfettiState | null>;
  phaseStartRef: RefObject<number>;
  alignStepStartRef: RefObject<number>;
  revealStepStartRef: RefObject<number>;
  exitStartRef: RefObject<number>;
  dealStartRef: RefObject<number>;
  prevPhaseRef: RefObject<Phase>;
}) {
  const {
    phase,
    alignStep,
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
    useDots,
    dotSize,
    compactCardW,
    compactCardH,
    capacity,
    layout,
    cloudBounds,
    roundPrizeLabel,
    drawCount,
    motionEffect,
    dealEffect,
    scatterEffect,
    alignEffect,
  } = data;

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  const canvasW = canvas.width / dpr;
  const canvasH = canvas.height / dpr;

  if (clearing || phase === "idle") {
    return [];
  }

  const cards = phase === "align" ? alignCards : activeCards;
  if (!cards.length) {
    return [];
  }

  const winnerSet = new Set(winnerIndexes);
  const selectedSet = new Set(selectedWinnerIds ?? []);
  const exitedSet = new Set(exitedWinnerIds ?? []);
  const demotedSet = new Set(demotedWinnerIds ?? []);
  const winnerCount = winnerIndexes.length;
  const multiWinner = winnerCount > 1;
  const winnerOrderMap = new Map<number, number>();
  winnerIndexes.forEach((index, order) => winnerOrderMap.set(index, order));
  if (exitActive && selectedSet.size === 0 && winnerCount > 0) {
    winnerIndexes.forEach((index) => {
      const card = cards[index];
      if (card) selectedSet.add(card.id);
    });
  }

  const arrangeGap = 28;
  const arrangeScale = 1.18;
  const {
    arrangeCardW,
    arrangeCardH,
    winnerAreaStage,
    winnerContentStage,
    winnerContentLocal,
    arrangeHeight,
    getArrangePos,
  } = computeWinnerLayout({
    layout,
    cloudBounds,
    winnerCount,
    arrangeScale,
    arrangeGap,
  });

  if (revealStep === "arrange") {
    const maxScroll = Math.max(0, arrangeHeight - winnerContentLocal.h);
    winnerMaxScrollRef.current = maxScroll;
    winnerScrollRef.current = clamp(winnerScrollRef.current, 0, maxScroll);
    winnerAreaRef.current = winnerContentStage;
  } else {
    winnerAreaRef.current = null;
  }

  if (revealStep === "arrange") {
    drawWinnerBackdrop(ctx, winnerAreaStage);
  }

  const dealTotal = Math.min(15000, Math.max(3000, cards.length * 22));
  const dealPer = cards.length ? dealTotal / cards.length : 0;
  const dealStart = dealStartRef.current || now;
  const scatterStart = phaseStartRef.current || now;
  const alignStepStart = alignStepStartRef.current || now;
  const revealStart = revealStepStartRef.current || now;

  const hitTargets: HitTarget[] = [];
  const drawOrder: number[] = [];
  const winnerDrawOrder: number[] = [];
  cards.forEach((card, index) => {
    const isWinnerRaw = winnerSet.has(index);
    const isDemoted = demotedSet.has(card.id);
    if (isWinnerRaw && !isDemoted) {
      winnerDrawOrder.push(index);
    } else {
      drawOrder.push(index);
    }
  });
  const ordered = drawOrder.concat(winnerDrawOrder);

  let stageShiftY = 0;
  if (phase === "deal" || phase === "dealt") {
    stageShiftY = -80;
  } else if (prevPhaseRef.current === "deal" || prevPhaseRef.current === "dealt") {
    const shiftProgress = clamp((now - scatterStart) / 260);
    stageShiftY = lerp(-80, 0, easeOutCubic(shiftProgress));
  }

  ordered.forEach((index) => {
    const card = cards[index];
    if (!card) return;
    if (exitedSet.has(card.id)) return;

    const isWinner = winnerSet.has(index);
    const isSelected = selectedSet.has(card.id);
    const isDemoted = demotedSet.has(card.id);
    const isWinnerActive = isWinner && !isDemoted;
    const winnerOrder = winnerOrderMap.get(index) ?? -1;
    const baseCapacity =
      phase === "align"
        ? useDots
          ? dotGrid.length
          : compactGrid.length
        : capacity;
    const posIndex = index % Math.max(1, baseCapacity);
    const basePos =
      phase === "align"
        ? useDots
          ? dotGrid[posIndex % Math.max(1, dotGrid.length)]
          : compactGrid[posIndex % Math.max(1, compactGrid.length)]
        : grid[posIndex % Math.max(1, grid.length)];
    const defaultPos = basePos ?? { x: 0, y: 0 };
    const scatterPos =
      phase === "scatter" || phase === "align"
        ? randomPositions[index] ?? defaultPos
        : defaultPos;
    const motionPos = motionPositions[index] ?? defaultPos;
    const frozenPos = frozenPositions[index] ?? defaultPos;
    const centerPos = {
      x: Math.max(0, (layout.width - layout.cardW) / 2),
      y: Math.max(0, (layout.height - layout.cardH) / 2),
    };
    const exitPos = {
      x: layout.width + layout.paddingX + layout.cardW,
      y: layout.paddingY,
    };
    const arrangePos =
      revealStep === "arrange" && isWinner ? getArrangePos(winnerOrderMap.get(index) ?? 0) : null;

    const renderDot =
      useDots &&
      revealStep !== "grow" &&
      revealStep !== "arrange" &&
      phase === "align" &&
      alignStep !== "none";
    const dotActive = renderDot;
    const compactActive = !useDots && phase === "align" && revealStep !== "grow" && revealStep !== "arrange";
    const baseWidth =
      revealStep === "grow" ? layout.cardW : dotActive ? dotSize : compactActive ? compactCardW : layout.cardW;
    const baseHeight =
      revealStep === "grow" ? layout.cardH : dotActive ? dotSize : compactActive ? compactCardH : layout.cardH;
    const layerIndex = Math.floor(index / Math.max(1, capacity));
    const baseScale = revealStep === "grow" ? 1.08 : 1;
    const winnerScale =
      isWinner && (revealStep === "grow" || revealStep === "arrange") ? arrangeScale : baseScale;
    const useMotionScale =
      phase === "align" &&
      alignStep === "move" &&
      revealStep === "none" &&
      (motionEffect === "sphere" || motionEffect === "ring" || motionEffect === "magnet");
    const motionScale = useMotionScale ? motionScales[index] ?? 1 : 1;
    const motionAlpha = useMotionScale ? motionAlphas[index] ?? 1 : 1;
    const motionRotation = useMotionScale ? motionRotations[index] ?? 0 : 0;
    const motionTilt = useMotionScale ? motionTilts[index] ?? 1 : 1;
    const appliedScale = (isWinner ? winnerScale : baseScale) * motionScale;
    const finalWidth = baseWidth * appliedScale;
    const finalHeight = baseHeight * appliedScale;
    const anchorOffsetX = -(finalWidth - baseWidth) / 2;
    const anchorOffsetY = -(finalHeight - baseHeight) / 2;
    const layerOffset = phase === "scatter" || phase === "align" ? 0 : layerIndex * 8;

    let x = defaultPos.x + layerOffset + anchorOffsetX;
    let y = defaultPos.y + layerOffset + anchorOffsetY;
    let w = finalWidth;
    let h = finalHeight;
    let opacity = 1;

    if (phase === "deal") {
      const delay = index * dealPer;
      const progress = clamp((now - (dealStart + delay)) / DEAL_DURATION);
      const eased = easeDeal(progress);
      let fromX = cloudBounds.width * 0.5;
      let fromY = cloudBounds.height * 0.88;
      let arcOffset = 0;
      if (dealEffect === "fan") {
        fromX = cloudBounds.width * 0.5 + Math.sin(index * 0.35) * 140;
        fromY = cloudBounds.height * 0.92;
        arcOffset = Math.sin(progress * Math.PI) * -40;
      } else if (dealEffect === "burst") {
        const angle = (index * 0.47) % (Math.PI * 2);
        const radius = 120;
        fromX = cloudBounds.width * 0.5 + Math.cos(angle) * radius;
        fromY = cloudBounds.height * 0.5 + Math.sin(angle) * radius;
        arcOffset = Math.sin(progress * Math.PI) * -20;
      }
      x = lerp(fromX, defaultPos.x + layerOffset + anchorOffsetX, eased);
      y = lerp(fromY, defaultPos.y + layerOffset + anchorOffsetY, eased) + arcOffset;
      opacity = eased;
    } else if (phase === "scatter") {
      const progress = clamp((now - scatterStart) / ALIGN_MOVE_DURATION);
      const eased = ease(progress);
      x = lerp(defaultPos.x + layerOffset, scatterPos.x + layerOffset, eased) + anchorOffsetX;
      y = lerp(defaultPos.y + layerOffset, scatterPos.y + layerOffset, eased) + anchorOffsetY;
      if (scatterEffect === "arc") {
        y -= Math.sin(progress * Math.PI) * 26;
      } else if (scatterEffect === "wave") {
        x += Math.sin(progress * Math.PI * 2 + index * 0.35) * 14;
        y += Math.cos(progress * Math.PI * 2 + index * 0.27) * 8;
      }
    } else if (phase === "align") {
      const alignEase = alignEffect === "snap" ? easeOutCubic : alignEffect === "bounce" ? easeOutBack : ease;
      if (alignStep === "shrink") {
        const sizeProgress = clamp((now - alignStepStart) / SHRINK_DURATION);
        const eased = clamp(alignEase(sizeProgress), 0, alignEffect === "bounce" ? 1.08 : 1);
        const startW = layout.cardW;
        const startH = layout.cardH;
        const targetW = useDots ? dotSize : compactCardW;
        const targetH = useDots ? dotSize : compactCardH;
        const currentW = lerp(startW, targetW, eased);
        const currentH = lerp(startH, targetH, eased);
        w = currentW;
        h = currentH;
        if (prevPhaseRef.current === "scatter") {
          x = scatterPos.x + layerOffset + anchorOffsetX;
          y = scatterPos.y + layerOffset + anchorOffsetY;
        } else {
          const posProgress = clamp((now - alignStepStart) / ALIGN_MOVE_DURATION);
          const posEased = alignEase(posProgress);
          x = lerp(defaultPos.x + layerOffset, scatterPos.x + layerOffset, posEased) + anchorOffsetX;
          y = lerp(defaultPos.y + layerOffset, scatterPos.y + layerOffset, posEased) + anchorOffsetY;
        }
      } else if (alignStep === "align") {
        const progress = clamp((now - alignStepStart) / ALIGN_MOVE_DURATION);
        const eased = alignEase(progress);
        x = lerp(scatterPos.x + layerOffset, defaultPos.x + layerOffset, eased) + anchorOffsetX;
        y = lerp(scatterPos.y + layerOffset, defaultPos.y + layerOffset, eased) + anchorOffsetY;
      } else if (alignStep === "move") {
        if (revealStep === "none" && motionPos) {
          x = motionPos.x + layerOffset + anchorOffsetX;
          y = motionPos.y + layerOffset + anchorOffsetY;
        }
      }
    }

    if (phase === "align" && revealStep !== "none") {
      const revealElapsed = now - revealStart;
      const revealProgress = clamp(revealElapsed / REVEAL_DURATION);
      const revealEased = ease(revealProgress);
      const startW = useDots ? dotSize : compactCardW;
      const startH = useDots ? dotSize : compactCardH;
      const targetW = layout.cardW;
      const targetH = layout.cardH;
      if (revealStep === "grow") {
        const currentW = lerp(startW, targetW, revealEased);
        const currentH = lerp(startH, targetH, revealEased);
        w = currentW * appliedScale;
        h = currentH * appliedScale;
      } else if (revealStep === "arrange") {
        w = targetW * appliedScale;
        h = targetH * appliedScale;
      } else {
        w = startW * appliedScale;
        h = startH * appliedScale;
      }

      if (revealStep === "grow" && isWinner && !multiWinner) {
        x = lerp(frozenPos.x + layerOffset, centerPos.x + layerOffset, revealEased) + anchorOffsetX;
        y = lerp(frozenPos.y + layerOffset, centerPos.y + layerOffset, revealEased) + anchorOffsetY;
      } else if (revealStep === "arrange" && isWinner && arrangePos) {
        const arrangeElapsed = now - revealStart;
        const arrangeProgress = clamp(arrangeElapsed / REVEAL_DURATION);
        const arrangeEased = ease(arrangeProgress);
        const scrollOffset = revealStep === "arrange" ? -winnerScrollRef.current : 0;
        x = lerp(frozenPos.x + layerOffset, arrangePos.x + layerOffset, arrangeEased) + anchorOffsetX;
        y = lerp(frozenPos.y + layerOffset, arrangePos.y + layerOffset + scrollOffset, arrangeEased) + anchorOffsetY;
      } else {
        x = frozenPos.x + layerOffset + anchorOffsetX;
        y = frozenPos.y + layerOffset + anchorOffsetY;
      }
    }

    if (exitActive && isWinner) {
      if (exitStartRef.current === 0) {
        exitStartRef.current = now;
      }
      const exitStart = exitStartRef.current || now;
      const exitElapsed = now - exitStart;
      const exitProgress = clamp(exitElapsed / EXIT_DURATION);
      const exitEased = ease(exitProgress);
      const scrollOffset = revealStep === "arrange" ? -winnerScrollRef.current : 0;
      const exitBasePos =
        revealStep === "arrange" && arrangePos
          ? { x: arrangePos.x, y: arrangePos.y + scrollOffset }
          : revealStep === "grow" && isWinner && !multiWinner
            ? centerPos
            : revealStep !== "none"
              ? frozenPos
              : defaultPos;
      const exitFromX = exitBasePos.x + layerOffset + anchorOffsetX;
      const exitFromY = exitBasePos.y + layerOffset + anchorOffsetY;
      if (isSelected) {
        x = lerp(exitFromX, exitPos.x, exitEased);
        y = lerp(exitFromY, exitPos.y, exitEased);
        opacity = lerp(opacity, 0, exitEased);
      } else {
        x = lerp(exitFromX, frozenPos.x + layerOffset + anchorOffsetX, exitEased);
        y = lerp(exitFromY, frozenPos.y + layerOffset + anchorOffsetY, exitEased);
        opacity = lerp(opacity, 1, exitEased);
      }
    }

    opacity *= motionAlpha;
    const drawX = x + cloudBounds.minX;
    const drawY = y + cloudBounds.minY + stageShiftY;

    if (dotActive) {
      drawDot({
        ctx,
        drawX,
        drawY,
        w,
        h,
        opacity,
        palette,
        motionRotation,
        motionTilt,
        isWinnerDot: isWinner && isWinnerActive,
      });
      return;
    }

    if (compactActive) {
      drawCompact({
        ctx,
        drawX,
        drawY,
        w,
        h,
        opacity,
        palette,
        motionRotation,
        motionTilt,
        isWinnerCircle: isWinner && revealStep === "selected",
        fontFamily,
        drawConfig,
        cardName: card.name,
      });
      return;
    }

    const baseBgAlpha = phase === "deal" || phase === "dealt" ? 0.95 : 0.7;
    const textAlpha = revealStep === "grow" ? clamp((now - revealStart) / 260) : 1;
    drawCard({
      ctx,
      drawX,
      drawY,
      w,
      h,
      opacity,
      palette,
      fontFamily,
      drawConfig,
      isWinnerActive,
      revealStep,
      isWinner,
      exitActive: Boolean(exitActive),
      winnerArea: winnerContentStage,
      card,
      baseBgAlpha,
      textAlpha,
      motionRotation,
      motionTilt,
    });

    const canToggle = revealStep === "arrange" && isWinner && !exitActive;
    if (canToggle) {
      drawToggle({
        ctx,
        drawX,
        drawY,
        w,
        opacity,
        isSelected,
        fontFamily,
        winnerArea: winnerAreaRef.current,
      });
      hitTargets.push({ id: card.id, x: drawX, y: drawY, w, h, canToggle });
    }
  });

  if (revealStep === "grow" || revealStep === "arrange") {
    drawWinnerTitleAndScroll({
      ctx,
      winnerAreaStage,
      winnerContentStage,
      roundPrizeLabel,
      drawCount,
      fontFamily,
      maxScroll: winnerMaxScrollRef.current,
      currentScroll: winnerScrollRef.current,
    });
  }

  if (revealStep === "grow" || revealStep === "arrange") {
    const confetti = confettiRef.current;
    if (confetti) {
      drawConfetti(ctx, confetti, now, canvasW, canvasH);
    }
  }

  return hitTargets;
}
