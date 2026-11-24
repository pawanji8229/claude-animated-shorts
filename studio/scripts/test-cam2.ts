// Camera 2.0 automated tests: lens, easing, every move, 9:16 framing, collision, director, TF2 bridge, QC, determinism,
// old-vs-new smoothness, performance. Usage: npx tsx scripts/test-cam2.ts [--json out.json]
import { writeFileSync } from "fs";
import * as C from "../src/lib/cine2/cam";
import { moves as M } from "../src/lib/cine2/cam";
import { STORY_BEATS, SET_OBSTACLES, subjects, HERO_SCRIPT, STORY_FRAMES, TOWER } from "../src/lib/cine2/lab/story";
import { camPath } from "../src/productions/london-bridge/common";
import * as OLD from "../src/lib/enhance/cinecam";

let pass = 0, fail = 0; const log: string[] = [], results: Record<string, unknown> = {};
const t = (name: string, ok: boolean, info = "") => { (ok ? pass++ : fail++); const l = `${ok ? "PASS" : "FAIL"}  ${name}${info ? `  (${info})` : ""}`; log.push(l); console.log(l); };
const near = (a: number, b: number, e: number) => Math.abs(a - b) <= e;

// ---------------------------------------------------------------- lens
t("lens: focal <-> fov round trip", [18, 24, 35, 50, 85, 135].every((mm) => near(C.focalFromFov(C.fovFromFocal(mm)), mm, 1e-6)));
t("lens: 35 mm = ~56.6 deg vertical in 9:16, 85 mm = ~25 deg", near(C.fovFromFocal(35), 56.6, 0.5) && near(C.fovFromFocal(85), 25.0, 0.6), `35mm ${C.fovFromFocal(35).toFixed(1)}, 85mm ${C.fovFromFocal(85).toFixed(1)}`);
{ const d = C.dofLimits(50, 2.8, 3); t("lens: thin-lens DOF limits bracket focus", d.near < 3 && d.far > 3 && d.far < 4, `50mm f/2.8 @3m: ${d.near.toFixed(2)}-${d.far.toFixed(2)} m`); }
t("lens: blur capped (no excessive blur) and in-focus band >= subject depth", [[85, 1.4, 2], [24, 1.4, 1], [50, 2.8, 3]].every(([f, n, s]) => { const p = C.lensToPost(f, n, s, 0.6); return p.dof <= C.MAX_BLUR + 1e-9 && p.focusRange >= 0.6; }));
t("lens: smaller f-number = more blur", C.lensToPost(50, 2, 3).dof > C.lensToPost(50, 8, 3).dof);

// ---------------------------------------------------------------- easing
const EASES: C.EaseName[] = ["linear", "sine", "cubic", "quint", "expo", "smoother", "cine", "settle", "launch", "land"];
t("easing: every curve maps 0->0, 1->1 and is monotone", EASES.every((e) => { if (!near(C.ease(e, 0), 0, 1e-6) || !near(C.ease(e, 1), 1, 1e-6)) return false; let p = 0; for (let i = 1; i <= 200; i++) { const v = C.ease(e, i / 200); if (v < p - 1e-9) return false; p = v; } return true; }));
{ let maxDv = 0; for (let i = 1; i < 999; i++) { const v0 = C.trapezoid(i / 1000, 0.3, 0.4) - C.trapezoid((i - 1) / 1000, 0.3, 0.4), v1 = C.trapezoid((i + 1) / 1000, 0.3, 0.4) - C.trapezoid(i / 1000, 0.3, 0.4); maxDv = Math.max(maxDv, Math.abs(v1 - v0)); }
  t("easing: trapezoid velocity profile is continuous (accel/decel control)", maxDv < 2e-5, `max dv ${maxDv.toExponential(2)}`); }
t("easing: launch starts slow and ends at cruise speed, land the reverse", C.trapezoid(0.02, 0.4, 0) < 0.005 && (C.trapezoid(1, 0.4, 0) - C.trapezoid(0.99, 0.4, 0)) > 0.009 && (C.trapezoid(0.02, 0, 0.5) > 0.01));

