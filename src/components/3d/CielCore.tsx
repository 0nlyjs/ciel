"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCielStore } from "@/store/useCielStore";

// custom shader for ciel's visual orb
const CielShader = {
  uniforms: {
    uTime: { value: 0 },
    uVolume: { value: 0 },
    uStatus: { value: 0 }, // 0: idle, 1: thinking, 2: speaking, 3: listening, 4: error
    uColorCore: { value: new THREE.Color("#00a2ff") },
    uColorGlow: { value: new THREE.Color("#00f0ff") },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uVolume;
    uniform float uStatus;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    // simple 3d sine noise for mesh wobble
    float sineNoise(vec3 p, float time) {
      float value = 0.0;
      float amplitude = 0.3;
      float frequency = 1.0;
      
      // sum up 3 octaves of sine waves for organic deformation
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
      
      // adjust speed/amp depending on current state
      float speedScale = 1.0;
      float ampScale = 0.08;

      if (uStatus == 1.0) { // thinking
        speedScale = 4.0;
        ampScale = 0.12;
      } else if (uStatus == 2.0) { // speaking
        speedScale = 2.0;
        ampScale = 0.08 + uVolume * 0.25; // displace more when speaking louder
      } else if (uStatus == 3.0) { // listening
        speedScale = 1.2;
        ampScale = 0.05 + uVolume * 0.2;
      } else if (uStatus == 4.0) { // error
        speedScale = 6.0;
        ampScale = 0.25; // spiky
      } else { // idle
        speedScale = 0.7;
        ampScale = 0.06;
      }

      // wobble vertex along normal
      float displacement = sineNoise(position * 2.5, uTime * speedScale) * ampScale;
      
      // make it erratic/glitchy on error
      if (uStatus == 4.0) {
        displacement += sin(position.x * 30.0) * 0.04;
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
      // view dir for camera
      vec3 viewDir = normalize(vViewPosition);
      
      // fresnel: glow edges more
      float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
      
      // core glow factor
      float glowFactor = fresnel * 1.5;
      
      // pulse effect
      float pulse = sin(uTime * (uStatus == 1.0 ? 5.0 : 1.5)) * 0.15 + 0.85;
      
      vec3 finalColor = mix(uColorCore, uColorGlow, fresnel);
      
      // modify glow based on state
      if (uStatus == 1.0) { // thinking
        finalColor += vec3(0.2, 0.0, 0.4) * fresnel; // violet edge tint
      } else if (uStatus == 2.0) { // speaking
        finalColor += vec3(0.2, 0.1, 0.1) * uVolume * fresnel; // flash slightly on voice input
      } else if (uStatus == 4.0) { // error
        finalColor = vec3(0.9, 0.0, 0.2); // crimson red
      }

      // glassmorphism base alpha
      float alpha = clamp(fresnel * 0.7 + 0.15, 0.0, 1.0);
      
      // boost opacity when active
      if (uStatus == 1.0 || uStatus == 2.0 || uStatus == 3.0) {
        alpha += 0.1;
      }
      
      gl_FragColor = vec4(finalColor * pulse * (1.0 + fresnel * 0.5), alpha);
    }
  `,
};

export function CielCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const status = useCielStore((s) => s.cielStatus);
  const volume = useCielStore((s) => s.currentVolume);

  // state to color mapping
  const colors = useMemo(() => {
    return {
      idle: { core: new THREE.Color("#0070bb"), glow: new THREE.Color("#00f0ff") },
      thinking: { core: new THREE.Color("#5a00a8"), glow: new THREE.Color("#b800ff") },
      speaking: { core: new THREE.Color("#0070bb"), glow: new THREE.Color("#ffffff") },
      listening: { core: new THREE.Color("#00a854"), glow: new THREE.Color("#00ffbb") },
      error: { core: new THREE.Color("#d30000"), glow: new THREE.Color("#ff3a3a") },
    };
  }, []);

  // update uniforms on status change
  useEffect(() => {
    if (!materialRef.current) return;

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

    materialRef.current.uniforms.uStatus.value = statusVal;

    // transition colors smoothly
    const duration = 0.5;
    const startCore = materialRef.current.uniforms.uColorCore.value.clone();
    const startGlow = materialRef.current.uniforms.uColorGlow.value.clone();
    const startTime = performance.now();

    const animateColors = (now: number) => {
      if (!materialRef.current) return;
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      materialRef.current.uniforms.uColorCore.value.lerpVectors(startCore, targetColors.core, progress);
      materialRef.current.uniforms.uColorGlow.value.lerpVectors(startGlow, targetColors.glow, progress);

      if (progress < 1) {
        requestAnimationFrame(animateColors);
      }
    };

    requestAnimationFrame(animateColors);
  }, [status, colors]);

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uVolume.value = volume;

    // spin/rotate mesh organically
    if (status === "thinking") {
      meshRef.current.rotation.y = time * 2.0;
      meshRef.current.rotation.x = time * 0.8;
    } else {
      meshRef.current.rotation.y = time * 0.2;
      meshRef.current.rotation.x = Math.sin(time * 0.4) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* high density sphere for smooth wobble */}
      <sphereGeometry args={[1.5, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={CielShader.vertexShader}
        fragmentShader={CielShader.fragmentShader}
        uniforms={CielShader.uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
