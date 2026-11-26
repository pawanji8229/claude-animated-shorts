// joralemon: No. 58 inside today (ILLUSTRATIVE cutaway, not the real equipment layout) - the gutted brick shell of the
// house: steel frame + bracing, two big axial fans (guards, motors, spinning blades) in a bulkhead, a galvanised duct
// rising to a louvred roof outlet, electrical cabinets + conduit, grated walkways with yellow handrails at the old
// floor levels, steel stairs, caged work lights, light shafts from roof hatches. The emergency stair continues down the
// shaft (under.tsx). House-local coordinates (same as rowhouse.ts): front face z = 0, interior z in [-13, -0.43].
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3, rng } from "../../lib/math";
import { jMats, JM } from "./mats";
import { W58, AREA_Y, PF, EAVE, SHAFT } from "./world";

const XI = W58 / 2 - 0.42, ZB = -12.6, ZF = -0.45;   // inside faces of the shell
export const FAN_Z = -6.4, FAN_R = 1.05, FANS: V3[] = [[-1.35, PF + 1.75, FAN_Z], [1.35, PF + 1.75, FAN_Z]];
const WALK_Y = [PF + 3.5, PF + 6.7];
const ibeam = (k: Kit, m: THREE.Material, a: V3, b: V3, s = 0.2) => { // I-section member along an axis-aligned span
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ax = Math.abs(d[0]) > 0.01 ? 0 : Math.abs(d[1]) > 0.01 ? 1 : 2;
  const lo = (i: number, o: number) => Math.min(a[i], b[i]) + (i === ax ? 0 : o), hi = (i: number, o: number) => Math.max(a[i], b[i]) + (i === ax ? 0 : o);
  const fl = ax === 1 ? 0 : 1, web = ax === 1 ? 2 : (ax === 0 ? 2 : 0);   // flange across `web` axis
  const box = (o0: V3, o1: V3) => k.span(m, [lo(0, o0[0]), lo(1, o0[1]), lo(2, o0[2])], [hi(0, o1[0]), hi(1, o1[1]), hi(2, o1[2])]);
  const h = s / 2, t = 0.02, f: V3 = [0, 0, 0];
  const o = (fx: number, fy: number, fz: number): V3 => [fx, fy, fz];
  if (ax === 1) { box(o(-h, 0, -h), o(h, 0, -h + t)); box(o(-h, 0, h - t), o(h, 0, h)); box(o(-t / 2, 0, -h + t), o(t / 2, 0, h - t)); }
  else if (ax === 0) { box(o(0, -h, -h), o(0, -h + t, h)); box(o(0, h - t, -h), o(0, h, h)); box(o(0, -h + t, -t / 2), o(0, h - t, t / 2)); }
  else { box(o(-h, -h, 0), o(h, -h + t, 0)); box(o(-h, h - t, 0), o(h, h, 0)); box(o(-t / 2, -h + t, 0), o(t / 2, h - t, 0)); }
  void fl; void web; void f;
};
const railing = (k: Kit, M: JM, a: V3, b: V3) => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.1));
  for (let i = 0; i <= n; i++) { const t = i / n, p: V3 = [a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t]; k.rod(M.safety, p, [p[0], p[1] + 1.05, p[2]], 0.022, 6); }
  for (const h of [0.55, 1.05]) k.rod(M.safety, [a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], 0.022, 6); };
