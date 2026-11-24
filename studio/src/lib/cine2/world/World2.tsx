// World 2.0 renderer: draws a populated world with instancing (one InstancedMesh per object type x LOD x material),
// shared materials (Lighting 2.0 surface library, wetness from the LightSpec), per-shot LOD + visibility culling,
// deterministic life (wind sway, rolling vehicles on paths, machine cycles, bobbing boats, smoke, birds, walkers) and
// grounding contact shadows. Everything is a pure function of the frame + the shot's camera samples.
import React, { useMemo } from "react";
import * as THREE from "three";
import { DEFS, mergeByMaterial, type Part, type Lod, type V3 } from "./kit";
import { building } from "./building";
import { shotSelect, type World, type ShotCam } from "./place";
import { moverAt, walkerScript, birdAt } from "./life";
import { groundY, type Recipe } from "./recipes";
import { surfaceMaterial } from "../light/materials";
import { WaterSurface, ContactShadow } from "../light/Light2";
import { Toon2Lit } from "../light/Toon2Lit";
import { evaluate as evalChar } from "../../../char/tf2/planner";
import type { LightSpec, Practical } from "../light/model";
import { kelvin } from "../light/model";
import type { Quality } from "../light/presets";

// ---------------------------------------------------------------- geometry caches (module level, shared by all frames)
const objCache = new Map<string, { geo: THREE.BufferGeometry; proto: Part }[]>();
const objGeo = (def: string, lod: Lod, variant: number, filter?: (p: Part) => boolean) => {
  const k = `${def}|${lod}|${variant}|${filter ? "f" : ""}`; let g = objCache.get(k);
  if (!g) { const parts = DEFS.get(def)!.build(lod, variant).filter(filter ?? (() => true)); g = parts.length ? mergeByMaterial(parts).map((x) => ({ geo: x.geo, proto: x.proto })) : []; objCache.set(k, g); }
  return g;
};
const matFor = (p: Part, wet: number) => surfaceMaterial(p.s, { tint: p.tint, emissive: p.em, emissiveIntensity: p.emI, wet: p.s === "glass" || p.s === "emissive" ? 0 : wet });
const variantsOf = (def: string) => DEFS.get(def)?.variants ?? 3;
const isNight = (l: LightSpec) => l.weather === "night" || l.key.intensity < 0.6 || l.exposure > 1.35;

/** practical light sources of the world (lamps, work lights, windows...) for Lighting 2.0 */
export const worldPracticals = (w: World, light: LightSpec, interior = false): Practical[] => {
  const night = isNight(light) || interior, out: Practical[] = [];
  for (const p of w.placements) { const d = DEFS.get(p.def); const L = d?.light; if (!L || (L.night && !night)) continue;
    const c = Math.cos(p.ry), s = Math.sin(p.ry), at: V3 = [p.pos[0] + L.at[0] * c + L.at[2] * s, p.pos[1] + L.at[1], p.pos[2] - L.at[0] * s + L.at[2] * c];
    const dir = L.dir ? ([L.dir[0] * c + L.dir[2] * s, L.dir[1], -L.dir[0] * s + L.dir[2] * c] as V3) : undefined;
    out.push({ id: p.id, kind: L.kind === "window" ? "window" : L.kind === "screen" ? "screen" : L.kind === "street" ? "street" : L.kind === "work" ? "work" : L.kind === "warning" ? "warning" : L.kind === "ship" ? "ship" : "lamp", pos: at, color: kelvin(L.K), lumens: L.lumens, range: L.range, dir, angle: dir ? 0.95 : undefined, flicker: L.flicker, importance: L.kind === "street" || L.kind === "work" ? 0.7 : 0.4 }); }
  return out;
};

