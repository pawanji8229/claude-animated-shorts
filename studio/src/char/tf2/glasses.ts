// ORIGINAL TwistFrame glasses asset: "soft-square keyhole panto" (designed for this character, not copied from any product
// or model). Chosen after researching frame/face-shape guidance: round faces read best with structured frames - a panto /
// soft-square shape with a flatter top line, a width matching the face at eye level, and a darker colour; a keyhole
// bridge gives a distinctive vintage-modern look. Dark espresso acetate with a warm edge highlight, silver rivets.
//
// The asset is defined in 3D (millimetre-like units in HEAD space, x across the face, y up, z forward from the face):
//   - two rims (rounded-square outlines, 28 points each) sitting 10 units in front of the eyes,
//   - a keyhole bridge (arched upper bar + lower curved saddle),
//   - two temple arms that run back along the sides of the head to the hinge-to-tip length,
//   - two hinge rivets.
// draw.ts projects it with the SAME head rotation as the eyes every frame (so it can never float or detach), and
// `glassesMesh()` builds a real three.js mesh (tubes) from the same data for GLB export / 3D use.
export const GL = { lensW: 34, lensH: 28, corner: 0.42, topFlat: 0.35, rim: 4.2, eyeX: 50, eyeY: -4, z: 10, templeLen: 1.05, frame: "#2b1d1a", frameHi: "#7a4a30", lens: "rgba(205,232,255,0.16)", metal: "#c8ccd2" };
/** rim outline in lens-local units (-1..1): a superellipse-like soft square with a slightly flattened top line */
export const rimShape = (n = 28): [number, number][] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), p = 2 + GL.corner * 3;
  let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p), y = Math.sign(s) * Math.pow(Math.abs(s), 2 / p); if (y < 0) y *= 1 - GL.topFlat * 0.12 * Math.pow(Math.abs(c), 0.5);   // y < 0 = top (screen up)
  return [x, y * (y < 0 ? 0.94 : 1.04)]; });
/** keyhole bridge: an upper arched bar and a lower saddle between the inner rim edges (lens-local of the LEFT lens at x=+1) */
export const bridgePts = (gap: number): { upper: [number, number][]; saddle: [number, number][] } => ({
  upper: Array.from({ length: 7 }, (_, i) => { const t = i / 6; return [t * gap, -0.62 - Math.sin(Math.PI * t) * 0.16] as [number, number]; }),
  saddle: Array.from({ length: 7 }, (_, i) => { const t = i / 6; return [t * gap, -0.1 - Math.sin(Math.PI * t) * 0.42] as [number, number]; }),
});
/** three.js mesh of the glasses (for GLB export / inspection in 3D); units: card px (head space) */
export const glassesMesh = async () => {
  const THREE = await import("three");
  const grp = new THREE.Group(); const frame = new THREE.MeshStandardMaterial({ color: GL.frame, roughness: 0.35 }), lens = new THREE.MeshPhysicalMaterial({ color: "#dff0ff", transmission: 0.9, transparent: true, opacity: 0.25, roughness: 0.05 });
  const tube = (pts: [number, number, number][], r: number, closed = false) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed), pts.length * 4, r, 8, closed), frame);
  for (const sg of [-1, 1]) { const cx = sg * GL.eyeX, rim = rimShape().map(([x, y]) => [cx + x * GL.lensW, GL.eyeY - y * GL.lensH, GL.z] as [number, number, number]);
    grp.add(tube(rim, GL.rim / 2, true)); const sh = new THREE.Shape(rimShape().map(([x, y]) => new THREE.Vector2(cx + x * (GL.lensW - 2), GL.eyeY - y * (GL.lensH - 2)))); const lm = new THREE.Mesh(new THREE.ShapeGeometry(sh), lens); lm.position.z = GL.z; grp.add(lm);
    // temple: from the outer hinge back along the head side (head radius ~150, the arm follows the curve)
    const hx = cx + sg * GL.lensW, temple: [number, number, number][] = Array.from({ length: 6 }, (_, i) => { const t = i / 5, a = Math.asin(Math.min(0.99, Math.abs(hx) / 150)) + t * GL.templeLen; return [sg * 150 * Math.sin(a) * 1.01, GL.eyeY + 12 - t * 6, 150 * Math.cos(a) * 0.95]; });
    grp.add(tube(temple, GL.rim / 2.4)); }
  const b = bridgePts(2 * (GL.eyeX - GL.lensW) / GL.lensW); for (const line of [b.upper, b.saddle]) grp.add(tube(line.map(([x, y]) => [-GL.eyeX + GL.lensW + x * GL.lensW, GL.eyeY - y * GL.lensH, GL.z] as [number, number, number]), GL.rim / 2.6));
  return grp;
};
