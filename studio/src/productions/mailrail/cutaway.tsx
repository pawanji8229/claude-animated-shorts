// Mail Rail section view. The world is a permanent architectural SECTION along the plane z = ZC (the near kerb line):
// nothing above ground exists in front of it, and the ground is a solid slab whose cut face shows the road build-up,
// London clay strata, service pipes and the railway inside it (the tunnel and stations are cut open like a museum
// model). Nothing ever dissolves or vanishes: the camera simply moves past the edge of the section.
// Underground set materials are clipped at ZC only while the section is "on". It is switched off for interior shots, at
// moments when the camera is inside the tunnel/station facing away from the plane, so the restored half is behind it.
import React, { useLayoutEffect, useMemo, useContext, createContext } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { InkHull, type InkFade } from "../../lib/Ink";
import { InkCtx } from "../../inventor/Workshop";
import { Kit, once } from "../short3/kit";
import { pm } from "./pbr";

export const ZC = 6.0;                      // section plane (world z); kept world: z <= ZC
export const RT = -6.5;                     // rail-top level of the railway (world y)
export const SECTION = new THREE.Plane(new THREE.Vector3(0, 0, -1), ZC);
const SEC = { uZC: { value: ZC } };
/** call during render (before the canvas draws): section on/off for this layer/frame */
export const setSection = (on: boolean) => { SECTION.constant = on ? ZC : 1e5; SEC.uZC.value = on ? ZC : 1e5; };
export const EnableClipping: React.FC = () => { const gl = useThree((s) => s.gl); useLayoutEffect(() => { gl.localClippingEnabled = true; }, [gl]); return null; };

const CACHE = new Map<string, THREE.Material>();
/** a clipped clone of a material (shared per source) */
export const secMat = (m: THREE.Material) => { let c = CACHE.get(m.uuid); if (!c) { c = m.clone(); c.clippingPlanes = [SECTION]; c.clipShadows = true; CACHE.set(m.uuid, c); } return c; };
const FADE: InkFade = { uniforms: SEC as unknown as Record<string, THREE.IUniform>, decl: "uniform float uZC;", alpha: "vW.z <= uZC ? 1.0 : 0.0" };
/** context: meshes under it are part of the cut world (clipped at the section plane) */
export const SecCtx = createContext(false);
/** KitMesh that respects the section (materials clipped, ink hulls discarded beyond the plane) */
export const MKit: React.FC<{ kit: Kit; inkScale?: number }> = ({ kit, inkScale = 1 }) => {
  const sec = useContext(SecCtx), px = useContext(InkCtx);
  const parts = useMemo(() => kit.build().map((p) => ({ ...p, mat: sec ? secMat(p.mat) : p.mat })), [kit, sec]);
  return <>{parts.map((p, i) => <mesh key={i} geometry={p.geo} material={p.mat} castShadow={p.opt.cast ?? true} receiveShadow={p.opt.receive ?? true}>
    {p.opt.ink !== false && <InkHull px={px * (p.opt.ink ?? 0.7) * inkScale} fade={sec ? FADE : undefined} />}
  </mesh>)}</>;
};

// ------------------------------------------------------------------ the cut face of the ground
/** soil strata (made ground, gravel, London clay with claystone bands), in world metres: u = x / 12, v = (y + 22) / 22 */
const strataTex = () => once("mrStrata", () => { const c = document.createElement("canvas"); c.width = 1024; c.height = 2048; const g = c.getContext("2d")!;
  const H = 2048, yPx = (y: number) => ((-y) / 22) * H;                    // y in metres below ground (0..-22) -> px from top
  const band = (y0: number, y1: number, col: string) => { g.fillStyle = col; g.fillRect(0, yPx(y0), 1024, yPx(y1) - yPx(y0)); };
  band(0, -1.2, "#6a5644"); band(-1.2, -1.6, "#7a6650"); band(-1.6, -4.2, "#9a8a6a"); band(-4.2, -22, "#6e6252");
  for (let i = 0; i < 26000; i++) { const x = Math.random() * 1024, y = Math.random() * H, d = y / H * 22; const gravel = d > 1.6 && d < 4.2; const r = gravel ? 0.8 + Math.random() * 2.6 : 0.5 + Math.random() * 1.3;
    g.fillStyle = gravel ? `rgba(${170 + Math.random() * 60},${150 + Math.random() * 50},${110 + Math.random() * 40},0.75)` : `rgba(${Math.random() < 0.5 ? "40,32,24" : "150,135,110"},${0.12 + Math.random() * 0.2})`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.4), Math.random() * 3, 0, 7); g.fill(); }
  for (const d of [6.5, 9.8, 13.6, 17.2]) { g.fillStyle = "rgba(120,104,84,0.6)"; for (let x = 0; x < 1024; x += 2) g.fillRect(x, yPx(-d) + Math.sin(x * 0.015 + d) * 8, 2, 9); }   // claystone bands
  for (let i = 0; i < 26; i++) { g.strokeStyle = "rgba(50,38,26,0.35)"; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * 1024, y = 0; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += 8 + Math.random() * 14; g.lineTo(x, y); } g.stroke(); }  // roots
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  t.repeat.set(1 / 12, 1 / 22); return t; });
export type Hole = { kind: "strip"; x0: number; x1: number; y0: number; y1: number } | { kind: "circle"; x: number; y: number; r: number };
const holePath = (h: Hole): [number, number][] => h.kind === "strip" ? [[h.x0, h.y0], [h.x0, h.y1], [h.x1, h.y1], [h.x1, h.y0]] : Array.from({ length: 28 }, (_, i) => [h.x + Math.cos(-i / 28 * Math.PI * 2) * h.r, h.y + Math.sin(-i / 28 * Math.PI * 2) * h.r] as [number, number]);
/** the cut face: a 0.6 m slab whose front sits 2 mm behind the plane (never clipped, never coplanar with the clip) */
export const earthFaceKit = (x0: number, x1: number, yTop: number, yBot: number, holes: Hole[]) => once(`mrEarth${x0}_${x1}_${holes.length}`, () => { const k = new Kit();
  const mat = new THREE.MeshStandardMaterial({ map: strataTex(), roughness: 0.95, color: "#d8d0c4" });
  const sh = new THREE.Shape([new THREE.Vector2(x0, yBot), new THREE.Vector2(x1, yBot), new THREE.Vector2(x1, yTop), new THREE.Vector2(x0, yTop)]);
  for (const h of holes) sh.holes.push(new THREE.Path(holePath(h).map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -0.6);
  { const uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i) + 22); }  // planar world UV
  k.add(mat, g, [0, 0, ZC - 0.002], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  // a thin dark border inside every hole (the cut lining / pipe wall seen end-on)
  const rim = pm("concrete", 1, { tint: "#5a5650" });
  for (const h of holes) if (h.kind === "circle") k.add(rim, new THREE.RingGeometry(h.r - 0.06, h.r, 28), [h.x, h.y, ZC - 0.001], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  return k; });