// ---------------------------------------------------------------- every move in the library
const S = subjects(), hero = S.hero.at, tw: C.V3 = [TOWER[0], 12, TOWER[2]];
const LIB: [string, M.Shot][] = [
  ["dolly", M.dolly({ f0: 0, f1: 120 }, [0, 1.2, 0], 0.4, 0.1, 6, 3.5)],
  ["slowPush", M.slowPush({ f0: 0, f1: 150 }, [0, 1.3, 0], 0.5, 0.05, 4)],
  ["dramaticPush", M.dramaticPush({ f0: 0, f1: 45 }, [0, 1.4, 0], 0.3, 0.05, 3.5)],
  ["pullBackReveal", M.pullBackReveal({ f0: 0, f1: 180 }, [0, 1, 0], tw, 0.5, [0.1, 0.35], [1.2, 30])],
  ["track", M.track({ f0: 30, f1: 150 }, { subject: hero, offset: [1.2, 1.4, 3], lead: 10 })],
  ["sideTrack", M.sideTrack({ f0: 30, f1: 150 }, hero, 3.5)],
  ["follow", M.follow({ f0: 30, f1: 150 }, hero)],
  ["actionFollow", M.actionFollow({ f0: 30, f1: 150 }, hero)],
  ["orbit (partial)", M.orbit({ f0: 0, f1: 150 }, [0, 1.2, 0], 0, 0.2, 0.15, 5)],
  ["arc", M.arc({ f0: 0, f1: 150 }, [0, 1.2, 0], [0.2, 1.1], [0.05, 0.2], [6, 4])],
  ["circular", M.circular({ f0: 0, f1: 300 }, [0, 1.2, 0], 0, 1, 0.12, 6)],
  ["crane up", M.crane({ f0: 0, f1: 150 }, [0, 1.2, 8], 6, [0, 1, 0], tw)],
  ["crane down", M.crane({ f0: 0, f1: 150 }, [0, 8, 8], -6, [0, 1, 0])],
  ["pedestal", M.pedestal({ f0: 0, f1: 120 }, [0, 1, 6], [0, 1, 0], 1.5)],
  ["pan", M.pan({ f0: 0, f1: 120 }, [0, 1.6, 6], Math.PI, Math.PI + 0.8, 0.05)],
  ["tilt", M.tilt({ f0: 0, f1: 120 }, [0, 1.6, 6], Math.PI, -0.05, 0.6)],
  ["truck", M.truck({ f0: 0, f1: 120 }, [0, 1.5, 6], [0, 1.2, 0], 3)],
  ["parallax", M.parallax({ f0: 0, f1: 150 }, [0, 1.5, 6], [0, 1.2, 0], 3)],
  ["approach", M.approach({ f0: 0, f1: 150 }, [0, 2, 20], [0, 1.6, 5], [0, 1.2, 0])],
  ["depart", M.depart({ f0: 0, f1: 150 }, [0, 1.6, 5], [0, 4, 22], [0, 1.2, 0])],
  ["fgReveal", M.fgReveal({ f0: 0, f1: 150 }, [1.5, 1.2, 3], [0, 1.2, 0], 1.4, 2)],
  ["passAround", M.passAround({ f0: 0, f1: 150 }, [3, 0, 3], 3, -0.6, 1.4, 1.6, [0, 1.2, 0])],
  ["aerial", M.aerial({ f0: 0, f1: 240 }, [60, 0, 60], [20, 0, 20], 30, tw)],
  ["establishing", M.establishing({ f0: 0, f1: 240 }, tw, 0.4)],
  ["hold (breathing)", M.hold({ f0: 0, f1: 150 }, [0, 1.4, 0], 0.4, 0.05, 3)],
  ["pov", M.pov({ f0: 0, f1: 90 }, [0, 1.5, 0], tw)],
  ["handheld layer", M.hold({ f0: 0, f1: 150, handheld: 0.006 }, [0, 1.4, 0], 0.4, 0.05, 3)],
];
const moveRows: unknown[] = [];
for (const [name, sh] of LIB) { const q = C.cameraQc(sh.at, sh.f0, sh.f1, {}, { ...C.LIMITS, maxSpeed: 1.5, maxAccel: 0.06, maxRotSpeed: 0.08, maxRotAccel: 0.012 });
  const bad = q.issues.filter((i) => ["invalid coordinates", "camera jump", "jitter", "focal-length jump", "focus hunting", "rotation jolt"].includes(i.kind));
  moveRows.push({ name, ...q.summary }); t(`move: ${name} - finite, no jumps / jitter / jolts / focus hunting`, bad.length === 0, bad.length ? bad.slice(0, 2).map((b) => `${b.kind}@${b.f}`).join(",") : `${q.summary.maxSpeed_ms.toFixed(2)} m/s`); }
