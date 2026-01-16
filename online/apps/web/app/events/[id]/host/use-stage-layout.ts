"use client";

import { useEffect, useRef, useState } from "react";
import type { Layout } from "./draw-stage.types";

export default function useStageLayout(participantCount: number) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cloudRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout>({
    cols: 7,
    rows: 5,
    cardW: 180,
    cardH: 96,
    paddingX: 28,
    paddingY: 70,
    width: 1200,
    height: 720,
  });
  const [cloudBounds, setCloudBounds] = useState<{
    minX: number;
    minY: number;
    width: number;
    height: number;
  }>({
    minX: 24,
    minY: 70,
    width: 1152,
    height: 500,
  });

  useEffect(() => {
    if (!stageRef.current) return;
    const resize = () => {
      const width = stageRef.current?.clientWidth || 1200;
      const height = stageRef.current?.clientHeight || 720;
      const paddingX = 28;
      const paddingY = 70;
      const baseCardW = participantCount > 200 ? 150 : 180;
      const cols = Math.max(4, Math.floor((width - paddingX * 2) / baseCardW));
      const cardW = Math.floor((width - paddingX * 2) / cols);
      const cardH = Math.floor(cardW * 0.58);
      const rows = Math.max(3, Math.floor((height - paddingY * 2) / cardH));
      setLayout({ cols, rows, cardW, cardH, paddingX, paddingY, width, height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [participantCount]);

  useEffect(() => {
    if (!stageRef.current || !cloudRef.current) return;
    const updateBounds = () => {
      const stageRect = stageRef.current?.getBoundingClientRect();
      const cloudRect = cloudRef.current?.getBoundingClientRect();
      if (!stageRect || !cloudRect) return;
      const minX = Math.max(0, cloudRect.left - stageRect.left);
      const minY = Math.max(0, cloudRect.top - stageRect.top);
      const width = Math.max(0, cloudRect.width);
      const height = Math.max(0, cloudRect.height);
      setCloudBounds({ minX, minY, width, height });
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(stageRef.current);
    observer.observe(cloudRef.current);
    return () => observer.disconnect();
  }, [layout.width, layout.height]);

  return { stageRef, cloudRef, layout, cloudBounds };
}
