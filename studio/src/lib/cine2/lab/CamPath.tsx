// Camera-path visualisation tool (SVG, no WebGL - renders in a second): top view + side view of a Camera 2.0 plan with
// the camera trajectory coloured per shot, view-direction ticks, the subject's path, shot boundaries (keyframes) and
// transition windows, obstacles, plus speed / acceleration / focal-length / easing graphs; the old keyframed camera is
// overlaid in grey for comparison.
import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as C from "../cam";
import { labSet } from "./labSet";
import { CMP_BEATS, CMP_FRAMES, oldCam } from "./CamLab";

const COLS = ["#e8553a", "#3a8ae8", "#2ab06a", "#c8a020", "#a050c8", "#20a8b8"];
export const CamPathViz: React.FC = () => {
  const { subjects, obstacles } = labSet();
  const plan = useMemo(() => C.direct(CMP_BEATS, subjects, { env: { obstacles, ground: () => 0, clearance: 0.4 } }), []);
  const N = CMP_FRAMES, cams = useMemo(() => Array.from({ length: N }, (_, f) => C.evaluate(plan, f)), [plan]), olds = useMemo(() => Array.from({ length: N }, (_, f) => oldCam()(f)), []);
  const hero = Array.from({ length: N }, (_, f) => subjects.hero.at(f)), shotOf = (f: number) => plan.shots.findIndex((s, i) => f >= s.beat.f0 && f < (plan.shots[i + 1]?.beat.f0 ?? Infinity));
  const xs = [...cams.map((c) => c.pos[0]), ...hero.map((p) => p[0])], zs = [...cams.map((c) => c.pos[2]), ...hero.map((p) => p[2])];
  const x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4, z0 = Math.min(...zs) - 4, z1 = Math.max(...zs) + 4, W = 1000, H = 760, sc = Math.min(W / (x1 - x0), H / (z1 - z0));
  const P = (x: number, z: number) => [20 + (x - x0) * sc, 120 + (z - z0) * sc];
  const speed = (arr: { pos: C.V3 }[]) => arr.slice(1).map((c, i) => C.dist(c.pos, arr[i].pos) * 30), sN = speed(cams), sO = speed(olds.map((o) => ({ pos: o.pos })));
  const acc = (s: number[]) => s.slice(1).map((v, i) => Math.abs(v - s[i]) * 30), aN = acc(sN), aO = acc(sO);
  const graph = (y0: number, h: number, series: { d: number[]; c: string; w: number }[], label: string, maxV?: number) => { const m = maxV ?? Math.max(...series.flatMap((s) => s.d), 1e-6);
    return <g>{series.map((s, k) => <polyline key={k} fill="none" stroke={s.c} strokeWidth={s.w} points={s.d.map((v, i) => `${20 + (i / N) * 1000},${y0 + h - (Math.min(v, m) / m) * h}`).join(" ")} />)}
      <text x={24} y={y0 + 16} fontSize={18} fill="#222">{label} (max {m.toFixed(2)})</text>{plan.shots.map((s, i) => <line key={i} x1={20 + (s.beat.f0 / N) * 1000} x2={20 + (s.beat.f0 / N) * 1000} y1={y0} y2={y0 + h} stroke="#999" strokeDasharray="4 4" />)}<rect x={20} y={y0} width={1000} height={h} fill="none" stroke="#bbb" /></g>; };
  return (<AbsoluteFill style={{ background: "#f6f3ee" }}><svg width={1080} height={1920} style={{ fontFamily: "sans-serif" }}>
    <text x={24} y={50} fontSize={34} fontWeight={700} fill="#222">Camera 2.0 path - top view</text>
    <text x={24} y={86} fontSize={18} fill="#444">{plan.shots.map((s, i) => `${i + 1}. ${s.preset} (f${s.beat.f0}-${s.beat.f1}, T=${s.transition})`).join("   ")}</text>
    {obstacles.filter((o) => o.kind === "box").map((o, i) => { if (o.kind !== "box") return null; const [a, b] = P(o.min[0], o.min[2]), [c, d] = P(o.max[0], o.max[2]); return <rect key={i} x={a} y={b} width={c - a} height={d - b} fill={o.soft ? "rgba(120,160,120,0.2)" : "rgba(80,80,90,0.25)"} stroke="#888" strokeWidth={0.5} />; })}
    <polyline fill="none" stroke="#999" strokeWidth={3} strokeDasharray="6 5" points={olds.map((o) => P(o.pos[0], o.pos[2]).join(",")).join(" ")} />
    <polyline fill="none" stroke="#222" strokeWidth={2} points={hero.map((p) => P(p[0], p[2]).join(",")).join(" ")} />
    {cams.map((c, f) => { if (f % 2) return null; const [a, b] = P(c.pos[0], c.pos[2]); return <circle key={f} cx={a} cy={b} r={3} fill={COLS[shotOf(f) % COLS.length]} />; })}
    {cams.map((c, f) => { if (f % 20) return null; const [a, b] = P(c.pos[0], c.pos[2]), d = C.norm(C.sub(c.look, c.pos)); return <line key={f} x1={a} y1={b} x2={a + d[0] * 40} y2={b + d[2] * 40} stroke={COLS[shotOf(f) % COLS.length]} strokeWidth={2} />; })}
    {plan.shots.map((s, i) => { const c = cams[Math.min(N - 1, s.beat.f0)], [a, b] = P(c.pos[0], c.pos[2]); return <g key={i}><rect x={a - 7} y={b - 7} width={14} height={14} fill="white" stroke={COLS[i]} strokeWidth={3} /><text x={a + 10} y={b - 10} fontSize={16} fill={COLS[i]}>key {i + 1}</text></g>; })}
    <text x={24} y={900} fontSize={16} fill="#444">coloured dots = Camera 2.0 position (every 2 f), ticks = view direction (every 20 f), squares = shot keyframes, black = subject path, dashed grey = old keyframed camera, boxes = obstacles</text>
    <text x={24} y={960} fontSize={30} fontWeight={700} fill="#222">Side view (height over time) + graphs</text>
    {graph(980, 150, [{ d: olds.map((o) => o.pos[1]), c: "#999", w: 2 }, { d: cams.map((c) => c.pos[1]), c: "#e8553a", w: 3 }], "camera height m (grey = old)")}
    {graph(1150, 170, [{ d: sO, c: "#999", w: 2 }, { d: sN, c: "#3a8ae8", w: 3 }], "speed m/s (grey = old)")}
    {graph(1340, 170, [{ d: aO, c: "#999", w: 2 }, { d: aN, c: "#2ab06a", w: 3 }], "acceleration m/s2 (grey = old)")}
    {graph(1530, 150, [{ d: cams.map((c) => c.focal), c: "#a050c8", w: 3 }, { d: cams.map((c) => c.focus * 5), c: "#c8a020", w: 2 }], "focal length mm (purple) / focus distance x5 (yellow)")}
    <text x={24} y={1720} fontSize={22} fontWeight={700} fill="#222">Easing library (position over time)</text>
    {(["sine", "cubic", "cine", "settle", "launch", "land", "expo", "smoother"] as C.EaseName[]).map((e, i) => <g key={e} transform={`translate(${24 + i * 128},1735)`}><rect width={110} height={110} fill="white" stroke="#bbb" /><polyline fill="none" stroke="#222" strokeWidth={2} points={Array.from({ length: 41 }, (_, k) => `${(k / 40) * 110},${110 - C.ease(e, k / 40) * 110}`).join(" ")} /><text x={4} y={128} fontSize={15}>{e}</text></g>)}
  </svg></AbsoluteFill>);
};
