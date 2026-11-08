// Flat 2D model sheet for fast character checks (no WebGL). Not a deliverable frame.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawOdo3, defaultPose, W3, H3, Odo3Pose } from "../char/odo3";

export const Sheet2D: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const f = useCurrentFrame();
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#2b2d3a"; g.fillRect(0, 0, 2400, 1100);
    const poses: Partial<Odo3Pose>[] = [
      { view: "front", mouth: "smile" },
      { view: "side" },
      ...[0, 0.125, 0.25, 0.375, 0.5, 0.625].map((q) => ({ view: "side" as const, walk: 1, distance: q * 0.66 })),
    ];
    poses.forEach((pp, i) => {
      g.save(); g.translate(i * 300, 50); g.scale(0.5, 1); g.restore();
      g.save(); g.translate(i * 290 - 20, 60); g.scale(0.95, 0.95);
      g.strokeStyle = "#555"; g.beginPath(); g.moveTo(0, 975); g.lineTo(600, 975); g.stroke();
      drawOdo3(g, { ...defaultPose(), ...pp, breathe: f });
      g.restore();
    });
  }, [f]);
  return <AbsoluteFill><canvas ref={ref} width={2400} height={1100} /></AbsoluteFill>;
};
