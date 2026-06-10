"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { LandingScene } from "./LandingScene";
import { CielCore } from "./CielCore";
import { Stars } from "@react-three/drei";

interface CielCanvasProps {
  scene: "landing" | "dashboard";
}

export default function CielCanvas({ scene }: CielCanvasProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-black" />;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />
        
        {/* lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* star field */}
        <Stars
          radius={100}
          depth={50}
          count={500}
          factor={4}
          saturation={0.5}
          fade
          speed={1}
        />

        {scene === "landing" ? (
          <LandingScene />
        ) : (
          <CielCore />
        )}
      </Canvas>
    </div>
  );
}
