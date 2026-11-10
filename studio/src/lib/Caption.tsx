// Screen-safe narration caption: white bold sans with a dark outline + soft shadow, lower-middle.
// Matches the *format* observed in the user's reference samples; toggle with the `captions` prop
// (upstream bridge skill mode = captions off).
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const f = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const k = height / 1920;
  if (f < from || f >= to) return null;
  const pop = interpolate(f, [from, from + 4], [0.92, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.8, display: "flex", justifyContent: "center", padding: `0 ${width * 0.09}px` }}>
      <div
        style={{
          fontFamily: "'DejaVu Sans', 'Arial Black', Arial, sans-serif",
          fontWeight: 900,
          fontSize: 78 * k,
          lineHeight: 1.15,
          color: "#ffffff",
          textAlign: "center",
          WebkitTextStroke: `${10 * k}px #111`,
          paintOrder: "stroke fill",
          textShadow: `0 ${6 * k}px ${10 * k}px rgba(0,0,0,0.55)`,
          transform: `scale(${pop})`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
