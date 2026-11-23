// ORIGINAL HERO MODEL: driverless Post Office Railway mail train, after the 1930s English Electric 2 ft gauge stock
// (two cars, each a central container well between two motor/control housings; no cab, no seat, no driver).
// Train-local frame: x along the track (front = +x), y up with y = 0 on the RAIL TOP, z across (rails at z = ±0.305).
// Every part is sized in metres and checked against the rails: wheel tread sits exactly on the rail head, flanges run
// inside the rail heads with 8 mm clearance, wheel tops clear the deck by >= 2 cm, the body clears the 9 ft tunnel.
// Wheels turn by distance / radius (no slip); body float is a slow smooth function of distance (no jitter).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { pm } from "./pbr";
import { Bag } from "./mailbag";
import type { V3 } from "../../lib/math";

export const GAUGE = 0.61, RAIL_Z = GAUGE / 2, WHEEL_R = 0.165;
export const CAR_L = 4.6, CAR_GAP = 0.36, TRAIN_L = CAR_L * 2 + CAR_GAP;
export const CAR_X = [CAR_L / 2 + CAR_GAP / 2, -(CAR_L / 2 + CAR_GAP / 2)];          // car centres (front car first)
const DECK = 0.38, BOGIE_X = 1.78, AXLE_DX = 0.42;
export const BOX = { w: 1.22, d: 0.66, h: 0.64, x: [0.64, -0.64] };                 // containers in each car well
/** container centres (top-of-container y) in train-local coords, order: front car front, front car rear, rear car front, rear car rear */
export const CONTAINERS: V3[] = CAR_X.flatMap((cx) => BOX.x.map((bx) => [cx + bx, DECK + BOX.h, 0] as V3));

// ------------------------------------------------------------------ materials
const paint = (k: string, col: string, rough = 0.45, metal = 0.12) => once(`mrPaint_${k}`, () => new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal }));
const M = {
  red: () => paint("red", "#a8201b", 0.42), yellow: () => paint("yellow", "#d9a514", 0.45), black: () => paint("black", "#1d1c1b", 0.55, 0.3),
  chassis: () => once("mrChassis", () => pm("rust", 0.8, { tint: "#4a4846", metal: 0.5, normal: 0.6 })),
  steel: () => once("mrSteel", () => pm("rust", 0.5, { tint: "#8a8884", metal: 0.75, normal: 0.3 })),
  green: () => paint("green", "#56645a", 0.6, 0.15),
  tread: () => once("mrTread", () => new THREE.MeshStandardMaterial({ color: "#8c8882", metalness: 1, roughness: 0.34 })),
  rust: () => once("mrTrainRust", () => pm("rust", 0.6, { tint: "#8a7a6a", metal: 0.4 })),
  brass: () => once("mrTrainBrass", () => new THREE.MeshStandardMaterial({ color: "#c09040", metalness: 0.9, roughness: 0.32 })),
  rubber: () => once("mrRubber", () => new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.85 })),
  copper: () => once("mrCopper", () => new THREE.MeshStandardMaterial({ color: "#b06a3a", metalness: 0.9, roughness: 0.35 })),
  lens: () => once("mrLens", () => new THREE.MeshStandardMaterial({ color: "#fff4d8", emissive: "#ffe2a0", emissiveIntensity: 1.6, roughness: 0.2 })),
  lensOff: () => once("mrLensOff", () => new THREE.MeshStandardMaterial({ color: "#8a8478", roughness: 0.15, metalness: 0.2 })),
  tail: () => once("mrTail", () => new THREE.MeshStandardMaterial({ color: "#ff5a40", emissive: "#ff2a10", emissiveIntensity: 1.2, roughness: 0.3 })),
};
const canvasMat = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rough = 0.5) => once(key, () => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, roughness: rough, metalness: 0.1 }); });
/** side panel livery: red with gold lining + "POST OFFICE RAILWAY" (in-world lettering on the vehicle) */
const liveryMat = () => canvasMat("mrLivery", 1024, 192, (g) => { g.fillStyle = "#a8201b"; g.fillRect(0, 0, 1024, 192);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,220,200"},${0.015 + Math.random() * 0.03})`; g.fillRect(Math.random() * 1024, Math.random() * 192, 2 + Math.random() * 14, 1 + Math.random() * 3); }
  g.strokeStyle = "#e0b850"; g.lineWidth = 5; g.strokeRect(14, 14, 996, 164); g.lineWidth = 2; g.strokeRect(24, 24, 976, 144);
  g.fillStyle = "#f1dfb0"; g.font = "bold 66px Georgia, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("POST OFFICE RAILWAY", 512, 98);
  g.fillStyle = "rgba(40,10,5,0.25)"; g.fillRect(0, 170, 1024, 22); });