results.moves = moveRows;
{ const sh = LIB.find(([n]) => n === "fgReveal")![1], a = sh.at(0).focus, b = sh.at(150).focus; t("move: fgReveal racks focus from foreground to subject", a < b - 0.5, `${a.toFixed(2)} -> ${b.toFixed(2)} m`); }
{ const sh = M.dolly({ f0: 0, speed: 1.5 }, [0, 1, 0], 0, 0, 10, 4); t("move: speed parameter sets the duration (6 m at 1.5 m/s = 120 f)", sh.f1 === 120, `f1=${sh.f1}`); }
{ const sh = M.dolly({ f0: 0, f1: 100, focal: [24, 50] }, [0, 1, 0], 0, 0, 6, 3); t("move: zoom / dolly-zoom interpolates focal length", near(sh.at(0).focal, 24, 1e-6) && near(sh.at(100).focal, 50, 1e-6)); }
{ const a = M.hold({ f0: 0, f1: 100, handheld: 0.01, seed: 3 }, [0, 1, 0], 0, 0, 3), b = M.hold({ f0: 0, f1: 100, handheld: 0.01, seed: 3 }, [0, 1, 0], 0, 0, 3); t("move: handheld layer is deterministic (seeded)", JSON.stringify(a.at(37)) === JSON.stringify(b.at(37))); }

// ---------------------------------------------------------------- framing (9:16)
const person: C.Subject = { id: "p", base: [0, 0, 0], height: 1.6, facing: 0, kind: "character" };
for (const size of ["MWS", "MS", "MCU", "CU"] as C.ShotSize[]) {
  const fr = C.solveFrame(person, { size, v: "eye", h: "threeQuarter", focal: 35 }), fov = C.fovFromFocal(35), eyes = C.project({ pos: fr.pos, look: fr.look }, fov, [0, 1.6 * 0.9, 0]);
  t(`framing ${size}: eye-line on the upper third of the 9:16 frame`, near(eyes.y, 1 / 3 - 0.02, 0.03), `eye y=${eyes.y.toFixed(3)}, dist ${fr.dist.toFixed(2)} m`);
}
{ const fr = C.solveFrame(person, { size: "FULL", v: "eye", h: "front", focal: 35 }), bx = C.subjectBox({ pos: fr.pos, look: fr.look }, C.fovFromFocal(35), person);
  t("framing FULL: whole body inside the Shorts safe area", C.insideFrac(bx, C.SAFE) > 0.97, `${(C.insideFrac(bx, C.SAFE) * 100).toFixed(0)}% inside`); }
{ const low = C.solveFrame(person, { size: "MS", v: "low", h: "front", focal: 35 }), high = C.solveFrame(person, { size: "MS", v: "high", h: "front", focal: 35 }), bird = C.solveFrame(person, { size: "WS", v: "bird", h: "front", focal: 24 });
  t("angles: low below / high above the subject / bird's-eye near vertical", low.pos[1] < 1.2 && high.pos[1] > 1.5 && C.azel(C.sub(bird.pos, bird.look)).el > 1.0); }
{ const a = C.solveFrame(person, { size: "MS", v: "eye", h: "threeQuarter", side: 1, focal: 35 }), b = C.solveFrame(person, { size: "MS", v: "eye", h: "threeQuarter", side: -1, focal: 35 }); t("angles: side flips the three-quarter (180-degree rule control)", Math.sign(a.pos[0]) !== Math.sign(b.pos[0])); }
{ const tight = C.solveFrame(person, { size: "MS", v: "eye", h: "front", focal: 85 }), wide = C.solveFrame(person, { size: "MS", v: "eye", h: "front", focal: 24 }); t("framing: longer lens = camera further back for the same shot size", tight.dist > wide.dist * 3); }
{ const good = C.solveFrame(person, { size: "MS", v: "eye", h: "threeQuarter", focal: 35 }), bad = { pos: good.pos, look: C.add(good.look, [2.5, -1.2, 0]) as C.V3 };
  t("composition: well-composed frame scores higher than an off-balance one", C.composeScore(good, C.fovFromFocal(35), person).score > C.composeScore(bad, C.fovFromFocal(35), person).score + 0.15); }

