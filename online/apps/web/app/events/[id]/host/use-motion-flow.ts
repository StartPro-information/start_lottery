"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardItem, Layout, MotionEffect, Position } from "./draw-stage.types";
import { mulberry32 } from "./draw-stage.utils";

type MotionParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emitDelay: number;
  startX: number;
  startY: number;
  angle: number;
  radius: number;
  omega: number;
  phase: number;
  theta: number;
  phi: number;
};

type MotionTransition = {
  start: number;
  duration: number;
  fromPositions: Position[];
  fromScales: number[];
  fromAlphas: number[];
  fromRotations: number[];
  fromTilts: number[];
};

const EFFECT_TRANSITION_DURATION = 800;

export default function useMotionFlow({
  phase,
  alignStep,
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
  stopSignal,
  motionEffect,
  motionSessionId,
  stageToken,
  autoStopNonce,
}: {
  phase: "idle" | "deal" | "dealt" | "scatter" | "align";
  alignStep: "none" | "shrink" | "align" | "move";
  shuffleKey: number;
  alignCards: CardItem[];
  alignCount: number;
  alignLimit: number;
  dotGrid: Position[];
  compactGrid: Position[];
  layout: Layout;
  dotSize: number;
  useDots: boolean;
  randomPositions: Position[];
  stopSignal?: number;
  motionEffect: MotionEffect;
  motionSessionId: number;
  stageToken: number;
  autoStopNonce: number;
}) {
  const rafRef = useRef<number | null>(null);
  const winnerTimer = useRef<number | null>(null);
  const motionRef = useRef<MotionParticle[]>([]);
  const motionPositionsRef = useRef<Position[]>([]);
  const motionScalesRef = useRef<number[]>([]);
  const motionAlphasRef = useRef<number[]>([]);
  const motionRotationsRef = useRef<number[]>([]);
  const motionTiltsRef = useRef<number[]>([]);
  const stopSignalRef = useRef(stopSignal ?? 0);
  const triggerStopRef = useRef<(() => void) | null>(null);
  const motionStartRef = useRef(0);
  const motionEffectRef = useRef(motionEffect);
  const activeEffectRef = useRef<MotionEffect>(motionEffect);
  const transitionRef = useRef<MotionTransition | null>(null);
  const effectSwitchRef = useRef(0);
  const [motionPositions, setMotionPositions] = useState<Position[]>([]);
  const [motionScales, setMotionScales] = useState<number[]>([]);
  const [motionAlphas, setMotionAlphas] = useState<number[]>([]);
  const [motionRotations, setMotionRotations] = useState<number[]>([]);
  const [motionTilts, setMotionTilts] = useState<number[]>([]);
  const [isMotionActive, setIsMotionActive] = useState(false);
  const [frozenPositions, setFrozenPositions] = useState<Position[]>([]);
  const manualStop = typeof stopSignal === "number";
  const stopTrigger = manualStop ? stopSignal ?? 0 : autoStopNonce;

  useEffect(() => {
    motionEffectRef.current = motionEffect;
  }, [motionEffect]);

  useEffect(() => {
    motionPositionsRef.current = motionPositions;
  }, [motionPositions]);

  useEffect(() => {
    motionScalesRef.current = motionScales;
  }, [motionScales]);

  useEffect(() => {
    motionAlphasRef.current = motionAlphas;
  }, [motionAlphas]);

  useEffect(() => {
    motionRotationsRef.current = motionRotations;
  }, [motionRotations]);

  useEffect(() => {
    motionTiltsRef.current = motionTilts;
  }, [motionTilts]);

  const buildParticles = useCallback(
    ({
      effect,
      seed,
      seedPositions,
      seedParticles,
    }: {
      effect: MotionEffect;
      seed: number;
      seedPositions?: Position[];
      seedParticles?: MotionParticle[];
    }) => {
      const count = Math.max(1, Math.min(alignCount || alignCards.length, alignLimit));
      const rng = mulberry32(seed);
      const particleW = useDots ? dotSize : layout.cardW;
      const particleH = useDots ? dotSize : layout.cardH;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(minX, layout.width - particleW);
      const maxY = Math.max(minY, layout.height - particleH);
      const speedMin =
        effect === "orbit" ? 0.22 : effect === "waterfall" ? 0.8 : 0.3;
      const speedMax =
        effect === "orbit" ? 0.5 : effect === "waterfall" ? 1.2 : 0.6;
      const centerX = layout.width * 0.5;
      const centerY = layout.height * 0.5;
      const maxSwirlRadius = Math.min(layout.width, layout.height) * 0.45;
      const sphereRadius = Math.min(layout.width, layout.height) * 0.4;
      const ringMaxRadius = Math.min(layout.width, layout.height) * 0.45;
      const ringMinRadius = Math.min(layout.width, layout.height) * 0.12;
      const ringCount = Math.max(3, Math.min(8, Math.round(Math.sqrt(count) / 2)));
      const magnetRadius = Math.min(layout.width, layout.height) * 0.42;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      return Array.from({ length: count }).map((_, index) => {
        const basePos = seedPositions?.[index]
          ? seedPositions[index]
          : useDots
            ? dotGrid[index] ?? { x: minX, y: minY }
            : compactGrid[index] ?? { x: minX, y: minY };
        const speed = speedMin + rng() * (speedMax - speedMin);
        const emitSide = effect === "bounce" ? (index % 2 === 0 ? "left" : "right") : "left";
        const angle =
          effect === "bounce"
            ? emitSide === "left"
              ? -Math.PI * 0.48 + rng() * (Math.PI * 0.96)
              : Math.PI - Math.PI * 0.48 + rng() * (Math.PI * 0.96)
            : rng() * Math.PI * 2;
        const emitX = emitSide === "left" ? minX : maxX;
        const emitY = centerY;
        const pos = seedPositions
          ? basePos
          : effect === "bounce"
            ? { x: emitX, y: emitY }
            : effect === "waterfall"
              ? {
                  x: minX + Math.round(rng() * 12) * ((maxX - minX || 1) / 12),
                  y: minY + rng() * (maxY - minY || 1),
                }
              : basePos;
        const baseX = pos.x;
        const baseY = pos.y;
        const dx = baseX - centerX;
        const dy = baseY - centerY;
        const dist = Math.hypot(dx, dy) || 1;
        const swirlRadius = Math.min(dist, maxSwirlRadius);
        const swirlAngle = Math.atan2(dy, dx);
        const omega = effect === "swirl" ? 0.0015 + rng() * 0.0015 : 0;
        const phase = rng() * Math.PI * 2;
        const sphereU = (index + 0.5) / count;
        const sphereTheta = goldenAngle * index;
        const spherePhi = Math.acos(1 - 2 * sphereU);
        const baseParticle = seedParticles?.[index];
        const baseVx = baseParticle?.vx;
        const baseVy = baseParticle?.vy;
        const vx = baseVx ?? (effect === "waterfall" ? 0 : Math.cos(angle) * speed);
        const vy = baseVy ?? (effect === "waterfall" ? speed : Math.sin(angle) * speed);
        const boostedVx =
          effect === "bounce" && !seedPositions
            ? emitSide === "left"
              ? Math.abs(vx) + speedMin * 0.6
              : -(Math.abs(vx) + speedMin * 0.6)
            : vx;
        const emitDelay =
          effect === "bounce" && !seedPositions ? rng() * 160 + index * 8 : 0;
        return {
          x: pos.x,
          y: pos.y,
          vx: boostedVx,
          vy,
          emitDelay,
          startX: pos.x,
          startY: pos.y,
          angle: swirlAngle,
          radius: swirlRadius,
          omega,
          phase,
          theta: sphereTheta,
          phi: spherePhi,
        };
      });
    },
    [
      alignCount,
      alignCards.length,
      alignLimit,
      useDots,
      dotSize,
      layout.cardW,
      layout.cardH,
      layout.width,
      layout.height,
      dotGrid,
      compactGrid,
    ],
  );

  useEffect(() => {
    if (phase !== "align" || alignStep !== "move") {
      motionRef.current = [];
      transitionRef.current = null;
      setMotionPositions([]);
      setMotionScales([]);
      setMotionAlphas([]);
      setMotionRotations([]);
      setMotionTilts([]);
      setIsMotionActive(false);
      setFrozenPositions([]);
      if (winnerTimer.current) window.clearTimeout(winnerTimer.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      winnerTimer.current = null;
      rafRef.current = null;
      return;
    }

    if (winnerTimer.current) window.clearTimeout(winnerTimer.current);
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    winnerTimer.current = null;
    rafRef.current = null;
    motionRef.current = [];
    setFrozenPositions([]);
    setMotionScales([]);
    setMotionAlphas([]);
    setMotionRotations([]);
    setMotionTilts([]);
    const currentEffect = motionEffectRef.current;
    activeEffectRef.current = currentEffect;
    effectSwitchRef.current = 0;
    transitionRef.current = null;
    motionStartRef.current = performance.now();

    const count = Math.max(1, Math.min(alignCount || alignCards.length, alignLimit));
    const particleW = useDots ? dotSize : layout.cardW;
    const particleH = useDots ? dotSize : layout.cardH;
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(minX, layout.width - particleW);
    const maxY = Math.max(minY, layout.height - particleH);
    const centerX = layout.width * 0.5;
    const centerY = layout.height * 0.5;
    const sphereRadius = Math.min(layout.width, layout.height) * 0.4;
    const ringMaxRadius = Math.min(layout.width, layout.height) * 0.45;
    const ringMinRadius = Math.min(layout.width, layout.height) * 0.12;
    const ringCount = Math.max(3, Math.min(8, Math.round(Math.sqrt(count) / 2)));
    const magnetRadius = Math.min(layout.width, layout.height) * 0.42;
    const next = buildParticles({
      effect: currentEffect,
      seed: shuffleKey + count * 91,
    });
    motionRef.current = next;
    setMotionPositions(next.map(({ x, y }) => ({ x, y })));
    setMotionScales(next.map(() => 1));
    setMotionAlphas(next.map(() => 1));
    setMotionRotations(next.map(() => 0));
    setMotionTilts(next.map(() => 1));
    setIsMotionActive(true);

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      const formationDuration = 900;
      const formationT = Math.min(1, Math.max(0, (now - motionStartRef.current) / formationDuration));
      const formationEase = 1 - Math.pow(1 - formationT, 3);
      const nextPositions: Position[] = [];
      const nextScales: number[] = [];
      const nextAlphas: number[] = [];
      const nextRotations: number[] = [];
      const nextTilts: number[] = [];
      const effect = activeEffectRef.current;
      const updated = motionRef.current.map((dot, index) => {
        const emitElapsed = now - motionStartRef.current - dot.emitDelay;
        const emitted = effect !== "bounce" || emitElapsed >= 0;
        let x = emitted ? dot.x + dot.vx * dt : dot.startX;
        let y = emitted ? dot.y + dot.vy * dt : dot.startY;
        let vx = dot.vx;
        let vy = dot.vy;
        let angle = dot.angle;
        let radius = dot.radius;
        const phase = dot.phase;
        let scale = 1;
        let alpha = emitted ? 1 : 0;
        let rotation = 0;
        let tilt = 1;
        if (effect === "bounce" && emitted) {
          alpha = Math.min(1, Math.max(0, emitElapsed / 120));
        }
        if (effect === "sphere") {
          const spinY = now * 0.0016;
          const theta = dot.theta + spinY;
          const phi = dot.phi;
          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);
          const cosTheta = Math.cos(theta);
          const sinTheta = Math.sin(theta);
          let x3 = sphereRadius * sinPhi * cosTheta;
          let y3 = sphereRadius * cosPhi;
          let z3 = sphereRadius * sinPhi * sinTheta;
          const x1 = x3;
          const y1 = y3;
          const z2 = z3;
          const depth = (z2 + sphereRadius) / (2 * sphereRadius);
          scale = 0.55 + depth * 0.7;
          alpha = 0.45 + depth * 0.55;
          rotation = Math.atan2(x1, z2 + sphereRadius) * 0.65;
          const tiltBase = Math.min(1, Math.abs(x1) / sphereRadius);
          tilt = 1 - Math.pow(tiltBase, 1.35) * 0.65;
          const sphereX = centerX + x1 * scale;
          const sphereY = centerY + y1 * scale;
          x = dot.startX + (sphereX - dot.startX) * formationEase;
          y = dot.startY + (sphereY - dot.startY) * formationEase;
        }
        if (effect === "ring") {
          const ringIndex = index % ringCount;
          const ringT = ringCount > 1 ? ringIndex / (ringCount - 1) : 0.5;
          const ringRadius = ringMinRadius + (ringMaxRadius - ringMinRadius) * ringT;
          const baseAngle = phase + ringIndex * 0.35;
          const ringSpeed = 0.0022 + ringT * 0.0004;
          const direction = ringIndex % 2 === 0 ? 1 : -1;
          const timeAngle = now * ringSpeed * direction;
          const angleStep = (index / ringCount) * 0.55;
          const angleAt = baseAngle + timeAngle + angleStep;
          const radius = ringRadius;
          const ringX = centerX + Math.cos(angleAt) * radius;
          const ringY = centerY + Math.sin(angleAt) * radius * 0.85;
          x = dot.startX + (ringX - dot.startX) * formationEase;
          y = dot.startY + (ringY - dot.startY) * formationEase;
          scale = 0.9 + ringT * 0.2;
          alpha = 0.6 + ringT * 0.4;
          tilt = 0.9 + ringT * 0.1;
        }
        if (effect === "magnet") {
          const armCount = 6;
          const armIndex = index % armCount;
          const armPhase = armIndex / armCount;
          const armSlots = Math.max(1, Math.ceil(motionRef.current.length / armCount));
          const slot = Math.floor(index / armCount);
          const t = (slot + 1) / (armSlots + 1);
          const inner = magnetRadius * 0.2;
          const outer = magnetRadius * 0.98;
          const radius = inner + (outer - inner) * t;
          const spin = -now * 0.0021;
          const swirl = spin + armPhase * Math.PI * 2 + t * 1.2;
          const drift =
            Math.sin(now * 0.0011) *
            (layout.width * 0.02) *
            Math.cos(armPhase * Math.PI * 2);
          const x1 = centerX + Math.cos(swirl) * radius + drift;
          const y1 = centerY + Math.sin(swirl) * radius * 0.85;
          x = dot.startX + (x1 - dot.startX) * formationEase;
          y = dot.startY + (y1 - dot.startY) * formationEase;
          const depth = t;
          scale = 0.85 + depth * 0.25;
          alpha = 0.55 + depth * 0.4;
          rotation = Math.cos(swirl) * 0.22;
          tilt = 0.85 + depth * 0.2;
        }
        if (effect === "swirl") {
          angle += dot.omega * dt;
          radius = dot.radius + Math.sin(now * 0.0015 + phase) * 6;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
        }
        if (effect === "waterfall") {
          const targetX = dot.startX;
          const targetY = y + vy * dt;
          let nextY = targetY;
          if (nextY > maxY) {
            const spread = (Math.sin(phase) + 1) * 0.5;
            nextY = minY - spread * (maxY - minY) * 0.25;
          }
          if (formationT < 1) {
            const easedTarget = Math.max(nextY, dot.startY);
            x = dot.startX;
            y = dot.startY + (easedTarget - dot.startY) * formationEase;
          } else {
            x = targetX;
            y = nextY;
          }
        }
        if (effect === "wheel") {
          const wheelCount = Math.max(1, motionRef.current.length);
          const wheelSpokes = 6;
          const outerRadius = Math.min(layout.width, layout.height) * 0.38;
          const hubRadius = outerRadius * 0.22;
          const outerRingCount = Math.min(wheelCount, Math.max(6, Math.round(wheelCount * 0.28)));
          const hubRingCount = Math.min(
            Math.max(0, wheelCount - outerRingCount),
            Math.max(4, Math.round(wheelCount * 0.14)),
          );
          const spokeCount = Math.max(0, wheelCount - outerRingCount - hubRingCount);
          const spokeSlots = Math.max(1, Math.ceil(spokeCount / wheelSpokes));
          let radius = hubRadius;
          let angle = 0;
          if (index < outerRingCount) {
            angle = (index / outerRingCount) * Math.PI * 2;
            radius = outerRadius;
          } else if (index < outerRingCount + hubRingCount) {
            const localIndex = index - outerRingCount;
            angle = (localIndex / Math.max(1, hubRingCount)) * Math.PI * 2;
            radius = hubRadius;
          } else {
            const localIndex = index - outerRingCount - hubRingCount;
            const spokeIndex = localIndex % wheelSpokes;
            const spokeSlot = Math.floor(localIndex / wheelSpokes);
            const t = (spokeSlot + 1) / (spokeSlots + 1);
            radius = hubRadius * 0.6 + t * (outerRadius * 0.95 - hubRadius * 0.6);
            angle = (spokeIndex / wheelSpokes) * Math.PI * 2;
          }
          const spin = now * 0.0011;
          const targetX = centerX + Math.cos(angle + spin) * radius;
          const targetY = centerY + Math.sin(angle + spin) * radius;
          x = dot.startX + (targetX - dot.startX) * formationEase;
          y = dot.startY + (targetY - dot.startY) * formationEase;
        }
        if (
          effect !== "sphere" &&
          effect !== "ring" &&
          effect !== "magnet" &&
          effect !== "wheel" &&
          effect !== "waterfall"
        ) {
          if (x <= minX || x >= maxX) {
            vx = -vx;
            x = Math.max(minX, Math.min(maxX, x));
          }
          if (y <= minY || y >= maxY) {
            vy = -vy;
            y = Math.max(minY, Math.min(maxY, y));
          }
        }
        if (effect === "orbit") {
          const spin = dt * 0.0015;
          const cos = Math.cos(spin);
          const sin = Math.sin(spin);
          const dx = x - centerX;
          const dy = y - centerY;
          x = centerX + dx * cos - dy * sin;
          y = centerY + dx * sin + dy * cos;
        }
        nextPositions.push({ x, y });
        nextScales.push(scale);
        nextAlphas.push(alpha);
        nextRotations.push(rotation);
        nextTilts.push(tilt);
        return {
          x,
          y,
          vx,
          vy,
          emitDelay: dot.emitDelay,
          startX: dot.startX,
          startY: dot.startY,
          angle,
          radius,
          omega: dot.omega,
          phase,
          theta: dot.theta,
          phi: dot.phi,
        };
      });
      motionRef.current = updated;
      const transition = transitionRef.current;
      if (transition) {
        const progress = Math.min(1, Math.max(0, (now - transition.start) / transition.duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        const blendedPositions = nextPositions.map((pos, index) => {
          const from = transition.fromPositions[index];
          if (!from) return pos;
          return {
            x: from.x + (pos.x - from.x) * eased,
            y: from.y + (pos.y - from.y) * eased,
          };
        });
        const blendedScales = nextScales.map((value, index) => {
          const from = transition.fromScales[index] ?? value;
          return from + (value - from) * eased;
        });
        const blendedAlphas = nextAlphas.map((value, index) => {
          const from = transition.fromAlphas[index] ?? value;
          return from + (value - from) * eased;
        });
        const blendedRotations = nextRotations.map((value, index) => {
          const from = transition.fromRotations[index] ?? value;
          return from + (value - from) * eased;
        });
        const blendedTilts = nextTilts.map((value, index) => {
          const from = transition.fromTilts[index] ?? value;
          return from + (value - from) * eased;
        });
        setMotionPositions(blendedPositions);
        setMotionScales(blendedScales);
        setMotionAlphas(blendedAlphas);
        setMotionRotations(blendedRotations);
        setMotionTilts(blendedTilts);
        if (progress >= 1) {
          transitionRef.current = null;
        }
      } else {
        setMotionPositions(nextPositions);
        setMotionScales(nextScales);
        setMotionAlphas(nextAlphas);
        setMotionRotations(nextRotations);
        setMotionTilts(nextTilts);
      }
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);

    const triggerStop = () => {
      const latestPositions =
        motionPositionsRef.current.length > 0
          ? motionPositionsRef.current
          : motionRef.current.length > 0
            ? motionRef.current.map(({ x, y }) => ({ x, y }))
            : next.map(({ x, y }) => ({ x, y }));
      setFrozenPositions(latestPositions);
      setMotionPositions(latestPositions);
      setIsMotionActive(false);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    triggerStopRef.current = triggerStop;
    if (!manualStop) {
      const spinDuration = 2000;
      winnerTimer.current = window.setTimeout(triggerStop, spinDuration);
    }
  }, [
    phase,
    alignStep,
    motionSessionId,
    stageToken,
    shuffleKey,
    alignCards.length,
    alignCards,
    alignCount,
    alignLimit,
    dotGrid,
    compactGrid,
    layout,
    dotSize,
    useDots,
    randomPositions,
    manualStop,
    buildParticles,
  ]);

  useEffect(() => {
    if (phase !== "align" || alignStep !== "move") return;
    if (!isMotionActive) return;
    if (motionEffect === activeEffectRef.current) return;
    if (motionRef.current.length === 0) return;
    const now = performance.now();
    const currentPositions =
      motionPositionsRef.current.length > 0
        ? motionPositionsRef.current
        : motionRef.current.map(({ x, y }) => ({ x, y }));
    transitionRef.current = {
      start: now,
      duration: EFFECT_TRANSITION_DURATION,
      fromPositions: currentPositions,
      fromScales: motionScalesRef.current.length
        ? motionScalesRef.current
        : new Array(currentPositions.length).fill(1),
      fromAlphas: motionAlphasRef.current.length
        ? motionAlphasRef.current
        : new Array(currentPositions.length).fill(1),
      fromRotations: motionRotationsRef.current.length
        ? motionRotationsRef.current
        : new Array(currentPositions.length).fill(0),
      fromTilts: motionTiltsRef.current.length
        ? motionTiltsRef.current
        : new Array(currentPositions.length).fill(1),
    };
    effectSwitchRef.current += 1;
    const nextParticles = buildParticles({
      effect: motionEffect,
      seed: shuffleKey + motionRef.current.length * 91 + effectSwitchRef.current * 37,
      seedPositions: currentPositions,
      seedParticles: motionRef.current,
    });
    motionRef.current = nextParticles;
    motionStartRef.current = now;
    activeEffectRef.current = motionEffect;
  }, [motionEffect, phase, alignStep, isMotionActive, shuffleKey, buildParticles]);

  useEffect(() => {
    if (phase !== "align" || alignStep !== "move") return;
    const current = stopTrigger;
    if (current === stopSignalRef.current) return;
    stopSignalRef.current = current;
    triggerStopRef.current?.();
  }, [stopTrigger, phase, alignStep]);

  useEffect(() => {
    return () => {
      if (winnerTimer.current) window.clearTimeout(winnerTimer.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    motionPositions,
    motionScales,
    motionAlphas,
    motionRotations,
    motionTilts,
    isMotionActive,
    frozenPositions,
  };
}
