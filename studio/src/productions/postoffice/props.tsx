// Story props: the waterproof plastic postcard (glossy print, raised EMBOSSED seal that presses in), an ordinary paper
// postcard that soaks (darkening wet front spreading in, corners sagging, ballpoint ink feathering and running — gradual,
// not instant), a ballpoint pen, the desk seal-EMBOSSER (cast frame, lever, ram, brass dies), the roll-top mail bag,
// the yellow "open" flag on its surface float tethered to the roof, the survey marker buoy, the work barge with its
// A-frame, and the Port Vila sorting room.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { paintTex } from "./assets";
import { signTex } from "./office";
import type { V3 } from "../../lib/math";

export const CARD = { w: 0.148, h: 0.105, t: 0.0018 };
// ---------------------------------------------------------------- printed art (original design)
const drawFront = (g: CanvasRenderingContext2D, W: number, H: number, r: () => number, title = true) => {
  const sky = g.createLinearGradient(0, 0, 0, H * 0.45); sky.addColorStop(0, "#5fb7ea"); sky.addColorStop(1, "#bfe6f5"); g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.45);
  const sea = g.createLinearGradient(0, H * 0.42, 0, H); sea.addColorStop(0, "#29b5c9"); sea.addColorStop(0.35, "#1a8fb2"); sea.addColorStop(1, "#0d5a86"); g.fillStyle = sea; g.fillRect(0, H * 0.42, W, H);
  g.fillStyle = "#f6d777"; g.beginPath(); g.arc(W * 0.82, H * 0.14, H * 0.07, 0, 7); g.fill();
  g.fillStyle = "#3f8f3a"; g.beginPath(); g.moveTo(W * 0.05, H * 0.43); g.quadraticCurveTo(W * 0.25, H * 0.25, W * 0.5, H * 0.43); g.closePath(); g.fill(); g.fillStyle = "#efe1b0"; g.fillRect(W * 0.06, H * 0.41, W * 0.43, H * 0.03);
  for (let k = 0; k < 4; k++) { const x = W * (0.12 + k * 0.1); g.strokeStyle = "#6b4a2a"; g.lineWidth = W * 0.008; g.beginPath(); g.moveTo(x, H * 0.42); g.quadraticCurveTo(x + W * 0.02, H * 0.33, x + W * 0.01, H * 0.26); g.stroke();
    for (let f = 0; f < 6; f++) { const a = f * 1.05; g.strokeStyle = "#2f7a2a"; g.lineWidth = W * 0.006; g.beginPath(); g.moveTo(x + W * 0.01, H * 0.26); g.quadraticCurveTo(x + W * 0.01 + Math.cos(a) * W * 0.03, H * 0.24, x + W * 0.01 + Math.cos(a) * W * 0.05, H * 0.27 + Math.abs(Math.sin(a)) * H * 0.02); g.stroke(); } }
  // the little office on the sand, coral, fish (in the print)
  g.fillStyle = "#efe9d2"; g.fillRect(W * 0.58, H * 0.68, W * 0.12, H * 0.16); g.fillStyle = "#3f6f9a"; g.beginPath(); g.moveTo(W * 0.55, H * 0.69); g.lineTo(W * 0.64, H * 0.6); g.lineTo(W * 0.73, H * 0.69); g.closePath(); g.fill(); g.fillStyle = "#1d3a4a"; g.fillRect(W * 0.61, H * 0.72, W * 0.06, H * 0.04);
  for (let i = 0; i < 22; i++) { const x = r() * W, y = H * (0.82 + r() * 0.16); g.fillStyle = ["#e86a8a", "#f2a23a", "#c9b24a", "#8a5ac8"][i % 4]; g.beginPath(); g.ellipse(x, y, W * 0.03 * (0.5 + r()), H * 0.04 * (0.5 + r()), 0, 0, 7); g.fill(); }
  for (let i = 0; i < 9; i++) { const x = W * (0.1 + r() * 0.8), y = H * (0.5 + r() * 0.25); g.fillStyle = i % 2 ? "#f2d23a" : "#f27a3a"; g.beginPath(); g.ellipse(x, y, W * 0.02, H * 0.016, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - W * 0.02, y); g.lineTo(x - W * 0.032, y - H * 0.015); g.lineTo(x - W * 0.032, y + H * 0.015); g.fill(); }
  if (title) { g.fillStyle = "rgba(255,255,255,0.92)"; g.font = `bold ${Math.round(H * 0.075)}px "DejaVu Sans", Arial`; g.textAlign = "left"; g.fillText("Greetings from", W * 0.05, H * 0.1); g.font = `bold ${Math.round(H * 0.11)}px "DejaVu Sans", Arial`; g.fillText("HIDEAWAY ISLAND", W * 0.05, H * 0.21); }
};
const drawBack = (g: CanvasRenderingContext2D, W: number, H: number, ink: boolean, foot = "WATERPROOF POSTCARD · VANUATU") => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, W, H); g.strokeStyle = "#9aa8b4"; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.52, H * 0.08); g.lineTo(W * 0.52, H * 0.92); g.stroke();
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(W * 0.57, H * (0.5 + k * 0.11)); g.lineTo(W * 0.95, H * (0.5 + k * 0.11)); g.stroke(); }
  g.strokeStyle = "#c8452e"; g.setLineDash([6, 4]); g.strokeRect(W * 0.76, H * 0.07, W * 0.19, H * 0.27); g.setLineDash([]);
  g.fillStyle = "#6a7a88"; g.font = `${Math.round(H * 0.045)}px "DejaVu Sans", Arial`; g.textAlign = "left"; g.fillText(foot, W * 0.05, H * 0.95);
  if (ink) { g.fillStyle = "#1c2a7a"; g.font = `italic ${Math.round(H * 0.075)}px "DejaVu Serif", Georgia, serif`; ["Dear Mum,", "I'm writing this", "3 metres under", "the sea! x"].forEach((l, i) => g.fillText(l, W * 0.06, H * (0.24 + i * 0.12)));
    ["Mrs J. Kale", "14 Harbour Rd", "Auckland, NZ"].forEach((l, i) => g.fillText(l, W * 0.58, H * (0.47 + i * 0.11))); }
};
/** embossed seal: height map (canvas) -> normal map */
const sealHeight = (W: number) => { const c = document.createElement("canvas"); c.width = W; c.height = W; const g = c.getContext("2d")!; g.fillStyle = "#000"; g.fillRect(0, 0, W, W);
  const C = W / 2; g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = W * 0.022; g.beginPath(); g.arc(C, C, W * 0.46, 0, 7); g.stroke(); g.lineWidth = W * 0.012; g.beginPath(); g.arc(C, C, W * 0.31, 0, 7); g.stroke();
  const txt = "UNDERWATER POST OFFICE · VANUATU · "; g.font = `bold ${Math.round(W * 0.075)}px "DejaVu Sans", Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < txt.length; i++) { const a = -Math.PI / 2 + (i / txt.length) * Math.PI * 2; g.save(); g.translate(C + Math.cos(a) * W * 0.385, C + Math.sin(a) * W * 0.385); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore(); }
  g.lineWidth = W * 0.02; for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = -0.22; x <= 0.22; x += 0.01) { const y = 0.06 * k - 0.06 + Math.sin(x * 28) * 0.025; if (x === -0.22) g.moveTo(C + x * W, C + y * W); else g.lineTo(C + x * W, C + y * W); } g.stroke(); }
  g.font = `bold ${Math.round(W * 0.09)}px "DejaVu Sans", Arial`; g.fillText("2003", C, C + W * 0.19); g.filter = "blur(2px)"; g.drawImage(c, 0, 0); return c; };
const normalFrom = (src: HTMLCanvasElement, k = 3) => { const W = src.width, H = src.height, d = src.getContext("2d")!.getImageData(0, 0, W, H).data, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!, out = g.createImageData(W, H);
  const h = (x: number, y: number) => d[((Math.min(H - 1, Math.max(0, y))) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (h(x + 1, y) - h(x - 1, y)) * k, dy = (h(x, y + 1) - h(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4; out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255; }
  g.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); return t; };

// ---------------------------------------------------------------- waterproof postcard (emboss 0..1)
const cardRes = () => once("poCardRes", () => {
  const front = paintTex(1024, 726, (g, r) => drawFront(g, 1024, 726, r), 81, true, false);
  const backC = document.createElement("canvas"); backC.width = 1024; backC.height = 726; drawBack(backC.getContext("2d")!, 1024, 726, true);
  const back = new THREE.CanvasTexture(backC); back.colorSpace = THREE.SRGBColorSpace; back.anisotropy = 8;
  const seal = sealHeight(512), sealN = normalFrom(seal, 4), sealA = new THREE.CanvasTexture(seal);
  const frontM = new THREE.MeshPhysicalMaterial({ map: front, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.2 });
  const edge = new THREE.MeshStandardMaterial({ color: "#f4f4ee", roughness: 0.3 });
  const U = { uEmb: { value: 0 }, uSealN: { value: sealN }, uSealA: { value: sealA } };
  const backM = new THREE.MeshPhysicalMaterial({ map: back, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.1 });
  backM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uEmb; uniform sampler2D uSealN, uSealA;\nvec2 sealUV(vec2 uv){ return (uv - vec2(0.855, 0.79)) / vec2(0.2, 0.282) + 0.5; }")
      .replace("#include <map_fragment>", `#include <map_fragment>
{ vec2 su = sealUV(vMapUv); if (su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0) { float a = texture2D(uSealA, su).r * uEmb; diffuseColor.rgb *= 1.0 - a * 0.06; } }`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec2 su = sealUV(vMapUv); if (su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0) { vec3 sn = texture2D(uSealN, su).xyz * 2.0 - 1.0; sn.xy *= uEmb * 1.6; normal = normalize(normal + (normalMatrix * vec3(sn.xy, 0.0)) * 1.0); } }`);
  }; backM.customProgramCacheKey = () => "poCardBack";
  return { frontM, backM, edge, U };
});
/** a waterproof postcard: local origin at the card centre, front face +z, size CARD; `emb` raises the embossed seal on the back */
export const Postcard: React.FC<{ p: V3; r: V3; emb?: number; s?: number }> = ({ p, r, emb = 0, s = 1 }) => {
  const R = cardRes(); R.U.uEmb.value = emb;
  return (<group position={p} rotation={new THREE.Euler(r[0], r[1], r[2], "YXZ")} scale={s}>
    <mesh material={R.edge}><boxGeometry args={[CARD.w, CARD.h, CARD.t]} /></mesh>
    <mesh position={[0, 0, CARD.t / 2 + 0.0002]} material={R.frontM}><planeGeometry args={[CARD.w - 0.001, CARD.h - 0.001]} /></mesh>
    <mesh position={[0, 0, -CARD.t / 2 - 0.0002]} rotation={[0, Math.PI, 0]} material={R.backM}><planeGeometry args={[CARD.w - 0.001, CARD.h - 0.001]} /></mesh>
  </group>);
};
/** a stack / fan of postcards for the kiosk counter (front up) */
export const CardFan: React.FC<{ p: V3; ry: number; n?: number; spread?: number }> = ({ p, ry, n = 7, spread = 0.9 }) => <group position={p} rotation={[0, ry, 0]}>
  {Array.from({ length: n }, (_, i) => { const a = (i - (n - 1) / 2) / n * spread; return <Postcard key={i} p={[Math.sin(a) * 0.08, 0.002 + i * 0.0021, -Math.cos(a) * 0.08 + 0.08]} r={[-Math.PI / 2, a, 0]} />; })}