const grating = (k: Kit, M: JM, x0: number, x1: number, y: number, z0: number, z1: number) => {
  k.span(M.grate, [x0, y - 0.06, z0], [x0 + 0.06, y, z1]); k.span(M.grate, [x1 - 0.06, y - 0.06, z0], [x1, y, z1]); k.span(M.grate, [x0, y - 0.06, z0], [x1, y, z0 + 0.06]); k.span(M.grate, [x0, y - 0.06, z1 - 0.06], [x1, y, z1]);
  for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.06) k.span(M.grate, [x - 0.008, y - 0.04, z0 + 0.06], [x + 0.008, y - 0.002, z1 - 0.06], { ink: false });
  for (let z = z0 + 0.4; z < z1 - 0.2; z += 0.4) k.span(M.grate, [x0 + 0.06, y - 0.045, z - 0.01], [x1 - 0.06, y - 0.012, z + 0.01], { ink: false });
};
const stair = (k: Kit, M: JM, x0: number, x1: number, a: [number, number], b: [number, number]) => { // along z from (z,y)=a to b
  const n = Math.round(Math.abs(b[1] - a[1]) / 0.19); for (const x of [x0, x1]) k.rod(M.machDark, [x, a[1], a[0]], [x, b[1], b[0]], 0.05, 6);
  for (let s = 1; s < n; s++) { const t = s / n, z = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; k.span(M.grate, [x0 + 0.04, y - 0.03, z - 0.13], [x1 - 0.04, y, z + 0.13], { ink: false }); }
  for (const x of [x0 - 0.03, x1 + 0.03]) { k.rod(M.safety, [x, a[1] + 0.95, a[0]], [x, b[1] + 0.95, b[0]], 0.022, 6); for (let s = 0; s <= 3; s++) { const t = s / 3; k.rod(M.safety, [x, a[1] + (b[1] - a[1]) * t, a[0] + (b[0] - a[0]) * t], [x, a[1] + (b[1] - a[1]) * t + 0.95, a[0] + (b[0] - a[0]) * t], 0.02, 6); } } };
const cabinet = (k: Kit, M: JM, x: number, y: number, z: number, w: number, h: number, face: 1 | -1) => {
  k.span(M.cabinet, [x - (face > 0 ? 0 : 0.5), y, z - w / 2], [x + (face > 0 ? 0.5 : 0), y + h, z + w / 2]);
  const fx = x + face * 0.5; for (let d = 0; d < Math.max(1, Math.round(w / 0.7)); d++) { const zc = z - w / 2 + (d + 0.5) * (w / Math.max(1, Math.round(w / 0.7)));
    k.span(M.cabinet, [fx - (face > 0 ? 0 : 0.02), y + 0.1, zc - 0.31], [fx + (face > 0 ? 0.02 : 0), y + h - 0.1, zc + 0.31], { ink: 0.4 }); k.span(M.machDark, [fx + face * 0.02 - 0.01, y + h * 0.52, zc + 0.2], [fx + face * 0.02 + 0.01, y + h * 0.58, zc + 0.24], { ink: false });
    k.span(M.cream, [fx + face * 0.021 - 0.003, y + h - 0.4, zc - 0.1], [fx + face * 0.021 + 0.003, y + h - 0.3, zc + 0.1], { ink: false }); }
  for (let c = 0; c < 4; c++) k.rod(M.galv, [x + face * 0.2 - 0.1 + c * 0.06 * face, y + h, z - 0.2 + c * 0.1], [x + face * 0.2 - 0.1 + c * 0.06 * face, WALK_Y[0] - 0.1, z - 0.2 + c * 0.1], 0.025, 6, { ink: false });
};
const cageLamp = (k: Kit, M: JM, p: V3) => { k.rod(M.machDark, [p[0], p[1] + 0.6, p[2]], [p[0], p[1] + 0.12, p[2]], 0.01, 5, { ink: false }); k.cyl(M.machDark, 0.14, 0.05, 0.12, [p[0], p[1] + 0.12, p[2]], [0, 0, 0], 12); k.sphere(M.cageLamp, 0.08, [p[0], p[1], p[2]], [1, 1.2, 1], { ink: false });
  for (let a = 0; a < 4; a++) k.rod(M.machDark, [p[0] + Math.cos(a * 1.57) * 0.1, p[1] + 0.08, p[2] + Math.sin(a * 1.57) * 0.1], [p[0] + Math.cos(a * 1.57) * 0.1, p[1] - 0.1, p[2] + Math.sin(a * 1.57) * 0.1], 0.006, 4, { ink: false }); };
