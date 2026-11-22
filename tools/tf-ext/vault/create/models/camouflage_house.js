// ORIGINAL MODEL (TwistFrame Lab): 1940s rooftop camouflage prop house, as built over aircraft plants in WWII
// (e.g. Boeing Plant 2, Seattle, c.1944): painted canvas stretched over a light timber stud frame, a canvas roof painted
// to read as shingles from the air, painted-on windows/door/shutters, and an OPEN BACK that shows the studs, braces and
// rafters (it was a stage set, not a building). Real-world scale in metres, Y up, origin at the base centre.
// Separate named parts for animation/construction: Frame, CanvasWalls, CanvasRoof, PaintedDetails, Chimney, LawnMat.
import * as THREE from "three";
import { pbr, fbm, rng, boxUV } from "../pbr.js";

const N = 2048;   // main materials at 2k (siding, roof, timber, trim); decals 512, lawn 1024
const W = 7.2, D = 6.0, H = 2.6, RISE = 1.9, OVER = 0.28, STUD = [0.05, 0.1], SP = 0.6;

function materials() {
  // painted canvas siding: 8 painted lap lines per 1.76 m tile, canvas weave, brush streaks, light weathering
  const n1 = fbm(N, 11), weave = (x, y) => 0.5 + 0.25 * Math.sin((x / N) * Math.PI * 2 * 220) * Math.sin((y / N) * Math.PI * 2 * 220);
  const lap = (y) => { const f = ((y / N) * 8) % 1; return f < 0.06 ? -1 + f / 0.06 : f > 0.94 ? (f - 0.94) / 0.06 * 0.4 : 0.4 * (1 - f); };
  const sidingH = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) sidingH[y * N + x] = lap(y) * 0.6 + weave(x, y) * 0.05 + n1[y * N + x] * 0.08;
  const siding = pbr("Painted canvas siding (pale yellow)", N, sidingH, (x, y, i) => { const l = lap(y), v = 0.9 + 0.1 * n1[i] + 0.06 * l - (l < -0.5 ? 0.18 : 0); return [233 * v, 222 * v, 178 * v]; }, (x, y, i) => 0.78 + 0.12 * n1[i], { strength: 3 });
  // canvas roof painted as asphalt shingles: 6 rows x 4 tabs per 1.2 m tile, staggered, per-tab tone variation
  const r = rng(5), tones = Array.from({ length: 64 }, () => 0.82 + r() * 0.3), n2 = fbm(N, 23);
  const sh = (x, y) => { const row = Math.floor((y / N) * 6), fy = ((y / N) * 6) % 1, off = row % 2 ? 0.5 : 0, col = Math.floor((x / N) * 4 + off) % 4, fx = ((x / N) * 4 + off) % 1; return { row, col, fy, fx }; };
  const roofH = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const s = sh(x, y); roofH[y * N + x] = s.fy * 0.6 + (s.fx < 0.02 ? -0.5 : 0) + weave(x, y) * 0.05 + n2[y * N + x] * 0.1; }
  const roof = pbr("Painted canvas roof (shingle pattern)", N, roofH, (x, y, i) => { const s = sh(x, y), t = tones[(s.row * 4 + s.col) % 64] * (0.88 + 0.16 * n2[i]) * (s.fy < 0.08 ? 0.7 : 1) * (s.fx < 0.02 ? 0.6 : 1); return [92 * t, 98 * t, 88 * t]; }, (x, y, i) => 0.88 + 0.08 * n2[i], { strength: 3, side: THREE.DoubleSide });
  // rough-sawn pine framing: grain along U, saw marks, knots
  const n3 = fbm(N, 37, [[2, 0.4], [6, 0.3], [24, 0.2], [64, 0.1]]), knots = Array.from({ length: 6 }, () => [r() * N, r() * N]);
  const grain = (x, y, i) => { let g = Math.sin((y / N) * Math.PI * 2 * 18 + n3[i] * 9); for (const [kx, ky] of knots) { const d = Math.hypot(((x - kx + N * 1.5) % N) - N / 2, ((y - ky + N * 1.5) % N) - N / 2); if (d < 26) g += (1 - d / 26) * 2.5 * Math.sin(d * 0.6); } return g; };
  const woodH = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; woodH[i] = grain(x, y, i) * 0.15 + 0.08 * Math.sin((x / N) * Math.PI * 2 * 40); }
  const timber = pbr("Rough-sawn pine", N, woodH, (x, y, i) => { const g = grain(x, y, i), v = 0.82 + 0.1 * g + 0.1 * n3[i]; return [196 * v, 152 * v, 104 * v]; }, (x, y, i) => 0.7 + 0.15 * n3[i], { strength: 2 });
  const trim = pbr("White painted trim board", N, woodH, (x, y, i) => { const v = 0.93 + 0.04 * grain(x, y, i) + 0.04 * n3[i]; return [238 * v, 236 * v, 228 * v]; }, (x, y, i) => 0.55 + 0.1 * n3[i], { strength: 1 });
  // burlap "lawn" mat: coarse two-direction weave painted grass green with mottling
  const NL = 1024, n4 = fbm(NL, 51), bw = (x, y) => Math.abs(Math.sin((x / NL) * Math.PI * 2 * 64)) * 0.5 + Math.abs(Math.sin((y / NL) * Math.PI * 2 * 64)) * 0.5;
  const lawnH = new Float32Array(NL * NL); for (let y = 0; y < NL; y++) for (let x = 0; x < NL; x++) lawnH[y * NL + x] = bw(x, y) * 0.5 + n4[y * NL + x] * 0.2;
  const lawn = pbr("Painted burlap lawn mat", NL, lawnH, (x, y, i) => { const v = 0.7 + 0.25 * bw(x, y) + 0.2 * n4[i]; return [92 * v, 128 * v, 62 * v]; }, (x, y, i) => 0.92, { strength: 4 });
  return { siding, roof, timber, trim, lawn };
}
/** painted-on window (1.0 x 1.3 m) or door (0.95 x 2.05 m) decal: white frame, dark glazing with painted sky reflection, mullions, sill shadow, shutters on windows */
function decal(kind) { const n = 512, aspect = kind === "door" ? 2.05 / 0.95 : 1.3 / 1.0, h = new Float32Array(n * n), nz = fbm(n, kind === "door" ? 71 : 73);
  const inFrame = (u, v) => kind === "door" ? (u < 0.08 || u > 0.92 || v > 0.95) : (u < 0.09 || u > 0.91 || v < 0.08 || v > 0.92 || Math.abs(u - 0.5) < 0.025 || Math.abs(v - 0.5) < 0.02);
  const panel = (u, v) => kind === "door" && ((u > 0.18 && u < 0.46) || (u > 0.54 && u < 0.82)) && ((v > 0.1 && v < 0.42) || (v > 0.5 && v < 0.88));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const u = x / n, v = 1 - y / n; h[y * n + x] = inFrame(u, v) ? 0.8 : panel(u, v) ? 0.25 : 0.4; }
  const m = pbr(kind === "door" ? "Painted door (canvas)" : "Painted window (canvas)", n, h, (x, y, i) => { const u = x / n, v = 1 - y / n, k = 0.92 + 0.08 * nz[i];
    if (inFrame(u, v)) return [240 * k, 238 * k, 230 * k];
    if (kind === "door") return panel(u, v) ? [118 * k, 52 * k, 40 * k] : [134 * k, 60 * k, 46 * k];
    const sky = 0.35 + 0.4 * Math.max(0, v - 0.2) * (u < 0.5 ? 1 : 0.7); return [52 * k + 60 * sky, 66 * k + 70 * sky, 82 * k + 80 * sky]; }, (x, y, i) => { const u = x / n, v = 1 - y / n; return inFrame(u, v) ? 0.5 : kind === "door" ? 0.6 : 0.3; }, { strength: 2.5 });
  m.polygonOffset = true; m.polygonOffsetFactor = -2; return { m, aspect }; }

