// Non-rendering unit tests for the optional enhancement modules (studio/src/lib/enhance). No video, no browser.
//   npx tsx scripts/test-enhance.ts
import assert from "node:assert/strict";
import { camPath } from "../src/productions/london-bridge/common";
import { dolly, truck, crane, orbit, overEdge, handheld, speedReport } from "../src/lib/enhance/cinecam";
import { LIGHTING, mixMood } from "../src/lib/enhance/lightingPresets";
import { planCity, lotsIn } from "../src/lib/enhance/cityPlan";
import { twoBone, fabrik, aimAngles } from "../src/lib/enhance/ik3d";
import { gerstner, oceanSpec } from "../src/lib/enhance/gerstner";
import type { V3 } from "../src/lib/math";
let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log(`ok  ${name}`); };
const d3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

t("cinecam: dolly keeps the subject as look target and moves the requested distance", () => { const k = dolly(0, 60, [0, 2, 10], [0, 1, 0], -4); assert.equal(k.length, 5); assert.deepEqual(k[4].look, [0, 1, 0]); assert.ok(Math.abs(d3(k[0].pos, k[4].pos) - 4) < 1e-9); });
t("cinecam: truck is perpendicular to the view axis", () => { const k = truck(0, 30, [0, 2, 10], [0, 2, 0], 3); const m = k[4].pos; assert.ok(Math.abs(m[2] - 10) < 1e-9 && Math.abs(Math.abs(m[0]) - 3) < 1e-9); });
t("cinecam: crane rises by the height", () => { const k = crane(0, 30, [0, 2, 10], 6, [0, 1, 0], [0, 3, 0]); assert.equal(k[4].pos[1], 8); assert.deepEqual(k[4].look, [0, 3, 0]); });
t("cinecam: full orbit is loop-safe (end == start)", () => { const k = orbit(0, 300, [0, 0, 0], 10, 3, 1); assert.ok(d3(k[0].pos, k[k.length - 1].pos) < 1e-9); });
t("cinecam: keys feed camPath and the move is smooth (no spikes)", () => { const keys = overEdge(0, 150, [-10, 30, -20], [0, 18, 60], [10, 26, 110], [0, 12, 40]); const p = camPath(keys, 9); const r = speedReport((f) => p(f), 0, 150); assert.ok(r.vMax < 1.5, `vMax ${r.vMax}`); assert.ok(r.aMax < 0.1, `aMax ${r.aMax}`); });
t("cinecam: handheld is deterministic, small and periodic", () => { assert.deepEqual(handheld(37, 3), handheld(37, 3)); const a = handheld(0, 5, 0.02, 600), b = handheld(600, 5, 0.02, 600); assert.ok(d3(a, b) < 1e-12); assert.ok(Math.max(...handheld(123, 5).map(Math.abs)) <= 0.02); });
t("lighting: presets respect the bloom threshold rule and blend", () => { for (const [k, m] of Object.entries(LIGHTING)) assert.ok((m.threshold ?? 1.6) >= 1.5, k); const h = mixMood(LIGHTING.midday, LIGHTING.goldenHour, 0.5); assert.ok(h.sun.i > 2.89 && h.sun.i < 3.0); assert.equal(mixMood(LIGHTING.midday, LIGHTING.overcast, 0).bg, LIGHTING.midday.bg); });
t("cityPlan: deterministic, lots inside their blocks, no overlaps on a frontage", () => { const o = { size: [400, 300] as [number, number], block: [80, 60] as [number, number], street: 8, lotW: [9, 13] as [number, number], depth: 18, seed: 7 };
  const a = planCity(o), b = planCity(o); assert.deepEqual(a, b); assert.ok(a.lots.length > 100, `lots ${a.lots.length}`);
  for (const l of a.lots) assert.ok(a.blocks.some((bk) => l.x0 >= bk.x0 - 1e-6 && l.x1 <= bk.x1 + 1e-6 && l.z0 >= bk.z0 - 1e-6 && l.z1 <= bk.z1 + 1e-6));
  const byRow = new Map<string, typeof a.lots>(); for (const l of a.lots) { const key = `${l.z0.toFixed(2)}|${l.z1.toFixed(2)}`; byRow.set(key, [...(byRow.get(key) ?? []), l]); }
  for (const row of byRow.values()) { row.sort((p, q) => p.x0 - q.x0); for (let i = 1; i < row.length; i++) assert.ok(row[i].x0 >= row[i - 1].x1 - 1e-6); }
  assert.ok(lotsIn(a, { x0: -20, x1: 20, z0: -20, z1: 20 }).length >= 1); });
t("ik3d: two-bone reaches a reachable target with exact bone lengths", () => { const r = twoBone([0, 0, 0], 3, 2, [3, 2, 1], [0, 1, 0]); assert.ok(r.reached); assert.ok(Math.abs(d3([0, 0, 0], r.elbow) - 3) < 1e-9); assert.ok(Math.abs(d3(r.elbow, r.end) - 2) < 1e-6); assert.ok(d3(r.end, [3, 2, 1]) < 1e-6); });
t("ik3d: two-bone clamps an unreachable target along the line", () => { const r = twoBone([0, 0, 0], 3, 2, [10, 0, 0], [0, 1, 0]); assert.equal(r.reached, false); assert.ok(Math.abs(r.end[0] - 5) < 1e-5); });
t("ik3d: FABRIK solves a 4-joint crane chain and keeps lengths", () => { const j: V3[] = [[0, 0, 0], [0, 4, 0], [0, 8, 0], [0, 11, 0]]; const s = fabrik(j, [5, 6, 2]); assert.ok(d3(s[3], [5, 6, 2]) < 1e-3); for (let i = 1; i < 4; i++) assert.ok(Math.abs(d3(s[i], s[i - 1]) - d3(j[i], j[i - 1])) < 1e-6); assert.deepEqual(s[0], [0, 0, 0]); });
t("ik3d: aim angles", () => { const a = aimAngles([0, 0, 0], [1, 1, 0]); assert.ok(Math.abs(a.yaw - Math.PI / 2) < 1e-9 && Math.abs(a.pitch - Math.PI / 4) < 1e-9); });
t("water: existing Gerstner port still deterministic", () => { const S = oceanSpec({ seed: 3 }); assert.deepEqual(gerstner(S, 4, 7, 1.5), gerstner(oceanSpec({ seed: 3 }), 4, 7, 1.5)); });
console.log(`\n${n} tests passed`);
