"use client";

export type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  length: number;
  rot: number;
  vr: number;
  color: string;
  delay: number;
  kind: "rect" | "streamer";
};

export type FireworkBurst = {
  x: number;
  y: number;
  startY: number;
  delay: number;
  count: number;
  color: string;
};

export type ConfettiState = {
  start: number;
  pieces: ConfettiPiece[];
  fireworks: FireworkBurst[];
};

export function createConfetti(count: number, width: number, height: number): ConfettiPiece[] {
  const colors = [
    "#ff3b30",
    "#ff9500",
    "#ffd60a",
    "#34c759",
    "#32d74b",
    "#64d2ff",
    "#0a84ff",
    "#5e5ce6",
    "#bf5af2",
    "#ff2d55",
    "#ff7a00",
    "#30d158",
  ];
  return Array.from({ length: count }).map((_, index) => {
    const kind: ConfettiPiece["kind"] = index % 5 === 0 ? "streamer" : "rect";
    return {
      x: Math.random() * width,
      y: -height * 0.1 - Math.random() * 60,
      vx: -22 + Math.random() * 44,
      vy: 26 + Math.random() * 70,
      size: 7 + (index % 7),
      length: 10 + (index % 8) * 2,
      rot: Math.random() * Math.PI * 2,
      vr: -1.6 + Math.random() * 3.2,
      color: colors[index % colors.length],
      delay: Math.random() * 2.2,
      kind,
    };
  });
}

export function createFireworks(count: number, width: number, height: number) {
  const colors = [
    "#ff3b30",
    "#ff9500",
    "#ffd60a",
    "#34c759",
    "#64d2ff",
    "#5e5ce6",
    "#bf5af2",
    "#ff2d55",
  ];
  return Array.from({ length: count }).map((_, index) => ({
    x: width * (0.2 + Math.random() * 0.6),
    y: height * (0.34 + Math.random() * 0.18),
    startY: height * (0.92 + Math.random() * 0.04),
    delay: 0.4 + Math.random() * 1.6,
    count: 22 + (index % 6) * 4,
    color: colors[index % colors.length],
  }));
}

export function drawConfetti(
  ctx: CanvasRenderingContext2D,
  confetti: ConfettiState,
  now: number,
  canvasW: number,
  canvasH: number,
) {
  const elapsed = (now - confetti.start) / 1000;
  const gravity = 28;
  confetti.pieces.forEach((piece) => {
    const t = elapsed - piece.delay;
    if (t < 0 || t > 6) return;
    const x = piece.x + piece.vx * t;
    const y = piece.y + piece.vy * t + 0.5 * gravity * t * t;
    if (x < -80 || x > canvasW + 80 || y > canvasH + 80) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(piece.rot + piece.vr * t);
    ctx.fillStyle = piece.color;
    if (piece.kind === "streamer") {
      ctx.fillRect(-piece.size / 2, -piece.length, piece.size * 0.35, piece.length * 2);
    } else {
      ctx.fillRect(-piece.size / 2, -piece.size, piece.size * 0.6, piece.size * 1.6);
    }
    ctx.restore();
  });
  confetti.fireworks.forEach((burst) => {
    const t = elapsed - burst.delay;
    if (t < 0 || t > 4.0) return;
    ctx.save();
    if (t < 1.3) {
      const ascent = t / 1.3;
      const y = burst.startY + (burst.y - burst.startY) * ascent;
      ctx.globalAlpha = Math.min(1, ascent * 1.2);
      ctx.fillStyle = burst.color;
      ctx.beginPath();
      ctx.arc(burst.x, y, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = burst.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(burst.x, y + 8);
      ctx.lineTo(burst.x, y + 36);
      ctx.stroke();
    } else {
      const boomT = (t - 1.3) / 2.7;
      const radius = boomT * 320;
      const alpha = Math.max(0, 1 - boomT);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = burst.color;
      for (let i = 0; i < burst.count; i += 1) {
        const angle = (Math.PI * 2 * i) / burst.count;
        const px = burst.x + Math.cos(angle) * radius;
        const py = burst.y + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(px, py, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });
}
