"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBox, Environment } from "@react-three/drei";

// Shared scroll tracker to avoid state-trigger lags
const scrollState = {
  progress: 0,
};

function ScrollTracker() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.progress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return null;
}

function CubeScene() {
  const cubeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (cubeRef.current) {
      const time = state.clock.getElapsedTime();
      
      // Calculate target rotation based on scroll position (e.g. 2 full rotations over the page scroll)
      const targetRotationX = scrollState.progress * Math.PI * 4;
      const targetRotationY = scrollState.progress * Math.PI * 4;
      
      // Smoothly interpolate rotation to match the scroll position
      cubeRef.current.rotation.x = THREE.MathUtils.lerp(cubeRef.current.rotation.x, targetRotationX, 0.08);
      cubeRef.current.rotation.y = THREE.MathUtils.lerp(cubeRef.current.rotation.y, targetRotationY, 0.08);
      
      // Also add a very subtle idle float/rotation so it stays alive when static
      cubeRef.current.rotation.z = time * 0.1;
      cubeRef.current.position.y = Math.sin(time * 1.5) * 0.15;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.8} color="#00ffff" />
      <pointLight position={[-10, -10, -10]} intensity={1.2} color="#ff00ff" />
      <directionalLight position={[5, 5, 5]} intensity={0.6} color="#ffffff" />
      
      {/* Background color blobs visible through glass refraction */}
      <mesh position={[-2.5, 1.8, -5]}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#7dd3fc" opacity={0.6} transparent />
      </mesh>
      <mesh position={[2.5, -1.8, -5]}>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial color="#f9a8d4" opacity={0.6} transparent />
      </mesh>
      <mesh position={[0, 0, -6]}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#c4b5fd" opacity={0.4} transparent />
      </mesh>
      
      {/* Rounded Glass Pebble Cube — fully transparent with clear glass look */}
      <RoundedBox ref={cubeRef} args={[2.3, 2.3, 2.3]} radius={0.4} smoothness={10}>
        <meshPhysicalMaterial
          transmission={1.0}
          roughness={0.0}
          metalness={0.0}
          thickness={2.5}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          color="#ffffff"
          ior={1.5}
          transparent
          opacity={1.0}
          envMapIntensity={1.0}
        />
      </RoundedBox>

      {/* Environment map for realistic glass reflections */}
      <Environment preset="city" />
    </group>
  );
}

export default function ThreeBackground() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Ensures interactions pass through to the foreground HTML layout
        zIndex: 0,
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E"),
          linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 16%, #ddd6fe 32%, #fbcfe8 48%, #fecdd3 64%, #fed7aa 80%, #bbf7d0 100%)
        `,
      }}
    >
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true }}>
        <ScrollTracker />
        <CubeScene />
      </Canvas>
    </div>
  );
}