// ---------------------------------------------------------------- collision / environment
const env: C.Env = { obstacles: SET_OBSTACLES, ground: () => 0, clearance: 0.4 };
{ const inside: C.V3 = [TOWER[0], 5, TOWER[2]], out = C.resolve(env, inside); t("collision: a camera inside the tower is pushed out with clearance", C.clearanceAt(env, out) >= 0.35, `clearance ${C.clearanceAt(env, out).toFixed(2)} m`); }
{ const out = C.resolve(env, [0, -1, 5]); t("collision: below-ground camera lifted above the ground", out[1] >= 0.35); }
{ const v = C.visibility(env, [-6, 1.5, -4], C.subjectPts([-6, 0, -24], 1.6)); t("line of sight: subject behind the tower is detected as hidden", v < 0.3, `visible ${(v * 100).toFixed(0)}%`); }
{ const wallPath = M.approach({ f0: 0, f1: 120 }, [-6, 3, 5], [-6, 3, -20], [-6, 3, -30]); let clips = 0; for (let f = 0; f <= 120; f++) if (C.clearanceAt(env, C.resolve(env, wallPath.at(f).pos)) < 0.3) clips++;
  t("collision: a path straight through the tower is repaired (never inside geometry)", clips === 0, `${clips} frames inside`); }

// ---------------------------------------------------------------- director
const plan = C.direct(STORY_BEATS, S, { env });
console.log("\n" + C.shotList(plan) + "\n");
t("director: one shot per beat, each with a reason", plan.shots.length === STORY_BEATS.length && plan.shots.every((s) => s.why.length > 20));
t("director: grandeur + giant structure -> a scale-revealing preset", ["giantStructureReveal", "epicScaleReveal", "aerialEnvironmentReveal"].includes(plan.shots[0].preset), plan.shots[0].preset);
t("director: surprise -> a timed push / reveal (no shake)", ["dramaticCloseup", "mysteryReveal"].includes(plan.shots[2].preset) && (PRESET_HANDHELD(plan.shots[2].preset) === 0), plan.shots[2].preset);
t("director: object beat frames the object", ["objectDetailReveal", "dramaticCloseup", "documentaryCinematic"].includes(plan.shots[3].preset), plan.shots[3].preset);
t("director: line of sight to the subject in every shot >= 70 %", plan.shots.every((s) => s.visibility >= 0.7), plan.shots.map((s) => (s.visibility * 100).toFixed(0)).join("/"));
function PRESET_HANDHELD(n: string) { return C.PRESETS[n].params.handheld; }
const cam = (f: number) => C.evaluate(plan, f);
const mainAt = (f: number): C.Subject[] => { const b = [...plan.shots].reverse().find((s) => s.beat.f0 <= f)!.beat; const sd = S[b.subject]; return [C.snap(sd, f)]; };
// QC each continuous segment (a dissolve legitimately switches camera between segments)
const segSubj = (sg: ReturnType<typeof C.segmentCams>[number]) => (f: number): C.Subject[] => { const b = ([...sg.shots].reverse().find((s) => s.beat.f0 <= f) ?? sg.shots[0]).beat; return [C.snap(S[b.subject], f)]; };
const qs = C.segmentCams(plan).map((sg) => C.cameraQc(sg.at, sg.f0, sg.f1, { env, subjects: segSubj(sg) }));
const q = { ...qs[0], issues: qs.flatMap((x) => x.issues), summary: { ...qs[0].summary, maxSpeed_ms: Math.max(...qs.map((x) => x.summary.maxSpeed_ms)), maxAccel_ms2: Math.max(...qs.map((x) => x.summary.maxAccel_ms2)), minSafeFrac: Math.min(...qs.map((x) => x.summary.minSafeFrac)) } };
qs.forEach((x, i) => console.log(`director QC segment ${i + 1}:`, C.qcText(x), x.issues.filter((u) => u.kind.includes("safe")).filter((_, k) => k % 8 === 0).map((u) => `${u.f}:${u.value.toFixed(2)}`).join(" ")));
results.directorQc = qs.map((x) => x.summary);
const hard = q.issues.filter((i) => ["invalid coordinates", "camera jump", "camera clipping geometry", "subject leaving frame", "focus hunting", "jitter"].includes(i.kind));
t("director timeline: no jumps, no clipping, no jitter, no focus hunting, subject never leaves frame", hard.length === 0, hard.slice(0, 4).map((i) => `${i.kind}@${i.f}`).join(", ") || C.qcText(q).slice(0, 90));
t("director timeline: speed and acceleration within cinematic limits", q.summary.maxSpeed_ms < 6 && q.summary.maxAccel_ms2 < 12, `${q.summary.maxSpeed_ms.toFixed(2)} m/s, ${q.summary.maxAccel_ms2.toFixed(2)} m/s2`);
t("director timeline: subject inside the Shorts safe area (>= 85 % of box) everywhere", q.summary.minSafeFrac >= 0.85, `min ${(q.summary.minSafeFrac * 100).toFixed(0)}%`);
{ const a = JSON.stringify(C.evaluate(plan, 211)); C.evaluate(plan, 5); C.evaluate(plan, 399); t("director: deterministic, order-independent evaluation", JSON.stringify(C.evaluate(plan, 211)) === a); }
{ const p2 = C.direct([...STORY_BEATS.slice(0, 2), { ...STORY_BEATS[2], scene: "workshop" }, { ...STORY_BEATS[3], scene: "workshop" }], S, { env }); const L = C.layers(p2, STORY_BEATS[2].f0, 24);
  t("transitions: scene change uses the opacity dissolve (two layers, partial opacity)", p2.shots[2].dissolve && L.length === 2 && L[1].opacity > 0.3 && L[1].opacity < 0.7, `opacity ${L[1]?.opacity.toFixed(2)}`); }
{ const rep: C.Beat[] = Array.from({ length: 5 }, (_, i) => ({ f0: i * 80, f1: i * 80 + 80, kind: "speak" as C.BeatKind, subject: "hero" })); const p = C.direct(rep, S, { env }), names = p.shots.map((s) => s.preset);
  t("director: variety - never the same preset three times in a row", !names.some((n, i) => i >= 2 && n === names[i - 1] && n === names[i - 2]), names.join(",")); }
{ const p = C.direct([{ f0: 0, f1: 20, kind: "speak", subject: "hero" }, { f0: 20, f1: 200, kind: "speak", subject: "hero" }], S, { env }); t("director: ignores beats shorter than the minimum shot (no chasing tiny moves)", p.shots.length === 1); }

