"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCielStore } from "@/store/useCielStore";

// Custom shader for Ciel's visual inner core
const CielShader = {
  uniforms: {
    uTime: { value: 0 },
    uVolume: { value: 0 },
    uStatus: { value: 0 }, // 0: idle, 1: thinking, 2: speaking, 3: listening, 4: error
    uColorCore: { value: new THREE.Color("#00F0FF") },
    uColorGlow: { value: new THREE.Color("#4DD0E1") },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uVolume;
    uniform float uStatus;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    // organic 3d noise for core wobble
    float sineNoise(vec3 p, float time) {
      float value = 0.0;
      float amplitude = 0.3;
      float frequency = 1.0;
      
      for (int i = 0; i < 3; i++) {
        value += amplitude * (
          sin(p.x * frequency + time) * 
          cos(p.y * frequency * 1.3 + time * 0.7) * 
          sin(p.z * frequency * 0.8 + time * 1.2)
        );
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      float speedScale = 1.0;
      float ampScale = 0.08;

      if (uStatus == 1.0) { // thinking
        speedScale = 4.0;
        ampScale = 0.15;
      } else if (uStatus == 2.0) { // speaking
        speedScale = 2.5;
        ampScale = 0.08 + uVolume * 0.3;
      } else if (uStatus == 3.0) { // listening
        speedScale = 1.5;
        ampScale = 0.05 + uVolume * 0.2;
      } else if (uStatus == 4.0) { // error
        speedScale = 6.0;
        ampScale = 0.3;
      } else { // idle
        speedScale = 0.8;
        ampScale = 0.06;
      }

      float displacement = sineNoise(position * 2.0, uTime * speedScale) * ampScale;
      
      if (uStatus == 4.0) {
        displacement += sin(position.x * 40.0) * 0.05; // spiky glitch effect
      }

      vec3 displacedPosition = position + normal * displacement;
      vec4 modelViewPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
      vViewPosition = -modelViewPosition.xyz;
      
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uStatus;
    uniform float uVolume;
    uniform vec3 uColorCore;
    uniform vec3 uColorGlow;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
      
      float pulse = sin(uTime * (uStatus == 1.0 ? 6.0 : 1.8)) * 0.15 + 0.85;
      vec3 finalColor = mix(uColorCore, uColorGlow, fresnel);
      
      if (uStatus == 1.0) { // thinking (Magenta glow)
        finalColor += vec3(0.3, 0.0, 0.3) * fresnel;
      } else if (uStatus == 2.0) { // speaking
        finalColor += vec3(0.2, 0.1, 0.2) * uVolume * fresnel;
      } else if (uStatus == 4.0) { // error
        finalColor = vec3(1.0, 0.0, 0.2); // crimson core
      }

      float alpha = clamp(fresnel * 0.85 + 0.2, 0.0, 1.0);
      if (uStatus == 1.0 || uStatus == 2.0 || uStatus == 3.0) {
        alpha += 0.15;
      }
      
      gl_FragColor = vec4(finalColor * pulse * (1.2 + fresnel * 0.8), alpha);
    }
  `,
};

export function CielCore() {
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const cubesGroupRef = useRef<THREE.Group>(null);

  const status = useCielStore((s) => s.cielStatus);
  const volume = useCielStore((s) => s.currentVolume);

  // Modern Subsurface Sci-Fi palette mapping
  const colors = useMemo(() => {
    return {
      idle: { core: new THREE.Color("#00F0FF"), glow: new THREE.Color("#4DD0E1") }, // Cyan & Ice Blue
      thinking: { core: new THREE.Color("#FF007F"), glow: new THREE.Color("#FF2A55") }, // Magenta & Crimson
      speaking: { core: new THREE.Color("#00F0FF"), glow: new THREE.Color("#FF007F") }, // Cyan & Magenta
      listening: { core: new THREE.Color("#4DD0E1"), glow: new THREE.Color("#00F0FF") }, // Ice Blue & Cyan
      error: { core: new THREE.Color("#FF2A55"), glow: new THREE.Color("#FF007F") }, // Crimson & Magenta
    };
  }, []);

  const activeLightColor = useMemo(() => {
    switch (status) {
      case "thinking":
        return "#FF007F";
      case "speaking":
        return "#FF007F";
      case "listening":
        return "#4DD0E1";
      case "error":
        return "#FF2A55";
      default:
        return "#00F0FF";
    }
  }, [status]);

  // Update uniforms and colors smoothly
  useEffect(() => {
    if (!shaderMaterialRef.current) return;

    let statusVal = 0;
    let targetColors = colors.idle;

    switch (status) {
      case "thinking":
        statusVal = 1;
        targetColors = colors.thinking;
        break;
      case "speaking":
        statusVal = 2;
        targetColors = colors.speaking;
        break;
      case "listening":
        statusVal = 3;
        targetColors = colors.listening;
        break;
      case "error":
        statusVal = 4;
        targetColors = colors.error;
        break;
      default:
        statusVal = 0;
        targetColors = colors.idle;
    }

    shaderMaterialRef.current.uniforms.uStatus.value = statusVal;

    const duration = 0.5;
    const startCore = shaderMaterialRef.current.uniforms.uColorCore.value.clone();
    const startGlow = shaderMaterialRef.current.uniforms.uColorGlow.value.clone();
    const startTime = performance.now();

    const animateColors = (now: number) => {
      if (!shaderMaterialRef.current) return;
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      shaderMaterialRef.current.uniforms.uColorCore.value.lerpVectors(startCore, targetColors.core, progress);
      shaderMaterialRef.current.uniforms.uColorGlow.value.lerpVectors(startGlow, targetColors.glow, progress);

      if (progress < 1) {
        requestAnimationFrame(animateColors);
      }
    };

    requestAnimationFrame(animateColors);
  }, [status, colors]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (shaderMaterialRef.current && coreMeshRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = time;
      shaderMaterialRef.current.uniforms.uVolume.value = volume;

      if (status === "thinking") {
        coreMeshRef.current.rotation.y = time * 2.5;
        coreMeshRef.current.rotation.x = time * 1.2;
      } else {
        coreMeshRef.current.rotation.y = time * 0.4;
        coreMeshRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
      }
    }

    // Spin orbiting glass rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.5;
      ring1Ref.current.rotation.y = time * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -time * 0.6;
      ring2Ref.current.rotation.z = time * 0.3;
    }

    // Rotate cubes group and individual cubes
    if (cubesGroupRef.current) {
      cubesGroupRef.current.rotation.y = time * 0.25;
      cubesGroupRef.current.children.forEach((child, idx) => {
        child.rotation.x = time * (0.6 + idx * 0.1);
        child.rotation.y = time * (0.4 + idx * 0.15);
        // Add tiny breathing float height
        child.position.y = Math.sin(time * 2 + idx) * 0.15;
      });
    }
  });

  return (
    <group scale={1.2}>
      
      {/* 1. INTERNAL SCENIC LIGHTS (Electric Cyan & Magenta) */}
      <pointLight color={activeLightColor} intensity={18} distance={6} decay={1.5} />
      <pointLight position={[2, 2, 2]} color="#00F0FF" intensity={6} distance={8} decay={2} />
      <pointLight position={[-2, -2, -2]} color="#FF007F" intensity={6} distance={8} decay={2} />

      {/* 2. CENTRAL CORE GEOMETRY GROUP */}
      <group>
        {/* Outer Iridescent Glowing Glass Sphere */}
        <mesh>
          <sphereGeometry args={[1.1, 64, 64]} />
          <meshPhysicalMaterial
            transmission={1}
            roughness={0.1}
            ior={1.5}
            thickness={2.0}
            dispersion={2.0}
            color="#ffffff"
            transparent
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inner Wobbling Shader Core */}
        <mesh ref={coreMeshRef}>
          <sphereGeometry args={[0.7, 64, 64]} />
          <shaderMaterial
            ref={shaderMaterialRef}
            vertexShader={CielShader.vertexShader}
            fragmentShader={CielShader.fragmentShader}
            uniforms={CielShader.uniforms}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 3. ORBITING GLASS RINGS */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.5, 0.04, 16, 100]} />
        <meshPhysicalMaterial
          transmission={1}
          roughness={0.05}
          ior={1.5}
          thickness={1.5}
          dispersion={2.0}
          color="#ffffff"
          transparent
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.03, 16, 100]} />
        <meshPhysicalMaterial
          transmission={1}
          roughness={0.08}
          ior={1.5}
          thickness={1.5}
          dispersion={2.0}
          color="#ffffff"
          transparent
        />
      </mesh>

      {/* 4. FLOATING ORBITAL GLASS CUBES */}
      <group ref={cubesGroupRef}>
        {/* Floating Cube 1 */}
        <mesh position={[2.2, 0, 0]}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshPhysicalMaterial
            transmission={1}
            roughness={0.1}
            ior={1.5}
            thickness={2.0}
            dispersion={2.0}
            color="#ffffff"
            transparent
          />
        </mesh>
        
        {/* Floating Cube 2 */}
        <mesh position={[-1.6, 1.2, 1.2]}>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <meshPhysicalMaterial
            transmission={1}
            roughness={0.1}
            ior={1.5}
            thickness={2.0}
            dispersion={2.0}
            color="#ffffff"
            transparent
          />
        </mesh>

        {/* Floating Cube 3 */}
        <mesh position={[-1.2, -1.5, -1.2]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshPhysicalMaterial
            transmission={1}
            roughness={0.1}
            ior={1.5}
            thickness={2.0}
            dispersion={2.0}
            color="#ffffff"
            transparent
          />
        </mesh>
      </group>

    </group>
  );
}
