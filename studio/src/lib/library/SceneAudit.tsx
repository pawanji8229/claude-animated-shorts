// Phase 7 scene audit (opt-in: inputProps.__audit). On the audited frame it walks the R3F scene and logs
// "[audit] {...}": triangles, draw calls, meshes, and PRIMITIVE PLACEHOLDER CANDIDATES = untextured Box/Cylinder/
// Sphere/Cone/Plane meshes that cover more than `minScreen` of the frame (projected bounding box). Small primitives
// (struts, rails, bolts) are normal construction and are not flagged. Also reports instanced draws and texture count.
import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { getInputProps, useCurrentFrame } from "remotion";
const ON = (() => { try { return !!(getInputProps() as { __audit?: boolean }).__audit; } catch { return false; } })();
const PRIM = new Set(["BoxGeometry", "CylinderGeometry", "SphereGeometry", "ConeGeometry", "PlaneGeometry", "IcosahedronGeometry", "CapsuleGeometry"]);
export const SceneAudit: React.FC<{ label: string; minScreen?: number }> = ({ label, minScreen = 0.04 }) => {
  const { scene, camera, gl } = useThree(); const f = useCurrentFrame();
  useEffect(() => {
    if (!ON) return;
    const id = requestAnimationFrame(() => {
      camera.updateMatrixWorld(); scene.updateMatrixWorld(true);
      let tris = 0, meshes = 0, instanced = 0; const flagged: { name: string; type: string; screen: number }[] = []; const box = new THREE.Box3(), v = new THREE.Vector3();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || !m.visible) return; meshes++; if ((m as unknown as THREE.InstancedMesh).isInstancedMesh) instanced++;
        const g = m.geometry; const n = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3; tris += n * ((m as unknown as THREE.InstancedMesh).count ?? 1);
        const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
        if (!PRIM.has(g.type) || mat?.map || (mat as unknown as THREE.ShaderMaterial).isShaderMaterial) return;
        box.setFromObject(m); if (box.isEmpty()) return; let x0 = 1, y0 = 1, x1 = -1, y1 = -1, behind = 0;
        for (let i = 0; i < 8; i++) { v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera); if (v.z > 1) behind++; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        if (behind === 8) return; const area = (Math.min(1, x1) - Math.max(-1, x0)) * (Math.min(1, y1) - Math.max(-1, y0)) / 4;
        if (area > minScreen) flagged.push({ name: m.name || m.parent?.name || "(unnamed)", type: g.type, screen: +area.toFixed(3) }); });
      console.log("[audit] " + JSON.stringify({ label, frame: f, tris: Math.round(tris), meshes, instanced, drawCalls: gl.info.render.calls, textures: gl.info.memory.textures, placeholders: flagged.sort((a, b) => b.screen - a.screen).slice(0, 12) }));
    });
    return () => cancelAnimationFrame(id);
  }, [f, scene, camera, gl, label]);
  return null;
};
