// short3 telephone hardware (original designs in the late-1920s style):
//  DeskPhone   weighted oval base, rotary dial (finger wheel with 10 holes, finger stop, centre number card),
//              cradle neck with forked prongs, handset (earpiece + mouthpiece cups on a curved handle), cloth cord
//              from the base to the handset (live curve, follows the handset when lifted)
//  switchboard cord board: oak cabinet, sloped keyshelf with cord-pair plugs + talk/ring keys, upright jack panels
//              (jack rows + lamp rows), canopy; per-position lamps light on a call; plugged cords arc to the jacks
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "./kit";
import { archMats } from "./archKit";
import { V3 } from "../../lib/math";
import { Ink } from "../../inventor/Workshop";

const bake = (c: string, rough = 0.25, metal = 0.1) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: metal, clearcoat: 1, clearcoatRoughness: 0.08 });
export const PH = () => once("phoneMats", () => ({ bakelite: bake("#121214"), card: new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = "#8a2a22"; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); g.fillStyle = "#2a2a2a"; g.font = "bold 22px Georgia"; g.textAlign = "center"; g.fillText("MAIN", 64, 60); g.fillText("2-417", 64, 84); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.6 }),
  cord: new THREE.MeshStandardMaterial({ color: "#3a2a1e", roughness: 0.9 }), felt: new THREE.MeshStandardMaterial({ color: "#2a3a2a", roughness: 1 }) }));

