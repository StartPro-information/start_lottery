"use client";

export type Participant = {
  id: string;
  displayName: string;
  uniqueKey?: string | null;
  employeeId?: string | null;
  email?: string | null;
  username?: string | null;
  department?: string | null;
  title?: string | null;
  orgPath?: string | null;
  customField?: string | null;
};

export type Phase = "idle" | "deal" | "dealt" | "scatter" | "align";

export type RevealStep = "none" | "frozen" | "selected" | "grow" | "arrange";

export type DealEffect = "drop" | "fan" | "burst";

export type ScatterEffect = "linear" | "arc" | "wave";

export type AlignEffect = "smooth" | "snap" | "bounce";

export type MotionEffect =
  | "bounce"
  | "orbit"
  | "swirl"
  | "sphere"
  | "ring"
  | "magnet"
  | "wheel"
  | "waterfall";

export type RevealEffect = "classic";

export type Layout = {
  cols: number;
  rows: number;
  cardW: number;
  cardH: number;
  paddingX: number;
  paddingY: number;
  width: number;
  height: number;
};

export type CardItem = {
  id: string;
  name: string;
  meta?: string | null;
  sub?: string | null;
};

export type Position = { x: number; y: number };

export type DotLayout = {
  cols: number;
  rows: number;
  offsetX: number;
  offsetY: number;
  capacity: number;
  regionW: number;
  regionH: number;
};

export type DotMatrix = {
  cols: number;
  rows: number;
  count: number;
  gapX: number;
  gapY: number;
};