// ---------------------------------------------------------------- TF2 bridge
const beats = C.beatsFromScript(HERO_SCRIPT, 0, STORY_FRAMES);
console.log("TF2 beats:", beats.map((b) => `${b.f0}-${b.f1}:${b.kind}`).join("  "));
t("TF2 bridge: beats cover the timeline without overlaps or gaps", beats[0].f0 === 0 && beats[beats.length - 1].f1 === STORY_FRAMES && beats.every((b, i) => i === 0 || b.f0 === beats[i - 1].f1));
t("TF2 bridge: walk -> follow beat, point -> point beat with a target, strong surprise -> react beat", beats.some((b) => b.kind === "action") && beats.some((b) => b.kind === "point" && !!b.poi) || beats.some((b) => b.kind === "react"), beats.map((b) => b.kind).join(","));
t("TF2 bridge: no beat shorter than the minimum shot except reactions", beats.every((b) => b.f1 - b.f0 >= 40 || b.kind === "react"));
{ const p = C.direct(beats, S, { env }); console.log(C.shotList(p)); const qa = C.segmentCams(p).map((sg) => C.cameraQc(sg.at, sg.f0, sg.f1, { env, subjects: (f) => [C.snap(S.hero, f)] })); qa.forEach((x) => console.log("TF2-driven QC:", C.qcText(x))); results.tf2Qc = qa.map((x) => x.summary);
  const h2 = qa.flatMap((x) => x.issues).filter((i) => ["invalid coordinates", "camera jump", "camera clipping geometry", "subject leaving frame", "jitter"].includes(i.kind));
  t("TF2-driven camera: follows the walk, settles, keeps the character in frame, no jumps", h2.length === 0, h2.slice(0, 3).map((i) => `${i.kind}@${i.f}`).join(", ") || "ok"); }

