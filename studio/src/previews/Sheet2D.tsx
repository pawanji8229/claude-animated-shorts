// Flat 2D model sheet for fast character checks (no WebGL). Not a deliverable frame.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { drawOdo4, pose4, Odo4Pose } from "../char/odo4";

export const Sheet2D: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#2b2d3a"; g.fillRect(0, 0, 2400, 1100);
    const poses: Partial<Odo4Pose>[] = [
      { view: "front" },
      { view: "front", mouth: "cringe", sweat: 1, browL: 1, browR: -0.4, lids: 0.2, shrug: 1 },
      { view: "front", mouth: "o", holdJar: 1, raiseJar: 1, lids: 0.1, browL: 0.6, browR: 0.6 },
      { view: "side", holdJar: 1 },
      ...[0, 0.25, 0.5, 0.75].map((q) => ({ view: "side" as const, walk: 1, distance: q * 0.78, holdJar: q > 0.6 ? 1 : 0 })),
    ];
    poses.forEach((pp, i) => {
      g.save(); g.translate(i * 300 - 10, 60); g.scale(0.95, 0.95);
      g.strokeStyle = "#555"; g.beginPath(); g.moveTo(0, 975); g.lineTo(600, 975); g.stroke();
      drawOdo4(g, pose4(pp)); g.restore();
    });
  }, []);
  return <AbsoluteFill><canvas ref={ref} width={2400} height={1100} /></AbsoluteFill>;
};
