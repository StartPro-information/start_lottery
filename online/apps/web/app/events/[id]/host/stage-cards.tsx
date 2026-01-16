"use client";

import type { CSSProperties } from "react";
import type { CardItem, Layout, Phase, Position, RevealStep } from "./draw-stage.types";

export default function StageCards({
  phase,
  clearing,
  canvasDotsActive,
  alignCards,
  activeCards,
  capacity,
  dotGrid,
  compactGrid,
  grid,
  randomPositions,
  motionPositions,
  alignStep,
  scatterStep,
  revealStep,
  winnerIndexes,
  frozenPositions,
  isMotionActive,
  useDots,
  layout,
  dotSize,
  compactCardW,
  compactCardH,
  cloudBounds,
  batchKey,
  selectedWinnerIds,
  onToggleWinner,
  exitActive,
  exitedWinnerIds,
  demotedWinnerIds,
}: {
  phase: Phase;
  clearing: boolean;
  canvasDotsActive: boolean;
  alignCards: CardItem[];
  activeCards: CardItem[];
  capacity: number;
  dotGrid: Position[];
  compactGrid: Position[];
  grid: Position[];
  randomPositions: Position[];
  motionPositions: Position[];
  alignStep: "none" | "shrink" | "align" | "move";
  scatterStep: "none" | "spread" | "dot";
  revealStep: RevealStep;
  winnerIndexes: number[];
  frozenPositions: Position[];
  isMotionActive: boolean;
  useDots: boolean;
  layout: Layout;
  dotSize: number;
  compactCardW: number;
  compactCardH: number;
  cloudBounds: { minX: number; minY: number };
  batchKey: number;
  selectedWinnerIds?: string[];
  onToggleWinner?: (id: string) => void;
  exitActive?: boolean;
  exitedWinnerIds?: string[];
  demotedWinnerIds?: string[];
}) {
  if (phase === "idle" || clearing || canvasDotsActive) {
    return null;
  }

  const winnerSet = new Set(winnerIndexes);
  const selectedSet = new Set(selectedWinnerIds ?? []);
  const exitedSet = new Set(exitedWinnerIds ?? []);
  const demotedSet = new Set(demotedWinnerIds ?? []);
  const multiWinner = winnerIndexes.length > 1;
  const winnerOrder = new Map<number, number>();
  winnerIndexes.forEach((index, order) => {
    winnerOrder.set(index, order);
  });
  const winnerCount = winnerIndexes.length;
  const arrangeGap = 28;
  const arrangeScale = 1.18;
  const arrangeCardW = Math.floor(layout.cardW * arrangeScale);
  const arrangeCardH = Math.floor(layout.cardH * arrangeScale);
  const arrangeCols = winnerCount
    ? Math.min(
        Math.max(2, Math.ceil(Math.sqrt(winnerCount))),
        Math.max(2, Math.floor((layout.width - layout.paddingX * 2) / (arrangeCardW + arrangeGap))),
      )
    : 0;
  const arrangeRows = arrangeCols ? Math.ceil(winnerCount / arrangeCols) : 0;
  const arrangeWidth =
    arrangeCols > 0 ? arrangeCols * arrangeCardW + (arrangeCols - 1) * arrangeGap : 0;
  const arrangeHeight =
    arrangeRows > 0 ? arrangeRows * arrangeCardH + (arrangeRows - 1) * arrangeGap : 0;
  const arrangeStartX = Math.max(layout.paddingX, (layout.width - arrangeWidth) / 2);
  const arrangeStartY = Math.max(layout.paddingY, (layout.height - arrangeHeight) / 2);
  const getArrangePos = (order: number) => ({
    x: arrangeStartX + (order % arrangeCols) * (arrangeCardW + arrangeGap),
    y: arrangeStartY + Math.floor(order / arrangeCols) * (arrangeCardH + arrangeGap),
  });

  return (
    <>
      {(phase === "align" ? alignCards : activeCards).map((card, index) => {
        if (exitedSet.has(card.id)) {
          return null;
        }
        const layerIndex = Math.floor(index / Math.max(1, capacity));
        const isWinnerRaw = winnerSet.has(index);
        const isDemoted = demotedSet.has(card.id);
        const isWinner = isWinnerRaw && !isDemoted;
        const isSelected = selectedSet.has(card.id);
        const isFreeze = revealStep === "frozen" || revealStep === "selected";
        const isGrow = revealStep === "grow";
        const isWinnerActive =
          isWinner &&
          (revealStep === "selected" || revealStep === "grow" || revealStep === "arrange") &&
          (!exitActive || isSelected);
        const baseCapacity =
          phase === "align" ? (useDots ? dotGrid.length : compactGrid.length) : capacity;
        const posIndex = index % Math.max(1, baseCapacity);
        const defaultPos =
          phase === "align" && useDots
            ? dotGrid[posIndex % dotGrid.length] ?? {
                x: layout.paddingX,
                y: layout.paddingY,
              }
            : phase === "align" && !useDots
              ? compactGrid[posIndex % compactGrid.length] ?? {
                  x: layout.paddingX,
                  y: layout.paddingY,
                }
              : grid[posIndex % grid.length] ?? {
                  x: layout.paddingX,
                  y: layout.paddingY,
                };
        const scatterPos = randomPositions[index] ?? defaultPos;
        const motionPos =
          phase === "align" && alignStep === "move" && motionPositions[index]
            ? motionPositions[index]
            : null;
        const renderDot =
          useDots &&
          revealStep !== "grow" &&
          revealStep !== "arrange" &&
          ((phase === "align" && alignStep !== "none") ||
            (phase !== "align" && scatterStep === "dot"));
        const frozenPos = frozenPositions[index];
        const centerPos = {
          x: Math.max(0, (layout.width - layout.cardW) / 2),
          y: Math.max(0, (layout.height - layout.cardH) / 2),
        };
        const exitPos = {
          x: layout.width + layout.paddingX + layout.cardW,
          y: layout.paddingY,
        };
        const exitTarget = exitActive && isWinner && isSelected ? exitPos : null;
        const arrangePos =
          revealStep === "arrange" && isWinner
            ? getArrangePos(winnerOrder.get(index) ?? 0)
            : null;
        const targetPos =
          exitTarget
            ? exitTarget
            : revealStep === "grow" && isWinner && !multiWinner
              ? centerPos
              : arrangePos
                ? arrangePos
                : revealStep !== "none" && frozenPos
                  ? frozenPos
                  : phase === "scatter"
                    ? scatterPos
                    : phase === "align" && alignStep === "shrink"
                      ? scatterPos
                      : phase === "align"
                        ? defaultPos
                        : defaultPos;
        const motionOffsetX =
          revealStep !== "none"
            ? 0
            : phase === "align" && alignStep === "move" && motionPos
              ? motionPos.x - defaultPos.x
              : 0;
        const motionOffsetY =
          revealStep !== "none"
            ? 0
            : phase === "align" && alignStep === "move" && motionPos
              ? motionPos.y - defaultPos.y
              : 0;
        const dealTotal = Math.min(15000, Math.max(3000, activeCards.length * 22));
        const dealPer = activeCards.length ? dealTotal / activeCards.length : 0;
        const dealDelay = phase === "deal" ? `${index * dealPer}ms` : "0ms";
        const dealDuration = phase === "deal" ? "420ms" : "0ms";
        const layerOffset = phase === "scatter" || phase === "align" ? 0 : layerIndex * 8;
        const dotActive = renderDot && !canvasDotsActive;
        const compactActive =
          !useDots && phase === "align" && revealStep !== "grow" && revealStep !== "arrange";
        const cloudOffsetX = cloudBounds.minX;
        const cloudOffsetY = cloudBounds.minY;
        const baseWidth =
          revealStep === "grow"
            ? layout.cardW
            : dotActive
              ? dotSize
              : compactActive
                ? compactCardW
                : layout.cardW;
        const baseHeight =
          revealStep === "grow"
            ? layout.cardH
            : dotActive
              ? dotSize
              : compactActive
                ? compactCardH
                : layout.cardH;
        const baseScale = revealStep === "grow" ? 1.08 : 1;
        const winnerScale =
          isWinner && (revealStep === "grow" || revealStep === "arrange") ? arrangeScale : baseScale;
        const appliedScale = isWinner ? winnerScale : baseScale;
        const finalWidth = baseWidth * appliedScale;
        const finalHeight = baseHeight * appliedScale;
        const anchorOffsetX = -(finalWidth - baseWidth) / 2;
        const anchorOffsetY = -(finalHeight - baseHeight) / 2;
        const style: CSSProperties = {
          ["--from-x" as string]: "50%",
          ["--from-y" as string]: "88%",
          ["--to-x" as string]: `${targetPos.x - cloudOffsetX + layerOffset + anchorOffsetX}px`,
          ["--to-y" as string]: `${targetPos.y - cloudOffsetY + layerOffset + anchorOffsetY}px`,
          ["--deal-delay" as string]: dealDelay,
          ["--deal-duration" as string]: dealDuration,
          ["--motion-x" as string]: `${motionOffsetX}px`,
          ["--motion-y" as string]: `${motionOffsetY}px`,
          opacity: 1,
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
          zIndex: isWinner ? 50 : 1,
        };
        const canToggle = revealStep === "arrange" && isWinner && !exitActive;
        return (
          <div
            className={`card-chip ${phase === "deal" ? "deal-in" : ""} ${dotActive ? "card-dot" : ""} ${
              isMotionActive ? "card-motion" : ""
            } ${phase === "align" && alignStep === "shrink" ? "card-shrink" : ""} ${
              isWinnerActive ? "card-winner" : ""
            } ${isGrow ? "card-reveal" : ""} ${isFreeze ? "card-freeze" : ""} ${
              isWinnerActive && isGrow ? "card-winner-main" : ""
            } ${revealStep === "arrange" ? "card-arrange" : ""} ${
              revealStep === "arrange" && isWinner ? "card-winner-final" : ""
            } ${canToggle ? "card-winner-selectable" : ""} ${
              exitActive && isWinner && isSelected ? "card-winner-exit" : ""
            }`}
            style={style}
            key={`${batchKey}-${card.id}`}
            onClick={canToggle ? () => onToggleWinner?.(card.id) : undefined}
          >
            <span className="card-name">{card.name}</span>
            {!compactActive && card.meta ? <span className="card-meta">{card.meta}</span> : null}
            {!compactActive && card.sub ? <span className="card-sub">{card.sub}</span> : null}
            {canToggle ? (
              <button
                type="button"
                className={`winner-toggle ${selectedSet.has(card.id) ? "is-checked" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleWinner?.(card.id);
                }}
                aria-pressed={selectedSet.has(card.id)}
              >
                <span className="winner-toggle-check" aria-hidden="true">
                  ✓
                </span>
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
