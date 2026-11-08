// Crowd naturalness check (TwistFrame rule: NO synchronised crowd animation).
// Usage: npx tsx scripts/check-crowd.ts src/productions/<id>/scene.ts
// The scene module must export PERSONAS (crowdLife personas), crowdPose(i, f) and FILM_FRAMES.
// Reports: pairwise correlation of hand motion between people, the most people moving their arms in the same frame,
// shutter/flash spacing, simultaneous flashes, and photographers vs non-photographers. Exit 1 on a hard failure.
import path from "path";
import * as THREE from "three";
import { personEvents } from "../src/char/crowdLife";

(async () => {
  const modPath = path.resolve(process.argv[2]);
  const M = await import(modPath);
  const N: number = M.FILM_FRAMES, P = M.PERSONAS as any[], pose = M.crowdPose as (i: number, f: number) => any;
  const n = P.length;
  // hand speed per person per frame (both hands)
  const sp: number[][] = P.map((_, i) => {
    const out: number[] = []; let prev = pose(i, 0);
    for (let f = 1; f < N; f++) { const cur = pose(i, f); out.push(Math.hypot(cur.armL.hand[0] - prev.armL.hand[0], cur.armL.hand[1] - prev.armL.hand[1]) + Math.hypot(cur.armR.hand[0] - prev.armR.hand[0], cur.armR.hand[1] - prev.armR.hand[1])); prev = cur; }
    return out;
  });
  const corr = (a: number[], b: number[]) => { const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length; let num = 0, da = 0, db = 0; for (let k = 0; k < a.length; k++) { num += (a[k] - ma) * (b[k] - mb); da += (a[k] - ma) ** 2; db += (b[k] - mb) ** 2; } return num / Math.sqrt(da * db + 1e-9); };
  let worst = { r: -1, a: 0, b: 0 };
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const r = corr(sp[a], sp[b]); if (r > worst.r) worst = { r, a, b }; }
  let maxMoving = 0, atF = 0;
  for (let f = 0; f < N - 1; f++) { const c = sp.filter((s) => s[f] > 2.5).length; if (c > maxMoving) { maxMoving = c; atF = f; } }
  const ev = P.flatMap((p, i) => personEvents(p, i));
  const shut = ev.filter((e) => e.kind === "shutter").map((e) => e.frame).sort((a, b) => a - b);
  const fl = ev.filter((e) => e.kind === "flash_pop").map((e) => e.frame).sort((a, b) => a - b);
  const gap = (xs: number[]) => xs.slice(1).reduce((m, x, k) => Math.min(m, x - xs[k]), Infinity);
  const photographers = P.filter((p) => p.clips.some((c: any) => c.kind === "photo")).length;
  const raises = P.flatMap((p) => p.clips.filter((c: any) => c.kind === "photo").map((c: any) => c.shots[0].f - 4 - c.raise)).sort((a: number, b: number) => a - b);
  const rows: [string, boolean, string][] = [
    ["hand motion not synchronised (max pairwise correlation <= 0.6)", worst.r <= 0.6, `max r = ${worst.r.toFixed(2)} (people ${worst.a} & ${worst.b})`],
    ["never most of the crowd gesturing at once", maxMoving <= Math.ceil(n * 0.5), `max ${maxMoving}/${n} people moving arms in one frame (frame ${atF})`],
    ["shutters individually timed (>= 6 frames apart)", gap(shut) >= 6, `${shut.length} shutters at ${shut.join(", ")} (min gap ${gap(shut)})`],
    ["no simultaneous flashes (>= 8 frames apart)", gap(fl) >= 8, `${fl.length} flashes at ${fl.join(", ")} (min gap ${gap(fl)})`],
    ["camera raises start at different times (>= 10 frames apart)", gap(raises) >= 10, `raise starts ${raises.join(", ")}`],
    ["some people do not photograph", photographers < n, `${photographers}/${n} photographers`],
  ];
  // visibility of every photographed shot (needs camAt + CROWD [+ HAL] exports): on screen, not behind the hero, not
  // hidden behind another person -> a shutter sound always has a visible photographer
  if (M.camAt && M.CROWD) {
    const proj = (p: number[], f: number) => { const c = M.camAt(f); const cam = new THREE.PerspectiveCamera(c.fov, 9 / 16, 0.1, 500); cam.position.set(c.pos[0], c.pos[1], c.pos[2]); cam.lookAt(c.look[0], c.look[1], c.look[2]); cam.updateMatrixWorld(); const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam); return [(v.x + 1) / 2, (1 - v.y) / 2, cam.position.distanceTo(new THREE.Vector3(p[0], p[1], p[2]))]; };
    const bad: string[] = []; const lines: string[] = [];
    for (const e of ev.filter((x) => x.kind === "shutter")) {
      const m = M.CROWD[e.who], h = proj([m.pos[0], m.pos[1] + 1.15, m.pos[2]], e.frame);
      const hero = M.HAL ? proj([M.HAL[0], M.HAL[1] + 1.0, M.HAL[2]], e.frame) : null;
      const why: string[] = [];
      if (h[0] < 0.06 || h[0] > 0.94) why.push("off-screen");
      if (hero && Math.abs(h[0] - hero[0]) < 0.12 && h[2] > hero[2]) why.push("behind hero");
      M.CROWD.forEach((o: any, j: number) => { if (j === e.who) return; const q = proj([o.pos[0], o.pos[1] + 1.15, o.pos[2]], e.frame); if (Math.abs(q[0] - h[0]) < 0.055 && q[2] < h[2] - 0.2) why.push(`behind person ${j}`); });
      lines.push(`f${e.frame} p${e.who} x=${h[0].toFixed(2)}${why.length ? " " + why.join(",") : ""}`); if (why.length) bad.push(`f${e.frame} p${e.who}: ${why.join(", ")}`);
    }
    rows.push(["every photographer visible at their shutter moment", bad.length === 0, bad.length ? bad.join("; ") : lines.join(" | ")]);
  }
  let fail = false;
  for (const [name, ok, d] of rows) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${d}`); if (!ok) fail = true; }
  process.exit(fail ? 1 : 0);
})();
