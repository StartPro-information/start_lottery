"use client";

import type { CardItem, DotLayout, DotMatrix, Layout, Participant, Position } from "./draw-stage.types";

export const FALLBACK_NAMES = [
  "Marketing / Alice",
  "Engineering / Bob",
  "Finance / Cindy",
  "HR / Devin",
  "Product / Ella",
  "Design / Finn",
  "Sales / Grace",
  "Ops / Henry",
  "Support / Iris",
  "Legal / Jack",
  "Marketing / Kevin",
  "Engineering / Lily",
  "Finance / Mike",
  "HR / Nina",
  "Product / Owen",
  "Design / Polly",
];

export function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCards(
  participants: Participant[],
  requiredFields: string[],
  maxCards: number,
): CardItem[] {
  if (!participants.length) {
    return FALLBACK_NAMES.slice(0, maxCards).map((name, index) => ({
      id: `fallback-${index}`,
      name,
      meta: "EMP000",
      sub: "Preset",
    }));
  }

  const fieldMap: Record<string, (person: Participant) => string | null | undefined> = {
    display_name: (person) => person.displayName,
    unique_key: (person) => person.uniqueKey,
    employee_id: (person) => person.employeeId,
    email: (person) => person.email,
    username: (person) => person.username,
    department: (person) => person.department,
    title: (person) => person.title,
    org_path: (person) => person.orgPath,
    custom_field: (person) => person.customField,
  };
  const normalizedFields = requiredFields.includes("display_name")
    ? requiredFields
    : ["display_name", ...requiredFields];
  const displayFields = normalizedFields.filter((field) => field !== "display_name");
  return participants.map((person) => ({
    id: person.id,
    name: person.displayName,
    meta:
      displayFields
        .map((field) => fieldMap[field]?.(person)?.toString().trim())
        .filter((value) => value)
        .slice(0, 2)[0] || "-",
    sub:
      displayFields
        .map((field) => fieldMap[field]?.(person)?.toString().trim())
        .filter((value) => value)
        .slice(0, 2)[1] || "",
  }));
}

export function buildGrid(count: number, cols: number, layout: Layout): Position[] {
  return Array.from({ length: count }).map((_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: layout.paddingX + col * layout.cardW,
      y: layout.paddingY + row * layout.cardH,
    };
  });
}

export function buildCompactGrid(
  count: number,
  compactCols: number,
  compactCardW: number,
  compactCardH: number,
  layout: Layout,
): Position[] {
  return Array.from({ length: count }).map((_, index) => {
    const col = index % compactCols;
    const row = Math.floor(index / compactCols);
    return {
      x: layout.paddingX + col * compactCardW,
      y: layout.paddingY + row * compactCardH,
    };
  });
}

export function buildDotLayout(
  availableW: number,
  availableH: number,
  regionScale: number,
  minGap: number,
  dotSize: number,
  layout: Layout,
): DotLayout {
  const regionW = Math.max(1, availableW * regionScale);
  const regionH = Math.max(1, availableH * regionScale);
  let cols = Math.max(1, Math.floor((regionW + minGap) / (dotSize + minGap)));
  let rows = Math.max(1, Math.floor((regionH + minGap) / (dotSize + minGap)));
  while (cols > 1) {
    const gapX = (regionW - cols * dotSize) / (cols - 1);
    if (gapX >= minGap) break;
    cols -= 1;
  }
  while (rows > 1) {
    const gapY = (regionH - rows * dotSize) / (rows - 1);
    if (gapY >= minGap) break;
    rows -= 1;
  }
  const offsetX = layout.paddingX + (availableW - regionW) / 2;
  const offsetY = layout.paddingY + (availableH - regionH) / 2;
  return {
    cols,
    rows,
    offsetX,
    offsetY,
    capacity: cols * rows,
    regionW,
    regionH,
  };
}

export function buildDotMatrix(
  dotLayout: DotLayout,
  maxCount: number,
  dotSize: number,
  minGap: number,
): DotMatrix {
  const maxRatio = 1.4;
  let best: DotMatrix = { cols: 1, rows: 1, count: 1, gapX: 0, gapY: 0 };
  for (let cols = Math.min(dotLayout.cols, maxCount); cols >= 1; cols -= 1) {
    const rows = Math.floor(maxCount / cols);
    if (rows < 1 || rows > dotLayout.rows) continue;
    const ratio = cols > rows ? cols / rows : rows / cols;
    if (ratio > maxRatio) continue;
    const gapX = cols > 1 ? (dotLayout.regionW - cols * dotSize) / (cols - 1) : 0;
    const gapY = rows > 1 ? (dotLayout.regionH - rows * dotSize) / (rows - 1) : 0;
    if (gapX < minGap || gapY < minGap) continue;
    const count = rows * cols;
    if (count >= best.count) {
      best = { cols, rows, count, gapX, gapY };
    }
  }
  if (best.count === 1) {
    const cols = Math.min(dotLayout.cols, maxCount);
    const rows = Math.max(1, Math.floor(maxCount / cols));
    const gapX = cols > 1 ? (dotLayout.regionW - cols * dotSize) / (cols - 1) : 0;
    const gapY = rows > 1 ? (dotLayout.regionH - rows * dotSize) / (rows - 1) : 0;
    best = { cols, rows, count: rows * cols, gapX, gapY };
  }
  return best;
}

export function buildDotGrid(
  count: number,
  dotLayout: DotLayout,
  dotMatrix: DotMatrix,
  dotSize: number,
): Position[] {
  const offsetX =
    dotLayout.offsetX +
    (dotLayout.regionW - (dotMatrix.cols * dotSize + (dotMatrix.cols - 1) * dotMatrix.gapX)) / 2;
  const offsetY =
    dotLayout.offsetY +
    (dotLayout.regionH - (dotMatrix.rows * dotSize + (dotMatrix.rows - 1) * dotMatrix.gapY)) / 2;
  return Array.from({ length: count }).map((_, index) => {
    const col = index % dotMatrix.cols;
    const row = Math.floor(index / dotMatrix.cols);
    return {
      x: offsetX + col * (dotSize + dotMatrix.gapX),
      y: offsetY + row * (dotSize + dotMatrix.gapY),
    };
  });
}
