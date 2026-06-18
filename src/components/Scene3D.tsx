"use client";

import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { useFrame, Canvas } from "@react-three/fiber";
import { useGLTF, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { FC } from "react";
import { useCielStore } from "@/store/useCielStore";

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

// ─── Camera Rig: Stationary Center Yaw Rotation ──────────────────────────────
const CameraRig: FC = () => {
  const rotationY = useRef(0);
  const lastScrollY = useRef(
    typeof window !== "undefined" ? window.scrollY : 0,
  );
  const scrollVelocity = useRef(0);
  const mouseVelocity = useRef(0);
  const bgRotate = useCielStore((s) => s.bgRotate);

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
    const mouseContribution = Math.min(0.3, mouseVelocity.current * 0.012);

    // Apply the rotation speed only if bgRotate animation is enabled
    const currentSpeed = bgRotate
      ? (baseSpeed + scrollContribution) * (1.0 + mouseContribution)
      : 0;

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
  const bgColorCycle = useCielStore((s) => s.bgColorCycle);
  const bgHue = useCielStore((s) => s.bgHue);

  useFrame((state) => {
    if (!lightRef.current) return;

    let hue = bgHue;
    if (bgColorCycle) {
      const t = state.clock.elapsedTime;
      // Cycle hue smoothly over time
      hue = (t * 0.04) % 1.0;
    }

    // Set color with HSL (Hue, Saturation, Lightness)

    const s = bgColorCycle ? 0.3 : 0.3;
    const l = bgColorCycle ? 0.3 : 0.3;
    lightRef.current.color.setHSL(hue, s, l);
  });

  return (
    <directionalLight ref={lightRef} position={[0, 40, 0]} intensity={50.8} />
  );
};

// ─── Loading State Notifier ──────────────────────────────────────────────────
const LoadingNotifier: FC<{ onLoad: () => void }> = ({ onLoad }) => {
  useEffect(() => {
    onLoad();
  }, [onLoad]);
  return null;
};

// ─── Main Scene Component ────────────────────────────────────────────────────
const Scene3D: FC = () => {
  const [modelLoaded, setModelLoaded] = useState(false);

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
      {/* Solid loading color background (#4C7280) that fades out when 3D model is loaded */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          backgroundColor: "#564980", //startup color
          opacity: modelLoaded ? 0 : 1,
          transition: "opacity 1.5s ease-in-out",
          pointerEvents: "none",
        }}
      />

      {/* Gradual blur overlay at the bottom half of the screen */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "80%",
          zIndex: 50,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <Canvas
        camera={{ position: [0, -1.0, 0], fov: 65, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={["#4b2b93", 15, 85]} />

        {/* Layer 1: The Cosmic Background. Dense, tiny, and static for deep space depth. */}
        <Stars
          radius={100}
          depth={50}
          count={4000}
          factor={2}
          saturation={0}
          fade={false}
          speed={0}
        />

        {/* Layer 2: The Atmospheric Layer. Sparser, slightly larger, with smooth, noise-based twinkling. */}
        <Stars
          radius={90}
          depth={50}
          count={1500}
          factor={4}
          saturation={0}
          fade={true}
          speed={2.5}
        />

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

        <Suspense fallback={null}>
          <CielModel />
          <LoadingNotifier onLoad={() => setModelLoaded(true)} />
        </Suspense>

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
