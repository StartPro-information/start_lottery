"use client";

import { useEffect, useRef } from "react";
import type { Phase, RevealStep } from "./draw-stage.types";

type AlignStep = "none" | "shrink" | "align" | "move";

type HostAudioInput = {
  enabled: boolean;
  phase: Phase;
  alignStep: AlignStep;
  revealStep: RevealStep;
  winnerCount: number;
  dealCount: number;
  dealBatchKey: number;
  stopSignal?: number;
};

const AUDIO_PATHS = {
  beat: "/sfx/host-beat.mp3",
  stop: "/sfx/host-stop.mp3",
  cheer: "/sfx/host-cheer.mp3",
};

function safePlay(audio: HTMLAudioElement | null) {
  if (!audio) return;
  const result = audio.play();
  if (result && typeof result.catch === "function") {
    result.catch(() => null);
  }
}

export default function useHostAudio({
  enabled,
  phase,
  alignStep,
  revealStep,
  winnerCount,
  dealCount,
  dealBatchKey,
  stopSignal,
}: HostAudioInput) {
  const beatRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef<HTMLAudioElement | null>(null);
  const cheerRef = useRef<HTMLAudioElement | null>(null);
  const dealTimerRef = useRef<number | null>(null);
  const dealTickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopSignalRef = useRef(stopSignal ?? 0);
  const prevMoveRef = useRef(false);
  const prevRevealRef = useRef<RevealStep>("none");
  const baseVolumeRef = useRef({
    beat: 0.35,
    stop: 0.7,
    cheer: 0.9,
  });

  useEffect(() => {
    beatRef.current = new Audio(AUDIO_PATHS.beat);
    stopRef.current = new Audio(AUDIO_PATHS.stop);
    cheerRef.current = new Audio(AUDIO_PATHS.cheer);
    beatRef.current.loop = true;
    beatRef.current.volume = baseVolumeRef.current.beat;
    stopRef.current.volume = baseVolumeRef.current.stop;
    cheerRef.current.volume = baseVolumeRef.current.cheer;
    return () => {
      beatRef.current?.pause();
      stopRef.current?.pause();
      cheerRef.current?.pause();
      if (dealTimerRef.current) {
        window.clearInterval(dealTimerRef.current);
        dealTimerRef.current = null;
      }
      audioContextRef.current?.close().catch(() => null);
    };
  }, []);

  useEffect(() => {
    const audios = [beatRef.current, stopRef.current, cheerRef.current];
    audios.forEach((audio) => {
      if (!audio) return;
      audio.muted = !enabled;
      if (!enabled) return;
      if (audio === beatRef.current) {
        audio.volume = baseVolumeRef.current.beat;
      } else if (audio === stopRef.current) {
        audio.volume = baseVolumeRef.current.stop;
      } else {
        audio.volume = baseVolumeRef.current.cheer;
      }
    });
    if (enabled) {
      const isMove = phase === "align" && alignStep === "move" && revealStep === "none";
      if (isMove) {
        safePlay(beatRef.current);
      } else if (beatRef.current) {
        beatRef.current.pause();
        beatRef.current.currentTime = 0;
      }
    }
  }, [enabled, phase, alignStep, revealStep]);

  useEffect(() => {
    if (!enabled) return;
    const isMove = phase === "align" && alignStep === "move" && revealStep === "none";
    if (isMove && !prevMoveRef.current) {
      safePlay(beatRef.current);
    } else if (!isMove && prevMoveRef.current) {
      if (beatRef.current) {
        beatRef.current.pause();
        beatRef.current.currentTime = 0;
      }
    }
    prevMoveRef.current = isMove;
  }, [enabled, phase, alignStep, revealStep]);

  useEffect(() => {
    if (!enabled) return;
    const prev = prevRevealRef.current;
    if (revealStep === "frozen" && prev === "none") {
      if (stopRef.current) {
        stopRef.current.currentTime = 0;
      }
      safePlay(stopRef.current);
    }
    if (revealStep === "arrange" && prev !== "arrange") {
      if (cheerRef.current) {
        cheerRef.current.currentTime = 0;
      }
      safePlay(cheerRef.current);
    }
    if (revealStep === "grow" && prev !== "grow" && winnerCount <= 1) {
      if (cheerRef.current) {
        cheerRef.current.currentTime = 0;
      }
      safePlay(cheerRef.current);
    }
    prevRevealRef.current = revealStep;
  }, [enabled, revealStep, winnerCount]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof stopSignal !== "number") return;
    if (stopSignal === stopSignalRef.current) return;
    stopSignalRef.current = stopSignal;
    if (phase !== "align") return;
    if (stopRef.current) {
      stopRef.current.currentTime = 0;
    }
    safePlay(stopRef.current);
  }, [enabled, stopSignal, phase]);

  useEffect(() => {
    if (!enabled || phase !== "deal" || dealCount <= 0) {
      if (dealTimerRef.current) {
        window.clearInterval(dealTimerRef.current);
        dealTimerRef.current = null;
      }
      return;
    }
    const total = Math.min(15000, Math.max(3000, dealCount * 22)) + 300;
    const interval = Math.max(30, total / dealCount);
    const playDealTick = () => {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = AudioCtx ? new AudioCtx() : null;
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => null);
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 520 + Math.random() * 420;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    };
    dealTickRef.current = 0;
    dealTimerRef.current = window.setInterval(() => {
      playDealTick();
      dealTickRef.current += 1;
      if (dealTickRef.current >= dealCount && dealTimerRef.current) {
        window.clearInterval(dealTimerRef.current);
        dealTimerRef.current = null;
      }
    }, interval);
    return () => {
      if (dealTimerRef.current) {
        window.clearInterval(dealTimerRef.current);
        dealTimerRef.current = null;
      }
    };
  }, [enabled, phase, dealCount, dealBatchKey]);
}