export const LAMPS_IN: V3[] = [[-1.6, PF + 3.1, -2.6], [1.6, PF + 3.1, -9.5], [0, PF + 6.3, -4.5], [-1.2, AREA_Y + 2.1, -8], [1.4, PF + 9.0, -7]];

/** static machinery shell; `stage` (0..3) lets the conversion scene grow it part by part: [kitShell, kitFrame, kitMach, kitWalks] */
export const ventKits = () => once("vent58", () => { const M = jMats(), r = rng(8);
  const shell = new Kit(), frame = new Kit(), mach = new Kit(), walks = new Kit();
  // gutted shell: exposed brick party walls (darker, sooty), back wall, roof underside with joists, basement slab with the shaft opening
  for (const sx of [-1, 1]) shell.span(M.brickDeep, [sx * XI - (sx > 0 ? 0 : 0.2), AREA_Y - 0.1, ZB], [sx * XI + (sx > 0 ? 0.2 : 0), EAVE, ZF], { ink: false });
  shell.span(M.brickDeep, [-XI, AREA_Y - 0.1, ZB - 0.2], [XI, EAVE, ZB], { ink: false });
  shell.span(M.timberDk, [-XI, EAVE - 0.25, ZB], [XI, EAVE - 0.2, ZF], { ink: false }); for (let z = ZB + 0.4; z < ZF; z += 0.6) shell.span(M.timberDk, [-XI, EAVE - 0.5, z], [XI, EAVE - 0.25, z + 0.08], { ink: false });
  // basement slab (concrete) except over the shaft (z SHAFT.z0..ZF): the shaft rim is guarded
  shell.span(M.concrete, [-XI, AREA_Y - 0.25, ZB], [XI, AREA_Y, SHAFT.z0], { ink: false });
  for (const sx of [-1, 1]) shell.span(M.concrete, [sx > 0 ? SHAFT.x1 : -XI, AREA_Y - 0.25, SHAFT.z0], [sx > 0 ? XI : SHAFT.x0, AREA_Y, ZF], { ink: false });
  // steel frame: columns at the corners of the bays, beams at the old floor lines, X-bracing on the back wall
  for (const x of [-XI + 0.15, XI - 0.15]) for (const z of [ZF - 0.5, -6.4, ZB + 0.3]) ibeam(frame, M.machGreen, [x, AREA_Y, z], [x, EAVE - 0.5, z], 0.24);
  for (const y of [PF - 0.1, ...WALK_Y.map((w) => w - 0.15)]) for (const z of [ZF - 0.5, -6.4, ZB + 0.3]) ibeam(frame, M.machGreen, [-XI + 0.15, y, z], [XI - 0.15, y, z], 0.22);
  for (const [a, b] of [[[-XI + 0.2, AREA_Y + 0.2], [XI - 0.2, PF + 3.2]], [[XI - 0.2, AREA_Y + 0.2], [-XI + 0.2, PF + 3.2]]] as [number, number][][]) frame.rod(M.machGreen, [a[0], a[1], ZB + 0.25], [b[0], b[1], ZB + 0.25], 0.05, 6);
  // fan bulkhead (steel plate wall with two round openings) at FAN_Z, from the basement to the walkway
  const holes = FANS.map((p) => Array.from({ length: 24 }, (_, i) => [p[0] + Math.cos((i / 24) * Math.PI * 2) * (FAN_R + 0.12), p[1] + Math.sin((i / 24) * Math.PI * 2) * (FAN_R + 0.12)] as [number, number]));
  mach.ext(M.machGrey, [[-XI, AREA_Y], [XI, AREA_Y], [XI, WALK_Y[0] - 0.3], [-XI, WALK_Y[0] - 0.3]], 0.08, [0, 0, FAN_Z - 0.4], [0, 0, 0], 0, {}, holes);
  for (const p of FANS) { // housing ring, guard (rings + spokes), motor on a tripod
    mach.add(M.machGreen, new THREE.CylinderGeometry(FAN_R + 0.12, FAN_R + 0.12, 0.9, 32, 1, true), [p[0], p[1], p[2] - 0.05], [Math.PI / 2, 0, 0]);
    mach.torus(M.machGreen, FAN_R + 0.12, 0.05, [p[0], p[1], p[2] + 0.4], [0, 0, 0]); mach.torus(M.machGreen, FAN_R + 0.12, 0.05, [p[0], p[1], p[2] - 0.5], [0, 0, 0]);
    for (const rr of [0.3, 0.6, 0.9]) mach.torus(M.machDark, rr, 0.012, [p[0], p[1], p[2] + 0.46], [0, 0, 0], Math.PI * 2, { ink: false });
    for (let s = 0; s < 8; s++) { const a = (s / 8) * Math.PI * 2; mach.rod(M.machDark, [p[0], p[1], p[2] + 0.46], [p[0] + Math.cos(a) * (FAN_R + 0.1), p[1] + Math.sin(a) * (FAN_R + 0.1), p[2] + 0.46], 0.012, 4, { ink: false }); }
    mach.cyl(M.machDark, 0.32, 0.32, 0.7, [p[0], p[1], p[2] - 0.95], [Math.PI / 2, 0, 0], 20); mach.cyl(M.machGrey, 0.34, 0.34, 0.08, [p[0], p[1], p[2] - 1.32], [Math.PI / 2, 0, 0], 20);
    for (let fn = 0; fn < 10; fn++) mach.span(M.machDark, [p[0] - 0.36, p[1] - 0.012 + (fn - 4.5) * 0.06, p[2] - 1.25], [p[0] + 0.36, p[1] + 0.012 + (fn - 4.5) * 0.06, p[2] - 0.65], { ink: false });
    mach.span(M.machGreen, [p[0] - 0.4, AREA_Y, p[2] - 1.3], [p[0] + 0.4, p[1] - 0.33, p[2] - 0.7]);
  }
  // galvanised duct: plenum box behind the fans -> rising rectangular duct -> roof outlet (louvred penthouse)
  mach.span(M.galv, [-XI + 0.2, PF - 0.3, -9.6], [XI - 0.2, PF + 3.0, FAN_Z - 1.45]);
  for (let z = -9.5; z < FAN_Z - 1.5; z += 0.6) mach.span(M.galv, [-XI + 0.18, PF - 0.32, z - 0.025], [XI - 0.18, PF + 3.02, z + 0.025], { ink: false });
  mach.span(M.galv, [-1.4, PF + 3.0, -9.4], [1.4, EAVE + 1.4, -7.0]); for (let y = PF + 3.2; y < EAVE + 1.3; y += 0.6) mach.span(M.galv, [-1.42, y - 0.025, -9.42], [1.42, y + 0.025, -6.98], { ink: false });
  mach.span(M.machGrey, [-1.8, EAVE + 1.4, -9.8], [1.8, EAVE + 2.6, -6.6]); for (let y = EAVE + 1.55; y < EAVE + 2.5; y += 0.14) mach.span(M.machDark, [-1.82, y, -6.62], [1.82, y + 0.05, -6.5], { ink: false }); mach.span(M.machDark, [-1.95, EAVE + 2.6, -9.95], [1.95, EAVE + 2.75, -6.45]);
  // round ducts + elbows along the right wall (supply to the shaft)
  mach.cyl(M.galv, 0.32, 0.32, EAVE - AREA_Y, [XI - 0.45, (EAVE + AREA_Y) / 2, -11.4], [0, 0, 0], 20); for (let y = AREA_Y + 0.6; y < EAVE; y += 1.2) mach.torus(M.galv, 0.33, 0.025, [XI - 0.45, y, -11.4], [Math.PI / 2, 0, 0], Math.PI * 2, { ink: false });
  // electrical: cabinets on the left wall (basement + parlour level), conduit runs, a big switch panel
  cabinet(mach, M, -XI, AREA_Y, -9.0, 2.0, 2.0, 1); cabinet(mach, M, -XI, PF - 0.1, -3.4, 1.6, 2.1, 1); cabinet(mach, M, XI, PF - 0.1, -3.0, 1.2, 1.8, -1);
  for (let c = 0; c < 5; c++) mach.rod(M.galv, [-XI + 0.06, AREA_Y + 2.3 + c * 0.08, -11], [-XI + 0.06, AREA_Y + 2.3 + c * 0.08, -1.0], 0.02, 5, { ink: false });
  // walkways (grating) at the old floor lines, front part; stairs between them; caged lamps
  grating(walks, M, -XI + 0.1, XI - 0.1, WALK_Y[0], -4.6, ZF - 0.1); railing(walks, M, [-XI + 0.15, WALK_Y[0], -4.55], [XI - 0.15, WALK_Y[0], -4.55]);
  grating(walks, M, -XI + 0.1, -0.2, WALK_Y[1], -12.2, -5.4); railing(walks, M, [-0.25, WALK_Y[1], -12.1], [-0.25, WALK_Y[1], -5.5]);
  grating(walks, M, 0.4, XI - 0.1, PF - 0.1, -12.2, -9.8);
  stair(walks, M, -XI + 0.2, -XI + 1.1, [-1.2, PF - 0.1], [-4.4, WALK_Y[0]]); stair(walks, M, 0.6, 1.5, [-11.8, WALK_Y[0]], [-8.8, WALK_Y[1]]);
  stair(walks, M, SHAFT.x0 + 0.2, SHAFT.x0 + 1.1, [-1.0, AREA_Y], [-3.6, PF - 0.1]);
  for (const p of LAMPS_IN) cageLamp(walks, M, p);
  void r;
  return { shell, frame, mach, walks }; });