/** base + dial + cradle (handset excluded). Local: base centre on the desk (y = 0), front (dial) toward +z. */
export const phoneBaseKit = () => once("phoneBase", () => {
  const k = new Kit(), B = PH().bakelite, M = archMats();
  k.lathe(B, [[0, 0], [0.105, 0], [0.11, 0.012], [0.1, 0.03], [0.075, 0.05], [0.0, 0.055]], [0, 0, 0], 32, [0, 0, 0], { ink: 0.5 });
  k.cyl(PH().felt, 0.1, 0.1, 0.004, [0, 0.002, 0], [0, 0, 0], 24, { ink: false });
  // sloped dial plate on the front
  const dial = new Kit(); dial.cyl(M.chrome, 0.048, 0.05, 0.006, [0, 0, 0], [Math.PI / 2, 0, 0], 32, { ink: 0.3 });
  dial.cyl(B, 0.044, 0.044, 0.006, [0, 0, 0.005], [Math.PI / 2, 0, 0], 32, { ink: false });
  for (let h = 0; h < 10; h++) { const a = -Math.PI * 0.35 + (h / 10) * Math.PI * 1.55; dial.cyl(PH().felt, 0.0085, 0.0085, 0.008, [Math.cos(a) * 0.032, Math.sin(a) * 0.032, 0.007], [Math.PI / 2, 0, 0], 12, { ink: false }); }
  dial.plane(PH().card, 0.034, 0.034, [0, 0, 0.0085], [0, 0, 0], { uv01: true }); dial.span(M.chrome, [0.034, -0.03, 0.004], [0.04, -0.012, 0.012], { ink: false });
  k.merge(dial, [0, 0.042, 0.072], [-0.62, 0, 0]);
  // neck + cradle prongs
  k.lathe(B, [[0, 0], [0.04, 0], [0.026, 0.03], [0.02, 0.1], [0.024, 0.12], [0, 0.125]], [0, 0.05, -0.02], 20);
  for (const s of [-1, 1]) { k.rod(B, [s * 0.02, 0.17, -0.02], [s * 0.085, 0.205, -0.02], 0.009, 8); k.rod(B, [s * 0.085, 0.205, -0.02], [s * 0.095, 0.225, -0.02], 0.009, 8); k.span(M.chrome, [s * 0.08 - 0.008, 0.2, -0.026], [s * 0.08 + 0.008, 0.212, -0.014], { ink: false }); }
  k.span(B, [-0.02, 0.165, -0.03], [0.02, 0.18, -0.01]);
  return k;
});
/** handset, centred, along x (earpiece at -x, mouthpiece at +x, cups opening toward -y) */
export const handsetKit = () => once("handset", () => {
  const k = new Kit(), B = PH().bakelite, pts: V3[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([-0.095 + 0.19 * t, 0.02 * Math.sin(t * Math.PI), 0]); }
  for (let i = 0; i < pts.length - 1; i++) k.rod(B, pts[i], pts[i + 1], 0.013, 10, { ink: 0.4 });
  k.lathe(B, [[0.0, 0.0], [0.018, 0.0], [0.04, -0.02], [0.042, -0.035], [0.034, -0.04], [0.0, -0.04]], [-0.1, 0.005, 0], 24, [0, 0, 0], { ink: 0.5 });
  k.lathe(B, [[0.0, 0.0], [0.016, 0.0], [0.032, -0.022], [0.033, -0.034], [0.026, -0.036], [0.0, -0.036]], [0.1, 0.005, 0], 24, [0, 0, 0], { ink: 0.5 });
  for (let h = 0; h < 6; h++) k.cyl(PH().felt, 0.003, 0.003, 0.004, [0.1 + Math.cos(h) * 0.012, -0.036, Math.sin(h) * 0.012], [0, 0, 0], 6, { ink: false });
  return k;
});
/** desk telephone with live handset + cord. `held` = world-space handset centre + rotation when lifted (else in the cradle). */
export const DeskPhone: React.FC<{ p: V3; ry?: number; ring?: number; f: number; held?: { p: V3; r: V3 } | null }> = ({ p, ry = 0, ring = 0, f, held }) => {
  const base = phoneBaseKit(), hs = handsetKit();
  const jig = ring > 0 ? Math.sin(f * 2.7) * 0.018 * ring : 0;          // the handset rattles in the cradle while the bell rings
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const rest: { p: V3; r: V3 } = { p: [p[0], p[1] + 0.228 + Math.abs(jig) * 0.6, p[2] - 0.02 * cs], r: [jig, ry, jig * 0.5] };
  const h = held ?? rest;
  // cord: from the back of the base to the mouthpiece end of the handset, sagging between
  const a = new THREE.Vector3(p[0] - 0.09 * sn, p[1] + 0.02, p[2] - 0.09 * cs), b = new THREE.Vector3(...h.p).add(new THREE.Vector3(0.1, -0.02, 0).applyEuler(new THREE.Euler(...h.r)));
  const mid = a.clone().lerp(b, 0.5); mid.y = Math.min(a.y, b.y) - 0.12 - a.distanceTo(b) * 0.25;
  const cord = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y - 0.05), mid, b.clone().lerp(mid, 0.4), b]), 24, 0.005, 6), [a.x, a.y, a.z, b.x, b.y, b.z]); // eslint-disable-line
  return (<group>
    <group position={p} rotation={[0, ry, 0]}><KitMesh kit={base} /></group>
    <group position={h.p} rotation={h.r}><KitMesh kit={hs} /></group>
    <mesh geometry={cord} material={PH().cord} castShadow><Ink k={0.25} /></mesh>
  </group>);
};

