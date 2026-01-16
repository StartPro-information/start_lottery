"use client";

export const DEAL_DURATION = 420;
export const ALIGN_MOVE_DURATION = 400;
export const SHRINK_DURATION = 1000;
export const REVEAL_DURATION = 1600;
export const EXIT_DURATION = 1800;

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;
    let x = t;
    for (let i = 0; i < 6; i += 1) {
      const f = ((ax * x + bx) * x + cx) * x - t;
      const df = (3 * ax * x + 2 * bx) * x + cx;
      if (Math.abs(df) < 1e-5) break;
      x -= f / df;
      x = clamp(x);
    }
    return ((ay * x + by) * x + cy) * x;
  };
}

export const ease = cubicBezier(0.25, 0.1, 0.25, 1);
export const easeDeal = cubicBezier(0.2, 0.7, 0.2, 1);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const clamped = clamp(t);
  return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
};

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const slice = text.slice(0, mid);
    if (ctx.measureText(`${slice}...`).width <= maxWidth) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return `${text.slice(0, Math.max(0, low - 1))}...`;
}

export function getInitial(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "?";
  const char = trimmed[0];
  if (char >= "a" && char <= "z") return char.toUpperCase();
  return char;
}
