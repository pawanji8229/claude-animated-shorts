// Lighting 2.0 continuity tests: a time-lapse (sunset -> night, night -> sunrise) and a doorway transition must never pop.
// Every light parameter that reaches the renderer is sampled at 30 fps and its largest single-frame step is bounded.
// Usage: npx tsx scripts/test-light2.ts
import { timeLapse, doorway } from "../src/lib/cine2/light/director";
import { blendProfiles, PROFILES, LIGHT_PRESETS } from "../src/lib/cine2/light/presets";
import { nightLevel } from "../src/lib/cine2/world/World2";
import type { LightSpec } from "../src/lib/cine2/light/model";
let pass = 0, fail = 0; const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const vec = (s: LightSpec) => { const p = s.profileW ? blendProfiles(s.profileW) : PROFILES[s.profile]; return { key: s.key.intensity, exposure: s.exposure, sky: s.sky.intensity, env: s.env.intensity, logFog: Math.log(s.fog.density + 1e-6), night: nightLevel(s), contrast: p.contrast, saturation: p.saturation, warmCool: p.warmCool, bloom: p.bloom, whiteK: s.whiteK / 1000, faceGlow: s.character.faceGlow }; };
const LIMIT: Record<string, number> = { key: 0.06, exposure: 0.02, sky: 0.03, env: 0.02, logFog: 0.06, night: 0.051, contrast: 0.01, saturation: 0.01, warmCool: 0.02, bloom: 0.01, whiteK: 0.06, faceGlow: 0.01 };
/** a POP is a single-frame step that is both above an absolute floor and far larger than the steps around it (a fast but
 *  smooth transition has similar neighbouring steps); slow time-lapses must also stay under the absolute limit */
const run = (name: string, at: (t: number) => LightSpec, frames: number, slow: boolean) => {
  const v = Array.from({ length: frames }, (_, f) => vec(at(f / (frames - 1))));
  for (const k of Object.keys(LIMIT) as (keyof ReturnType<typeof vec>)[]) {
    const d = v.slice(1).map((x, i) => Math.abs(x[k] - v[i][k])); let worst = 0, pop = -1;
    d.forEach((x, i) => { const nb = Math.max(...[-3, -2, -1, 1, 2, 3].map((o) => d[i + o] ?? 0)); if (x > LIMIT[k] && x > 3 * nb + 1e-9) pop = i + 1; worst = Math.max(worst, x); });
    ok(pop < 0, `${name}: ${k} pops at frame ${pop}`); if (slow) ok(worst <= LIMIT[k], `${name}: ${k} steps ${worst.toFixed(4)} in one frame (limit ${LIMIT[k]})`); } };
run("sunset 19:00 -> 21:18 over 6 s", (t) => timeLapse(19.0, 21.3, t), 180, true);
run("night -> sunrise 3:30 -> 6:00 over 6 s", (t) => timeLapse(3.5, 6.0, t), 180, true);
run("full day 5:00 -> 22:00 over 20 s", (t) => timeLapse(5, 22, t), 600, false);
run("doorway street -> interior over 1 s", (t) => doorway(LIGHT_PRESETS.middayStreet ?? Object.values(LIGHT_PRESETS)[0], LIGHT_PRESETS.cozyInterior ?? Object.values(LIGHT_PRESETS)[1], t), 30, false);
ok(nightLevel(timeLapse(12, 12, 0)) === 0, "noon has no night lighting"); ok(nightLevel(timeLapse(23, 23, 0)) === 1, "23:00 is full night lighting");
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
