#!/usr/bin/env node
// TwistFrame optional tool: OFFLINE rigid-body physics with Rapier (the engine behind pmndrs/react-three-rapier).
// Why offline: Remotion renders frames out of order and the cloud renderer splits a video across several machines,
// so a live physics world (react-three-rapier steps in useFrame on the wall clock) would give different results per
// chunk. Instead we simulate ONCE here at a fixed 240 Hz step and store one pose per video frame; the scene then reads
// pose[frame] - a pure function of the frame like everything else in TwistFrame (deterministic, chunk-safe).
//   node bake-physics.mjs scene.json out.json
// scene.json: { "fps": 30, "frames": 150, "startFrame": 0, "gravity": [0,-9.81,0], "substeps": 8,
//   "static": [{ "shape": "box", "size": [hx,hy,hz], "pos": [..], "rot": [x,y,z] (euler), "friction": 0.8 }],
//   "bodies": [{ "id": "cone1", "shape": "box|ball|cylinder|cone", "size": [hx,hy,hz] | r | [halfH, r], "pos": [..], "rot": [..],
//     "vel": [..], "angvel": [..], "density": 1, "friction": 0.7, "restitution": 0.2, "sleepAt": frame?,
//     "kick": { "frame": 40, "impulse": [..], "at": [offset from the body centre, optional], "torque": [..] } }] }
// out.json: { fps, frames, startFrame, bodies: { id: [[px,py,pz, qx,qy,qz,qw], ... one per frame] } }
import RAPIER from "@dimforge/rapier3d-compat";
import { readFileSync, writeFileSync } from "node:fs";

const [inp, out] = process.argv.slice(2);
if (!inp || !out) { console.error("usage: bake-physics.mjs scene.json out.json"); process.exit(2); }
const S = JSON.parse(readFileSync(inp, "utf8"));
await RAPIER.init({});
const fps = S.fps ?? 30, frames = S.frames, sub = S.substeps ?? 8, dt = 1 / (fps * sub);
const world = new RAPIER.World({ x: S.gravity?.[0] ?? 0, y: S.gravity?.[1] ?? -9.81, z: S.gravity?.[2] ?? 0 });
world.timestep = dt;
const quat = (e = [0, 0, 0]) => { const [x, y, z] = e.map((a) => a / 2); const c = [Math.cos(x), Math.cos(y), Math.cos(z)], s = [Math.sin(x), Math.sin(y), Math.sin(z)];
  return { x: s[0] * c[1] * c[2] + c[0] * s[1] * s[2], y: c[0] * s[1] * c[2] - s[0] * c[1] * s[2], z: c[0] * c[1] * s[2] + s[0] * s[1] * c[2], w: c[0] * c[1] * c[2] - s[0] * s[1] * s[2] }; };   // XYZ order (three.js default)
const collider = (b) => { const s = b.size; switch (b.shape) {
  case "ball": return RAPIER.ColliderDesc.ball(s);
  case "cylinder": return RAPIER.ColliderDesc.cylinder(s[0], s[1]);
  case "cone": return RAPIER.ColliderDesc.cone(s[0], s[1]);
  default: return RAPIER.ColliderDesc.cuboid(s[0], s[1], s[2]); } };
for (const g of S.static ?? []) { const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...g.pos).setRotation(quat(g.rot)));
  world.createCollider(collider(g).setFriction(g.friction ?? 0.8).setRestitution(g.restitution ?? 0.1), rb); }
const bodies = (S.bodies ?? []).map((b) => { const d = RAPIER.RigidBodyDesc.dynamic().setTranslation(...b.pos).setRotation(quat(b.rot)).setCcdEnabled(true).setLinearDamping(b.linDamp ?? 0.25).setAngularDamping(b.angDamp ?? 0.9);
  if (b.vel) d.setLinvel(...b.vel); if (b.angvel) d.setAngvel({ x: b.angvel[0], y: b.angvel[1], z: b.angvel[2] });
  const rb = world.createRigidBody(d); world.createCollider(collider(b).setDensity(b.density ?? 1).setFriction(b.friction ?? 0.7).setRestitution(b.restitution ?? 0.2), rb);
  return { b, rb, track: [] }; });
const rec = () => { for (const o of bodies) { const t = o.rb.translation(), r = o.rb.rotation(); o.track.push([t.x, t.y, t.z, r.x, r.y, r.z, r.w].map((v) => +v.toFixed(5))); } };
for (let f = 0; f < frames; f++) {
  rec();
  for (const o of bodies) if (o.b.kick && o.b.kick.frame === f) { const k = o.b.kick; if (k.impulse) { const I = { x: k.impulse[0], y: k.impulse[1], z: k.impulse[2] }; if (k.at) { const t = o.rb.translation(); o.rb.applyImpulseAtPoint(I, { x: t.x + k.at[0], y: t.y + k.at[1], z: t.z + k.at[2] }, true); } else o.rb.applyImpulse(I, true); } if (k.torque) o.rb.applyTorqueImpulse({ x: k.torque[0], y: k.torque[1], z: k.torque[2] }, true); }
  for (let i = 0; i < sub; i++) world.step();
}
const res = { fps, frames, startFrame: S.startFrame ?? 0, engine: `rapier3d-compat ${RAPIER.version()}`, bodies: Object.fromEntries(bodies.map((o) => [o.b.id, o.track])) };
writeFileSync(out, JSON.stringify(res));
console.log(`baked ${bodies.length} bodies x ${frames} frames (${sub} substeps/frame, dt ${(dt * 1000).toFixed(2)} ms) -> ${out}`);
