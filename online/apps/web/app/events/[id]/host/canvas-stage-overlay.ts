"use client";

import { roundRect } from "./canvas-stage-helpers";
import type { WinnerArea } from "./canvas-stage-layout";

export function drawWinnerBackdrop(
  ctx: CanvasRenderingContext2D,
  winnerAreaStage: WinnerArea,
) {
  ctx.save();
  roundRect(ctx, winnerAreaStage.x, winnerAreaStage.y, winnerAreaStage.w, winnerAreaStage.h, 18);
  ctx.fillStyle = "rgba(6, 10, 16, 0.48)";
  ctx.fill();
  ctx.restore();
}

export function drawWinnerTitleAndScroll({
  ctx,
  winnerAreaStage,
  winnerContentStage,
  roundPrizeLabel,
  drawCount,
  fontFamily,
  maxScroll,
  currentScroll,
}: {
  ctx: CanvasRenderingContext2D;
  winnerAreaStage: WinnerArea;
  winnerContentStage: WinnerArea;
  roundPrizeLabel?: string;
  drawCount?: number;
  fontFamily: string;
  maxScroll: number;
  currentScroll: number;
}) {
  const titlePrize = roundPrizeLabel || "-";
  const titleCount = drawCount ? `${drawCount}人` : "-";
  const title = `${titlePrize} · ${titleCount}`;
  ctx.save();
  const titleFontSize = 64;
  ctx.font = `800 ${titleFontSize}px ${fontFamily}`;
  const titleWidth = ctx.measureText(title).width;
  const titlePaddingX = 18;
  const titleBoxW = titleWidth + titlePaddingX * 2;
  const titleBoxH = titleFontSize + 20;
  const titleBoxX = winnerAreaStage.x + (winnerAreaStage.w - titleBoxW) / 2;
  const titleBoxY = winnerAreaStage.y + 22;
  roundRect(ctx, titleBoxX, titleBoxY, titleBoxW, titleBoxH, 999);
  ctx.fillStyle = "rgba(12, 16, 22, 1)";
  ctx.fill();
  // no border for title pill
  ctx.fillStyle = "rgba(255, 236, 204, 0.98)";
  ctx.textBaseline = "middle";
  ctx.fillText(title, titleBoxX + titlePaddingX, titleBoxY + titleBoxH / 2);
  ctx.textBaseline = "alphabetic";

  if (maxScroll > 0) {
    const trackX = winnerContentStage.x + winnerContentStage.w - 6;
    const trackY = winnerContentStage.y;
    const trackW = 4;
    const trackH = winnerContentStage.h;
    const thumbH = Math.max(28, (trackH * trackH) / (trackH + maxScroll));
    const maxThumbY = trackH - thumbH;
    const thumbY = maxThumbY > 0 ? (currentScroll / maxScroll) * maxThumbY : 0;
    ctx.save();
    roundRect(ctx, trackX, trackY, trackW, trackH, 999);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    roundRect(ctx, trackX, trackY + thumbY, trackW, thumbH, 999);
    ctx.fillStyle = "rgba(255, 193, 94, 0.6)";
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
