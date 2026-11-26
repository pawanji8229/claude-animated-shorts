// Outdoor reflection environment for short3: a PMREM of a sky dome + warm ground + a ring of building silhouettes,
// so glass, brass and paint reflect a believable street instead of the default studio room.
// Mounted AFTER SetRig: it overrides scene.environment on every render.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

export const SkyEnv: React.FC<{ intensity?: number; warm?: number }> = ({ intensity = 0.55, warm = 0 }) => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const s = new THREE.Scene();
    const c = document.createElement("canvas"); c.width = 16; c.height = 256; const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#3f7cc9"); gr.addColorStop(0.42, "#9cc3ea"); gr.addColorStop(0.5, "#f1ead8"); gr.addColorStop(0.52, "#8a7a64"); gr.addColorStop(1, "#4a4036");
    g.fillStyle = gr; g.fillRect(0, 0, 16, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
    const bm = new THREE.MeshBasicMaterial({ color: "#6b4a3c" }), bm2 = new THREE.MeshBasicMaterial({ color: "#8c7a66" });
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, h = 6 + ((i * 7) % 5) * 3, m = new THREE.Mesh(new THREE.BoxGeometry(9, h, 4), i % 2 ? bm : bm2); m.position.set(Math.cos(a) * 30, h / 2 - 1, Math.sin(a) * 30); m.lookAt(0, h / 2 - 1, 0); s.add(m); }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 10, 8) })); sun.position.set(-20, 30, 25); s.add(sun);
    const pm = new THREE.PMREMGenerator(gl); const tex = pm.fromScene(s, 0.02).texture; pm.dispose(); return tex;
  }, [gl]);
  useLayoutEffect(() => { scene.environment = env; scene.environmentIntensity = intensity * (1 - 0.2 * warm); });
  return null;
};
