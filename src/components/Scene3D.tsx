"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { FC } from "react";

// ─── Custom GLTF Model (Ciel Landscape) ──────────────────────────────────────
const CielModel: FC = () => {
  const { scene } = useGLTF("/ciel.glb");

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useMemo(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Use a realistic sand material that reacts softly to lighting
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#050618",
          roughness: 0.95,
          metalness: 0.0,
          flatShading: false,
        });
      }
    });
  }, [clonedScene]);

  // Position at center on the ground plane, scaled to wrap around/face the camera
  return (
    <primitive
      object={clonedScene}
      position={[0, -3.5, 0]}
      scale={[2.5, 2.5, 2.5]}
    />
  );
};

useGLTF.preload("/ciel.glb");

// ─── Custom Twinkling Stars Component ────────────────────────────────────────
const TwinklingStars: FC = () => {
  const count = 2000;
  const meshRef = useRef<THREE.Points>(null);

  const [positions, sizes, blinkSpeeds, phs] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const speed = new Float32Array(count);
    const ph = new Float32Array(count);

    const radius = 95;

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      sz[i] = 0.15 + Math.random() * 0.25;

      if (Math.random() < 0.4) {
        speed[i] = 0.4 + Math.random() * 1.2;
      } else {
        speed[i] = 0.0;
      }

      ph[i] = Math.random() * Math.PI * 2;
    }

    return [pos, sz, speed, ph];
  }, []);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        attribute float aSize;
        attribute float aBlinkSpeed;
        attribute float aPhase;
        varying float vOpacity;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = aSize * (280.0 / -mvPosition.z);
          
          if (aBlinkSpeed > 0.0) {
            vOpacity = 0.3 + 0.7 * sin(uTime * aBlinkSpeed + aPhase);
          } else {
            vOpacity = 0.95;
          }
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, r) * vOpacity;
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute
          attach="attributes-aBlinkSpeed"
          args={[blinkSpeeds, 1]}
        />
        <bufferAttribute attach="attributes-aPhase" args={[phs, 1]} />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
};

// ─── Camera Rig: Stationary Center Yaw Rotation ──────────────────────────────
const CameraRig: FC = () => {
  const rotationY = useRef(0);
  const lastScrollY = useRef(
    typeof window !== "undefined" ? window.scrollY : 0,
  );
  const scrollVelocity = useRef(0);
  const mouseVelocity = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.movementX;
      const dy = e.movementY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      mouseVelocity.current = speed;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    const camera = state.camera;

    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;

    const rawDiff = Math.abs(scrollY - lastScrollY.current);
    scrollVelocity.current = THREE.MathUtils.lerp(
      scrollVelocity.current,
      rawDiff,
      0.1,
    );
    lastScrollY.current = scrollY;

    // Decay the mouse velocity towards 0
    mouseVelocity.current = THREE.MathUtils.lerp(
      mouseVelocity.current,
      0,
      0.08,
    );

    const baseSpeed = 0.05;
    const scrollContribution = scrollVelocity.current * 0.064;

    // Calculate mouse speedup factor (capped at 30% / 0.30)
    const mouseContribution = Math.min(0.6, mouseVelocity.current * 0.012);

    // Apply the 15% speed increase multiplier when cursor moves
    const currentSpeed =
      (baseSpeed + scrollContribution) * (1.0 + mouseContribution);

    rotationY.current += delta * currentSpeed;

    camera.position.set(0, -3.3, 0);
    camera.rotation.y = rotationY.current;
    camera.rotation.x = 0;
    camera.rotation.z = 0;
  });

  return null;
};

// ─── Pastel Color-Cycling Directional Light ──────────────────────────────────
const CyclingDirectionalLight: FC = () => {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    // Cycle hue smoothly over time (0.04 controls the speed)
    const hue = (t * 0.1) % 1.0;
    // Set color with HSL (hue, pastel saturation 0.8, pastel lightness 0.8)
    lightRef.current.color.setHSL(hue, 0.3, 0.3);
  });

  return (
    <directionalLight ref={lightRef} position={[0, 40, 0]} intensity={50.8} />
  );
};

// ─── Main Scene Component ────────────────────────────────────────────────────
const Scene3D: FC = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        // Sky gradient matching the reference photo (deep blue to soft purple horizon glow)
        background:
          "linear-gradient(to bottom, #010617 0%, #080d33 45%, #18195a 75%, #4b2b93 100%)",
      }}
    >
      <Canvas
        camera={{ position: [0, -1.0, 0], fov: 65, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Fog matching the horizon purple glow */}
        <fog attach="fog" args={["#4b2b93", 15, 85]} />

        {/* Custom twinkling stars */}
        <TwinklingStars />

        <CameraRig />

        {/* Flat sandy ground landscape centered around camera (no grid lines) */}
        <mesh position={[0, -3.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[180, 180, 2, 2]} />
          <meshStandardMaterial
            color="#050618"
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>

        <CielModel />

        {/* ── Lighting Rig ──────────────────────────────────────────────── */}
        {/* Hemisphere light simulating HDRI sky/ground ambient reflection */}
        <hemisphereLight
          color="#4b2b93"
          groundColor="#050618"
          intensity={1.8}
        />

        {/* Horizon backlight matching the purple sky glow */}
        <directionalLight
          position={[0, -2, -60]}
          intensity={2.8}
          color="#4b2b93"
        />

        {/* Soft blue top-down/side light to catch landscape edges */}
        <directionalLight
          position={[15, 20, 15]}
          intensity={1.2}
          color="#202a78"
        />

        {/* Large-scale top-down light with pastel color cycling */}
        <CyclingDirectionalLight />
      </Canvas>
    </div>
  );
};

export default Scene3D;
