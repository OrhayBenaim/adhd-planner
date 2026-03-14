# Visual Recipes for Immersive 3D Websites

Complete, copy-paste-ready patterns for common 3D website effects.

## Glass / Crystal Material

```tsx
import { MeshTransmissionMaterial } from "@react-three/drei";

function GlassOrb({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshTransmissionMaterial
        transmission={1}
        thickness={0.5}
        roughness={0}
        chromaticAberration={0.03}
        anisotropicBlur={0.1}
        distortion={0.2}
        distortionScale={0.5}
        temporalDistortion={0.1}
        backside
        backsideThickness={0.3}
        resolution={512}
        samples={16}
      />
    </mesh>
  );
}
```

### Frosted Glass Panel

```tsx
<mesh>
  <planeGeometry args={[4, 3]} />
  <MeshTransmissionMaterial
    transmission={1}
    thickness={0.2}
    roughness={0.4}
    chromaticAberration={0.02}
    resolution={32}
  />
</mesh>
```

## Particle Field

```tsx
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField({ count = 2000, spread = 20 }) {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * spread;
    }
    return pos;
  }, [count, spread]);

  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
```

### Sparkles (Drei shortcut)

```tsx
import { Sparkles } from "@react-three/drei";

<Sparkles count={200} scale={10} size={2} speed={0.4} opacity={0.5} color="#ffffff" />
```

## GLTF Model Loading

```tsx
import { useGLTF, Float } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ProductModel({ scrollOffset }: { scrollOffset: number }) {
  const { scene } = useGLTF("/models/product.glb");
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    ref.current.rotation.y = scrollOffset * Math.PI * 2;
  });

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={ref}>
        <primitive object={scene} scale={0.5} />
      </group>
    </Float>
  );
}

// Preload for instant display
useGLTF.preload("/models/product.glb");
```

## Post-Processing Effects

```tsx
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

function Effects() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        intensity={0.6}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={0.8}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={[0.001, 0.001]}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
```

### Selective Bloom (Emissive objects glow)

```tsx
// Make objects glow by setting emissive properties
<mesh>
  <sphereGeometry args={[0.5, 32, 32]} />
  <meshStandardMaterial
    color="#4060ff"
    emissive="#4060ff"
    emissiveIntensity={2}
    toneMapped={false}
  />
</mesh>

// Then add Bloom in post-processing -- emissive objects will glow
<EffectComposer>
  <Bloom luminanceThreshold={1} intensity={0.5} mipmapBlur />
</EffectComposer>
```

## Environment & Lighting Setups

### Moody Studio

```tsx
import { Environment, Lightformer } from "@react-three/drei";

<Environment resolution={256}>
  <Lightformer form="rect" intensity={2} position={[0, 5, -5]} scale={[10, 5]} color="#ffffff" />
  <Lightformer form="circle" intensity={1} position={[-5, 2, 0]} scale={3} color="#88ccff" />
  <Lightformer form="ring" intensity={0.5} position={[5, 0, 2]} scale={2} color="#ff8844" />
</Environment>
```

### Dramatic with HDRI

```tsx
<Environment
  preset="night"
  background
  backgroundBlurriness={0.6}
  backgroundIntensity={0.3}
/>
<directionalLight position={[5, 8, 3]} intensity={2} castShadow color="#ffd4a0" />
<ambientLight intensity={0.15} />
```

### Available Environment Presets

`apartment`, `city`, `dawn`, `forest`, `lobby`, `night`, `park`, `studio`, `sunset`, `warehouse`

## 3D Text

```tsx
import { Text3D, Center } from "@react-three/drei";

<Center>
  <Text3D
    font="/fonts/Inter_Bold.json"
    size={1.5}
    height={0.2}
    bevelEnabled
    bevelSize={0.02}
    bevelThickness={0.01}
    letterSpacing={-0.05}
  >
    IMMERSIVE
    <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
  </Text3D>
</Center>
```

Generate font JSON files from TTF at: https://gero3.github.io/facetype.js/

## GSAP ScrollTrigger Integration

For complex multi-step timelines that go beyond Drei's `useScroll`:

```tsx
"use client";
import { useRef, useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function GSAPAnimatedCamera() {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    // Camera path: move from intro position to feature showcase
    tl.to(camera.position, { x: 3, y: 1, z: 2, duration: 1 }, 0);
    tl.to(camera.position, { x: -2, y: 0.5, z: 4, duration: 1 }, 1);
    tl.to(camera.position, { x: 0, y: 2, z: 6, duration: 1 }, 2);

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [camera]);

  return null;
}
```

**Important:** When using GSAP with R3F, do NOT combine with `<ScrollControls>`. Use one scroll system or the other.

## Floating Elements Pattern

```tsx
import { Float } from "@react-three/drei";

function FloatingElements() {
  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[-3, 1, -2]}>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#ff6b6b" metalness={0.9} roughness={0.1} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <mesh position={[3, -0.5, -1]}>
          <torusGeometry args={[0.4, 0.15, 16, 32]} />
          <meshStandardMaterial color="#4ecdc4" metalness={0.7} roughness={0.2} />
        </mesh>
      </Float>

      <Float speed={1} rotationIntensity={0.2} floatIntensity={1.5} floatingRange={[-0.3, 0.3]}>
        <mesh position={[0, 2, -3]}>
          <icosahedronGeometry args={[0.6]} />
          <meshStandardMaterial color="#a78bfa" metalness={0.8} roughness={0.15} />
        </mesh>
      </Float>
    </group>
  );
}
```

## Scroll-Linked Color Transitions

```tsx
import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";

const palette = [
  new THREE.Color("#0a0a0a"),
  new THREE.Color("#1a0a2e"),
  new THREE.Color("#0a1628"),
  new THREE.Color("#0a0a0a"),
];

function BackgroundColor() {
  const scroll = useScroll();
  const color = useRef(new THREE.Color());

  useFrame(({ scene }) => {
    const t = scroll.offset * (palette.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = palette[Math.min(i, palette.length - 1)];
    const b = palette[Math.min(i + 1, palette.length - 1)];
    color.current.copy(a).lerp(b, f);
    scene.background = color.current;
  });

  return null;
}
```

## Responsive 3D Layout

```tsx
import { useThree } from "@react-three/fiber";

function ResponsiveScene() {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5;

  return (
    <group scale={isMobile ? 0.6 : 1}>
      <mesh position={[isMobile ? 0 : -2, 0, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}
```

## Next.js Specifics

### Dynamic Import for Canvas (prevents SSR issues)

```tsx
// app/page.tsx
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/Scene").then((mod) => mod.Scene), {
  ssr: false,
  loading: () => <div className="h-screen bg-black" />,
});

export default function Home() {
  return (
    <main className="bg-black">
      <Scene />
    </main>
  );
}
```

### next.config.js for Three.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["three"],
};
module.exports = nextConfig;
```
