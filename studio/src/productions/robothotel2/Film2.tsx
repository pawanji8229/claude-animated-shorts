// ROBOT HOTEL (reference style): 26 shots cut to the narration (avg ~2 s), every shot with its own camera move, whip
// pans (motion blur) / dissolves between shots, punchy cartoon-3D look (ToonSet: saturated colour, strong key + rim,
// bloom, DOF, ink lines), high-detail downloaded hero models (animated raptor receptionist with bellhop cap + bow
// tie, concierge kiosk robot, floating porter robot, humanoid workforce, cute bedside robot, Japanese hotel) and the
// approved odo5 cartoon characters, big in frame with exaggerated expressions. Everything is a function of the frame.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ToonSet, type Look, type TCam } from "./ToonSet";
import { useH2Ready, GModel } from "./glb";
import { BellhopCap, BowTie } from "./props";
import { Toon, HERO } from "../centennial/chars";
import { useHotelReady } from "../robothotel/assets";
import { useTexReady } from "../short3/tex";
import { Building, HotelLights, DESK, ALCOVES, CONCIERGE_AT, DOOR101, COR } from "../robothotel/hotel";
import { Dolly } from "../robothotel/robots";
import { KEN, TECH, MANAGER, GUEST2, GUEST3 } from "../robothotel/timeline";
import { stand, walker, keys, ft, A, mixArm, sm, lv, type Act, type Placed } from "../mailrail/actors";
import { REST_L, REST_R } from "../../char/odo5";
import type { V3 } from "../../lib/math";

export const FPS = 30, FILM_FRAMES = 1679;
const cl = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => { const u = cl(t); return u * u * (3 - 2 * u); };
const easeOut = (t: number) => 1 - Math.pow(1 - cl(t), 3);
const shake = (f: number, amp: number, seed = 1): V3 => [amp * Math.sin(f * 1.7 + seed), amp * Math.sin(f * 2.3 + seed * 2), amp * 0.5 * Math.sin(f * 1.1 + seed * 3)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ================================================================= looks (per scene)
const BASE = { exposure: 1.04, bloom: 0.5, threshold: 1.35, saturation: 1.38, contrast: 1.16, warmCool: 0.65, vignette: 0.36, ink: 0.95 };
const EXT: Look = { ...BASE, bg: "#5fb4f2", sky: "#e8f6ff", ground: "#8a7860", hemi: 0.75, env: 0.6, sun: { dir: [0.55, 0.75, 0.6], color: "#fff0d0", i: 3.4, at: [0, 0, 14], size: 22 }, rim: { dir: [-0.6, 0.4, -1], color: "#bfe6ff", i: 1.2 }, fog: { color: "#bfe0f6", near: 60, far: 260 } };
const LOBBY: Look = { ...BASE, bg: "#20160f", sky: "#fff0da", ground: "#5a3a24", hemi: 0.5, env: 0.55, sun: { dir: [0.75, 0.55, 0.35], color: "#ffd59a", i: 3.4, at: [-1, 0, -8], size: 11 }, rim: { dir: [-0.4, 0.5, -1], color: "#7fd8ff", i: 1.7 } };
const ALARM: Look = { ...LOBBY, sky: "#ffb0a0", sun: { ...LOBBY.sun, color: "#ff8a6a", i: 2.6 }, rim: { dir: [-0.4, 0.5, -1], color: "#ff3020", i: 2.6 }, saturation: 1.45, warmCool: 0.9 };
const COR_L: Look = { ...LOBBY, hemi: 0.45, sun: { ...LOBBY.sun, i: 1.6, at: [14, 0, -11], size: 8 } };
const NIGHT: Look = { ...BASE, bg: "#060a18", sky: "#4a64b0", ground: "#141428", hemi: 0.32, env: 0.25, sun: { dir: [0.4, 0.7, 0.6], color: "#8fb0ff", i: 1.1, at: [40, 0, 0], size: 5 }, rim: { dir: [0.5, 0.4, -1], color: "#5fe0ff", i: 1.4 }, exposure: 1.2, bloom: 0.7, threshold: 1.1, warmCool: 0.3 };
const WAKE: Look = { ...NIGHT, sky: "#a0e8ff", sun: { ...NIGHT.sun, color: "#d8f4ff", i: 2.6 }, exposure: 1.35, bloom: 0.9 };

// ================================================================= sets
const ROOM_AT: V3 = [40, 0, 0];
const NS_TOP = 0.96; const BOT: V3 = [ROOM_AT[0] - 1.55, NS_TOP, ROOM_AT[2] + 0.74];   // room floor y 0.5, end table top 0.96, window wall z 1.05
                                                  // top of the bedroom model's own nightstand                                       // the downloaded bedroom, far away from the hotel set
const HOTEL_EXT: V3 = [0, 0, 0];
const ground = (c: string, size = 400, y = -0.01) => <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow><planeGeometry args={[size, size]} /><meshStandardMaterial color={c} roughness={0.9} /></mesh>;
const Exterior: React.FC = () => <>
  <GModel name="jphotel" p={HOTEL_EXT} ry={Math.PI / 2} />
  {ground("#c8b89a")}
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 22]} receiveShadow><planeGeometry args={[400, 9]} /><meshStandardMaterial color="#5a5a62" roughness={0.85} /></mesh>
  {[-30, -15, 15, 30].map((x) => <GModel key={x} name="cityhotel" p={[x * 2.4, 0, -60 - Math.abs(x)]} ry={x * 0.02} s={0.9} />)}
