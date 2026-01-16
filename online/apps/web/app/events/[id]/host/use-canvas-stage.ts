"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MouseEvent, RefObject } from "react";
import type { Phase, RevealStep } from "./draw-stage.types";
import { createConfetti, createFireworks, type ConfettiState } from "./canvas-stage-confetti";
import { getHitTarget, handleWinnerWheel } from "./canvas-stage-input";
import { renderCanvasFrame, type CanvasRenderInput, type HitTarget } from "./canvas-stage-render-loop";

type ColorPalette = {
  ink: string;
  muted: string;
  accent: string;
  accentWarm: string;
};


export default function useCanvasStage({
  canvasRef,
  stageRef,
  onToggleWinner,
  ...input
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  onToggleWinner?: (id: string) => void;
} & CanvasRenderInput) {
  const dataRef = useRef(input);
  const hitTargetsRef = useRef<HitTarget[]>([]);
  const winnerAreaRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const winnerScrollRef = useRef(0);
  const winnerMaxScrollRef = useRef(0);
  const exitSnapshotRef = useRef<CanvasRenderInput | null>(null);
  const confettiRef = useRef<ConfettiState | null>(null);
  const paletteRef = useRef<ColorPalette>({
    ink: "#e7eef8",
    muted: "#9db0c7",
    accent: "#20d3c2",
    accentWarm: "#ffb15c",
  });
  const fontFamilyRef = useRef("Segoe UI, sans-serif");
  const phaseStartRef = useRef(0);
  const alignStepStartRef = useRef(0);
  const revealStepStartRef = useRef(0);
  const exitStartRef = useRef(0);
  const dealStartRef = useRef(0);
  const lastPhaseRef = useRef<Phase>(input.phase);
  const prevPhaseRef = useRef<Phase>(input.phase);
  const lastAlignStepRef = useRef(input.alignStep);
  const lastRevealStepRef = useRef(input.revealStep);
  const lastBatchKeyRef = useRef(input.batchKey);
  const lastExitActiveRef = useRef(Boolean(input.exitActive));

  useEffect(() => {
    dataRef.current = input;
  }, [input]);

  useEffect(() => {
    if (!stageRef.current) return;
    const style = getComputedStyle(stageRef.current);
    const ink = style.getPropertyValue("--host-ink").trim();
    const muted = style.getPropertyValue("--host-muted").trim();
    const accent = style.getPropertyValue("--host-accent").trim();
    const accentWarm = style.getPropertyValue("--host-accent-2").trim();
    paletteRef.current = {
      ink: ink || paletteRef.current.ink,
      muted: muted || paletteRef.current.muted,
      accent: accent || paletteRef.current.accent,
      accentWarm: accentWarm || paletteRef.current.accentWarm,
    };
    const bodyStyle = getComputedStyle(document.body);
    fontFamilyRef.current = bodyStyle.fontFamily || fontFamilyRef.current;
  }, [stageRef]);

  useEffect(() => {
    if (input.phase !== lastPhaseRef.current) {
      phaseStartRef.current = performance.now();
      prevPhaseRef.current = lastPhaseRef.current;
      lastPhaseRef.current = input.phase;
    }
  }, [input.phase]);

  useEffect(() => {
    if (input.alignStep !== lastAlignStepRef.current) {
      alignStepStartRef.current = performance.now();
      lastAlignStepRef.current = input.alignStep;
    }
  }, [input.alignStep]);

  useEffect(() => {
    if (input.revealStep !== lastRevealStepRef.current) {
      revealStepStartRef.current = performance.now();
      lastRevealStepRef.current = input.revealStep;
    }
  }, [input.revealStep]);

  useEffect(() => {
    const shouldStartConfetti =
      input.revealStep === "arrange" ||
      (input.revealStep === "grow" && input.winnerIndexes.length <= 1);
    if (!shouldStartConfetti) {
      confettiRef.current = null;
      return;
    }
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    confettiRef.current = {
      start: performance.now(),
      pieces: createConfetti(960, width, height),
      fireworks: createFireworks(60, width, height),
    };
  }, [input.revealStep, input.winnerIndexes.length, canvasRef]);

  useEffect(() => {
    const exitActive = Boolean(input.exitActive);
    if (!exitActive) {
      exitStartRef.current = 0;
      lastExitActiveRef.current = false;
      exitSnapshotRef.current = null;
      return;
    }
    if (!lastExitActiveRef.current) {
      exitStartRef.current = performance.now();
      lastExitActiveRef.current = true;
      exitSnapshotRef.current = {
        ...dataRef.current,
        activeCards: [...dataRef.current.activeCards],
        alignCards: [...dataRef.current.alignCards],
        grid: [...dataRef.current.grid],
        compactGrid: [...dataRef.current.compactGrid],
        dotGrid: [...dataRef.current.dotGrid],
        randomPositions: [...dataRef.current.randomPositions],
        motionPositions: [...dataRef.current.motionPositions],
        motionScales: [...dataRef.current.motionScales],
        motionAlphas: [...dataRef.current.motionAlphas],
        motionRotations: [...dataRef.current.motionRotations],
        motionTilts: [...dataRef.current.motionTilts],
        frozenPositions: [...dataRef.current.frozenPositions],
        winnerIndexes: [...dataRef.current.winnerIndexes],
        selectedWinnerIds: dataRef.current.selectedWinnerIds
          ? [...dataRef.current.selectedWinnerIds]
          : undefined,
        exitedWinnerIds: dataRef.current.exitedWinnerIds
          ? [...dataRef.current.exitedWinnerIds]
          : undefined,
        demotedWinnerIds: dataRef.current.demotedWinnerIds
          ? [...dataRef.current.demotedWinnerIds]
          : undefined,
      };
    }
  }, [input.exitActive]);

  useEffect(() => {
    if (!input.exitActive) return;
    exitStartRef.current = performance.now();
    lastExitActiveRef.current = true;
  }, [input.exitNonce, input.exitActive]);

  useEffect(() => {
    if (input.phase === "deal" && input.batchKey !== lastBatchKeyRef.current) {
      dealStartRef.current = performance.now();
      lastBatchKeyRef.current = input.batchKey;
    }
  }, [input.phase, input.batchKey]);

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => {
      if (!canvasRef.current || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [canvasRef, stageRef]);

  const onCanvasClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      const target = getHitTarget(event, hitTargetsRef.current);
      if (target) {
        onToggleWinner?.(target.id);
      }
    },
    [onToggleWinner],
  );

  const handleWheel = useCallback(
    (event: {
      clientX: number;
      clientY: number;
      deltaY: number;
      currentTarget: HTMLCanvasElement;
      preventDefault?: () => void;
    }) => {
      const { revealStep, exitActive } = dataRef.current;
      handleWinnerWheel({
        event,
        area: winnerAreaRef.current,
        revealStep,
        exitActive: Boolean(exitActive),
        winnerMaxScrollRef,
        winnerScrollRef,
      });
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (event: globalThis.WheelEvent) => {
      handleWheel({
        clientX: event.clientX,
        clientY: event.clientY,
        deltaY: event.deltaY,
        currentTarget: canvas,
        preventDefault: () => event.preventDefault(),
      });
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handler);
    };
  }, [canvasRef, handleWheel]);

  const drawConfig = useMemo(
    () => ({
      cardRadius: 16,
      dotRadius: 999,
      cardPaddingX: 18,
      cardPaddingY: 12,
      nameSize: 14,
      compactNameSize: 20,
      metaSize: 11,
      subSize: 11,
      nameSizeGrow: 22,
      nameSizeArrange: 24,
      metaSizeGrow: 14,
    }),
    [],
  );

  useEffect(() => {
    let raf = 0;
    const render = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        raf = window.requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = window.requestAnimationFrame(render);
        return;
      }
      const renderData =
        dataRef.current.exitActive && exitSnapshotRef.current
          ? { ...exitSnapshotRef.current, exitActive: dataRef.current.exitActive }
          : dataRef.current;
      hitTargetsRef.current = renderCanvasFrame({
        now,
        ctx,
        canvas,
        data: renderData,
        drawConfig,
        palette: paletteRef.current,
        fontFamily: fontFamilyRef.current,
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
      });
      raf = window.requestAnimationFrame(render);
    };
    raf = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(raf);
  }, [canvasRef, drawConfig, stageRef]);

  return { onCanvasClick };
}
