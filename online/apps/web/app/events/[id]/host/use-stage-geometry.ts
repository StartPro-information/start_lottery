"use client";

import { useMemo } from "react";
import type { Layout } from "./draw-stage.types";
import { buildCompactGrid, buildDotLayout, buildDotMatrix, buildGrid } from "./draw-stage.utils";

export default function useStageGeometry({
  layout,
  cardsLength,
  shuffledLength,
}: {
  layout: Layout;
  cardsLength: number;
  shuffledLength: number;
}) {
  const capacity = layout.cols * layout.rows;
  const maxVisible = Math.max(1, capacity * 3);
  const batchSize = Math.min(maxVisible, 360);
  const totalBatches = Math.max(1, Math.ceil(shuffledLength / batchSize));
  const dotSize = 12;
  const minGap = 36;
  const alignMax = 400;
  const regionScale = 0.7;
  const useDots = cardsLength >= 200;
  const availableW = Math.max(1, layout.width - layout.paddingX * 2);
  const availableH = Math.max(1, layout.height - layout.paddingY * 2);
  const dotLayout = useMemo(
    () => buildDotLayout(availableW, availableH, regionScale, minGap, dotSize, layout),
    [availableW, availableH, regionScale, minGap, dotSize, layout],
  );
  const grid = useMemo(
    () => buildGrid(Math.min(batchSize, capacity), layout.cols, layout),
    [batchSize, capacity, layout],
  );
  const compactCardW = Math.max(84, Math.floor(layout.cardW * 0.48));
  const compactCardH = Math.floor(compactCardW * 0.58);
  const compactCols = Math.max(
    4,
    Math.floor((layout.width - layout.paddingX * 2) / compactCardW),
  );
  const compactRows = Math.max(
    3,
    Math.floor((layout.height - layout.paddingY * 2) / compactCardH),
  );
  const compactCapacity = compactCols * compactRows;
  const compactGrid = useMemo(
    () => buildCompactGrid(compactCols * compactRows, compactCols, compactCardW, compactCardH, layout),
    [compactCols, compactRows, compactCardW, compactCardH, layout],
  );
  const maxCount = Math.min(shuffledLength, alignMax, useDots ? dotLayout.capacity : alignMax);
  const dotMatrix = useMemo(() => {
    if (!useDots) {
      return { cols: 1, rows: 1, count: 1, gapX: 0, gapY: 0 };
    }
    return buildDotMatrix(dotLayout, maxCount, dotSize, minGap);
  }, [dotLayout, maxCount, dotSize, minGap, useDots]);
  const alignLimit = useDots
    ? Math.max(1, dotMatrix.count)
    : Math.max(1, Math.min(shuffledLength, 199, compactCapacity));
  const scatterLimit = alignLimit;

  return {
    capacity,
    batchSize,
    totalBatches,
    dotSize,
    useDots,
    dotLayout,
    dotMatrix,
    alignLimit,
    scatterLimit,
    grid,
    compactGrid,
    compactCardW,
    compactCardH,
  };
}