</>;
const Lobby: React.FC<{ f: number; raptorClip?: string; raptorT?: number; raptor2?: string; workers?: (i: number) => { rx: number; clip: string; t: number; gone?: boolean } }> = ({ f, raptorClip = "Idle_01", raptorT, raptor2 = "Idle_01", workers }) => <>
  <Building doors={0} door101={0} show={{ ext: false, lobby: true, cor: false, room: false }} woodFloor />
  <HotelLights lobby={1} cor={0} room={0} />
  <Raptor at={[-3.0, 0.22, -12.15]} clip={raptorClip} t={raptorT ?? f / 30} />
  <Raptor at={[0.2, 0.22, -12.15]} clip={raptor2} t={f / 30 + 0.7} />
  <GModel name="copper" p={CONCIERGE_AT} ry={-0.75} />
  {ALCOVES.map((p, i) => { const w = workers?.(i) ?? { rx: 0, clip: "IDLE", t: f / 30 + i * 0.37 }; return w.gone ? null : <GModel key={i} name="humanoid" p={[p[0] - 0.2, 0, p[2]]} ry={-Math.PI / 2} rx={w.rx} clip={w.clip} t={w.t} />; })}
  <GModel name="vacuum" p={[-5.6 + 1.4 * Math.cos(f / 40), 0.01, -6.0 + 1.1 * Math.sin(f / 40)]} ry={-f / 40} />
</>;
const Raptor: React.FC<{ at: V3; clip: string; t: number; ry?: number }> = ({ at, clip, t, ry = 0 }) =>
  <GModel name="raptorpbr" p={at} ry={ry} clip={clip} t={t} attach={[{ bone: "Head_09", node: <BellhopCap s={1.5} o={[0, 0.13, -0.03]} /> }, { bone: "Neck_3_08", node: <BowTie s={1.3} o={[0, -0.03, 0.16]} /> }]} />;
const Bedroom: React.FC<{ glow: number; eyes: number }> = ({ glow }) => <>
  <GModel name="bedroom" p={ROOM_AT} />
  <GModel name="minirobot" p={BOT} ry={1.25} s={0.42} />
  <pointLight position={[BOT[0] + 0.35, BOT[1] + 0.3, BOT[2] - 0.1]} intensity={0.6 + 4 * glow} distance={5} decay={1.4} color="#5fe8ff" />
</>;
/** floating comic "Z" for the snore (in-world sprite) */
const zTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  g.font = "bold 110px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 12; g.strokeStyle = "#101018"; g.strokeText("Z", 64, 68); g.fillStyle = "#ffffff"; g.fillText("Z", 64, 68);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }; })();
const Zs: React.FC<{ at: V3; f: number; on: number }> = ({ at, f, on }) => <>{[0, 1, 2].map((i) => { const u = ((f / 45 + i / 3) % 1); return <sprite key={i} position={[at[0] + 0.25 * u, at[1] + 0.9 * u, at[2] + 0.15 * Math.sin(u * 6)]} scale={0.18 + 0.2 * u}>
  <spriteMaterial map={zTex()} transparent opacity={on * Math.sin(Math.PI * u)} depthWrite={false} /></sprite>; })}</>;
/** "2019" desk calendar (in-world prop, big for the insert shot) */
const calTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = 512; c.height = 640; const g = c.getContext("2d")!;
  g.fillStyle = "#fbf8f0"; g.fillRect(0, 0, 512, 640); g.fillStyle = "#d42a2a"; g.fillRect(0, 0, 512, 170); g.fillStyle = "#fff"; g.font = "bold 130px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("2019", 256, 92);
  g.fillStyle = "#3a3a44"; for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) { g.globalAlpha = 0.8; g.fillRect(30 + k * 66, 210 + r * 82, 46, 56); } g.globalAlpha = 1; t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }; })();
const Calendar: React.FC<{ at: V3; flip: number }> = ({ at, flip }) => <group position={at} rotation={[-0.2, 0, 0]}>
  <mesh position={[0, 0.16, 0]}><planeGeometry args={[0.26, 0.325]} /><meshStandardMaterial map={calTex()} roughness={0.6} /></mesh>
  <mesh position={[0, 0.16, 0.002 + 0.02 * flip]} rotation={[-flip * 2.6, 0, 0]}><planeGeometry args={[0.26, 0.325]} /><meshStandardMaterial color="#f2eee4" side={THREE.DoubleSide} /></mesh>
  <mesh position={[0, 0.0, -0.04]}><boxGeometry args={[0.28, 0.03, 0.12]} /><meshStandardMaterial color="#2a2a30" /></mesh></group>;

