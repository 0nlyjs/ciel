"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { LandingScene } from "./LandingScene";
import { CielCore } from "./CielCore";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

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

  if (!mounted) return <div className="w-full h-full bg-[#090B10]" />;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        {/* The Void: Deep Obsidian Background */}
        <color attach="background" args={["#090B10"]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />

        {/* Star Field */}
        <Stars
          radius={100}
          depth={50}
          count={600}
          factor={4}
          saturation={0.7}
          fade
          speed={1.2}
        />

        {scene === "landing" ? (
          <LandingScene />
        ) : (
          <CielCore />
        )}

        {/* Scenic Post-Processing: Signature glow bleeding into obsidian void */}
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
