"use client";

import type { CardItem, RevealStep } from "./draw-stage.types";
import { fitText, getInitial, roundRect } from "./canvas-stage-helpers";
import type { WinnerArea } from "./canvas-stage-layout";

export type DrawConfig = {
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

export type ColorPalette = {
  ink: string;
  muted: string;
  accent: string;
  accentWarm: string;
};

export function drawDot({
  ctx,
  drawX,
  drawY,
  w,
  h,
  opacity,
  palette,
  motionRotation,
  motionTilt,
  isWinnerDot,
}: {
  ctx: CanvasRenderingContext2D;
  drawX: number;
  drawY: number;
  w: number;
  h: number;
  opacity: number;
  palette: ColorPalette;
  motionRotation: number;
  motionTilt: number;
  isWinnerDot: boolean;
}) {
  ctx.save();
  if (motionRotation !== 0) {
    const centerX = drawX + w / 2;
    const centerY = drawY + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(motionRotation);
    ctx.scale(motionTilt, 1);
    ctx.translate(-centerX, -centerY);
  }
  ctx.globalAlpha = opacity;
  const dotRadius = Math.max(1, Math.min(w, h) / 2);
  const dotX = drawX + w / 2;
  const dotY = drawY + h / 2;
  if (isWinnerDot) {
    const grad = ctx.createLinearGradient(dotX - dotRadius, dotY - dotRadius, dotX + dotRadius, dotY + dotRadius);
    grad.addColorStop(0, "#ffd776");
    grad.addColorStop(1, palette.accentWarm);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = palette.accent;
  }
  ctx.shadowColor = isWinnerDot ? "rgba(255, 193, 94, 0.55)" : "rgba(32, 211, 194, 0.55)";
  ctx.shadowBlur = isWinnerDot ? 14 : 10;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCompact({
  ctx,
  drawX,
  drawY,
  w,
  h,
  opacity,
  palette,
  motionRotation,
  motionTilt,
  isWinnerCircle,
  fontFamily,
  drawConfig,
  cardName,
}: {
  ctx: CanvasRenderingContext2D;
  drawX: number;
  drawY: number;
  w: number;
  h: number;
  opacity: number;
  palette: ColorPalette;
  motionRotation: number;
  motionTilt: number;
  isWinnerCircle: boolean;
  fontFamily: string;
  drawConfig: DrawConfig;
  cardName: string;
}) {
  ctx.save();
  if (motionRotation !== 0) {
    const centerX = drawX + w / 2;
    const centerY = drawY + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(motionRotation);
    ctx.scale(motionTilt, 1);
    ctx.translate(-centerX, -centerY);
  }
  ctx.globalAlpha = opacity;
  const cx = drawX + w / 2;
  const cy = drawY + h / 2;
  const radius = Math.max(1, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = isWinnerCircle ? palette.accentWarm : palette.accent;
  ctx.fill();
  ctx.fillStyle = "#0c1016";
  ctx.font = `600 ${drawConfig.compactNameSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(getInitial(cardName), cx, cy);
  ctx.restore();
}

export function drawCard({
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
  exitActive,
  winnerArea,
  card,
  baseBgAlpha,
  textAlpha,
  motionRotation,
  motionTilt,
}: {
  ctx: CanvasRenderingContext2D;
  drawX: number;
  drawY: number;
  w: number;
  h: number;
  opacity: number;
  palette: ColorPalette;
  fontFamily: string;
  drawConfig: DrawConfig;
  isWinnerActive: boolean;
  revealStep: RevealStep;
  isWinner: boolean;
  exitActive: boolean;
  winnerArea: WinnerArea | null;
  card: CardItem;
  baseBgAlpha: number;
  textAlpha: number;
  motionRotation: number;
  motionTilt: number;
}) {
  ctx.save();
  if (motionRotation !== 0) {
    const centerX = drawX + w / 2;
    const centerY = drawY + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(motionRotation);
    ctx.scale(motionTilt, 1);
    ctx.translate(-centerX, -centerY);
  }
  if (revealStep === "arrange" && isWinner && !exitActive && winnerArea) {
    ctx.beginPath();
    ctx.rect(winnerArea.x, winnerArea.y, winnerArea.w, winnerArea.h);
    ctx.clip();
  }
  ctx.globalAlpha = opacity;
  const radius = drawConfig.cardRadius;
  roundRect(ctx, drawX, drawY, w, h, radius);
  if (isWinnerActive) {
    ctx.fillStyle = "rgba(22, 24, 18, 0.9)";
    ctx.fill();
    const glow = ctx.createLinearGradient(drawX, drawY, drawX + w, drawY + h);
    glow.addColorStop(0, "rgba(255, 204, 102, 0.28)");
    glow.addColorStop(0.6, "rgba(255, 204, 102, 0.16)");
    glow.addColorStop(1, "rgba(32, 211, 194, 0.08)");
    ctx.fillStyle = glow;
    ctx.fill();
  } else {
    ctx.fillStyle = `rgba(18, 28, 40, ${baseBgAlpha})`;
    ctx.fill();
  }
  ctx.lineWidth = isWinnerActive ? 2 : 1;
  ctx.strokeStyle = isWinnerActive ? "rgba(255, 193, 94, 0.95)" : "rgba(32, 211, 194, 0.35)";
  ctx.stroke();
  if (isWinnerActive) {
    ctx.shadowColor = "rgba(255, 193, 94, 0.35)";
    ctx.shadowBlur = 12;
  } else {
    ctx.shadowColor = "rgba(32, 211, 194, 0.2)";
    ctx.shadowBlur = 8;
  }

  ctx.globalAlpha = opacity * textAlpha;
  const paddingX = drawConfig.cardPaddingX;
  const paddingY = drawConfig.cardPaddingY;
  const nameSize = isWinnerActive
    ? revealStep === "arrange"
      ? drawConfig.nameSizeArrange
      : drawConfig.nameSizeGrow
    : drawConfig.nameSize;
  const metaSize = isWinnerActive && revealStep !== "arrange" ? drawConfig.metaSizeGrow : drawConfig.metaSize;
  ctx.fillStyle = palette.ink;
  ctx.font = `600 ${nameSize}px ${fontFamily}`;
  const nameMaxWidth = w - paddingX * 2;
  const nameText = fitText(ctx, card.name, nameMaxWidth);
  ctx.fillText(nameText, drawX + paddingX, drawY + paddingY + nameSize);

  ctx.font = `400 ${metaSize}px ${fontFamily}`;
  ctx.fillStyle = palette.muted;
  const metaText = fitText(ctx, card.meta ?? "-", nameMaxWidth);
  ctx.fillText(metaText, drawX + paddingX, drawY + paddingY + nameSize + metaSize + 6);
  if (card.sub) {
    ctx.fillStyle = "rgba(157, 176, 199, 0.7)";
    const subText = fitText(ctx, card.sub, nameMaxWidth);
    ctx.fillText(
      subText,
      drawX + paddingX,
      drawY + paddingY + nameSize + metaSize * 2 + 12,
    );
  }
  ctx.restore();
}

export function drawToggle({
  ctx,
  drawX,
  drawY,
  w,
  opacity,
  isSelected,
  fontFamily,
  winnerArea,
}: {
  ctx: CanvasRenderingContext2D;
  drawX: number;
  drawY: number;
  w: number;
  opacity: number;
  isSelected: boolean;
  fontFamily: string;
  winnerArea: WinnerArea | null;
}) {
  const toggleSize = 26;
  const toggleX = drawX + w - toggleSize - 8;
  const toggleY = drawY + 8;
  ctx.save();
  ctx.globalAlpha = opacity;
  if (winnerArea) {
    ctx.beginPath();
    ctx.rect(winnerArea.x, winnerArea.y, winnerArea.w, winnerArea.h);
    ctx.clip();
  }
  roundRect(ctx, toggleX, toggleY, toggleSize, toggleSize, 8);
  if (isSelected) {
    ctx.fillStyle = "rgba(255, 193, 94, 0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 193, 94, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1b1406";
    ctx.font = `700 16px ${fontFamily}`;
    ctx.fillText("✓", toggleX + 7, toggleY + 18);
  } else {
    ctx.fillStyle = "rgba(12, 18, 26, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}