// ================================================================= cast
const act = (c: Act["c"], seed: number, face: Parameters<typeof ft>[0], armL?: Act["armL"], armR?: Act["armR"]): Act => ({ c, seed, face: ft(face, 4), armL, armR });
const UP_L = A([-115, -175], "open", -1, -2.6, [-105, -55]), UP_R = A([115, -175], "open", 1, 2.6, [105, -55]);
const WAVE = (f: number) => A([120 + 25 * Math.sin(f * 0.5), -150], "open", 1, 2.4, [90, -50]);
const POINT = A([150, -40], "open", 1, 1.7, [90, -10]);
const SCRATCH = A([60, -200], "open", 1, 2.6, [80, -80]);
const HOLD = A([60, 40], "grip", 1, 1.3, [90, 30]);
const FACEPALM = A([30, -175], "open", 1, 2.9, [70, -70]);

// ================================================================= shots
type Shot = { a: number; b: number; look: Look; cam: (u: number, f: number) => TCam; world: (f: number, u: number, cam: V3, hi: boolean) => React.ReactNode; out?: "cut" | "whip" | "dissolve"; whipDir?: 1 | -1 };
const C = (pos0: V3, look0: V3, fov0: number, pos1: V3, look1: V3, fov1: number, e = ease, dof = 0.35) => (u: number): TCam => { const k = e(u); return { pos: lv(pos0, pos1, k), look: lv(look0, look1, k), fov: fov0 + (fov1 - fov0) * k, dof }; };
const card = (p: Placed, cam: V3, hi: boolean, k = 0) => <Toon key={k} p={{ ...p, contact: 0 }} cam={cam} hi={hi} />;
const DESK_HERO: V3 = [-1.6, 0, -10.0];

