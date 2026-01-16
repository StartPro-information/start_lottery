"use client";

import { useEffect, useMemo } from "react";
import type { RefObject } from "react";
import type { Position } from "./draw-stage.types";

export default function useCanvasDots({
  canvasDotsActive,
  canvasRef,
  stageRef,
  dotSize,
  alignStep,
  dotGrid,
  motionPositions,
}: {
  canvasDotsActive: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  dotSize: number;
  alignStep: "none" | "shrink" | "align" | "move";
  dotGrid: Position[];
  motionPositions: Position[];
}) {
  const canvasDots = useMemo(() => {
    if (!canvasDotsActive) return [];
    if (alignStep === "move") {
      return motionPositions;
    }
    return dotGrid;
  }, [alignStep, canvasDotsActive, dotGrid, motionPositions]);

  useEffect(() => {
    if (!canvasDotsActive || !canvasRef.current || !stageRef.current) return;
    const canvas = canvasRef.current;
    const rect = stageRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#20d3c2";
    ctx.shadowColor = "rgba(32, 211, 194, 0.7)";
    ctx.shadowBlur = 10;
    const radius = dotSize / 2;
    for (const dot of canvasDots) {
      ctx.beginPath();
      ctx.arc(dot.x + radius, dot.y + radius, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [canvasDots, canvasDotsActive, dotSize, canvasRef, stageRef]);
}
