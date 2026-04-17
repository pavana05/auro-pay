import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Lightweight Three.js background:
 * - Drifting particle field (gold/white)
 * - 6 wireframe geometries floating
 * - Mouse parallax via group rotation
 * Mobile auto-reduces particle count.
 */

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const count = isMobile() ? 900 : 1800;

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const gold = new THREE.Color("#c8952e");
    const white = new THREE.Color("#fff7e3");
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 14;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
      const c = Math.random() > 0.7 ? white : gold;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.02;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Shape({
  geom,
  position,
  color,
  speed,
}: {
  geom: "ico" | "octa" | "torus" | "dodec";
  position: [number, number, number];
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = t * speed;
    ref.current.rotation.y = t * speed * 0.7;
    ref.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 0.5;
  });
  return (
    <mesh ref={ref} position={position}>
      {geom === "ico" && <icosahedronGeometry args={[1.2, 0]} />}
      {geom === "octa" && <octahedronGeometry args={[1.1, 0]} />}
      {geom === "torus" && <torusKnotGeometry args={[0.8, 0.2, 64, 8]} />}
      {geom === "dodec" && <dodecahedronGeometry args={[1.0, 0]} />}
      <meshBasicMaterial color={color} wireframe transparent opacity={0.14} />
    </mesh>
  );
}

function Scene({ mouse }: { mouse: { x: number; y: number } }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += (mouse.x * 0.15 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-mouse.y * 0.1 - group.current.rotation.x) * 0.04;
  });
  return (
    <group ref={group}>
      <ParticleField />
      {!isMobile() && (
        <>
          <Shape geom="ico" position={[-5, 2, -3]} color="#c8952e" speed={0.15} />
          <Shape geom="octa" position={[5, -2, -2]} color="#e0b048" speed={-0.18} />
          <Shape geom="torus" position={[-4, -3, -4]} color="#fff7e3" speed={0.1} />
          <Shape geom="dodec" position={[4, 3, -5]} color="#c8952e" speed={0.13} />
          <Shape geom="ico" position={[0, 4, -6]} color="#e0b048" speed={-0.11} />
          <Shape geom="octa" position={[-6, 0, -5]} color="#c8952e" speed={0.16} />
        </>
      )}
    </group>
  );
}

export default function ThreeBackground() {
  const mouse = useRef({ x: 0, y: 0 });

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      onMouseMoveCapture={(e) => {
        mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene mouse={mouse.current} />
        </Suspense>
      </Canvas>
    </div>
  );
}
