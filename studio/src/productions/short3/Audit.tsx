// short3 geometry audit composition (not part of the film): builds every static kit in the browser and reports
// coplanar overlapping faces (z-fighting) via console.warn. Render one still of "S3Audit" to run it.
import React, { useEffect } from "react";
import { AbsoluteFill } from "remotion";
import { useTexReady } from "./tex";
import { useHeroKit } from "./Hero";
import { useStreetKit } from "./Street";
import { useStreetBuildings } from "./Neighbours";
import { auditCoplanar, Kit } from "./kit";
import { switchboardKit, phoneBaseKit } from "./Phone";
import { roomKit } from "./IntSet";
const Run: React.FC = () => {
  useEffect(() => {
    const heroRoom = new Kit(); heroRoom.merge(useHeroKit()); heroRoom.merge(roomKit(false));   // EXT: the switchboard room inside the hero
    const kits: [string, Kit][] = [["heroRoom", heroRoom], ["roomINT", roomKit(true)], ["street", useStreetKit()], ["switchboard", switchboardKit(5)], ["phone", phoneBaseKit()], ...useStreetBuildings().map((b, i) => [`neighbour${i}`, b.kit] as [string, Kit])];
    // faces pressed against a facade from outside (back faces of sills, lintels, cornices at z = 0, facing -z) are buried in the wall
    const skip = (n: string) => (ax: number, sgn: number, pl: number) => n.startsWith("neighbour") && ax === 2 && sgn < 0 && Math.abs(pl) < 0.01;
    for (const [n, k] of kits) { const h = auditCoplanar(k, 4e-4, { skip: skip(n) }); const uniq = [...new Map(h.map((x) => [x.plane + x.at.join(","), x])).values()];
      const byPlane = new Map<string, number>(); uniq.forEach((x) => byPlane.set(x.plane, (byPlane.get(x.plane) ?? 0) + 1));
      console.warn(`AUDIT ${n}: ${uniq.length} | planes: ${JSON.stringify([...byPlane].sort((a, b) => b[1] - a[1]).slice(0, 10))} | top: ${JSON.stringify(uniq.slice(0, 4))}`); }
  }, []);
  return <AbsoluteFill style={{ background: "#222" }} />;
};
export const S3Audit: React.FC = () => (useTexReady() ? <Run /> : null);
