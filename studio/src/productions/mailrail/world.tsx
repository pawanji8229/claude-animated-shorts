// Mail Rail world assembly: London above, the railway below (station A -> running tunnel with crossover -> station B,
// plus stub tunnels beyond both stations), all in world coordinates. Underground group: x = world x, y = RT, z = UNDER_Z.
import React from "react";
import { London, STATION_X, TUNNEL_X, UNDER_Z } from "./london";
import { Station, StationLights } from "./station";
import { RunningTunnel, LampLights } from "./tunnel";
import { RT, SecCtx, EnableClipping, setSection } from "./cutaway";
import type { V3 } from "../../lib/math";

export const U = (x: number, y: number, z: number): V3 => [x, RT + y, UNDER_Z + z];      // underground-local -> world
export const CROSS_X = 10;                                                                // crossover position (tunnel-local)
export type WorldState = { section: boolean; city: boolean; camX: number; belt?: number; clock?: { hours: number; year: number }; lightK?: number; cool?: number; tunnelK?: number };
export const MRWorld: React.FC<{ w: WorldState }> = ({ w }) => { setSection(w.section);
  return <>
    <EnableClipping />
    <London city={w.city} section={w.section} />
    <SecCtx.Provider value={true}>
      <group position={[0, RT, UNDER_Z]}>
        <group position={[STATION_X.A, 0, 0]}><Station id="A" far={!w.section} clock={undefined} /><StationLights k={w.lightK ?? 1} cool={w.cool ?? 0} /></group>
        <group position={[STATION_X.B, 0, 0]}><Station id="B" far={!w.section} belt={w.belt ?? 0} clock={w.clock} /><StationLights k={w.lightK ?? 1} cool={w.cool ?? 0} /></group>
        <group position={[TUNNEL_X[0], 0, 0]}><RunningTunnel len={TUNNEL_X[1] - TUNNEL_X[0]} id="main" crossover={CROSS_X} /><LampLights x0={0} len={TUNNEL_X[1] - TUNNEL_X[0]} camX={w.camX - TUNNEL_X[0]} i={2.6 * (w.tunnelK ?? 1)} /></group>
        <group position={[STATION_X.A - 14, 0, 0]}><RunningTunnel len={14} id="stubA" /></group>
        <group position={[STATION_X.B + 30, 0, 0]}><RunningTunnel len={14} id="stubB" /></group>
      </group>
    </SecCtx.Provider>
  </>;
};