export function build() {
  const M = materials(), root = new THREE.Group(); root.name = "Camouflage_Prop_House_1940s";
  const part = (name) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };
  const frame = part("Frame"), walls = part("CanvasWalls"), roofG = part("CanvasRoof"), details = part("PaintedDetails"), chimney = part("Chimney"), lawn = part("LawnMat");
  const box = (g, mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0, tile = 1, name) => { const geo = boxUV(new THREE.BoxGeometry(sx, sy, sz), tile), m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (name) m.name = name; g.add(m); return m; };
  const hw = W / 2, hd = D / 2, base = 0.16;
  // --- frame: skids, sill plates, studs, top plates, open-back braces, ceiling joists, rafters, ridge board
  for (const z of [-hd + 0.4, 0, hd - 0.4]) box(frame, M.timber, W + 0.3, 0.1, 0.15, 0, 0.05, z, 0, 0, 0, 1, "Skid");
  for (const z of [-hd, hd]) box(frame, M.timber, W, 0.06, STUD[1], 0, base - 0.03, z + (z < 0 ? STUD[1] / 2 : -STUD[1] / 2), 0, 0, 0, 1, "SillPlate");
  for (const x of [-hw, hw]) box(frame, M.timber, STUD[1], 0.06, D, x + (x < 0 ? STUD[1] / 2 : -STUD[1] / 2), base - 0.03, 0, 0, 0, 0, 1, "SillPlate");
  const studH = H - 0.12;
  for (let x = -hw + 0.05; x <= hw - 0.04; x += SP) for (const z of [-hd + 0.05, hd - 0.05]) box(frame, M.timber, STUD[0], studH, STUD[1], Math.min(x, hw - 0.05), base + studH / 2, z, 0, 0, 0, 1, "Stud");
  for (let z = -hd + 0.05 + SP; z < hd - 0.1; z += SP) for (const x of [-hw + 0.05, hw - 0.05]) box(frame, M.timber, STUD[1], studH, STUD[0], x, base + studH / 2, z, 0, 0, 0, 1, "Stud");
  for (const z of [-hd + 0.05, hd - 0.05]) box(frame, M.timber, W, 0.06, STUD[1], 0, base + studH + 0.03, z, 0, 0, 0, 1, "TopPlate");
  for (const x of [-hw + 0.05, hw - 0.05]) box(frame, M.timber, STUD[1], 0.06, D, x, base + studH + 0.03, 0, 0, 0, 0, 1, "TopPlate");
  const topY = base + H;
  // open back: two long diagonal braces + a mid-height girt (what an aerial camera never sees, a ground camera does)
  const brace = (x0, y0, x1, y1, z) => { const L = Math.hypot(x1 - x0, y1 - y0); box(frame, M.timber, L, 0.08, 0.04, (x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(y1 - y0, x1 - x0), 1, "Brace"); };
  brace(-hw + 0.1, base + 0.1, -0.3, topY - 0.15, -hd + 0.12); brace(hw - 0.1, base + 0.1, 0.3, topY - 0.15, -hd + 0.12); box(frame, M.timber, W - 0.1, 0.08, 0.04, 0, base + 1.25, -hd + 0.12, 0, 0, 0, 1, "Girt");
  // props holding the façade (raking shores from the back)
  for (const x of [-2.4, 0, 2.4]) { const L = Math.hypot(1.6, 1.9); box(frame, M.timber, 0.06, L, 0.09, x, base + 0.95, hd - 0.85, Math.atan2(1.6, 1.9), 0, 0, 1, "Shore"); }
  for (let x = -hw + 0.05; x <= hw; x += SP) box(frame, M.timber, 0.045, 0.14, D, Math.min(x, hw - 0.05), topY + 0.04, 0, 0, 0, 0, 1, "CeilingJoist");
  // rafter line: ridge (z 0, y topY+RISE) -> eave tip (z hd+OVER, y topY - OVER*tan(pitch)); same line for both slopes
  const pitch = Math.atan2(RISE, hd), dropO = OVER * Math.tan(pitch), slope = Math.hypot(hd + OVER, RISE + dropO), midY = topY + (RISE - dropO) / 2, midZ = (hd + OVER) / 2;
  for (let x = -hw; x <= hw + 0.01; x += SP) for (const s of [-1, 1]) box(frame, M.timber, 0.045, 0.14, slope, Math.min(Math.max(x, -hw + 0.03), hw - 0.03), midY, s * midZ, s * pitch, 0, 0, 1, "Rafter");
  box(frame, M.timber, W + 2 * OVER, 0.18, 0.04, 0, topY + RISE, 0, 0, 0, 0, 1, "RidgeBoard");
  // --- canvas walls (front + both sides), stretched just outside the studs; gable ends in canvas
  const T = 0.012;
  box(walls, M.siding, W + 0.02, H, T, 0, base + H / 2, hd + T / 2, 0, 0, 0, 1.76, "FrontCanvas");
  for (const s of [-1, 1]) box(walls, M.siding, T, H, D + 0.02, s * (hw + T / 2), base + H / 2, 0, 0, 0, 0, 1.76, s < 0 ? "LeftCanvas" : "RightCanvas");
  for (const s of [-1, 1]) { const sh = new THREE.Shape([new THREE.Vector2(-hd, 0), new THREE.Vector2(hd, 0), new THREE.Vector2(0, RISE)]), g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); boxUV(g, 1.76);
    const m = new THREE.Mesh(g, M.siding); m.name = s < 0 ? "GableLeft" : "GableRight"; m.rotation.y = s * Math.PI / 2; m.position.set(s * (hw + (s > 0 ? 0 : T)), topY, 0); walls.add(m); }
  // --- canvas roof: two subdivided sheets sagging slightly between rafters (real geometry, not a texture trick)
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(W + 2 * OVER, slope, 144, 24), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + hw, f = ((x / SP) % 1 + 1) % 1, along = (p.getY(i) + slope / 2) / slope; p.setZ(i, -0.016 * Math.sin(Math.PI * f) * Math.sin(Math.PI * Math.min(1, along * 1.05))); }
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + hw + OVER) / 1.2, (p.getY(i) + slope / 2) / 1.2); g.computeVertexNormals();
    // explicit basis: local x along the ridge, local y up the slope (eave -> ridge), local z = outward normal
    const up = new THREE.Vector3(0, Math.sin(pitch), -s * Math.cos(pitch)), nrm = new THREE.Vector3(0, Math.cos(pitch), s * Math.sin(pitch)), ax = new THREE.Vector3(s, 0, 0);
    const m = new THREE.Mesh(g, M.roof); m.name = s < 0 ? "RoofSheetBack" : "RoofSheetFront"; m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, up, nrm));
    m.position.set(0, midY, s * midZ).addScaledVector(nrm, 0.07 + 0.01); roofG.add(m); }
  box(roofG, M.roof, W + 2 * OVER + 0.04, 0.05, 0.36, 0, topY + RISE + 0.1, 0, 0, 0, 0, 1.2, "RidgeCap");
  // fascia + corner boards in white trim
  for (const s of [-1, 1]) box(details, M.trim, W + 2 * OVER, 0.16, 0.025, 0, topY - dropO + 0.02, s * (hd + OVER + 0.02), 0, 0, 0, 1, "Fascia");
  for (const x of [-hw - 0.02, hw + 0.02]) box(details, M.trim, 0.1, H, 0.03, x, base + H / 2, hd + 0.02, 0, 0, 0, 1, "CornerBoard");
  // painted openings: front door + 4 windows, 2 windows per side; shutters painted dark green on the front windows
  const win = decal("window"), door = decal("door"), shutter = pbr("Painted shutter", 256, fbm(256, 81), (x, y, i) => { const slat = (y / 256 * 14) % 1 < 0.15 ? 0.7 : 1; return [44 * slat, 74 * slat, 52 * slat]; }, () => 0.6, { strength: 2 });
  shutter.polygonOffset = true; shutter.polygonOffsetFactor = -2;
  const plane = (mat, w, h, x, y, z, ry, name) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.name = name; details.add(m); };
  plane(door.m, 0.95, 2.05, 0, base + 1.03, hd + T + 0.004, 0, "PaintedDoor");
  for (const x of [-2.55, -1.3, 1.3, 2.55]) { plane(win.m, 1.0, 1.3, x, base + 1.45, hd + T + 0.004, 0, "PaintedWindow"); for (const sx of [-1, 1]) plane(shutter, 0.42, 1.3, x + sx * 0.73, base + 1.45, hd + T + 0.003, 0, "PaintedShutter"); }
  for (const s of [-1, 1]) for (const z of [-1.4, 1.4]) plane(win.m, 1.0, 1.3, s * (hw + T + 0.004), base + 1.45, z, s * Math.PI / 2, "PaintedWindow");
  box(details, M.trim, 1.5, 0.06, 0.5, 0, base + 0.03, hd + 0.26, 0, 0, 0, 1, "Doorstep");
  // canvas was tacked to the studs under thin battens at the panel seams (every 1.2 m) and along the bottom hem
  // (no front battens: the painted door, windows and shutters span the whole front wall)
  for (const sx of [-1, 1]) for (let z = -hd + 1.2; z < hd - 0.3; z += 1.2) if (Math.abs(z) > 0.6 && Math.abs(Math.abs(z) - 1.4) > 0.6) box(details, M.trim, 0.012, H - 0.05, 0.05, sx * (hw + T + 0.006), base + H / 2, z, 0, 0, 0, 1, "Batten");
  box(details, M.timber, W + 0.04, 0.07, 0.02, 0, base + 0.035, hd + T + 0.01, 0, 0, 0, 1, "HemBatten");
  // real 3D trim around the painted openings: sills project, heads cap, side casings stand proud
  const casing = (x, y, z, w, h, ry, door) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; details.add(g);
    const b2 = (sx, sy, sz, px, py, pz, nm) => { const geo = boxUV(new THREE.BoxGeometry(sx, sy, sz), 1), m = new THREE.Mesh(geo, M.trim); m.position.set(px, py, pz); m.name = nm; g.add(m); };
    b2(w + 0.2, 0.08, 0.05, 0, h / 2 + 0.04, 0.025, "Head"); b2(w + 0.26, 0.025, 0.07, 0, h / 2 + 0.09, 0.035, "HeadCap");
    for (const sx of [-1, 1]) b2(0.07, h, 0.035, sx * (w / 2 + 0.035), 0, 0.018, "Casing");
    if (!door) b2(w + 0.18, 0.045, 0.09, 0, -h / 2 - 0.022, 0.045, "Sill"); };
  casing(0, base + 1.03, hd + T, 0.95, 2.05, 0, true);
  for (const x of [-2.55, -1.3, 1.3, 2.55]) casing(x, base + 1.45, hd + T, 1.0, 1.3, 0, false);
  for (const s2 of [-1, 1]) for (const z of [-1.4, 1.4]) casing(s2 * (hw + T), base + 1.45, z, 1.0, 1.3, s2 * Math.PI / 2, false);
  // canvas tie-down: grommets + lacing pegs along the canvas bottom edge
  const peg = new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8); boxUV(peg, 0.2);
  for (let x = -hw + 0.3; x < hw; x += 0.6) { const m = new THREE.Mesh(peg, M.trim); m.rotation.x = Math.PI / 2; m.position.set(x, base + 0.06, hd + T + 0.02); m.name = "TieDownPeg"; details.add(m); }
  // plywood chimney box with canvas sides painted brick-red, sitting on the roof slope
  const brick = pbr("Painted canvas chimney (brick)", 512, fbm(512, 91), (x, y, i) => { const row = Math.floor(y / 32), mort = y % 32 < 3 || ((x + (row % 2) * 32) % 64) < 3; return mort ? [190, 182, 168] : [146, 68, 52]; }, () => 0.85, { strength: 2.5 });
  box(chimney, brick, 0.6, 1.3, 0.6, 1.9, topY + RISE * 0.55 + 0.45, -0.9, 0, 0, 0, 1, "ChimneyBody"); box(chimney, M.trim, 0.72, 0.06, 0.72, 1.9, topY + RISE * 0.55 + 1.12, -0.9, 0, 0, 0, 1, "ChimneyCap");
  // painted burlap lawn mat in front (part of the camouflage set dressing)
  const lm = box(lawn, M.lawn, W + 1.6, 0.01, 2.6, 0, 0.005, hd + 1.45, 0, 0, 0, 0.5, "BurlapLawn");
  void lm;
  return { group: root, meta: { view: [-0.95, 0.5, 1.25], backView: [1.15, 0.45, -1.2], parts: root.children.map((c) => c.name) } };
}
