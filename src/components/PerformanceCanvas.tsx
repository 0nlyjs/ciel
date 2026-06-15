"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCielStore } from "@/store/useCielStore";

function MorphingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const isSyncing = useCielStore((s) => s.isSyncing);
  const isSearching = useCielStore((s) => s.isSearching);

  // Generate initial particle geometry
  const particleCount = 750;
  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      // Create a nice spherical or toroidal shell distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.5 + Math.random() * 0.3; // radius with small variance

      arr[i] = r * Math.sin(phi) * Math.cos(theta);
      arr[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [particleCount]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();

    // Speed up and scale up based on syncing / searching states
    let speed = 0.15;
    let amplitude = 1.0;
    if (isSyncing) {
      speed = 1.8;
      amplitude = 1.6;
    } else if (isSearching) {
      speed = 0.75;
      amplitude = 0.5; // Gather inward
    }

    // Organic micro-variations to simulate system latency variations
    const simulatedLatencyFactor = 1.0 + Math.sin(time * 3) * 0.08;
    const currentSpeed = speed * simulatedLatencyFactor;

    pointsRef.current.rotation.y = time * currentSpeed;
    pointsRef.current.rotation.x = Math.sin(time * 0.15) * 0.08;

    // Pulse size and shape
    const pulseFactor = isSyncing ? 8 : 2;
    const pulseRange = isSyncing ? 0.25 : 0.06;
    const scale = amplitude * (1 + Math.sin(time * pulseFactor) * pulseRange);
    pointsRef.current.scale.set(scale, scale, scale);
  });

  // Color changes dynamically based on active state:
  // - Syncing: Glowing vibrant purple/magenta (#c084fc)
  // - Searching: Cyan/Teal (#22d3ee)
  // - Idle: Neutral slate/blue-gray (#64748b)
  const color = isSyncing ? "#c084fc" : isSearching ? "#22d3ee" : "#64748b";
  const size = isSyncing ? 0.075 : isSearching ? 0.055 : 0.045;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function PerformanceCanvas() {
  return (
    <div className="w-20 h-20 relative overflow-hidden bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner select-none pointer-events-none">
      <Canvas camera={{ position: [0, 0, 3.5], fov: 55 }}>
        <ambientLight intensity={0.6} />
        <MorphingParticles />
      </Canvas>
      <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none select-none">
        <span className="text-[7px] uppercase tracking-widest text-slate-400 font-bold font-mono">Telemetry</span>
      </div>
    </div>
  );
}
