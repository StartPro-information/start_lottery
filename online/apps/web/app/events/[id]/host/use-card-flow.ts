"use client";

import { useMemo } from "react";
import type { CardItem, DotLayout, DotMatrix, Layout, Phase, Position } from "./draw-stage.types";
import { buildDotGrid, mulberry32 } from "./draw-stage.utils";

function hashIds(ids: string[]) {
  let hash = 0;
  for (const id of ids) {
    for (let i = 0; i < id.length; i += 1) {
      hash = Math.imul(31, hash) + id.charCodeAt(i);
      hash |= 0;
    }
  }
  return hash;
}

export default function useCardFlow({
  phase,
  shuffled,
  visibleCards,
  alignLimit,
  scatterLimit,
  alignCount,
  dotLayout,
  dotMatrix,
  dotSize,
  useDots,
  shuffleKey,
  capacity,
  layout,
  winnerIds,
}: {
  phase: Phase;
  shuffled: CardItem[];
  visibleCards: CardItem[];
  alignLimit: number;
  scatterLimit: number;
  alignCount: number;
  dotLayout: DotLayout;
  dotMatrix: DotMatrix;
  dotSize: number;
  useDots: boolean;
  shuffleKey: number;
  capacity: number;
  layout: Layout;
  winnerIds?: string[];
}) {
  const activeCards = useMemo(() => {
    if (phase === "scatter") {
      return shuffled.slice(0, scatterLimit);
    }
    if (phase === "align") {
      return shuffled.slice(0, alignLimit);
    }
    return visibleCards;
  }, [phase, shuffled, scatterLimit, alignLimit, visibleCards]);

  const alignCards = useMemo(() => {
    const count = alignCount || alignLimit;
    if (!winnerIds || winnerIds.length === 0) {
      return shuffled.slice(0, count);
    }
    const winnerSet = new Set(winnerIds);
    const visible = shuffled.slice(0, count);
    const missing = shuffled.filter((card, index) => winnerSet.has(card.id) && index >= count);
    if (missing.length === 0) {
      return visible;
    }
    const openSlots: number[] = [];
    for (let i = 0; i < visible.length; i += 1) {
      if (!winnerSet.has(visible[i].id)) {
        openSlots.push(i);
      }
    }
    if (openSlots.length === 0) {
      return visible;
    }
    const seed = shuffleKey + hashIds(winnerIds) + count * 131;
    const rng = mulberry32(seed);
    const next = [...visible];
    for (const card of missing) {
      if (openSlots.length === 0) break;
      const pickIndex = Math.floor(rng() * openSlots.length);
      const replaceAt = openSlots.splice(pickIndex, 1)[0];
      next[replaceAt] = card;
    }
    return next;
  }, [shuffled, alignCount, alignLimit, winnerIds, shuffleKey]);

  const dotGrid = useMemo(() => {
    if (!useDots) {
      return [];
    }
    const count = Math.max(1, Math.min(alignCount || alignCards.length, alignLimit));
    return buildDotGrid(count, dotLayout, dotMatrix, dotSize);
  }, [alignCards.length, alignCount, alignLimit, dotLayout, dotMatrix, dotSize, useDots]);

  const randomPositions = useMemo(() => {
    const rng = mulberry32(shuffleKey + activeCards.length * 31 + capacity * 7);
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(minX, layout.width - layout.cardW);
    const maxY = Math.max(minY, layout.height - layout.cardH);
    return activeCards.map(() => ({
      x: minX + rng() * (maxX - minX),
      y: minY + rng() * (maxY - minY),
    }));
  }, [shuffleKey, activeCards.length, capacity, layout]);

  return {
    activeCards,
    alignCards,
    dotGrid,
    randomPositions,
  };
}