</group>;

// ---------------------------------------------------------------- the paper postcard that soaks (wet 0..1)
const paperRes = () => once("poPaperRes", () => {
  const W = 1024, H = 726; const base = document.createElement("canvas"); base.width = W; base.height = H; drawBack(base.getContext("2d")!, W, H, false, "POST CARD");
  const inkC = document.createElement("canvas"); inkC.width = W; inkC.height = H; const ig = inkC.getContext("2d")!; ig.fillStyle = "#1c2a7a"; ig.font = `italic ${Math.round(H * 0.075)}px "DejaVu Serif", Georgia, serif`; ig.textAlign = "left"; ["Dear Mum,", "Guess where I", "am writing this…"].forEach((l, i) => ig.fillText(l, W * 0.06, H * (0.24 + i * 0.12))); ig.fillText("Mrs J. Kale", W * 0.58, H * 0.47);
  const blurC = document.createElement("canvas"); blurC.width = W; blurC.height = H; const bg = blurC.getContext("2d")!; bg.filter = "blur(9px)"; bg.drawImage(inkC, 0, 0); bg.filter = "blur(3px)"; bg.globalAlpha = 0.7; bg.drawImage(inkC, 6, 10);
  const tx = (c: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const U = { uWet: { value: 0 }, uInk: { value: tx(inkC) }, uBlur: { value: tx(blurC) } };
  const m = new THREE.MeshStandardMaterial({ map: tx(base), roughness: 0.92, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWet;").replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec2 q = uv - vec2(0.0, 1.0); float d = length(q * vec2(1.0, 0.7)); // held by the top-left corner: everything else sags + edges curl as it soaks
  transformed.z -= uWet * 0.03 * d * d * 1.6 + uWet * 0.006 * sin(uv.x * 9.0 + uv.y * 4.0); transformed.y -= uWet * 0.012 * d * d; }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform float uWet; uniform sampler2D uInk, uBlur;
float pph(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ppn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(pph(i), pph(i + vec2(1, 0)), f.x), mix(pph(i + vec2(0, 1)), pph(i + vec2(1, 1)), f.x), f.y); }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
{ vec2 uv = vMapUv; float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float front = smoothstep(uWet * 0.62 - 0.05, uWet * 0.62 + 0.05, 0.5 - edge + (ppn(uv * 9.0) - 0.5) * 0.12) ; // wet from the edges inward
  front = max(front, step(0.98, uWet));
  vec3 paper = diffuseColor.rgb * mix(vec3(1.0), vec3(0.72, 0.74, 0.7), front) ;
  vec4 ink = texture2D(uInk, uv), bl = texture2D(uBlur, uv);
  float run = clamp(front * (uWet * 1.3 - 0.15), 0.0, 1.0);
  vec4 I = mix(ink, bl * vec4(1.0, 1.0, 1.0, 1.25), run);
  paper = mix(paper, mix(I.rgb, vec3(0.32, 0.38, 0.62), run * 0.5), clamp(I.a * (1.0 - run * 0.35), 0.0, 1.0));
  // tide line where the wet front stops
  float tl = smoothstep(0.03, 0.0, abs(0.5 - edge - (uWet * 0.62)) ) * (1.0 - step(0.98, uWet)) * step(0.02, uWet);
  diffuseColor.rgb = mix(paper, paper * 0.82, tl * 0.6); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.92, 0.55, uWet);");
  }; m.customProgramCacheKey = () => "poPaper";
  return { m, U };
});
export const PaperCard: React.FC<{ p: V3; r: V3; wet: number; s?: number }> = ({ p, r, wet, s = 1 }) => { const R = paperRes(); R.U.uWet.value = wet;
  return <mesh position={p} rotation={new THREE.Euler(r[0], r[1], r[2], "YXZ")} scale={s} material={R.m}><planeGeometry args={[CARD.w, CARD.h, 24, 16]} /></mesh>; };
