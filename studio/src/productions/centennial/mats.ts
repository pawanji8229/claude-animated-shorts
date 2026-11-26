// Centennial Light materials: the short3 CC0 scans (metre UVs) + painted finishes for the two fire stations, the
// apparatus of each era and the bulb itself. Call cm() only after useTexReady() (short3/tex) is true.
import * as THREE from "three";
import { pbr } from "../short3/tex";
import { archMats } from "../short3/archKit";

const std = (color: string, rough = 0.6, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
/** fire-apparatus enamel (deep red, clear-coated) */
export const enamel = (color: string) => phys({ color, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12 });

let M: ReturnType<typeof make> | null = null;
const make = () => { const A = archMats(); return {
  A,
  // ---- old station (brick + timber, 1901..1976)
  brick: pbr("red_brick_03", { normal: 1.15, color: "#efd9c8" }),
  brickOld: pbr("large_red_bricks", { normal: 1.1, color: "#e2c8b6" }),
  brickIn: pbr("red_brick_03", { normal: 1.0, color: "#d8b8a2", emissive: "map", ei: 0.05 }),
  clap: pbr("old_planks_02", { color: "#f1e6cc", scale: 0.45, normal: 0.7, bright: 1.25 }),       // painted clapboard
  clapTrim: std("#f3ead2", 0.65), trimGreen: std("#2c4a3a", 0.55), trimRed: std("#7a2620", 0.55),
  floorOld: pbr("old_wood_floor", { scale: 0.45, normal: 0.9, color: "#e8d2b4" }),
  joist: pbr("dark_wood", { scale: 0.35, normal: 0.8, color: "#c89a6a" }),
  ceilBoard: pbr("old_planks_02", { color: "#f0e6cc", scale: 0.4, normal: 0.6, bright: 1.3 }),     // painted beadboard ceiling
  timber: pbr("old_planks_02", { normal: 1.0, color: "#d8bc96", scale: 0.55 }),
  plasterOld: pbr("beige_wall_001", { color: "#e8dcc0", scale: 0.6, normal: 0.6 }),
  wainscot: pbr("dark_wood", { scale: 0.4, color: "#b08058" }),
  doorPaint: std("#5a2a22", 0.5), doorPaint76: std("#8a1f1a", 0.45),
  dirt: pbr("gravel_road", { normal: 0.8, color: "#d9c4a0", scale: 1.6 }),
  boards: pbr("old_planks_02", { normal: 1.1, color: "#bfa27c", scale: 0.6 }),
  // ---- modern station 6 (1976 build)
  block: pbr("beige_wall_001", { color: "#ece6d8", scale: 0.4, normal: 1.4, bright: 1.3 }),                  // painted concrete block
  brickMod: pbr("brick_wall_006", { normal: 1.0, color: "#c9ad9c", scale: 0.42 }),
  epoxy: phys({ color: "#7d8288", roughness: 0.32, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
  concrete: pbr("concrete_pavement", { normal: 0.7, color: "#e6e2da", scale: 1.0, bright: 1.15 }),
  asphalt: pbr("asphalt_01", { normal: 0.8, color: "#e4e0da", bright: 1.15 }),
  steel: std("#8a9096", 0.45, 0.7), steelDark: std("#3a3f45", 0.5, 0.6), deck: std("#b8bcc0", 0.6, 0.4),
  yellowLine: std("#e8b81e", 0.55), white: std("#f2f0ea", 0.55), offWhite: std("#e6e1d6", 0.7),
  locker: std("#5b6670", 0.4, 0.5), lockerRed: std("#8a1f1e", 0.45, 0.3),
  turnout: std("#b39a62", 0.85), turnoutDk: std("#2a2a28", 0.8), reflect: new THREE.MeshStandardMaterial({ color: "#e8ef6a", roughness: 0.3, emissive: new THREE.Color("#5a6a10"), emissiveIntensity: 0.25 }),
  // ---- metals, glass, details (shared)
  brass: std("#c99a40", 0.24, 0.95), brassDark: std("#8a6428", 0.35, 0.9), copper: std("#b0643a", 0.3, 0.9), nickel: std("#d6d8d8", 0.18, 1),
  castIron: std("#2a2c2e", 0.55, 0.55), black: std("#141414", 0.55, 0.1), rubber: std("#181818", 0.85), leather: std("#3a2418", 0.6), leatherBlk: std("#151210", 0.5),
  canvas: std("#b8a37a", 0.95), hose: std("#c9b48a", 0.85), hoseRed: std("#9a3020", 0.75),
  red: enamel("#a81a16"), red76: enamel("#b8241c"), redMod: enamel("#b01820"), whiteEnamel: enamel("#f2f2ee"), chrome: std("#eef1f3", 0.08, 1),
  gold: std("#d8b04a", 0.3, 0.9), green: std("#2f5a3a", 0.5), greenEnamel: std("#2c5a3e", 0.35, 0.2), creamEnamel: std("#efe8d4", 0.3, 0.1),
  glass: phys({ color: "#e4eef2", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, envMapIntensity: 1.6, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02 }),
  glassWin: phys({ color: "#cfdde4", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, envMapIntensity: 1.4, depthWrite: false }),
  glassDark: phys({ color: "#283038", roughness: 0.08, metalness: 0.3, envMapIntensity: 1.2, clearcoat: 1 }),
  porcelain: std("#f4f1ea", 0.25, 0.05), ebonite: std("#1a1612", 0.4),
  paper: std("#efe6d0", 0.9), wood: pbr("dark_wood", { scale: 0.35, normal: 0.7, color: "#d0a070" }), woodLight: pbr("old_planks_02", { scale: 0.4, color: "#e0c49a" }),
  plastic: std("#2a2c30", 0.5), plasticGrey: std("#7a7e84", 0.5), screen: new THREE.MeshBasicMaterial({ color: "#000000" }),
  lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.75, 1.3), toneMapped: false }),
  lampCool: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.95, 2.0), toneMapped: false }),
  lampOff: std("#d8d2c4", 0.3, 0, { transparent: true, opacity: 0.55 }),
  flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.6), toneMapped: false }),
}; };
export const cm = () => (M ??= make());
export type CM = ReturnType<typeof make>;
