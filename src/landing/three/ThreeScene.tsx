import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Particle field — 1500/2500 points drifting + mouse repulsion. */
function ParticleField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);
  const mouseRef = useRef(new THREE.Vector3());
  const { viewport } = useThree();

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const center = new THREE.Color("#fff4d6");
    const edge = new THREE.Color("#c8952e");
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.5) * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi) - 4;
      const t = Math.min(r / 14, 1);
      const c = center.clone().lerp(edge, t);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.02;
    ref.current.rotation.x = Math.sin(t * 0.05) * 0.1;
    mouseRef.current.set(
      state.mouse.x * viewport.width * 0.5,
      state.mouse.y * viewport.height * 0.5,
      0,
    );
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function FloatingShape({
  geometry,
  color,
  position,
  speed = 1,
  scale = 1,
}: {
  geometry: "ico" | "octa" | "torus" | "dodeca";
  color: string;
  position: [number, number, number];
  speed?: number;
  scale?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.08 * speed;
    ref.current.rotation.y = t * 0.12 * speed;
    ref.current.position.y = position[1] + Math.sin(t * 0.6 * speed) * 0.4;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      {geometry === "ico" && <icosahedronGeometry args={[1, 0]} />}
      {geometry === "octa" && <octahedronGeometry args={[1, 0]} />}
      {geometry === "torus" && <torusKnotGeometry args={[0.7, 0.18, 64, 8]} />}
      {geometry === "dodeca" && <dodecahedronGeometry args={[1, 0]} />}
      <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
    </mesh>
  );
}

function MouseParallax({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!groupRef.current) return;
    const targetX = state.mouse.x * 0.6;
    const targetY = state.mouse.y * 0.4;
    groupRef.current.position.x +=
      (-targetX - groupRef.current.position.x) * 0.04;
    groupRef.current.position.y +=
      (-targetY - groupRef.current.position.y) * 0.04;
  });
  return <group ref={groupRef}>{children}</group>;
}

interface ThreeSceneProps {
  /** Reduce particle count + drop shapes on mobile. */
  isMobile?: boolean;
}

export default function ThreeScene({ isMobile = false }: ThreeSceneProps) {
  const particleCount = isMobile ? 900 : 1800;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, hsl(42 60% 12% / 0.55) 0%, hsl(220 25% 3%) 55%, #050608 100%)",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <MouseParallax>
            <ParticleField count={particleCount} />
            {!isMobile && (
              <>
                <FloatingShape geometry="ico" color="#c8952e" position={[-6, 2, -3]} scale={1.4} />
                <FloatingShape geometry="ico" color="#e6b347" position={[7, -1, -4]} scale={1.1} speed={-0.8} />
                <FloatingShape geometry="octa" color="#a87a24" position={[-5, -3, -2]} scale={1.0} speed={0.7} />
                <FloatingShape geometry="octa" color="#ffd97a" position={[6, 3, -5]} scale={0.9} speed={-1.1} />
                <FloatingShape geometry="torus" color="#fff4d6" position={[0, 4, -6]} scale={1.2} speed={0.5} />
                <FloatingShape geometry="torus" color="#fff4d6" position={[-3, -4, -5]} scale={0.9} speed={-0.6} />
                <FloatingShape geometry="dodeca" color="#c8952e" position={[3, 0, -4]} scale={0.8} speed={0.9} />
                <FloatingShape geometry="dodeca" color="#e6b347" position={[-7, 0, -6]} scale={1.0} speed={-0.4} />
              </>
            )}
          </MouseParallax>
        </Suspense>
      </Canvas>
      {/* Vignette + grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, transparent 60%, hsl(220 25% 3% / 0.7) 100%), repeating-linear-gradient(90deg, hsl(42 60% 50% / 0.04) 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, hsl(42 60% 50% / 0.03) 0 1px, transparent 1px 80px)",
        }}
      />
    </div>
  );
}