const numberMat = (n: string) => canvasMat(`mrNum${n}`, 256, 128, (g) => { g.fillStyle = "#1d1c1b"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#c09040"; g.lineWidth = 8; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = "#e8d8a8"; g.font = "bold 72px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, 128, 68); }, 0.4);
/** container side: grey-green painted steel with rivet rows and a stencil */
const boxMat = () => canvasMat("mrBoxSide", 512, 256, (g) => { g.fillStyle = "#56645a"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${Math.random() < 0.6 ? "20,25,20" : "200,210,190"},${0.02 + Math.random() * 0.04})`; g.fillRect(Math.random() * 512, Math.random() * 256, 3 + Math.random() * 20, 1 + Math.random() * 4); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(110,70,40,0.18)"; g.beginPath(); g.ellipse(Math.random() * 512, 200 + Math.random() * 56, 6 + Math.random() * 30, 3 + Math.random() * 10, 0, 0, 7); g.fill(); }
  for (const y of [14, 242]) for (let x = 14; x < 512; x += 22) { g.fillStyle = "rgba(255,255,240,0.25)"; g.beginPath(); g.arc(x, y - 1, 3.2, 0, 7); g.fill(); g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(x + 1, y + 1, 3.2, 0, 7); g.fill(); }
  g.fillStyle = "rgba(235,232,215,0.85)"; g.font = "bold 46px Arial, sans-serif"; g.textAlign = "center"; g.fillText("G.P.O.", 256, 118); g.font = "bold 26px Arial"; g.fillText("CONTAINER  No 2", 256, 158); }, 0.6);

// ------------------------------------------------------------------ wheelset (rotates as a unit)
const P2 = (pts: [number, number][]) => pts.map(([r, a]) => new THREE.Vector2(r, a));
/** one flanged wheel, axis along y, flange at -y (rotated so the flange faces the track centre) */
const WHEEL_PROF = P2([[0.001, -0.045], [0.05, -0.045], [0.056, -0.013], [0.134, -0.013], [0.14, -0.038], [0.178, -0.042], [0.19, -0.034], [0.186, -0.026], [0.167, -0.022], [0.14, -0.022]]);
const TREAD_PROF = P2([[0.140, -0.022], [0.167, -0.022], [0.160, 0.036], [0.140, 0.036]]);
const WHEEL_BACK = P2([[0.14, 0.036], [0.135, 0.012], [0.056, 0.012], [0.05, 0.045], [0.001, 0.045]]);
const wheelset = () => once("mrWheelset", () => { const k = new Kit(), side = [1, -1];
  for (const s of side) { const z = s * (RAIL_Z - 0.005), r: V3 = [s * Math.PI / 2, 0, 0];
    k.add(M.steel(), new THREE.LatheGeometry(WHEEL_PROF, 40), [0, 0, z], r, [1, 1, 1], { ink: 0.45 });
    k.add(M.tread(), new THREE.LatheGeometry(TREAD_PROF, 40), [0, 0, z], r, [1, 1, 1], { ink: false });
    k.add(M.steel(), new THREE.LatheGeometry(WHEEL_BACK, 40), [0, 0, z], r, [1, 1, 1], { ink: false });
    // four dark lightening holes + six hub nuts on the outer web: they make the spin readable
    // ONE balance weight (crescent) per wheel: a non-repeating mark, so the spin never strobes backwards on camera
    k.add(M.black(), new THREE.RingGeometry(0.07, 0.125, 16, 1, -0.7, 1.4), [0, 0, z + s * 0.0145], [0, s > 0 ? 0 : Math.PI, 0], [1, 1, 1], { ink: false });
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; k.cyl(M.brass(), 0.008, 0.008, 0.012, [Math.cos(a) * 0.036, Math.sin(a) * 0.036, z + s * 0.05], [Math.PI / 2, 0, 0], 6, { ink: false }); }
    k.cyl(M.yellow(), 0.012, 0.012, 0.003, [0.15, 0, z + s * 0.037], [Math.PI / 2, 0, 0], 10, { ink: false }); }
  k.cyl(M.steel(), 0.034, 0.034, 0.74, [0, 0, 0], [Math.PI / 2, 0, 0], 16, { ink: false });
  k.cyl(M.chassis(), 0.07, 0.07, 0.16, [0, 0, 0], [Math.PI / 2, 0, 0], 20, { ink: 0.3 });            // final-drive gear case on the axle
  return k; });

// ------------------------------------------------------------------ bogie frame (static, rides on the rails)
const bogie = () => once("mrBogie", () => { const k = new Kit(), C = M.chassis();
  for (const s of [1, -1]) { const z = s * 0.392;                                                      // outside frames, clear of the wheels
    k.box(C, [1.22, 0.1, 0.02], [0, 0.2, z]); k.box(C, [1.08, 0.022, 0.06], [0, 0.26, z - s * 0.02]); k.box(C, [1.08, 0.022, 0.06], [0, 0.14, z - s * 0.02]);
    for (const ax of [AXLE_DX, -AXLE_DX]) {
      k.box(M.black(), [0.12, 0.11, 0.05], [ax, WHEEL_R, z + s * 0.035]);                               // axle box
      k.cyl(M.steel(), 0.03, 0.03, 0.012, [ax, WHEEL_R, z + s * 0.066], [Math.PI / 2, 0, 0], 16, { ink: false });
      for (let l = 0; l < 4; l++) k.box(M.steel(), [0.32 - l * 0.06, 0.011, 0.045], [ax, 0.252 + l * 0.0118, z + s * 0.035], [0, 0, 0], { ink: l === 0 ? 0.25 : false });  // leaf spring
      k.box(C, [0.03, 0.06, 0.04], [ax - 0.17, 0.27, z + s * 0.035]); k.box(C, [0.03, 0.06, 0.04], [ax + 0.17, 0.27, z + s * 0.035]);
      // brake block hanging just behind each wheel tread (8 mm off the tread)
      k.box(M.rust(), [0.05, 0.11, 0.06], [ax - s * 0 - 0.206, 0.15, s * (RAIL_Z + 0.004)], [0, 0, 0.12], { ink: false }); }
    for (const ax of [0.58, -0.58]) k.box(C, [0.04, 0.12, 0.04], [ax, 0.2, z - s * 0.01]); }
  k.box(C, [0.16, 0.06, 0.78], [0, 0.29, 0]);                                                           // bolster
  k.cyl(M.steel(), 0.07, 0.07, 0.04, [0, 0.335, 0], [0, 0, 0], 20, { ink: false });                    // centre pivot
  // traction motor between the axles: barrel along z, end bells, cable box
  k.cyl(M.black(), 0.11, 0.11, 0.42, [0, 0.175, 0], [Math.PI / 2, 0, 0], 24, { ink: 0.4 });
  for (const s of [1, -1]) k.cyl(M.chassis(), 0.085, 0.1, 0.05, [0, 0.175, s * 0.235], [Math.PI / 2, 0, 0], 24, { ink: false });
  for (let i = -3; i <= 3; i++) k.box(M.chassis(), [0.012, 0.012, 0.42], [Math.sin(i * 0.45) * 0.112, 0.175 + Math.cos(i * 0.45) * 0.112, 0], [0, 0, -i * 0.45], { ink: false });
  k.box(M.chassis(), [0.08, 0.06, 0.12], [0, 0.31, 0.16]); k.rod(M.rubber(), [0.04, 0.3, 0.16], [0.2, 0.35, 0.2], 0.012, 8, { ink: false });
  // collector shoe gear on the centre conductor rail (shoe 6 mm above the conductor rail top)
  for (const s of [1, -1]) { k.rod(M.chassis(), [s * 0.2, 0.12, 0], [s * 0.36, 0.06, 0], 0.012, 8, { ink: false }); k.box(M.steel(), [0.22, 0.014, 0.07], [s * 0.42, CONDUCTOR_TOP + 0.013, 0], [0, 0, 0], { ink: 0.3 }); k.rod(M.copper(), [s * 0.2, 0.13, 0.03], [s * 0.4, 0.075, 0.03], 0.006, 6, { ink: false }); }
  return k; });
export const CONDUCTOR_TOP = 0.045;

// ------------------------------------------------------------------ one car body (container well between two housings)
const HOUSE = { x0: 1.3, x1: CAR_L / 2 - 0.05, w: 0.84 };
const housingProfile = (): [number, number][] => { const a = HOUSE.x0, b = HOUSE.x1, y0 = DECK, top = 1.08, nose = 0.86;
  const pts: [number, number][] = [[a, y0], [b, y0], [b, nose - 0.04]];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([b - 0.04 - 0.36 * t, nose + (top - nose) * Math.sin(t * Math.PI / 2)]); }  // rounded nose to roof
  pts.push([a + 0.04, top], [a, top - 0.04]); return pts; };
const carBody = (num: string) => once(`mrCar${num}`, () => { const k = new Kit(), R = M.red(), Y = M.yellow(), C = M.chassis(), B = M.black(), L = CAR_L;
  // main frame: deep steel channels + headstocks + deck plate
  for (const s of [1, -1]) { k.box(C, [L - 0.08, 0.06, 0.025], [0, DECK - 0.03, s * 0.44]); k.box(C, [L - 0.08, 0.016, 0.06], [0, DECK - 0.052, s * 0.42]);   // shallow channel: the bogies (top 0.30) pass beneath
    for (let x = -L / 2 + 0.25; x < L / 2 - 0.1; x += 0.3) k.cyl(M.steel(), 0.009, 0.009, 0.01, [x, DECK - 0.025, s * 0.4575], [Math.PI / 2, 0, 0], 6, { ink: false }); }
  for (const e of [1, -1]) { k.box(B, [0.06, 0.2, 0.92], [e * (L / 2 - 0.03), DECK - 0.07, 0]);
    k.box(Y, [0.012, 0.15, 0.6], [e * (L / 2 + 0.006), DECK - 0.07, 0], [0, 0, 0], { ink: false });                     // yellow buffer beam face
    for (const s of [1, -1]) { k.cyl(M.steel(), 0.035, 0.035, 0.12, [e * (L / 2 + 0.06), DECK - 0.07, s * 0.3], [0, 0, Math.PI / 2], 16, { ink: 0.3 }); k.cyl(B, 0.06, 0.06, 0.02, [e * (L / 2 + 0.125), DECK - 0.07, s * 0.3], [0, 0, Math.PI / 2], 20, { ink: 0.3 }); }
    k.box(M.steel(), [0.12, 0.05, 0.08], [e * (L / 2 + 0.06), DECK - 0.11, 0]); }
  k.box(C, [2 * HOUSE.x0 + 0.02, 0.025, 0.86], [0, DECK - 0.0125, 0]);                                                 // well floor
  for (let x = -1.2; x <= 1.2; x += 0.4) k.box(M.steel(), [0.04, 0.012, 0.84], [x, DECK + 0.006, 0], [0, 0, 0], { ink: false });  // container guide strips
  // motor/control housings at both ends (no cab, no seat, no window: nobody rides on it)
  for (const e of [1, -1]) { const r: V3 = [0, e > 0 ? 0 : Math.PI, 0];
    const g = new Kit(); g.ext(R, housingProfile(), HOUSE.w, [0, 0, 0], [0, 0, 0], 0.012, { ink: 0.6 });
    const nx = HOUSE.x1 + 0.013;                                                                    // nose face = x1 + 12 mm bevel
    g.box(Y, [0.012, 0.3, 0.7], [nx, DECK + 0.2, 0], [0, 0, 0], { ink: false });                                       // yellow warning panel on the nose
    for (let i = 0; i < 6; i++) g.box(B, [0.004, 0.012, 0.6], [nx + 0.007, DECK + 0.1 + i * 0.04, 0], [0, 0, 0], { ink: false });  // black chevron slats
    g.cyl(B, 0.075, 0.085, 0.07, [nx + 0.035, 0.72, 0], [0, 0, Math.PI / 2], 24, { ink: 0.4 });                      // headlamp housing
    g.cyl(M.steel(), 0.068, 0.068, 0.008, [nx + 0.068, 0.72, 0], [0, 0, Math.PI / 2], 24, { ink: false });
    g.box(B, [0.01, 0.07, 0.11], [nx + 0.005, 0.56, 0.28], [0, 0, 0], { ink: false }); g.plane(numberMat(num), 0.1, 0.06, [nx + 0.0105, 0.56, 0.28], [0, Math.PI / 2, 0], { uv01: true, cast: false });
    for (const s of [1, -1]) { g.rod(M.brass(), [nx + 0.02, 0.6, s * 0.36], [nx + 0.02, 0.84, s * 0.36], 0.009, 8, { ink: false }); g.box(M.steel(), [0.03, 0.01, 0.02], [nx + 0.01, 0.6, s * 0.36]); g.box(M.steel(), [0.03, 0.01, 0.02], [nx + 0.01, 0.84, s * 0.36]); }
    // side access doors (panel seams, louvres, handles), inset 1.5 cm from the body side
    for (const s of [1, -1]) { const zf = s * (HOUSE.w / 2 + 0.012 + 0.004);   // body side = w/2 + 12 mm bevel
      g.box(B, [0.006, 0.006, 0.004], [HOUSE.x0 + 0.08, 0.7, zf], [0, 0, 0], { ink: false });
      for (const [xa, xb] of [[HOUSE.x0 + 0.06, HOUSE.x0 + 0.44], [HOUSE.x0 + 0.48, HOUSE.x1 - 0.12]] as [number, number][]) { const xm = (xa + xb) / 2, w = xb - xa;
        g.box(B, [w, 0.008, 0.003], [xm, DECK + 0.07, zf]); g.box(B, [w, 0.008, 0.003], [xm, 0.94, zf]); g.box(B, [0.008, 0.87 - DECK - 0.0, 0.003], [xa, (DECK + 0.07 + 0.94) / 2, zf]); g.box(B, [0.008, 0.87 - DECK, 0.003], [xb, (DECK + 0.07 + 0.94) / 2, zf]);
        for (let l = 0; l < 5; l++) g.box(C, [w * 0.6, 0.012, 0.008], [xm, 0.78 + l * 0.028, zf + s * 0.002], [s * 0.5, 0, 0], { ink: false });
        g.box(M.brass(), [0.04, 0.014, 0.012], [xb - 0.06, 0.62, zf + s * 0.004], [0, 0, 0], { ink: false }); } }
    for (let i = 0; i < 3; i++) g.box(B, [0.2, 0.01, 0.6], [HOUSE.x0 + 0.18 + i * 0.25, 1.096, 0], [0, 0, 0], { ink: false });   // roof hatch seams
    g.box(M.steel(), [0.16, 0.05, 0.12], [HOUSE.x0 + 0.3, 1.105, 0.2]);                                                     // control resistor cover
    k.merge(g, [0, 0, 0], r); }
  // low side skirts along the well with the lettered livery panels (proud by 6 mm, no coplanar faces)
  for (const s of [1, -1]) { k.box(R, [2 * HOUSE.x0, 0.26, 0.022], [0, DECK + 0.13, s * 0.431]); k.box(B, [2 * HOUSE.x0, 0.02, 0.03], [0, DECK + 0.27, s * 0.431]);
    k.plane(liveryMat(), 2 * HOUSE.x0 - 0.2, 0.2, [0, DECK + 0.13, s * 0.4465], [0, s > 0 ? 0 : Math.PI, 0], { uv01: true, cast: false }); }
  return k; });

// ------------------------------------------------------------------ mail container with hinged lid
const container = () => once("mrBox", () => { const k = new Kit(), S = boxMat(), F = M.steel(), { w, d, h } = BOX;
  for (const s of [1, -1]) { k.box(M.green(), [w - 0.04, h - 0.04, 0.012], [0, h / 2, s * (d / 2 - 0.006)], [0, 0, 0], { ink: 0.45 }); k.box(M.green(), [0.012, h - 0.04, d - 0.04], [s * (w / 2 - 0.006), h / 2, 0], [0, 0, 0], { ink: 0.45 });
    k.plane(S, w - 0.08, h - 0.08, [0, h / 2, s * (d / 2 + 0.004)], [0, s > 0 ? 0 : Math.PI, 0], { uv01: true, cast: false }); }   // stencilled panel, 4 mm proud
  k.box(M.chassis(), [w - 0.02, 0.02, d - 0.02], [0, 0.01, 0]);
  for (const sx of [1, -1]) for (const sz of [1, -1]) k.box(F, [0.035, h, 0.035], [sx * (w / 2 - 0.0175), h / 2, sz * (d / 2 - 0.0175)], [0, 0, 0], { ink: 0.3 });  // corner posts
  for (const y of [0.02, h - 0.015]) for (const s of [1, -1]) { k.box(F, [w, 0.03, 0.02], [0, y, s * (d / 2 + 0.003)], [0, 0, 0], { ink: false }); k.box(F, [0.02, 0.03, d], [s * (w / 2 + 0.003), y, 0], [0, 0, 0], { ink: false }); }
  for (const s of [1, -1]) { k.rod(F, [s * (w / 2 + 0.03), h * 0.55, -0.15], [s * (w / 2 + 0.03), h * 0.55, 0.15], 0.01, 8, { ink: false }); k.box(F, [0.03, 0.02, 0.02], [s * (w / 2 + 0.015), h * 0.55, -0.15]); k.box(F, [0.03, 0.02, 0.02], [s * (w / 2 + 0.015), h * 0.55, 0.15]); }
  return k; });
const lid = () => once("mrLid", () => { const k = new Kit(), { w, d } = BOX;                                  // hinge line at local z = 0 (the -z edge)
  k.box(M.green(), [w + 0.02, 0.016, d + 0.02], [0, 0.008, (d + 0.02) / 2], [0, 0, 0], { ink: 0.45 });
  for (const x of [-0.4, 0, 0.4]) k.box(M.steel(), [0.03, 0.022, d], [x, 0.027, d / 2 + 0.01], [0, 0, 0], { ink: false });
  k.box(M.steel(), [0.12, 0.02, 0.03], [0, 0.01, d + 0.035]); k.rod(M.steel(), [-0.5, 0.008, -0.004], [0.5, 0.008, -0.004], 0.012, 10, { ink: false });
  return k; });
const BAG_SLOTS: V3[] = [[-0.38, 0, -0.15], [0, 0, -0.15], [0.38, 0, -0.15], [-0.38, 0, 0.15], [0, 0, 0.15], [0.38, 0, 0.15]];

export type TrainState = {
  x: number;            // distance of the train centre along its track (m); also drives wheel rotation
  lamp?: number;        // 0..1 headlamp brightness
  lids?: number[];      // 4 lid angles (0 closed .. 3.0 folded right over onto the far side, away from the platform)
  fill?: number[];      // 4 bag counts (0..6)
  sway?: number;        // 0..1 running motion (body float); 0 when standing
};
/** the whole 2-car train; parent group sets track origin / heading. Rail top = y 0 of the parent. */
export const MailTrain: React.FC<{ s: TrainState; pos?: V3; ry?: number }> = ({ s, pos = [0, 0, 0], ry = 0 }) => {
  const parts = useMemo(() => ({ ws: wheelset(), bg: bogie(), cars: [carBody("803"), carBody("804")], box: container(), lid: lid() }), []);
  const spin = -s.x / WHEEL_R, sw = s.sway ?? 0, lamp = s.lamp ?? 1;
  return <group position={pos} rotation={[0, ry, 0]}><group position={[s.x, 0, 0]}>
    {CAR_X.map((cx, ci) => { const ph = cx * 1.7;
      // body float on the springs: slow (period >= 2 m of travel), 2.5 mm max, smooth in distance -> no jitter
      const bob = sw * (0.0016 * Math.sin((s.x + ph) * 2.1) + 0.0009 * Math.sin((s.x + ph) * 5.3 + 1));
      const roll = sw * 0.0022 * Math.sin((s.x + ph) * 1.3 + 0.5), pitch = sw * 0.0009 * Math.sin((s.x + ph) * 1.7 + 2);
      return <group key={ci} position={[cx, 0, 0]}>
        {[BOGIE_X, -BOGIE_X].map((bx) => <group key={bx} position={[bx, 0, 0]}>
          <KitMesh kit={parts.bg} />
          {[AXLE_DX, -AXLE_DX].map((ax) => <group key={ax} position={[ax, WHEEL_R, 0]} rotation={[0, 0, spin]}><KitMesh kit={parts.ws} /></group>)}
        </group>)}
        <group position={[0, bob, 0]} rotation={[roll, 0, pitch]}>
          <KitMesh kit={parts.cars[ci]} />
          {BOX.x.map((bx, bi) => { const k = ci * 2 + bi, la = Math.min(3.0, Math.max(0, s.lids?.[k] ?? 0)), n = Math.round(s.fill?.[k] ?? 0);
            return <group key={bi} position={[bx, DECK + 0.012, 0]}>
              <KitMesh kit={parts.box} />
              {BAG_SLOTS.slice(0, n).map((p, i) => <Bag key={i} b={{ p: [p[0], 0.022, p[2]], ry: i * 1.9 + k, s: 0.68, v: (i + k) % 3, tilt: ((i * 37 + k * 11) % 7 - 3) * 0.02 }} />)}
              <group position={[0, BOX.h, BOX.d / 2 + 0.01]} rotation={[la, Math.PI, 0]}><KitMesh kit={parts.lid} /></group>
            </group>; })}
          {/* headlamp at the front (+x) end of the front car, red tail lamp at the rear end of the rear car */}
          {ci === 0 && <mesh position={[HOUSE.x1 + 0.089, 0.72, 0]} rotation={[0, 0, Math.PI / 2]} material={lamp > 0.05 ? M.lens() : M.lensOff()}><cylinderGeometry args={[0.062, 0.062, 0.006, 24]} /></mesh>}
          {ci === 1 && <mesh position={[-(HOUSE.x1 + 0.089), 0.72, 0]} rotation={[0, 0, Math.PI / 2]} material={lamp > 0.05 ? M.tail() : M.lensOff()}><cylinderGeometry args={[0.05, 0.05, 0.006, 24]} /></mesh>}
        </group>
      </group>; })}
    {/* coupling bar between the cars */}
    <mesh position={[0, DECK - 0.11, 0]} rotation={[0, 0, Math.PI / 2]} material={M.steel()}><cylinderGeometry args={[0.025, 0.025, CAR_GAP + 0.1, 12]} /></mesh>
  </group></group>;
};
/** world-space front lamp position (for a light that follows the train), given the train's x */
export const lampPos = (x: number): V3 => [x + CAR_X[0] + HOUSE.x1 + 0.12, 0.72, 0];