const SHOTS: Shot[] = [
  // 1. "A hotel in Japan" - the hotel from the street: crane down from the roof line to the entrance
  { a: 0, b: 42, look: EXT, out: "cut", cam: C([-3, 7, 48], [0, 6, 8], 46, [-1, 3.5, 34], [0, 3, 12], 52),
    world: (f, u, cam, hi) => <><Exterior />{card(walker(act(HERO, 7, [[0, "content"]]), keys([[0, [-5, 0, 26.5]], [42, [-1.6, 0, 24.5]]]), f, { pos: cam, look: [0, 3, 12] }, 0), cam, hi)}</> },
  // 2. "...hired robots" - a welcome line of robots at the door, the hero delighted
  { a: 42, b: 82, look: EXT, out: "whip", whipDir: 1, cam: C([2.6, 1.5, 24.5], [0, 1.2, 16.5], 50, [1.6, 1.45, 23.2], [-0.3, 1.2, 16.5], 46),
    world: (f, u, cam, hi) => <><Exterior />
      <GModel name="humanoid" p={[-2.4, 0, 16]} clip="IDLE" t={f / 30} /><GModel name="poddy" p={[-0.6, 0.3, 16.3]} clip={3} t={f / 30} /><GModel name="vintagebot" p={[1.0, 0, 16.2]} ry={-0.3} />
      <GModel name="humanoid" p={[2.6, 0, 15.8]} ry={-0.4} clip="IDLE" t={f / 30 + 0.8} />
      {card(stand(act(HERO, 7, [[42, "delighted"]], undefined, WAVE), [0.6, 0, 19.5], f), cam, hi)}</> },
  // 3. "then fired more than half of them" - the workforce line-up: robot after robot topples over (powered off)
  { a: 82, b: 140, look: LOBBY, out: "cut", cam: C([4.6, 1.5, -1.6], [8.4, 1.0, -4.2], 50, [4.4, 1.45, -6.6], [8.4, 1.0, -9.0], 48, (t) => t),
    world: (f, u, cam, hi) => <Lobby f={f} workers={(i) => { const tf = [92, 0, 104, 116, 0, 128][i]; const k = tf ? easeOut((f - tf) / 10) : 0; return { rx: k * 1.35, clip: k > 0 ? "IDLE" : "IDLE", t: k > 0 ? tf / 30 : f / 30 + i * 0.37 }; }} /> },
  // 4. "some of those robots" - walk up to reception: the raptor receptionist behind the desk
  { a: 140, b: 182, look: LOBBY, out: "cut", cam: C([1.2, 1.6, -5.2], [-1.6, 1.4, -11.4], 50, [0.2, 1.55, -7.2], [-2.2, 1.6, -11.8], 46),
    world: (f, u, cam, hi) => <><Lobby f={f} />{card(walker(act(HERO, 7, [[140, "content"]]), keys([[140, [0.6, 0, -8.6]], [182, DESK_HERO]]), f, { pos: cam, look: DESK_HERO }, 140), cam, hi)}</> },
  // 5. "...were actual robotic dinosaurs" - low close-up: it ROARS (camera shake)
  { a: 182, b: 222, look: LOBBY, out: "cut", cam: (u, f) => { const s = shake(f, 0.025 * (u > 0.15 && u < 0.8 ? 1 : 0)); return { pos: add([-2.55, 1.35, -10.3], s), look: add([-3.0, 1.85, -12.0], s), fov: 52, dof: 0.45 }; },
    world: (f) => <Lobby f={f} raptorClip="Roar_01" raptorT={(f - 182) / 30} /> },
  // 6. huge double take on the hero (close-up, eyes pop)
  { a: 222, b: 268, look: LOBBY, out: "whip", whipDir: -1, cam: C([-1.15, 1.42, -8.75], [-1.6, 1.32, -10.0], 46, [-1.3, 1.42, -9.15], [-1.6, 1.32, -10.0], 42, easeOut, 0.5),
    world: (f, u, cam, hi) => <><Lobby f={f} raptorClip="Idle_01" />{card(stand(act(HERO, 7, [[222, "hugeShock"], [240, "doubleTake"]], () => UP_L, () => UP_R), DESK_HERO, f, { squash: f < 228 ? 0.25 : 0, lean: -0.08 }), cam, hi)}</> },
  // 7. "the hotel wanted to create a futuristic experience" - grand crane-up over the lobby: robots everywhere
  { a: 268, b: 330, look: LOBBY, out: "cut", cam: C([3.5, 1.4, -1.2], [-1, 1.2, -9], 56, [1.8, 4.3, -0.6], [-1.6, 0.8, -9.5], 62),
    world: (f) => <><Lobby f={f} /><GModel name="poddy" p={[2.5, 1.2 + 0.08 * Math.sin(f / 9), -5.5]} ry={-0.6} clip={0} t={f / 30} /></> },
  // 8. the concierge kiosk robot glows, a guest admires it (orbit)
  { a: 330, b: 384, look: LOBBY, out: "cut", cam: (u) => { const a = -0.9 + 0.7 * ease(u), r = 2.6; return { pos: [CONCIERGE_AT[0] + Math.sin(a) * r, 1.35, CONCIERGE_AT[2] + Math.cos(a) * r], look: [CONCIERGE_AT[0], 1.0, CONCIERGE_AT[2]], fov: 48, dof: 0.4 }; },
    world: (f, u, cam, hi) => <><Lobby f={f} />{card(stand(act(GUEST3, 27, [[330, "delighted"]], undefined, () => POINT), [CONCIERGE_AT[0] - 1.0, 0, CONCIERGE_AT[2] + 0.6], f), cam, hi)}</> },
  // 9. "instead of relying entirely on human staff" - the lone employee, bored with a coffee while robots zip past
  { a: 384, b: 476, look: LOBBY, out: "whip", whipDir: 1, cam: C([3.8, 1.5, -10.4], [5.4, 1.35, -13.2], 46, [4.4, 1.5, -11.4], [5.5, 1.35, -13.2], 40),
    world: (f, u, cam, hi) => <><Lobby f={f} />
      <GModel name="poddy" p={[2.0 + 4.0 * ((f - 384) / 92), 1.0, -12.2]} ry={Math.PI / 2} clip={0} t={f / 30} />
      {card(stand(act(KEN, 21, [[384, "bored"], [430, "deadpan"]], () => A([-20, -40], "grip", -1, -1.9, [-70, -10]), (g) => g > 440 && g < 460 ? A([40, -150], "grip", 1, 2.8, [70, -50]) : A([40, -110], "grip", 1, 2.6, [70, -40])), [5.45, 0, -13.1], f, { lookX: -0.5 }), cam, hi)}</> },
  // 10. "reception" - insert: the raptor slides the key card across the counter
  { a: 476, b: 520, look: LOBBY, out: "cut", cam: C([-1.4, 1.35, -10.3], [-2.4, 1.25, -11.4], 44, [-1.6, 1.3, -10.6], [-2.4, 1.2, -11.4], 38, ease, 0.55),
    world: (f) => <><Lobby f={f} raptorClip="Sniff" raptorT={(f - 476) / 30} /><mesh position={[-2.7 + 0.9 * ease((f - 486) / 22), DESK.h + 0.012, -11.05]}><boxGeometry args={[0.085, 0.004, 0.054]} /><meshStandardMaterial color="#e0b040" metalness={0.9} roughness={0.25} /></mesh></> },
  // 11. "luggage" - the floating porter robot carries the suitcases (tracking)
  { a: 520, b: 566, look: LOBBY, out: "cut", cam: (u, f) => { const x = -0.5 + 3.4 * ((f - 520) / 46); return { pos: [x + 0.4, 1.3, -6.6], look: [x - 0.3, 0.9, -9.4], fov: 48, dof: 0.35 }; },
    world: (f) => { const x = -0.5 + 3.4 * ((f - 520) / 46); return <><Lobby f={f} /><GModel name="poddy" p={[x, 0.85, -9.2]} ry={Math.PI / 2} clip={0} t={f / 30} /><GModel name="suitcase" p={[x - 0.05, 0.2 + 0.03 * Math.sin(f / 6), -9.25]} ry={Math.PI / 2} s={0.75} /></>; } },
  // 12. "and guest services" - the concierge kiosk greets the hero
  { a: 566, b: 612, look: LOBBY, out: "whip", whipDir: -1, cam: C([5.0, 1.4, -6.6], [6.6, 1.1, -8.5], 46, [5.4, 1.4, -7.0], [6.7, 1.1, -8.6], 42),
    world: (f, u, cam, hi) => <><Lobby f={f} />{card(stand(act(HERO, 7, [[566, "delighted"]], undefined, WAVE), [5.75, 0, -8.15], f), cam, hi)}</> },
  // 13. "At first, everything looked amazing" - the hero spins in delight, orbiting camera, sparkle lights
  { a: 612, b: 702, look: LOBBY, out: "cut", cam: (u) => { const a = 0.9 - 1.4 * ease(u), r = 2.4; return { pos: [-1.0 + Math.sin(a) * r, 1.4, -7.4 + Math.cos(a) * r], look: [-1.0, 1.1, -7.4], fov: 50, dof: 0.45 }; },
    world: (f, u, cam, hi) => <><Lobby f={f} />{card(stand(act(HERO, 7, [[612, "delighted"], [650, "proud"]], () => UP_L, () => UP_R), [-1.0, 0, -7.4], f, { squash: 0.12 * Math.max(0, Math.sin(f * 0.4)) }), cam, hi)}
      {[0, 1, 2, 3, 4].map((i) => <pointLight key={i} position={[-1 + 1.3 * Math.cos(f / 12 + i * 1.3), 2.2, -7.4 + 1.3 * Math.sin(f / 12 + i * 1.3)]} intensity={2.5} distance={3} color={["#ffd060", "#60e0ff", "#ff70d0", "#90ff90", "#ffffff"][i]} />)}</> },
  // 14. "And then the problems started" - red alarm, the porter robot freezes in an 'omfg' pose, suitcase drops
  { a: 702, b: 762, look: ALARM, out: "cut", cam: (u, f) => { const s = shake(f, 0.012, 3); return { pos: add([1.6, 1.0, -7.2], s), look: [3.4, 1.0, -9.6], fov: 48, roll: 0.12, dof: 0.4 }; },
    world: (f) => <><Lobby f={f} /><GModel name="poddy" p={[3.4, 0.85, -9.4]} ry={-0.4} clip={1} t={0.6} /><GModel name="suitcase" p={[3.0, Math.max(0, 0.55 - 9.8 * Math.pow(Math.max(0, (f - 712) / 30), 2)), -9.1]} ry={0.4 + (f > 712 ? 0.5 : 0)} s={0.75} />
      <pointLight position={[3.4, 2.4, -9.4]} intensity={6 * (0.5 + 0.5 * Math.sin(f * 0.6))} distance={8} color="#ff2a1a" /></> },
  // 15. "Some robots couldn't answer simple questions" - the guest asks, the kiosk thinks... and thinks
  { a: 762, b: 846, look: LOBBY, out: "whip", whipDir: 1, cam: C([5.6, 1.45, -6.9], [6.4, 1.25, -8.4], 40, [5.9, 1.45, -7.4], [6.5, 1.2, -8.5], 34, ease, 0.5),
    world: (f, u, cam, hi) => <><Lobby f={f} />{card(stand(act(GUEST2, 26, [[762, "talking"], [790, "confused"], [818, "tinyConfused"]], undefined, (g) => g < 790 ? POINT : SCRATCH), [6.05, 0, -8.0], f), cam, hi)}
      <pointLight position={[6.7, 1.3, -8.4]} intensity={2 + 1.5 * Math.sin(f * 0.8)} distance={2.5} color="#40d0ff" /></> },
  // 16. "Others struggled to carry luggage to the right rooms" - corridor: the porter bonks the wrong door, the hero chases
  { a: 846, b: 932, look: COR_L, out: "dissolve", cam: C([10.4, 1.5, -11.3], [17, 1.0, -11.4], 54, [11.6, 1.5, -11.3], [17, 1.0, -11.4], 50),
    world: (f, u, cam, hi) => { const bonk = (f - 880) / 12, px = f < 880 ? 12 + 5.0 * ((f - 846) / 34) : 17.0 - 0.15 * Math.abs(Math.sin(Math.max(0, bonk) * Math.PI));
      return <><Building doors={0} door101={0} show={{ ext: false, lobby: false, cor: true, room: false }} /><HotelLights lobby={0} cor={1} room={0} />
        <GModel name="poddy" p={[px, 1.0, -11.85]} ry={Math.PI / 2} clip={f > 880 ? 1 : 0} t={f / 30} /><GModel name="suitcase" p={[px - 0.1, 0.35, -11.85]} ry={Math.PI / 2} s={0.7} />
        {card(walker(act(HERO, 7, [[846, "panic"]], () => UP_L, () => UP_R), keys([[846, [10.5, 0, -11.2]], [932, [15.5, 0, -11.25]]]), f, { pos: cam, look: [17, 1, -11.4] }, 846), cam, hi)}</>; } },
  // 17. "And one type of robot inside the bedrooms" - night bedroom, slow push to the little robot on the nightstand
  { a: 932, b: 1004, look: NIGHT, out: "cut", cam: C([ROOM_AT[0] + 1.0, 1.9, ROOM_AT[2] + 0.9], [ROOM_AT[0] - 1.0, 1.0, ROOM_AT[2] - 0.4], 52, [ROOM_AT[0] - 0.55, 1.3, ROOM_AT[2] + 0.95], [BOT[0], BOT[1] + 0.2, BOT[2]], 40),
    world: (f, u, cam, hi) => <><Bedroom glow={0.15} eyes={0} />{card(sleeper(f, 0), cam, hi)}</> },
  // 18. "could mistake guests' snoring for someone trying to speak to it" - he snores, its eyes light on every snore
  { a: 1004, b: 1104, look: NIGHT, out: "cut", cam: C([ROOM_AT[0] + 0.2, 2.1, ROOM_AT[2] + 0.9], [ROOM_AT[0] - 1.3, 0.95, ROOM_AT[2] - 0.6], 50, [ROOM_AT[0] - 0.1, 1.95, ROOM_AT[2] + 0.6], [ROOM_AT[0] - 1.4, 0.95, ROOM_AT[2] - 0.7], 46),
    world: (f, u, cam, hi) => { const g = snoreGlow(f); return <><Bedroom glow={g} eyes={g} />{card(sleeper(f, 0), cam, hi)}<Zs at={[ROOM_AT[0] - 1.6, 1.3, ROOM_AT[2] - 0.46]} f={f} on={1} /></>; } },
  // 19. "which meant it would wake people up while they were sleeping" - full blast: he jolts upright (shake)
  { a: 1104, b: 1200, look: WAKE, out: "cut", cam: (u, f) => { const s = shake(f, f > 1112 && f < 1150 ? 0.02 : 0, 5); return { pos: add([ROOM_AT[0] - 0.1, 1.55, ROOM_AT[2] + 0.7], s), look: add([ROOM_AT[0] - 1.5, 1.15, ROOM_AT[2] - 0.6], s), fov: 50, dof: 0.4 }; },
    world: (f, u, cam, hi) => <><Bedroom glow={1} eyes={1} />{card(sleeper(f, sm(1112, 1122, f)), cam, hi)}</> },
  // 20. "Oops." - close-up: the little robot blinks innocently
  { a: 1200, b: 1226, look: NIGHT, out: "whip", whipDir: 1, cam: C([BOT[0] + 0.8, BOT[1] + 0.28, BOT[2] + 0.18], [BOT[0], BOT[1] + 0.18, BOT[2]], 40, [BOT[0] + 0.65, BOT[1] + 0.25, BOT[2] + 0.15], [BOT[0], BOT[1] + 0.18, BOT[2]], 34, ease, 0.3),
    world: () => <Bedroom glow={0.5} eyes={0.5} /> },
  // 21. "Meanwhile, human employees kept having to step in and fix things" - the technician fixing the kiosk (sparks)
  { a: 1226, b: 1334, look: LOBBY, out: "cut", cam: C([5.2, 1.3, -6.3], [6.6, 1.1, -8.4], 48, [5.6, 1.35, -6.9], [6.7, 1.1, -8.5], 42),
    world: (f, u, cam, hi) => <><Lobby f={f} />{card(stand(act(TECH, 24, [[1226, "focused"], [1280, "xDisbelief"]], undefined, (g) => A([110, 40 + 25 * Math.sin(g * 0.6)], "grip", 1, 1.2, [100, 30])), [6.0, 0, -8.05], f, { lean: 0.1 }), cam, hi)}
      <pointLight position={[6.6, 1.0, -8.3]} intensity={(f % 11) < 3 ? 8 : 0} distance={2.5} color="#9fe0ff" />
      {card(walker(act(KEN, 21, [[1226, "panic"]], () => HOLD), keys([[1226, [2.0, 0, -9.5]], [1334, [8.0, 0, -12.0]]]), f, { pos: cam, look: [6.7, 1, -8.5] }, 1226), cam, hi, 1)}</> },
  // 22. "Eventually the hotel realized..." - the employee buried in work: pushing the stuck porter, the manager facepalms
  { a: 1334, b: 1424, look: LOBBY, out: "cut", cam: C([0.6, 1.5, -5.6], [-1.6, 1.2, -9.4], 50, [0.2, 1.45, -6.6], [-1.8, 1.2, -9.6], 46),
    world: (f, u, cam, hi) => <><Lobby f={f} raptorClip="Sniff" />
      {card(stand(act(MANAGER, 25, [[1334, "comicSerious"], [1370, "cringe"]], undefined, (g) => g > 1370 ? FACEPALM : HOLD), [-0.6, 0, -8.6], f), cam, hi)}
      {card(stand(act(KEN, 21, [[1334, "nervousLaugh"], [1390, "embarrassed"]], () => HOLD, () => HOLD), [-2.3, 0, -9.6], f, { lean: 0.14 }), cam, hi, 1)}
      <GModel name="suitcase" p={[-2.3, 0.0, -9.2]} s={0.8} /></> },
  // 23. "...creating more work instead of saving it" - the raptor stares at a passport, upside down; staff hold it right way
  { a: 1424, b: 1508, look: LOBBY, out: "whip", whipDir: -1, cam: C([-2.4, 1.6, -9.6], [-3.0, 1.7, -12.0], 50, [-2.6, 1.55, -10.1], [-3.0, 1.75, -12.0], 46),
    world: (f, u, cam, hi) => <><Lobby f={f} raptorClip="Sniff" raptorT={(f - 1424) / 30} />{card(stand(act(KEN, 21, [[1424, "uncomfyGrin"]], undefined, () => A([110, -60], "open", 1, 1.6, [90, -20])), [-2.4, 0, -10.6], f), cam, hi)}
      <mesh position={[-2.75, 1.4, -11.3]} rotation={[0, 0.3, f > 1470 ? 0 : Math.PI]}><boxGeometry args={[0.12, 0.17, 0.01]} /><meshStandardMaterial color="#7a1e2a" /></mesh></> },
  // 24. "So in 2019" - insert: the desk calendar, a page flips to 2019 (push-in)
  { a: 1508, b: 1560, look: LOBBY, out: "cut", cam: C([0.95, 1.32, -10.4], [0.9, 1.16, -11.15], 40, [0.92, 1.24, -10.75], [0.9, 1.16, -11.15], 34, ease, 0.6),
    world: (f) => <><Lobby f={f} /><Calendar at={[0.9, DESK.h, -11.12]} flip={sm(1516, 1530, f)} /></> },
  // 25. "it retired more than half of its robotic workforce" - robots wheeled out on dollies; the raptor curls up to sleep
  { a: 1560, b: 1646, look: LOBBY, out: "dissolve", cam: C([2.0, 1.6, -2.2], [6.0, 0.9, -7.0], 52, [0.8, 1.7, -1.6], [-1.0, 1.0, -10.5], 54),
    world: (f, u, cam, hi) => { const k = (f - 1560) / 86; return <><Lobby f={f} raptorClip={f > 1600 ? "Go to Sleep" : "Idle_01"} raptorT={f > 1600 ? Math.min(1.2, (f - 1600) / 30) : f / 30} workers={(i) => ({ rx: 0, clip: "IDLE", t: 0, gone: i % 2 === 0 })} />
      {[0, 1, 2].map((i) => { const x = 6.5 - (k * 7 + i * 1.6); return <React.Fragment key={i}><Dolly p={[x, 0, -4.2 - i * 0.6]} ry={-Math.PI / 2} /><GModel name="humanoid" p={[x, 0.14, -4.2 - i * 0.6]} ry={-Math.PI / 2} rx={-0.25} clip="IDLE" t={0} /></React.Fragment>; })}
      {card(walker(act(KEN, 21, [[1560, "relieved"]], () => HOLD, () => HOLD), keys([[1560, [7.6, 0, -4.4]], [1646, [0.2, 0, -4.6]]]), f, { pos: cam, look: [0, 1, -6] }, 1560), cam, hi)}</>; } },
  // 26. "And that's why..." - back outside: pull out from the hotel (loops into shot 1)
  { a: 1646, b: 1679, look: EXT, out: "cut", cam: C([-1, 3.5, 34], [0, 3, 12], 52, [-3, 7, 48], [0, 6, 8], 46), world: () => <Exterior /> },
];
const snoreGlow = (f: number) => { const ph = ((f - 1004) % 60 + 60) % 60 / 60; return ph > 0.45 && ph < 0.8 ? Math.sin((ph - 0.45) / 0.35 * Math.PI) : 0; };
/** the hero asleep on the downloaded bed (card lying on its back), sitting up with `up` */
const sleeper = (f: number, up: number): Placed => { const a = act(HERO, 7, up > 0.3 ? [[0, "hugeShock"], [1150, "xDisbelief"], [1190, "suspSquint"]] : [[0, "neutral"]]);
  const pose = stand(a, [0, 0, 0], f, {}).pose; if (up < 0.3) { const ph = ((f - 1004) % 60 + 60) % 60 / 60; pose.blink = true; pose.mouth = ph > 0.45 && ph < 0.8 ? "o" : "flat"; pose.mouthW = 0.7 + 0.5 * Math.sin(ph * Math.PI); pose.lids = 1; }
  const lie: V3 = [ROOM_AT[0] - 1.05, 1.02, ROOM_AT[2] - 0.46], sit: V3 = [ROOM_AT[0] - 1.4, 1.3, ROOM_AT[2] - 0.46];
  return { pose, pos: lv(lie, sit, up), h: 1.55, centre: true, roll: (Math.PI / 2) * (1 - up), halo: 0.08, contact: 0 }; };