/** spinning fan rotors (7 twisted blades + spinner), angle in radians */
const rotorKit = () => once("rotor", () => { const M = jMats(), k = new Kit(); k.sphere(M.machDark, 0.2, [0, 0, 0.1], [1, 1, 1.3]);
  for (let b = 0; b < 7; b++) { const a = (b / 7) * Math.PI * 2; const g = new THREE.BoxGeometry(0.34, FAN_R - 0.2, 0.025); g.translate(0, (FAN_R - 0.2) / 2 + 0.17, 0); k.add(M.machYellow, g, [0, 0, 0.05], [0.35, 0, a]); }
  return k; });
export const VentInterior: React.FC<{ f: number; spin: number; show?: { frame?: number; mach?: number; walks?: number } }> = ({ f, spin, show = {} }) => { const K = ventKits(), R = rotorKit();
  const sh = (v: number | undefined) => v === undefined || v >= 1;
  return (<group>
    <KitMesh kit={K.shell} />
    {sh(show.frame) && <KitMesh kit={K.frame} />}
    {sh(show.mach) && <><KitMesh kit={K.mach} />{FANS.map((p, i) => <group key={i} position={p} rotation={[0, 0, spin * (i ? -1 : 1) + i * 0.3]}><KitMesh kit={R} /></group>)}</>}
    {sh(show.walks) && <KitMesh kit={K.walks} />}
    {LAMPS_IN.slice(0, 4).map((p, i) => <pointLight key={i} position={[p[0], p[1] - 0.2, p[2]]} color="#ffe2b0" intensity={6} distance={9} decay={1.6} />)}
    <LightShafts f={f} />
  </group>);
};
/** soft light beams from two roof hatches (additive, no depth write) */
const beamMat = () => once("beamMat", () => new THREE.MeshBasicMaterial({ color: "#fff1d6", transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
const LightShafts: React.FC<{ f: number }> = ({ f }) => { const geo = useMemo(() => new THREE.CylinderGeometry(0.45, 1.1, EAVE - PF, 16, 1, true), []);
  return <>{[[-1.4, -3.6], [1.2, -10.8]].map(([x, z], i) => <mesh key={i} geometry={geo} material={beamMat()} position={[x, (EAVE + PF) / 2, z]} rotation={[0.08 + Math.sin(f * 0.01 + i) * 0.005, 0, 0.1]} />)}</>; };