export const Pen: React.FC<{ p: V3; r: V3; s?: number }> = ({ p, r, s = 1 }) => <group position={p} rotation={new THREE.Euler(r[0], r[1], r[2], "YXZ")} scale={s}>
  <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.0045, 0.0045, 0.13, 12]} /><meshStandardMaterial color="#1f3a8a" roughness={0.35} /></mesh>
  <mesh position={[0.07, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.0045, 0.014, 12]} /><meshStandardMaterial color="#c9ced4" metalness={0.6} roughness={0.3} /></mesh>
  <mesh position={[-0.05, 0.006, 0]} ><boxGeometry args={[0.04, 0.002, 0.003]} /><meshStandardMaterial color="#c9ced4" metalness={0.6} roughness={0.3} /></mesh>
</group>;

// ---------------------------------------------------------------- the seal embosser (lever 0 = raised, 1 = pressed)
const embMats = () => once("poEmbMats", () => ({
  cast: new THREE.MeshPhysicalMaterial({ color: "#23402f", roughness: 0.35, metalness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
  brass: new THREE.MeshStandardMaterial({ color: "#c9a24a", roughness: 0.3, metalness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: "#b8bec6", roughness: 0.25, metalness: 0.9 }),
  rubber: new THREE.MeshStandardMaterial({ color: "#16161a", roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: "#e0bf5a", roughness: 0.35, metalness: 0.8 }),
}));
const embBody = () => once("poEmbBody", () => { const m = embMats(), K = new Kit();
  K.box(m.cast, [0.16, 0.022, 0.11], [0, 0.011, 0]); K.box(m.rubber, [0.15, 0.004, 0.1], [0, -0.002, 0], [0, 0, 0], { ink: false });
  // C-frame: rear column + top arm (cast, rounded with cylinders)
  K.box(m.cast, [0.032, 0.11, 0.05], [-0.058, 0.075, 0]); K.cyl(m.cast, 0.026, 0.026, 0.05, [-0.058, 0.13, 0], [Math.PI / 2, 0, 0], 20);
  K.box(m.cast, [0.1, 0.03, 0.044], [-0.012, 0.135, 0]); K.cyl(m.cast, 0.022, 0.022, 0.044, [0.038, 0.135, 0], [Math.PI / 2, 0, 0], 20);
  // gold pin-striping
  for (const z of [-0.0255, 0.0255]) K.box(m.gold, [0.09, 0.003, 0.0012], [-0.012, 0.135, z], [0, 0, 0], { ink: false });
  // the bottom (counter) die on the base, brass, with the seal face
  K.cyl(m.brass, 0.026, 0.026, 0.008, [0.035, 0.026, 0], [0, 0, 0], 32);
  // guide bush for the ram
  K.cyl(m.steel, 0.012, 0.012, 0.03, [0.035, 0.13, 0], [0, 0, 0], 20);
  return K; });
export const EMB = { dieX: 0.035, dieY: 0.031, pivot: [-0.058, 0.13] as [number, number] };
export const Embosser: React.FC<{ p: V3; ry: number; press: number; s?: number }> = ({ p, ry, press, s = 1 }) => {
  const m = embMats(); const a = 0.55 * (1 - press) + 0.02, ramDrop = 0.016 * press;   // lever angle (rad, up from horizontal) and ram travel
  return (<group position={p} rotation={[0, ry, 0]} scale={s}>
    <KitMesh kit={embBody()} />
    {/* ram + upper die (moves down as the lever is pressed) */}
    <group position={[EMB.dieX, 0.105 - ramDrop, 0]}>
      <mesh material={m.steel}><cylinderGeometry args={[0.009, 0.009, 0.06, 20]} /></mesh>
      <mesh position={[0, -0.034, 0]} material={m.brass}><cylinderGeometry args={[0.026, 0.026, 0.009, 32]} /></mesh>
    </group>
    {/* lever: pivots at the back of the arm, long handle forward with a ball knob */}
    <group position={[EMB.pivot[0], 0.155, 0]} rotation={[0, 0, a]}>
      <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.cast}><cylinderGeometry args={[0.009, 0.012, 0.22, 16]} /></mesh>
      <mesh position={[0.225, 0, 0]} material={m.rubber}><sphereGeometry args={[0.019, 20, 14]} /></mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.008, 0.008, 0.058, 16]} /></mesh>
    </group>
  </group>);
};
/** the closed ink stamp + pad that STAYS in its dry box (shown, pushed aside, never used underwater) */
export const InkBox: React.FC<{ p: V3; ry: number; open?: number }> = ({ p, ry, open = 0 }) => <group position={p} rotation={[0, ry, 0]}>
  <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.16, 0.06, 0.11]} /><meshStandardMaterial color="#e8e6de" roughness={0.3} transparent opacity={0.55} /></mesh>
  <mesh position={[0, 0.062 + open * 0.02, -open * 0.05]} rotation={[-open * 1.2, 0, 0]}><boxGeometry args={[0.165, 0.008, 0.115]} /><meshStandardMaterial color="#d8d6ce" roughness={0.3} transparent opacity={0.6} /></mesh>
  <mesh position={[-0.035, 0.012, 0]}><boxGeometry args={[0.06, 0.014, 0.08]} /><meshStandardMaterial color="#2a2a3a" roughness={0.5} /></mesh>
  <group position={[0.04, 0.012, 0]}><mesh position={[0, 0.006, 0]}><boxGeometry args={[0.05, 0.012, 0.035]} /><meshStandardMaterial color="#5a3a24" roughness={0.6} /></mesh><mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.009, 0.012, 0.035, 12]} /><meshStandardMaterial color="#7a5a3a" roughness={0.5} /></mesh></group>
