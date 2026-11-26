// Per-frame camera inspection for the continuous take: bridge intersection, ground clearance, jumps.
import { camHook, HOOK_END } from "../src/desert/desertHook";
import { groundY } from "../src/desert/DesertWorld";
import { BRIDGE_LEN, BR2 } from "../src/desert/Bridge";
let bad = 0, maxV = 0, maxA = 0, maxLookA = 0; let pv = 0, plv = 0;
const P = (f: number) => camHook(f);
for (let f = 0; f <= HOOK_END; f++) {
  const c = P(f);
  const inBridge = Math.abs(c.pos[0]) < BRIDGE_LEN / 2 + 3.5 && Math.abs(c.pos[2]) < BR2.width / 2 + 1.2 && c.pos[1] < BR2.deck + 4.5;
  const clear = c.pos[1] - groundY(c.pos[0], c.pos[2]);
  if (inBridge || clear < 0.25) { bad++; console.log(`frame ${f}: ${inBridge ? "INSIDE BRIDGE VOLUME" : ""} clearance=${clear.toFixed(2)}`); }
  if (f > 0) {
    const p0 = P(f - 1); const v = Math.hypot(c.pos[0] - p0.pos[0], c.pos[1] - p0.pos[1], c.pos[2] - p0.pos[2]);
    const lv = Math.hypot(c.look[0] - p0.look[0], c.look[1] - p0.look[1], c.look[2] - p0.look[2]);
    if (f > 1) { maxA = Math.max(maxA, Math.abs(v - pv)); maxLookA = Math.max(maxLookA, Math.abs(lv - plv)); }
    maxV = Math.max(maxV, v); pv = v; plv = lv;
  }
}
console.log(`frames checked: ${HOOK_END + 1}; problems: ${bad}; max camera speed ${(maxV * 30).toFixed(2)} m/s; max frame-to-frame speed change ${(maxA * 30).toFixed(3)} m/s; max look-target accel ${(maxLookA * 30).toFixed(3)} m/s`);
