"use client";

import type { Layout, Position } from "./draw-stage.types";

export type WinnerArea = { x: number; y: number; w: number; h: number };

export type WinnerLayout = {
  arrangeCardW: number;
  arrangeCardH: number;
  winnerAreaStage: WinnerArea;
  winnerContentStage: WinnerArea;
  winnerContentLocal: WinnerArea;
  arrangeCols: number;
  arrangeRows: number;
  arrangeWidth: number;
  arrangeHeight: number;
  arrangeStartX: number;
  arrangeStartY: number;
  arrangeScalePadY: number;
  getArrangePos: (order: number) => Position;
};

export function computeWinnerLayout({
  layout,
  cloudBounds,
  winnerCount,
  arrangeScale,
  arrangeGap,
  areaPadding = 22,
  headerHeight = 140,
  contentTopInset = 12,
}: {
  layout: Layout;
  cloudBounds: { minX: number; minY: number; width: number; height: number };
  winnerCount: number;
  arrangeScale: number;
  arrangeGap: number;
  areaPadding?: number;
  headerHeight?: number;
  contentTopInset?: number;
}): WinnerLayout {
  const arrangeCardW = Math.floor(layout.cardW * arrangeScale);
  const arrangeCardH = Math.floor(layout.cardH * arrangeScale);
  const winnerAreaStage = {
    x: cloudBounds.minX + 6,
    y: cloudBounds.minY + 6,
    w: Math.max(0, cloudBounds.width - 12),
    h: Math.max(0, cloudBounds.height - 12),
  };
  const winnerContentStage = {
    x: winnerAreaStage.x + areaPadding,
    y: winnerAreaStage.y + headerHeight + contentTopInset,
    w: Math.max(0, winnerAreaStage.w - areaPadding * 2),
    h: Math.max(0, winnerAreaStage.h - headerHeight - areaPadding - contentTopInset),
  };
  const winnerContentLocal = {
    x: winnerContentStage.x - cloudBounds.minX,
    y: winnerContentStage.y - cloudBounds.minY,
    w: winnerContentStage.w,
    h: winnerContentStage.h,
  };
  const arrangeCols = winnerCount
    ? Math.min(
        Math.max(2, Math.ceil(Math.sqrt(winnerCount))),
        Math.max(2, Math.floor(winnerContentLocal.w / (arrangeCardW + arrangeGap))),
      )
    : 0;
  const arrangeRows = arrangeCols ? Math.ceil(winnerCount / arrangeCols) : 0;
  const arrangeWidth =
    arrangeCols > 0 ? arrangeCols * arrangeCardW + (arrangeCols - 1) * arrangeGap : 0;
  const arrangeHeight =
    arrangeRows > 0 ? arrangeRows * arrangeCardH + (arrangeRows - 1) * arrangeGap : 0;
  const arrangeStartX = Math.max(
    winnerContentLocal.x,
    winnerContentLocal.x + (winnerContentLocal.w - arrangeWidth) / 2,
  );
  const arrangeScalePadY = (layout.cardH * (arrangeScale - 1)) / 2;
  const arrangeStartY = Math.max(
    winnerContentLocal.y + arrangeScalePadY,
    winnerContentLocal.y + (winnerContentLocal.h - arrangeHeight) / 2 + arrangeScalePadY,
  );
  const getArrangePos = (order: number) => ({
    x: arrangeStartX + (order % arrangeCols) * (arrangeCardW + arrangeGap),
    y: arrangeStartY + Math.floor(order / arrangeCols) * (arrangeCardH + arrangeGap),
  });

  return {
    arrangeCardW,
    arrangeCardH,
    winnerAreaStage,
    winnerContentStage,
    winnerContentLocal,
    arrangeCols,
    arrangeRows,
    arrangeWidth,
    arrangeHeight,
    arrangeStartX,
    arrangeStartY,
    arrangeScalePadY,
    getArrangePos,
  };
}