</group>;

// ---------------------------------------------------------------- mail bag (3D, roll-top dry bag)
export const MailBag3D: React.FC<{ p: V3; r: V3; fill?: number }> = ({ p, r, fill = 1 }) => <group position={p} rotation={r}>
  <mesh scale={[1, 0.8 + 0.2 * fill, 0.7 + 0.3 * fill]}><capsuleGeometry args={[0.12, 0.26, 8, 16]} /><meshStandardMaterial color="#e8792e" roughness={0.55} /></mesh>
  <mesh position={[0, 0.27, 0]}><boxGeometry args={[0.26, 0.06, 0.06]} /><meshStandardMaterial color="#1d2a36" roughness={0.5} /></mesh>
  <mesh position={[0, 0.05, 0.12]}><planeGeometry args={[0.12, 0.08]} /><meshStandardMaterial color="#f6efe0" roughness={0.6} /></mesh>
</group>;

// ---------------------------------------------------------------- surface float + yellow flag / survey marker buoy
const flagGeo = () => new THREE.PlaneGeometry(0.42, 0.28, 12, 6);
export const FlagFloat: React.FC<{ p: V3; t: number; tether?: V3; marker?: boolean }> = ({ p, t, tether, marker }) => {
  const g = useMemo(() => { const f = flagGeo(); f.translate(0.21, 0, 0); return f; }, []);
  const P = g.attributes.position as THREE.BufferAttribute; const base = useMemo(() => Float32Array.from(P.array as Float32Array), [P]);
  for (let i = 0; i < P.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; P.setXYZ(i, x * (1 - 0.05 * Math.sin(t * 3)), y - x * x * 0.4, Math.sin(x * 14 - t * 7.5) * 0.035 * (x / 0.42) + Math.sin(y * 9 + t * 4) * 0.01 * (x / 0.42)); } P.needsUpdate = true; g.computeVertexNormals();
  const line = tether ? (() => { const a = new THREE.Vector3(p[0], p[1] - 0.15, p[2]), b = new THREE.Vector3(...tether), d = b.clone().sub(a), L = d.length(); return { mid: a.clone().add(b).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), L }; })() : null;
  return (<group>
    <group position={p} rotation={[Math.sin(t * 1.2) * 0.08, 0, Math.sin(t * 0.9 + 1) * 0.07]}>
      <mesh position={[0, 0.0, 0]}><sphereGeometry args={[marker ? 0.24 : 0.2, 24, 16]} /><meshStandardMaterial color={marker ? "#f26a1e" : "#f3f1ea"} roughness={0.4} /></mesh>
      <mesh position={[0, 0.06, 0]}><torusGeometry args={[marker ? 0.24 : 0.2, 0.025, 8, 24]} /><meshStandardMaterial color="#2a2a30" roughness={0.6} /></mesh>
      {!marker && <><mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.012, 0.012, 0.95, 8]} /><meshStandardMaterial color="#d9d6cc" roughness={0.4} /></mesh>
        <mesh position={[0.01, 0.86, 0]} geometry={g}><meshStandardMaterial color="#f2c419" roughness={0.65} side={THREE.DoubleSide} /></mesh></>}
    </group>
    {line && <mesh position={line.mid} quaternion={line.q}><cylinderGeometry args={[0.006, 0.006, line.L, 6]} /><meshStandardMaterial color="#d8cfae" roughness={0.8} /></mesh>}
  </group>);
};

