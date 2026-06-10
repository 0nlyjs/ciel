"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 2000;

// generate galaxy positions/colors outside render tree
const generateGalaxyData = () => {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const col = new Float32Array(PARTICLE_COUNT * 3);

  const baseColor = new THREE.Color("#00f0ff");
  const accentColor = new THREE.Color("#7000ff");
  const whiteColor = new THREE.Color("#ffffff");

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const angle = (i / PARTICLE_COUNT) * Math.PI * 40; // swirls
    const radius = Math.pow(Math.random(), 1.5) * 12; // crowd near center
    const spinAngle = radius * 0.4;

    const randomX = (Math.random() - 0.5) * 0.5 * (12 - radius) * 0.15;
    const randomY = (Math.random() - 0.5) * 0.5 * (12 - radius) * 0.15;
    const randomZ = (Math.random() - 0.5) * 0.5 * (12 - radius) * 0.15;

    pos[i3] = Math.cos(angle + spinAngle) * radius + randomX;
    pos[i3 + 1] = randomY;
    pos[i3 + 2] = Math.sin(angle + spinAngle) * radius + randomZ;

    // center is white/cyan, edges fade to purple
    const mixedColor = baseColor.clone();
    if (radius < 2.5) {
      mixedColor.lerp(whiteColor, 1 - radius / 2.5);
    } else {
      mixedColor.lerp(accentColor, (radius - 2.5) / 9.5);
    }

    col[i3] = mixedColor.r;
    col[i3 + 1] = mixedColor.g;
    col[i3 + 2] = mixedColor.b;
  }

  return { positions: pos, colors: col };
};

const GALAXY_DATA = generateGalaxyData();

export function LandingScene() {
  const pointsRef = useRef<THREE.Points>(null);
  const { mouse, viewport } = useThree();

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();

    // slow spin
    pointsRef.current.rotation.y = time * 0.04;

    // float around a bit
    pointsRef.current.rotation.x = Math.sin(time * 0.1) * 0.05;
    pointsRef.current.rotation.z = Math.cos(time * 0.15) * 0.05;

    // lean towards cursor
    const targetX = (mouse.x * viewport.width) / 10;
    const targetY = (mouse.y * viewport.height) / 10;

    pointsRef.current.position.x = THREE.MathUtils.lerp(pointsRef.current.position.x, targetX, 0.02);
    pointsRef.current.position.y = THREE.MathUtils.lerp(pointsRef.current.position.y, targetY, 0.02);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[GALAXY_DATA.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[GALAXY_DATA.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
