// Flat 2D model sheet for fast character checks (no WebGL). Not a deliverable frame.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { drawOdo5, pose5, Odo5Pose, ARM } from "../char/odo5";

export const Sheet2D: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#2b2d3a"; g.fillRect(0, 0, 3000, 2200);
    const lantern = ARM.lantern;
    const rows: Partial<Odo5Pose>[][] = [
      Array.from({ length: 8 }, (_, i) => ({ view: "side" as const, walk: 1, gait: i / 8, holdLantern: true })),
      [
        { view: "front", armL: lantern },
        { view: "front", eyes: "wide", pupil: 0.45, browL: 1, browR: 1, worry: 0.3, mouth: "o", armL: lantern },
        { view: "front", eyes: "squint", mouth: "yikes", blush: 1, sweat: 1, worry: 1, browL: 0.4, browR: 0.4, armL: lantern, armR: ARM.scratch },
        { view: "front", eyes: "wince", mouth: "yikes", mouthW: 1.15, blush: 1, sweat: 1, worry: 0.8, browL: 0.9, browR: 0.2, armL: lantern, armR: ARM.thumb },
        { view: "front", eyes: "lid", mouth: "wobble", worry: 0.6, sweat: 0.6, lookX: -0.6, armL: lantern, armR: ARM.thumbLow },
      ],
    ];
    rows.forEach((row, ri) => row.forEach((pp, i) => {
      g.save(); g.translate(i * 360 + 10, ri * 1080 + 40); g.scale(0.95, 0.95);
      g.strokeStyle = "#555"; g.beginPath(); g.moveTo(0, 975); g.lineTo(600, 975); g.stroke();
      drawOdo5(g, pose5(pp)); g.restore();
    }));
  }, []);
  return <AbsoluteFill><canvas ref={ref} width={3000} height={2200} /></AbsoluteFill>;
};