// ---------------------------------------------------------------- work barge with the A-frame (installation)
export const bargeKit = () => once("poBarge", () => { const K = new Kit(); const hull = new THREE.MeshStandardMaterial({ color: "#3a5a7a", roughness: 0.5 }), deck = new THREE.MeshStandardMaterial({ color: "#8a8478", roughness: 0.8 }), yel = new THREE.MeshStandardMaterial({ color: "#f0c22e", roughness: 0.45 }), dark = new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.6 }), tyre = new THREE.MeshStandardMaterial({ color: "#161618", roughness: 0.9 });
  K.box(hull, [7.5, 0.9, 3.2], [0, 0.0, 0]); K.box(deck, [7.4, 0.06, 3.1], [0, 0.47, 0]); for (const s of [-1, 1]) K.box(hull, [7.5, 0.25, 0.1], [0, 0.6, s * 1.6]);
  for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) K.add(tyre, new THREE.TorusGeometry(0.22, 0.08, 8, 16), [k * 1.0, 0.3, s * 1.68], [0, 0, 0], [1, 1, 1], { ink: 0.4 });
  // A-frame davit at the stern (+x end) leaning out over the water
  for (const s of [-1, 1]) K.rod(yel, [2.8, 0.5, s * 1.2], [4.3, 3.6, s * 0.35], 0.07, 8); K.rod(yel, [4.3, 3.6, -0.4], [4.3, 3.6, 0.4], 0.07, 8); K.box(dark, [0.3, 0.3, 0.3], [4.3, 3.5, 0]);
  K.box(dark, [0.8, 0.6, 0.6], [-2.6, 0.8, 0]); K.cyl(dark, 0.2, 0.2, 0.7, [-2.6, 1.1, 0], [Math.PI / 2, 0, 0], 14);   // winch
  K.box(new THREE.MeshStandardMaterial({ color: "#f3f1ea", roughness: 0.5 }), [1.4, 1.5, 1.6], [-1.2, 1.2, 0]);   // wheel-house
  return K; });