// ---------------------------------------------------------------- switchboard (local: front face plane x = 0, operators at +x, spans z 0..L)
const jackPanelTex = () => once("jackPanel", () => { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d")!;
  g.fillStyle = "#1a1714"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 18; row++) { const y = 18 + row * 27; if (row % 6 === 5) { g.fillStyle = "#6b4a2a"; g.fillRect(0, y - 6, 512, 10); continue; }
    for (let col = 0; col < 20; col++) { const x = 14 + col * 25; g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = "#0a0908"; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    if (row % 3 === 2) for (let col = 0; col < 20; col++) { g.fillStyle = ["#e9e2cf", "#c43a2a", "#d8b85a"][col % 3]; g.beginPath(); g.arc(14 + col * 25, y + 12, 3.5, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
export const POS_W = 1.0;
export const switchboardKit = (n: number) => once(`switchboard${n}`, () => {
  const k = new Kit(), M = archMats(), L = n * POS_W, oak = M.furn, panelM = new THREE.MeshStandardMaterial({ map: jackPanelTex(), roughness: 0.5, metalness: 0.2, emissive: new THREE.Color("#ffe0a0"), emissiveIntensity: 0.06, emissiveMap: jackPanelTex() });
  // lower cabinet + kick plate, sloped keyshelf, upright section, canopy
  k.span(oak, [-0.75, 0, 0], [0.0, 0.76, L]); k.span(M.timberDk, [-0.02, 0, 0], [0.02, 0.12, L]);
  for (let p = 0; p < n; p++) for (const y of [0.25, 0.55]) k.span(M.timberDk, [-0.01, y - 0.15, p * POS_W + 0.08], [0.015, y + 0.12, p * POS_W + POS_W - 0.08], { ink: 0.3 });
  k.ext(oak, [[-0.1, 0], [0.36, 0], [0.36, 0.03], [-0.1, 0.09]], L, [0, 0.76, L / 2]);
  k.span(oak, [-0.75, 0.76, 0], [-0.42, 2.12, L]); k.span(oak, [-0.8, 2.12, -0.04], [-0.3, 2.2, L + 0.04]); k.span(M.timberDk, [-0.82, 2.2, -0.05], [-0.36, 2.26, L + 0.05]);
  for (let p = 0; p <= n; p++) k.span(M.timberDk, [-0.43, 0.86, p * POS_W - 0.03], [-0.38, 2.12, p * POS_W + 0.03]);
  for (let p = 0; p < n; p++) k.plane(panelM, POS_W - 0.08, 1.16, [-0.418, 1.5, p * POS_W + POS_W / 2], [0, Math.PI / 2, 0], { uv01: true });
  // keyshelf hardware per position: cord-pair plugs (rear row), keys (front rows), cord holes
  for (let p = 0; p < n; p++) for (let j = 0; j < 8; j++) { const z = p * POS_W + 0.12 + j * 0.1;
    k.cyl(M.brass, 0.006, 0.006, 0.05, [-0.04, 0.83, z], [0, 0, 0], 6, { ink: false }); k.cyl(M.black, 0.014, 0.016, 0.06, [-0.04, 0.88, z], [0, 0, 0], 8, { ink: false });
    k.cyl(M.brass, 0.006, 0.006, 0.05, [0.04, 0.84, z], [0, 0, 0], 6, { ink: false }); k.cyl(M.black, 0.014, 0.016, 0.06, [0.04, 0.89, z], [0, 0, 0], 8, { ink: false });
    for (const kx of [0.15, 0.24]) { k.span(M.black, [kx - 0.012, 0.83, z - 0.008], [kx + 0.012, 0.87, z + 0.008], { ink: false }); k.sphere(M.cream, 0.008, [kx, 0.875, z], [1, 1, 1], { ink: false }); } }
  return k;
});
/** cord from the keyshelf (plug row) to a jack on the upright panel (both switchboard-local) */
export const PlugCord: React.FC<{ from: V3; to: V3 }> = ({ from, to }) => {
  const geo = useMemo(() => { const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to); const m = a.clone().lerp(b, 0.5); m.x += 0.12; m.y -= 0.05;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().setY(a.y + 0.06), m, b.clone().setX(b.x + 0.06), b]), 20, 0.007, 6); }, [from[0], from[1], from[2], to[0], to[1], to[2]]); // eslint-disable-line
  const M = archMats();
  return (<group><mesh geometry={geo} material={PH().cord} /><mesh position={[to[0] + 0.03, to[1], to[2]]} rotation={[0, 0, Math.PI / 2]} material={M.black}><cylinderGeometry args={[0.014, 0.016, 0.06, 8]} /></mesh></group>);
};