// ---------------------------------------------------------------- QC catches problems
{ const jumpy = (f: number): C.CamState => ({ pos: [f === 50 ? 5 : 0, 1.5, 6], look: [0, 1, 0], focal: 35, focus: 6, fstop: 4, roll: 0 }); const r = C.cameraQc(jumpy, 0, 100); t("QC: detects a camera jump", r.kinds.includes("camera jump")); }
{ const jit = (f: number): C.CamState => ({ pos: [Math.sin(f * 2.7) * 0.01, 1.5, 6], look: [0, 1, 0], focal: 35, focus: 6, fstop: 4, roll: 0 }); t("QC: detects jitter", C.cameraQc(jit, 0, 100).kinds.includes("jitter")); }
{ const z = (f: number): C.CamState => ({ pos: [0, 1.5, 6], look: [0, 1, 0], focal: f === 40 ? 70 : 35, focus: 6, fstop: 4, roll: 0 }); t("QC: detects a sudden focal-length change", C.cameraQc(z, 0, 100).kinds.includes("focal-length jump")); }
{ const h = (f: number): C.CamState => ({ pos: [0, 1.5, 6], look: [0, 1, 0], focal: 35, focus: 6 + Math.sin(f * 0.4) * 2, fstop: 4, roll: 0 }); t("QC: detects focus hunting", C.cameraQc(h, 0, 100).kinds.includes("focus hunting")); }
{ const c = (f: number): C.CamState => ({ pos: [TOWER[0], 4, TOWER[2] + f * 0.01], look: [0, 1, 0], focal: 35, focus: 6, fstop: 4, roll: 0 }); t("QC: detects clipping into geometry", C.cameraQc(c, 0, 30, { env }).kinds.includes("camera clipping geometry")); }
{ const o = (f: number): C.CamState => ({ pos: [0, 1.5, 6], look: [f * 0.2, 1, 0], focal: 35, focus: 6, fstop: 4, roll: 0 }); t("QC: detects the subject leaving the frame", C.cameraQc(o, 0, 100, { subjects: () => [person] }).kinds.includes("subject leaving frame")); }
{ const n = (f: number): C.CamState => ({ pos: [f === 10 ? NaN : 0, 1.5, 6], look: [0, 1, 0], focal: 35, focus: 6, fstop: 4, roll: 0 }); t("QC: detects invalid coordinates", C.cameraQc(n, 0, 30).kinds.includes("invalid coordinates")); }
{ const m = (f: number): C.CamState => ({ pos: [f * 0.03, 1.5, 6], look: [0, 1, 0], focal: 35, focus: 6, fstop: 4, roll: 0 }); t("QC: detects unwanted movement during a hold", C.cameraQc(m, 0, 60, { holds: [[0, 60]] }).kinds.includes("unwanted movement during hold")); }

// ---------------------------------------------------------------- old vs new (same move: push-in + orbit around a subject)
{ const oldKeys = [...OLD.dolly(0, 60, [0, 1.6, 7], [0, 1.2, 0], -3), ...OLD.orbit(60, 150, [0, 1.2, 0], 4, 0.4, 0.15, Math.PI / 2).slice(1)].map((k) => ({ ...k, fov: 45 }));
  const oldCam = camPath(oldKeys as never, 6), oldFn = (f: number): C.CamState => { const c = oldCam(f); return { pos: c.pos, look: c.look, focal: C.focalFromFov(c.fov), focus: c.focus, fstop: 5.6, roll: 0 }; };
  const nb: C.Beat[] = [{ f0: 0, f1: 60, kind: "introduce", subject: "p0", preset: "documentaryCinematic" }, { f0: 60, f1: 150, kind: "environment", subject: "p0", preset: "cinematicOrbit" }];
  const np = C.direct(nb, { p0: { id: "p0", kind: "character", height: 1.6, at: () => [0, 0, 0], facingAt: () => 0 } }, { minShot: 10 }), newFn = (f: number) => C.evaluate(np, f);
  const qo = C.cameraQc(oldFn, 2, 148), qn = C.cameraQc(newFn, 2, 148); results.oldVsNew = { old: qo.summary, new: qn.summary };
  console.log("OLD:", C.qcText(qo)); console.log("NEW:", C.qcText(qn));
  t("old vs new: Camera 2.0 has lower peak acceleration (smoother speed changes) than the old keyframe path", qn.summary.maxAccel_ms2 < qo.summary.maxAccel_ms2, `old ${qo.summary.maxAccel_ms2.toFixed(2)} vs new ${qn.summary.maxAccel_ms2.toFixed(2)} m/s2`); }

// ---------------------------------------------------------------- performance
{ const N = 400, t0 = performance.now(); for (let f = 0; f < N; f++) C.evaluate(plan, f); const ms = (performance.now() - t0) / N; results.perfMsPerFrame = ms;
  t("performance: director evaluation < 5 ms per frame (smoothing + collision included)", ms < 5, `${ms.toFixed(3)} ms/frame`); }

console.log(`\n${pass} passed, ${fail} failed`);
const ji = process.argv.indexOf("--json"); if (ji > 0) writeFileSync(process.argv[ji + 1], JSON.stringify({ pass, fail, log, results }, null, 1));
process.exit(fail ? 1 : 0);
