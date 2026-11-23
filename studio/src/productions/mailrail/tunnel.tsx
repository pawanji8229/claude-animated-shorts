// ORIGINAL: Post Office Railway running tunnel (9 ft cast-iron segmental lining, twin 2 ft gauge tracks) + track +
// centre conductor rails + cable runs + bulkhead lamps + a crossover junction. Local frame: x along the tunnel, y = 0 on
// the rail top, tunnel axis at y = AXIS (so both tracks fit: the trains' top corners clear the lining by >= 0.25 m).
// Repeated detail (rings, bolts, brackets) carries no ink outline and is merged per material; ring joints alternate
// their longitudinal flanges (staggered like real segmental lining) so the repetition does not read as a pattern.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, once } from "../short3/kit";
import { MKit } from "./cutaway";
import { pm } from "./pbr";
import { CONDUCTOR_TOP, RAIL_Z } from "./train";
import { rng, type V3 } from "../../lib/math";

export const R_TUN = 1.37, AXIS = 0.65, RING = 0.508, TRACK_Z = [-0.55, 0.55], FLOOR = -0.1;
const TM = {
  lining: () => once("mrLining", () => pm("rust", 1.3, { tint: "#8e8b86", metal: 0.2, normal: 0.9, side: THREE.BackSide })),
  flange: () => once("mrFlange", () => pm("rust", 0.9, { tint: "#7a7772", metal: 0.3, normal: 0.8 })),
  bolt: () => once("mrBolt", () => new THREE.MeshStandardMaterial({ color: "#4a4640", metalness: 0.6, roughness: 0.6 })),
  concrete: () => once("mrConc", () => pm("concrete", 2.2, { tint: "#a9a49a" })),
  sleeper: () => once("mrSleeper", () => pm("oak", 1.2, { tint: "#6a5a48" })),
  rail: () => once("mrRail", () => pm("rust", 0.5, { tint: "#6a645c", metal: 0.7, normal: 0.4 })),
  railTop: () => once("mrRailTop", () => new THREE.MeshStandardMaterial({ color: "#bdb8b0", metalness: 1, roughness: 0.3 })),
  insul: () => once("mrInsul", () => new THREE.MeshStandardMaterial({ color: "#d8d0c0", roughness: 0.35 })),
  cable: () => once("mrCable", () => new THREE.MeshStandardMaterial({ color: "#1c1b1a", roughness: 0.7 })),
  cableLead: () => once("mrCableLead", () => new THREE.MeshStandardMaterial({ color: "#55575a", metalness: 0.5, roughness: 0.5 })),
  bracket: () => once("mrBracket", () => pm("rust", 0.6, { tint: "#6a5e54", metal: 0.4 })),
  lampBody: () => once("mrLampBody", () => new THREE.MeshStandardMaterial({ color: "#2a2a28", metalness: 0.5, roughness: 0.5 })),
  glow: () => once("mrBulb", () => new THREE.MeshStandardMaterial({ color: "#fff2d0", emissive: "#ffd890", emissiveIntensity: 2.2, roughness: 0.3 })),
  glass: () => once("mrGlass", () => new THREE.MeshStandardMaterial({ color: "#fff6e0", emissive: "#ffcc80", emissiveIntensity: 0.9, roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false })),
  paintW: () => once("mrPaintW", () => new THREE.MeshStandardMaterial({ color: "#e8e2d2", roughness: 0.7 })),
  sign: () => once("mrSignRed", () => new THREE.MeshStandardMaterial({ color: "#a8201b", roughness: 0.5 })),
};
const rotX = (g: THREE.BufferGeometry) => { g.rotateZ(-Math.PI / 2); return g; };   // axis y -> axis x
/** ring module (one 508 mm ring of lining) at local x 0..RING; `alt` staggers the segment joints */
const ringKit = (alt: boolean) => once(`mrRing${alt}`, () => { const k = new Kit(), R = R_TUN, N = 7;
  const skin = new THREE.CylinderGeometry(R, R, RING, 56, 1, true); { const uv = skin.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * R, uv.getY(i) * RING); }
  k.add(TM.lining(), rotX(skin), [RING / 2, AXIS, 0], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  const prof = [[R + 0.01, -0.016], [R - 0.07, -0.016], [R - 0.075, -0.01], [R - 0.075, 0.01], [R - 0.07, 0.016], [R + 0.01, 0.016]].map(([a, b]) => new THREE.Vector2(a, b));
  k.add(TM.flange(), rotX(new THREE.LatheGeometry(prof, 56)), [0, AXIS, 0], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  for (let i = 0; i < N; i++) { const a = (i + (alt ? 0.5 : 0)) / N * Math.PI * 2 + 0.2, y = AXIS + Math.sin(a) * (R - 0.035), z = Math.cos(a) * (R - 0.035);
    if (y < FLOOR + 0.05) continue;                                                     // buried in the invert concrete
    k.box(TM.flange(), [RING - 0.03, 0.07, 0.026], [RING / 2, y, z], [a + Math.PI / 2, 0, 0], { ink: false, cast: false });
    for (const bx of [0.03, RING - 0.03]) k.box(TM.bolt(), [0.03, 0.03, 0.03], [bx, AXIS + Math.sin(a + 0.07) * (R - 0.085), Math.cos(a + 0.07) * (R - 0.085)], [a, 0, 0], { ink: false, cast: false }); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.1, y = AXIS + Math.sin(a) * (R - 0.08); if (y < FLOOR + 0.05) continue;
    k.cyl(TM.bolt(), 0.014, 0.014, 0.05, [0, y, Math.cos(a) * (R - 0.08)], [0, 0, Math.PI / 2], 6, { ink: false, cast: false }); }
  return k; });

/** one track (two rails on oak sleepers set in the concrete invert, centre conductor rail on porcelain insulators) */
const trackKit = (len: number, zc: number, key: string) => once(`mrTrack${key}`, () => { const k = new Kit();
  for (const s of [1, -1]) { const z = zc + s * RAIL_Z;
    k.box(TM.railTop(), [len, 0.012, 0.044], [len / 2, -0.006, z], [0, 0, 0], { ink: false });       // polished running head (top at y = 0)
    k.box(TM.rail(), [len, 0.016, 0.046], [len / 2, -0.02, z], [0, 0, 0], { ink: false });
    k.box(TM.rail(), [len, 0.03, 0.014], [len / 2, -0.043, z], [0, 0, 0], { ink: false });
    k.box(TM.rail(), [len, 0.012, 0.09], [len / 2, -0.064, z], [0, 0, 0], { ink: false }); }
  for (let x = 0.3, r = rng(zc * 100 + len); x < len; x += 0.52 + r() * 0.2) { k.box(TM.sleeper(), [0.16, 0.1, 0.96], [x, -0.12, zc], [0, 0, 0], { ink: false, cast: false });
    for (const s of [1, -1]) k.box(TM.bolt(), [0.12, 0.008, 0.13], [x, -0.067, zc + s * RAIL_Z], [0, 0, 0], { ink: false, cast: false }); }
  k.box(TM.rail(), [len, 0.02, 0.05], [len / 2, CONDUCTOR_TOP - 0.01, zc], [0, 0, 0], { ink: false });
  for (let x = 0.3; x < len; x += 1.86) k.cyl(TM.insul(), 0.025, 0.032, CONDUCTOR_TOP - 0.02 + 0.07, [x, (CONDUCTOR_TOP - 0.02 - 0.07) / 2, zc], [0, 0, 0], 10, { ink: false, cast: false });
  return k; });

/** cables on brackets along both walls + bulkhead lamps at LAMP_DX spacing on the upper wall */
export const LAMP_DX = 6.1;
const wallKit = (len: number, key: string) => once(`mrWall${key}`, () => { const k = new Kit();
  const wallPt = (a: number, inset: number): [number, number] => [AXIS + Math.sin(a) * (R_TUN - inset), Math.cos(a) * (R_TUN - inset)];
  for (const s of [1, -1]) { const cab = [0.42, 0.52, 0.62, 0.74];                              // cable angles (rad above the axis) on side s
    for (const [ci, a0] of cab.entries()) { const a = s > 0 ? a0 : Math.PI - a0, [y, z] = wallPt(a, 0.14 + (ci % 2) * 0.012);
      k.add(ci === 2 ? TM.cableLead() : TM.cable(), (() => { const g = new THREE.CylinderGeometry(0.02 + (ci % 2) * 0.008, 0.02 + (ci % 2) * 0.008, len, 10, 1, true); g.rotateZ(Math.PI / 2); return g; })(), [len / 2, y, z], [0, 0, 0], [1, 1, 1], { ink: false, cast: false }); }
    for (let x = 0.7; x < len; x += 1.524) { const a1 = s > 0 ? 0.36 : Math.PI - 0.36, a2 = s > 0 ? 0.8 : Math.PI - 0.8; const [y1, z1] = wallPt(a1, 0.09), [y2, z2] = wallPt(a2, 0.09);
      k.rod(TM.bracket(), [x, y1, z1], [x, y2, z2], 0.012, 6, { ink: false, cast: false });
      for (const a0 of cab) { const a = s > 0 ? a0 : Math.PI - a0, [y, z] = wallPt(a, 0.12); k.rod(TM.bracket(), [x, y, z], [x, ...wallPt(a, 0.02)], 0.008, 5, { ink: false, cast: false }); } } }
  // lamps: alternate sides, high on the wall (clear of the train's swept envelope by > 0.3 m)
  for (let i = 0, x = LAMP_DX / 2; x < len; x += LAMP_DX, i++) { const s = i % 2 ? 1 : -1, a = s > 0 ? 1.12 : Math.PI - 1.12, [y, z] = wallPt(a, 0.08);
    k.box(TM.lampBody(), [0.22, 0.06, 0.2], [x, y + 0.02, z]); k.sphere(TM.glass(), 0.075, [x, y - 0.04, z - s * 0.01], [1.2, 0.8, 1], { ink: false, cast: false });
    for (const dx of [-0.07, 0.07]) k.rod(TM.lampBody(), [x + dx, y, z], [x + dx, y - 0.1, z - s * 0.01], 0.005, 4, { ink: false, cast: false });
    k.rod(TM.cable(), [x - 0.11, y + 0.03, z], [x - 0.6, ...wallPt(s > 0 ? 0.74 : Math.PI - 0.74, 0.14)], 0.009, 6, { ink: false, cast: false }); }
  return k; });
export const lampXs = (len: number) => { const out: { x: number; s: number }[] = []; for (let i = 0, x = LAMP_DX / 2; x < len; x += LAMP_DX, i++) out.push({ x, s: i % 2 ? 1 : -1 }); return out; };
/** the bulb meshes (bright emissive core inside each glass dome) */
const bulbKit = (len: number, key: string) => once(`mrBulbs${key}`, () => { const k = new Kit();
  for (const { x, s } of lampXs(len)) { const a = s > 0 ? 1.12 : Math.PI - 1.12, y = AXIS + Math.sin(a) * (R_TUN - 0.08), z = Math.cos(a) * (R_TUN - 0.08); k.sphere(TM.glow(), 0.03, [x, y - 0.04, z - s * 0.01], [1, 1, 1], { ink: false, cast: false }); }
  return k; });

/** concrete invert (floor) between the lining and the sleepers + a shallow drain channel on the centre line */
const invertKit = (len: number, key: string) => once(`mrInvert${key}`, () => { const k = new Kit(), hw = Math.sqrt(R_TUN ** 2 - (AXIS - FLOOR) ** 2);
  k.box(TM.concrete(), [len, 0.06, 2 * hw + 0.04], [len / 2, FLOOR - 0.03 - 0.02, 0], [0, 0, 0], { ink: false, cast: false });
  for (const s of [1, -1]) k.box(TM.concrete(), [len, 0.03, 0.18], [len / 2, FLOOR - 0.015, s * (hw - 0.09)], [0, 0, 0], { ink: false, cast: false });
  return k; });

/** a straight run of running tunnel from local x = 0 to len (place the group at the tunnel's start) */
export const RunningTunnel: React.FC<{ len: number; id: string; crossover?: number }> = ({ len, id, crossover }) => {
  const kits = useMemo(() => {
    const rings = once(`mrRings${id}`, () => { const k = new Kit(), r = rng(len * 7 + 3); let x = 0, i = 0; while (x < len) { const s = 0.82 + r() * 0.36; k.merge(ringKit(i % 2 === 1), [x, 0, 0], [0, 0, 0], [s, 1, 1]); x += RING * s; i++; } return k; });   // aperiodic ring spacing: no wagon-wheel aliasing when the camera tracks
    return [rings, trackKit(len, TRACK_Z[0], `${id}a`), trackKit(len, TRACK_Z[1], `${id}b`), wallKit(len, id), bulbKit(len, id), invertKit(len, id)]; }, [len, id]);
  return <>{kits.map((k, i) => <MKit key={i} kit={k} />)}{crossover !== undefined && <Crossover x={crossover} />}</>;
};

/** crossover between the two tracks: diagonal rails with switch blades, check rails and a point-motor box.
 *  Pure set dressing (the trains in the film stay on their own track), sized on the same 2 ft gauge. */
const Crossover: React.FC<{ x: number }> = ({ x }) => { const k = useMemo(() => once(`mrX${x}`, () => { const k = new Kit(), L = 4.2, dz = TRACK_Z[1] - TRACK_Z[0], ang = Math.atan2(dz, L);
  for (const s of [1, -1]) { const cx = x + L / 2, cz = s * RAIL_Z, len = Math.hypot(L, dz) - 0.3;
    k.box(TM.railTop(), [len, 0.012, 0.04], [cx, -0.007, cz], [0, -ang, 0], { ink: false }); k.box(TM.rail(), [len, 0.05, 0.016], [cx, -0.035, cz], [0, -ang, 0], { ink: false }); }
  for (const [px, pz] of [[x + 0.3, TRACK_Z[0]], [x + L - 0.3, TRACK_Z[1]]]) { const sd = pz < 0 ? -1 : 1; k.box(TM.lampBody(), [0.4, 0.14, 0.16], [px, 0.02, pz + sd * 0.5]); k.rod(TM.rail(), [px, -0.01, pz + sd * 0.42], [px, -0.01, pz + sd * 0.33], 0.012, 6, { ink: false }); }
  return k; }), [x]);
  return <MKit kit={k} />; };

/** fixed pool of point lights for the lamps (no shadow). Lamp i always drives light (i % N); its intensity fades in with
 *  distance from the camera (fully off at the edge of the window), and a window narrower than N spacings means no light
 *  ever jumps between lamps while lit -> no popping, no flicker. */
export const LampLights: React.FC<{ x0: number; len: number; camX: number; N?: number; i?: number; color?: string; y0?: number }> = ({ x0, len, camX, N = 5, i: I = 2.6, color = "#ffd8a0", y0 = 0 }) => {
  const lamps = lampXs(len), win = (N * LAMP_DX) / 2 - 1.2;
  const slots = Array.from({ length: N }, (_, j) => { const cand = lamps.map((l, k) => ({ ...l, k })).filter((l) => l.k % N === j).map((l) => ({ ...l, d: Math.abs(x0 + l.x - camX) })).sort((a, b) => a.d - b.d)[0];
    if (!cand) return null; const w = Math.max(0, Math.min(1, (win - cand.d) / 3.5)); const a = cand.s > 0 ? 1.12 : Math.PI - 1.12;
    return { p: [x0 + cand.x, y0 + AXIS + Math.sin(a) * (R_TUN - 0.2), Math.cos(a) * (R_TUN - 0.25)] as V3, w: w * w * (3 - 2 * w) }; });
  return <>{slots.map((s, j) => <pointLight key={j} position={s?.p ?? [0, -999, 0]} intensity={(s?.w ?? 0) * I} distance={9} decay={1.6} color={color} />)}</>;
};
/** just the two tracks on their invert (studio views / station approaches) */
export const TrackOnly: React.FC<{ len: number; id: string }> = ({ len, id }) => { const kits = useMemo(() => [trackKit(len, TRACK_Z[0], `${id}a`), trackKit(len, TRACK_Z[1], `${id}b`)], [len, id]);
  return <>{kits.map((k, i) => <MKit key={i} kit={k} />)}</>; };