// ---------------------------------------------------------------- static instanced objects
type Group = { def: string; lod: Lod; variant: number; items: { pos: V3; ry: number; scale: number; seed: number; bob: boolean }[] };
const InstancedGroup: React.FC<{ g: Group; wet: number; t: number; wind: number }> = ({ g, wet, t, wind }) => {
  const d = DEFS.get(g.def)!, geos = objGeo(g.def, g.lod, g.variant), sway = d.anim === "wind" ? wind : 0;
  const meshes = useMemo(() => geos.map((x) => { const im = new THREE.InstancedMesh(x.geo, matFor(x.proto, wet), g.items.length); im.castShadow = x.proto.s !== "glass" && x.proto.s !== "emissive" && g.lod < 2; im.receiveShadow = true; im.frustumCulled = false; return im; }), [geos, g.items.length, wet]);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  g.items.forEach((it, i) => {
    const sw = sway ? sway * (0.6 * Math.sin(t * 1.3 + it.seed) + 0.4 * Math.sin(t * 2.9 + it.seed * 1.7)) : 0, bobY = it.bob ? 0.12 * Math.sin(t * 0.9 + it.seed) : 0, roll = it.bob ? 0.025 * Math.sin(t * 0.7 + it.seed * 2) : 0;
    E.set(sw * 0.6, it.ry, sw + roll, "YXZ"); Q.setFromEuler(E); P.set(it.pos[0], it.pos[1] + bobY, it.pos[2]); S.setScalar(it.scale); M.compose(P, Q, S);
    for (const m of meshes) m.setMatrixAt(i, M);
  });
  for (const m of meshes) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
/** moving sub-assemblies (excavator arm, crane jib, mixer drum, fan) rendered per object */
const MovingRig: React.FC<{ def: string; lod: Lod; variant: number; pos: V3; ry: number; t: number; seed: number; wet: number }> = ({ def, lod, variant, pos, ry, t, seed, wet }) => {
  const d = DEFS.get(def)!, rig = useMemo(() => d.moving!(lod, variant).map((m) => ({ ...m, merged: mergeByMaterial(m.parts) })), [def, lod, variant]);
  const build = (idx: number): React.ReactNode => { const m = rig[idx], ang = m.motion(t, seed), rot: [number, number, number] = m.axis === "x" ? [ang, 0, 0] : m.axis === "y" ? [0, ang, 0] : [0, 0, ang];
    return (<group key={idx} position={m.pivot} rotation={rot}>{m.merged.map((x, k) => <mesh key={k} geometry={x.geo} material={matFor(x.proto, wet)} castShadow receiveShadow />)}{rig.map((c, ci) => (c.parent === idx ? build(ci) : null))}</group>); };
  return <group position={pos} rotation={[0, ry, 0]}>{rig.map((m, i) => (m.parent === undefined ? build(i) : null))}</group>;
};
/** a vehicle / boat / machine on a path: body + rolling wheels */
const MoverView: React.FC<{ def: string; lod: Lod; variant: number; pos: V3; heading: number; wheel: number; wet: number; t: number; water: boolean }> = ({ def, lod, variant, pos, heading, wheel, wet, t, water }) => {
  const body = objGeo(def, lod, variant, (p) => p.tag !== "wheel"), wheels = useMemo(() => {
    const parts = DEFS.get(def)!.build(lod, variant).filter((p) => p.tag === "wheel"), groups = new Map<string, Part[]>();
    for (const p of parts) { p.g.computeBoundingBox(); const c = p.g.boundingBox!.getCenter(new THREE.Vector3()), k = `${c.y.toFixed(2)}|${c.z.toFixed(2)}|${Math.sign(c.x)}`; const arr = groups.get(k) ?? []; arr.push(p); groups.set(k, arr); }
    return [...groups.values()].map((ps) => { const bb = new THREE.Box3(); ps.forEach((p) => bb.union(p.g.boundingBox!)); const c = bb.getCenter(new THREE.Vector3()); return { c: [c.x, c.y, c.z] as V3, merged: mergeByMaterial(ps.map((p) => ({ ...p, g: p.g.clone().translate(-c.x, -c.y, -c.z) }))) }; });
  }, [def, lod, variant]);
  const bob = water ? 0.12 * Math.sin(t * 0.9 + def.length) : 0, roll = water ? 0.02 * Math.sin(t * 0.7) : 0;
  return (<group position={[pos[0], pos[1] + bob, pos[2]]} rotation={[0, heading, roll]}>
    {body.map((x, i) => <mesh key={i} geometry={x.geo} material={matFor(x.proto, wet)} castShadow receiveShadow />)}
    {wheels.map((w, i) => <group key={i} position={w.c} rotation={[wheel, 0, 0]}>{w.merged.map((x, k) => <mesh key={k} geometry={x.geo} material={matFor(x.proto, wet)} castShadow />)}</group>)}
  </group>);
};
const BuildingView: React.FC<{ b: World["buildings"][number]; lod: Lod; night: boolean; wet: number }> = ({ b, lod, night, wet }) => {
  const merged = useMemo(() => mergeByMaterial(building({ ...b.spec, night }, lod)), [b.id, lod, night]);
  return <group position={b.pos} rotation={[0, b.ry, 0]}>{merged.map((x, i) => <mesh key={i} geometry={x.geo} material={matFor(x.proto, wet)} castShadow={x.proto.s !== "glass"} receiveShadow />)}</group>;
};
const smokeTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
const EMIT: Record<string, { at: V3; kind: "smoke" | "steam" }[]> = { cargoShip: [{ at: [0, 32.5, -54], kind: "smoke" }], tugboat: [{ at: [0, 8.6, -1.5], kind: "smoke" }], generator: [{ at: [0.6, 1.5, 0.2], kind: "smoke" }], storageTank: [{ at: [0, 7.2, 0], kind: "steam" }] };
/** drifting smoke / steam puffs (deterministic: each puff's age is a function of time and its index) */
const Smoke: React.FC<{ at: V3; t: number; kind: "smoke" | "steam"; seed: number }> = ({ at, t, kind, seed }) => {
  const n = 14, life = kind === "smoke" ? 7 : 4; return (<group>{Array.from({ length: n }, (_, i) => { const age = (((t + (i * life) / n + seed) % life) + life) % life, k = age / life;
    return <sprite key={i} position={[at[0] + k * 2.5 + Math.sin(i * 1.7) * 0.2, at[1] + k * (kind === "smoke" ? 5 : 3), at[2] + k * 0.8]} scale={[0.6 + k * 3, 0.6 + k * 3, 1]}><spriteMaterial map={smokeTex()} color={kind === "smoke" ? "#6a6a68" : "#e8eaec"} transparent opacity={(1 - k) * (kind === "smoke" ? 0.35 : 0.45)} depthWrite={false} /></sprite>; })}</group>);
};
const Birds: React.FC<{ n: number; c: V3; R: number; t: number; f: number; kind: "gull" | "pigeon" }> = ({ n, c, R, f, kind }) => {
  const wing = useMemo(() => new THREE.PlaneGeometry(kind === "gull" ? 0.55 : 0.3, 0.12).translate(kind === "gull" ? 0.27 : 0.15, 0, 0), [kind]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: kind === "gull" ? "#e8e8e4" : "#6a6a72", side: THREE.DoubleSide, roughness: 0.9 }), [kind]);
  return (<group>{Array.from({ length: n }, (_, i) => { const b = birdAt(i, f, c, R); return (<group key={i} position={b.pos} rotation={[0, b.heading, 0]}>
    <mesh geometry={wing} material={mat} rotation={[Math.PI / 2, 0, b.flap * 0.6]} /><mesh geometry={wing} material={mat} rotation={[Math.PI / 2, Math.PI, -b.flap * 0.6]} /></group>); })}</group>);
};