// ================================================================= transitions (whip pan / dissolve) + the film
const WHIP = 6, DISS = 12;
const shotAt = (f: number) => { let i = SHOTS.findIndex((s) => f >= s.a && f < s.b); if (i < 0) i = SHOTS.length - 1; return i; };
const camFor = (s: Shot, f: number, extraYaw = 0, blur = 0): TCam => { const c = s.cam((f - s.a) / (s.b - s.a), f);
  if (!extraYaw && !blur) return c; const d = [c.look[0] - c.pos[0], c.look[2] - c.pos[2]], ca = Math.cos(extraYaw), sa = Math.sin(extraYaw);
  return { ...c, look: [c.pos[0] + d[0] * ca - d[1] * sa, c.look[1], c.pos[2] + d[0] * sa + d[1] * ca], mblur: [blur, 0] }; };
const Layer: React.FC<{ s: Shot; f: number; yaw?: number; blur?: number }> = ({ s, f, yaw = 0, blur = 0 }) => {
  const c = camFor(s, f, yaw, blur), u = (f - s.a) / (s.b - s.a);
  return <ToonSet c={c} m={s.look} f={f} world={({ hi, cam }) => s.world(f, u, cam, hi)} />;
};
export const RobotHotelFilm: React.FC<{ frame?: number }> = ({ frame }) => {
  const f0 = useCurrentFrame(), f = frame ?? f0, r0 = useTexReady(), r1 = useHotelReady(), r2 = useH2Ready();
  if (!r0 || !r1 || !r2) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const i = shotAt(f), s = SHOTS[i], prev = SHOTS[(i + SHOTS.length - 1) % SHOTS.length], next = SHOTS[(i + 1) % SHOTS.length];
  // whip: the last WHIP frames of a shot swing away fast with motion blur; the first WHIP frames of the next swing in
  if (s.out === "whip" && f >= s.b - WHIP) { const k = (f - (s.b - WHIP)) / WHIP; return <AbsoluteFill><Layer s={s} f={f} yaw={(s.whipDir ?? 1) * 0.9 * k * k} blur={(s.whipDir ?? 1) * 0.35 * k} /></AbsoluteFill>; }
  if (prev.out === "whip" && f < s.a + WHIP) { const k = 1 - (f - s.a) / WHIP; return <AbsoluteFill><Layer s={s} f={f} yaw={-(prev.whipDir ?? 1) * 0.9 * k * k} blur={(prev.whipDir ?? 1) * 0.35 * k} /></AbsoluteFill>; }
  if (s.out === "dissolve" && f >= s.b - DISS / 2) { const k = (f - (s.b - DISS / 2)) / DISS; return <AbsoluteFill><Layer s={s} f={f} /><AbsoluteFill style={{ opacity: k }}><Layer s={next} f={next.a} /></AbsoluteFill></AbsoluteFill>; }
  if (prev.out === "dissolve" && f < s.a + DISS / 2) { const k = 0.5 + (f - s.a) / DISS; return <AbsoluteFill><Layer s={prev} f={prev.b - 1} /><AbsoluteFill style={{ opacity: k }}><Layer s={s} f={f} /></AbsoluteFill></AbsoluteFill>; }
  return <AbsoluteFill><Layer s={s} f={f} /></AbsoluteFill>;
};
export const SHOT_STARTS = SHOTS.map((s) => s.a);
/** QC: the middle frame of every shot */
export const MID = SHOTS.map((s) => Math.round((s.a + s.b) / 2));
export const RH2Mids: React.FC = () => { const f = useCurrentFrame(); return <RobotHotelFilm frame={MID[Math.min(f, MID.length - 1)]} />; };
/** QC: chosen film frames (edit PROBE to inspect any moment) */
export const PROBE = [935, 1000, 1150, 1212, 1218];
export const RH2Probe: React.FC = () => { const f = useCurrentFrame(); return <RobotHotelFilm frame={PROBE[Math.min(f, PROBE.length - 1)]} />; };
void mixArm; void REST_L; void REST_R; void DOOR101; void COR;
