"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardItem, Phase } from "./draw-stage.types";

export default function useDealFlow({
  phase,
  shuffleKey,
  batchSize,
  totalBatches,
  shuffled,
  onDealComplete,
}: {
  phase: Phase;
  shuffleKey: number;
  batchSize: number;
  totalBatches: number;
  shuffled: CardItem[];
  onDealComplete?: () => void;
}) {
  const batchTimer = useRef<number | null>(null);
  const clearTimer = useRef<number | null>(null);
  const completeTimer = useRef<number | null>(null);
  const dealComplete = useRef(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchKey, setBatchKey] = useState(0);
  const [clearing, setClearing] = useState(false);

  const visibleCards = useMemo(() => {
    const batchStart = batchIndex * batchSize;
    const batchEnd = Math.min(shuffled.length, batchStart + batchSize);
    return shuffled.slice(batchStart, batchEnd);
  }, [batchIndex, batchSize, shuffled]);

  useEffect(() => {
    dealComplete.current = false;
    if (batchTimer.current) window.clearTimeout(batchTimer.current);
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    if (completeTimer.current) window.clearTimeout(completeTimer.current);
    batchTimer.current = null;
    clearTimer.current = null;
    completeTimer.current = null;
    if (phase !== "deal") {
      setBatchIndex(0);
      setClearing(false);
      return;
    }
    setBatchIndex(0);
    setClearing(false);
    setBatchKey((value) => value + 1);
  }, [phase, shuffleKey, batchSize]);

  useEffect(() => {
    if (phase !== "deal") return;
    if (totalBatches <= 1) return;
    if (batchIndex >= totalBatches - 1) return;
    const dealTotal = Math.min(15000, Math.max(3000, visibleCards.length * 22));
    const clearDelay = 80;
    batchTimer.current = window.setTimeout(() => {
      setClearing(true);
      clearTimer.current = window.setTimeout(() => {
        setBatchIndex((value) => value + 1);
        setBatchKey((value) => value + 1);
        setClearing(false);
      }, clearDelay);
    }, dealTotal + 300);
    return () => {
      if (batchTimer.current) window.clearTimeout(batchTimer.current);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, [phase, batchIndex, totalBatches, visibleCards.length]);

  useEffect(() => {
    if (phase !== "deal") return;
    if (batchIndex !== totalBatches - 1) return;
    if (dealComplete.current) return;
    const dealTotal = Math.min(15000, Math.max(3000, visibleCards.length * 22));
    completeTimer.current = window.setTimeout(() => {
      if (dealComplete.current) return;
      dealComplete.current = true;
      onDealComplete?.();
    }, dealTotal + 200);
    return () => {
      if (completeTimer.current) window.clearTimeout(completeTimer.current);
    };
  }, [phase, batchIndex, totalBatches, visibleCards.length, onDealComplete]);

  useEffect(() => {
    return () => {
      if (batchTimer.current) window.clearTimeout(batchTimer.current);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      if (completeTimer.current) window.clearTimeout(completeTimer.current);
    };
  }, []);

  return { batchIndex, batchKey, clearing, visibleCards };
}