export const Barge: React.FC<{ p: V3; ry: number; t: number }> = ({ p, ry, t }) => <group position={[p[0], p[1] + Math.sin(t * 1.1) * 0.05 - 0.2, p[2]]} rotation={[Math.sin(t * 0.8) * 0.02, ry, Math.sin(t * 1.3) * 0.015]}><KitMesh kit={bargeKit()} /></group>;
/** a rope (straight) between two world points */
export const Rope: React.FC<{ a: V3; b: V3; r?: number; color?: string }> = ({ a, b, r = 0.012, color = "#d8cfae" }) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  return <mesh position={A.clone().add(B).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())}><cylinderGeometry args={[r, r, L, 6]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>; };

// ---------------------------------------------------------------- Port Vila sorting room (a separate interior set)
export const SORT_ROOM: V3 = [3000, 40, 3000];
const roomKit = () => once("poRoom", () => { const K = new Kit(); const wall = new THREE.MeshStandardMaterial({ color: "#efe6cf", roughness: 0.85 }), floor = new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.7 }), wood = new THREE.MeshStandardMaterial({ color: "#7a5a3a", roughness: 0.7 }), blue = new THREE.MeshStandardMaterial({ color: "#2b4a7a", roughness: 0.6 }), bag = new THREE.MeshStandardMaterial({ color: "#c9b48a", roughness: 0.9 }), sky = new THREE.MeshBasicMaterial({ color: "#cfe8f6" });
  const sign = new THREE.MeshStandardMaterial({ map: signTex([{ t: "OUTWARD MAIL", size: 110, y: 128 }], 1024, 256, "#f6efd8", "#2b4a7a", 21), roughness: 0.6 }), air = new THREE.MeshStandardMaterial({ map: signTex([{ t: "AIR MAIL · PAR AVION", size: 74, y: 128, col: "#c8452e" }], 1024, 256, "#f2ead2", "#2b4a7a", 22), roughness: 0.8 });
  K.box(floor, [6, 0.1, 5], [0, -0.05, 0]); K.box(wall, [6, 3, 0.1], [0, 1.5, -2.5]); K.box(wall, [0.1, 3, 5], [-3, 1.5, 0]); K.box(wall, [0.1, 3, 5], [3, 1.5, 0]); K.box(wall, [6, 0.1, 5], [0, 3, 0]);
  K.box(wall, [6, 3, 0.1], [0, 1.5, 2.5]);
  K.box(sky, [1.6, 1.1, 0.05], [1.6, 1.7, -2.44], [0, 0, 0], { ink: false }); K.box(wood, [1.75, 0.08, 0.15], [1.6, 1.12, -2.4]);
  // pigeonhole wall
  K.box(wood, [2.4, 1.6, 0.4], [-1.4, 1.5, -2.25]); for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) K.box(new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.8 }), [0.34, 0.26, 0.05], [-2.45 + i * 0.4 + 0.2, 0.86 + j * 0.3 + 0.12, -2.03], [0, 0, 0], { ink: false });
  K.box(sign, [1.6, 0.4, 0.04], [-1.4, 2.55, -2.42]);
  // sorting counter + scale + bags
  K.box(wood, [3.0, 0.9, 0.8], [0, 0.45, -0.4]); K.box(blue, [3.1, 0.06, 0.9], [0, 0.93, -0.4]);
  K.add(bag, new THREE.CapsuleGeometry(0.28, 0.5, 6, 12), [2.0, 0.5, 0.6], [0, 0, 0.1]); K.box(air, [0.5, 0.13, 0.02], [2.0, 0.6, 0.89], [0, 0, 0.1]);
  K.add(bag, new THREE.CapsuleGeometry(0.25, 0.45, 6, 12), [2.4, 0.45, -0.2], [0, 0, -0.2]);
  K.cyl(new THREE.MeshStandardMaterial({ color: "#c9ced4", metalness: 0.7, roughness: 0.3 }), 0.12, 0.14, 0.08, [-1.0, 0.99, -0.5], [0, 0, 0], 20);
  return K; });
export const SortRoom: React.FC = () => <group position={SORT_ROOM}><KitMesh kit={roomKit()} /><pointLight position={[0.5, 2.6, 0.5]} intensity={6} distance={8} decay={1.4} color="#fff2dc" /><pointLight position={[1.6, 1.7, -1.8]} intensity={3} distance={5} decay={1.6} color="#dcefff" /></group>;
export const InkStamp: React.FC<{ p: V3; down: number }> = ({ p, down }) => <group position={[p[0], p[1] + 0.05 + (1 - down) * 0.08, p[2]]}>
  <mesh><cylinderGeometry args={[0.025, 0.03, 0.02, 16]} /><meshStandardMaterial color="#2a2a3a" roughness={0.5} /></mesh><mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.012, 0.016, 0.09, 12]} /><meshStandardMaterial color="#7a5a3a" roughness={0.5} /></mesh>
  <mesh position={[0, 0.11, 0]}><sphereGeometry args={[0.022, 14, 10]} /><meshStandardMaterial color="#5a3a24" roughness={0.5} /></mesh></group>;