export type World2Props = { recipe: Recipe; world: World; f: number; cam: V3; shot: ShotCam[]; light: LightSpec; quality?: Quality; hi: boolean; walkers?: boolean; birds?: boolean; walkerFrames?: number; fps?: number };
export const World2: React.FC<World2Props> = ({ recipe, world, f, cam, shot, light, quality = "BALANCED", hi, walkers = true, birds = true, walkerFrames = 600, fps = 30 }) => {
  const t = f / fps, wet = light.wet, night = isNight(light), wind = light.weather === "storm" ? 0.05 : light.weather === "rain" ? 0.03 : 0.018;
  const shotKey = shot.map((c) => c.pos.map((v) => v.toFixed(1)).join(",")).join("|");
  const vis = useMemo(() => shotSelect(world, shot), [world, shotKey]);
  const groups = useMemo(() => { const m = new Map<string, Group>();
    for (const p of world.placements) { const lod = vis.get(p.id); if (lod === undefined) continue; const d = DEFS.get(p.def)!; if (d.moving) continue; const v = p.variant % variantsOf(p.def), k = `${p.def}|${lod}|${v}`;
      let g = m.get(k); if (!g) { g = { def: p.def, lod, variant: v, items: [] }; m.set(k, g); } g.items.push({ pos: p.pos, ry: p.ry, scale: p.scale, seed: p.id.length * 7.3 + p.pos[0] * 0.37 + p.pos[2] * 0.11, bob: d.place === "water" }); }
    return [...m.values()]; }, [world, vis]);
  const movingObjs = world.placements.filter((p) => vis.has(p.id) && DEFS.get(p.def)!.moving);
  const scripts = useMemo(() => (walkers ? recipe.walkers.map((w) => walkerScript(w, walkerFrames, fps)) : []), [recipe, walkers, walkerFrames]);
  const water = recipe.water;
  return (<group>
    {/* base set: ground surfaces (with thickness, so raised pavements have real curbs), interior shells, water */}
    {recipe.ground.filter((g) => !(recipe.groundFn && g.s === "vegetation")).map((g, i) => <mesh key={`g${i}`} position={[g.area.cx, g.y - g.h / 2, g.area.cz]} rotation={[0, g.area.ry ?? 0, 0]} receiveShadow material={surfaceMaterial(g.s, { tint: g.tint, wet: g.s === "vegetation" ? wet * 0.3 : wet, repeat: g.repeat ?? 1 })}><boxGeometry args={[g.area.w, Math.max(0.01, g.h), g.area.d]} /></mesh>)}
    {recipe.groundFn && <Terrain recipe={recipe} wet={wet} />}
    {recipe.shells.map((s, i) => <mesh key={`s${i}`} position={[(s.box[0][0] + s.box[1][0]) / 2, (s.box[0][1] + s.box[1][1]) / 2, (s.box[0][2] + s.box[1][2]) / 2]} receiveShadow castShadow material={surfaceMaterial(s.s, { tint: s.tint })}><boxGeometry args={[s.box[1][0] - s.box[0][0], s.box[1][1] - s.box[0][1], s.box[1][2] - s.box[0][2]]} /></mesh>)}
    {water && <WaterSurface size={[Math.min(water.area.w, 260), Math.min(water.area.d, 160)]} at={[water.area.cx, water.y, water.area.cz]} f={f} seg={hi ? 120 : 80} amp={recipe.env === "countryside" ? 0.02 : 0.12} />}
    {world.buildings.filter((b) => vis.has(b.id)).map((b) => <BuildingView key={b.id} b={b} lod={vis.get(b.id)!} night={night} wet={wet} />)}
    {groups.map((g) => <InstancedGroup key={`${g.def}|${g.lod}|${g.variant}`} g={g} wet={wet} t={t} wind={wind} />)}
    {movingObjs.map((p) => <React.Fragment key={p.id}><mesh visible={false} /><group>{(() => { const lod = vis.get(p.id)!, v = p.variant % variantsOf(p.def), body = objGeo(p.def, lod, v);
      return <><group position={p.pos} rotation={[0, p.ry, 0]}>{body.map((x, i) => <mesh key={i} geometry={x.geo} material={matFor(x.proto, wet)} castShadow receiveShadow />)}</group><MovingRig def={p.def} lod={lod} variant={v} pos={p.pos} ry={p.ry} t={t} seed={p.pos[0] * 0.13} wet={wet} /></>; })()}</group></React.Fragment>)}
    {recipe.movers.map((m) => { const s = moverAt(m, f, fps); if (!s.visible) return null; const d = Math.hypot(s.pos[0] - cam[0], s.pos[2] - cam[2]); if (d > 260) return null;
      return <MoverView key={m.id} def={m.def} lod={d < 22 ? 0 : d < 70 ? 1 : 2} variant={s.variant % variantsOf(m.def)} pos={s.pos} heading={s.heading} wheel={s.wheelAngle} wet={wet} t={t} water={DEFS.get(m.def)!.place === "water"} />; })}
    {world.placements.filter((p) => EMIT[p.def] && vis.has(p.id)).flatMap((p) => EMIT[p.def].map((e, i) => { const c = Math.cos(p.ry), s = Math.sin(p.ry); return <Smoke key={`${p.id}e${i}`} at={[p.pos[0] + e.at[0] * c + e.at[2] * s, p.pos[1] + e.at[1], p.pos[2] - e.at[0] * s + e.at[2] * c]} t={t} kind={e.kind} seed={i * 1.3 + p.pos[0]} />; }))}
    {recipe.movers.filter((m) => EMIT[m.def]).map((m) => { const s = moverAt(m, f, fps); if (!s.visible) return null; const e = EMIT[m.def][0], c = Math.cos(s.heading), sn = Math.sin(s.heading); return <Smoke key={`${m.id}sm`} at={[s.pos[0] + e.at[0] * c + e.at[2] * sn, s.pos[1] + e.at[1], s.pos[2] - e.at[0] * sn + e.at[2] * c]} t={t} kind={e.kind} seed={3} />; })}
    {quality === "LOW" && world.placements.filter((p) => vis.get(p.id) === 0 && DEFS.get(p.def)!.solid && DEFS.get(p.def)!.place === "ground").map((p) => { const d = DEFS.get(p.def)!; return <ContactShadow key={`cs${p.id}`} at={p.pos} w={d.size[0] * p.scale} d={d.size[2] * p.scale} rot={p.ry} opacity={0.5} />; })}
    {birds && recipe.birds && <Birds n={recipe.birds.count} c={recipe.birds.centre} R={recipe.birds.radius} t={t} f={f} kind={recipe.birds.kind} />}
    {scripts.map((sc, i) => { const fr = evalChar(sc, Math.min(f, walkerFrames), cam); const d = Math.hypot(fr.pos[0] - cam[0], fr.pos[2] - cam[2]); if (d > 70) return null;
      const y = groundY(recipe, fr.pos[0], fr.pos[2]); return <Toon2Lit key={`w${i}`} p={{ fr: { ...fr, pos: [fr.pos[0], fr.pos[1] + y, fr.pos[2]] }, costume: sc.costume, t: f, halo: 0.06 }} cam={cam} hi={hi} light={light} />; })}
  </group>);
};
/** heightfield terrain for recipes with a ground function (countryside) */
const Terrain: React.FC<{ recipe: Recipe; wet: number }> = ({ recipe, wet }) => {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(160, 140, 80, 70).rotateX(-Math.PI / 2); const P = g.attributes.position.array as Float32Array;
    for (let i = 0; i < P.length; i += 3) P[i + 1] = recipe.groundFn!(P[i], P[i + 2] - 8) + 0.01; g.translate(0, 0, -8); g.computeVertexNormals(); return g; }, [recipe]);
  return <mesh geometry={geo} receiveShadow material={surfaceMaterial("vegetation", { tint: "#6a8a3e", wet: wet * 0.3, repeat: 2 })} />;
};
