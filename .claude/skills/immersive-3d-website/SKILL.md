---
name: immersive-3d-website
description: Build scroll-driven, immersive 3D websites using Next.js, React Three Fiber, Drei, and Three.js. This skill should be used when the agent needs to create 3D landing pages, scroll-animated 3D experiences, interactive product showcases, or any website with WebGL-powered 3D visuals.
---

# Immersive 3D Website Builder

Build stunning scroll-driven 3D web experiences using React Three Fiber (R3F), Drei helpers, and Three.js within Next.js projects.

## Tech Stack

| Package | Purpose |
|---------|---------|
| `three` | Core 3D engine (WebGL) |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Ready-made R3F helpers (scroll, lights, materials, text) |
| `@react-three/postprocessing` | Bloom, vignette, chromatic aberration, DOF |
| `next` | Framework (App Router) |
| `tailwindcss` | HTML overlay styling |
| `gsap` + `@gsap/react` | Optional: advanced scroll-driven timeline animations |

## Installation

```bash
npx create-next-app@latest my-3d-site --typescript --tailwind --app
cd my-3d-site
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm install --save-dev @types/three
# Optional: GSAP for complex scroll timelines
npm install gsap @gsap/react
```

## Architecture

```
app/
  layout.tsx          # Root layout with font + metadata
  page.tsx            # Main page composing Scene + HTML sections
components/
  Scene.tsx           # Canvas wrapper (client component)
  Experience.tsx      # 3D scene content inside ScrollControls
  sections/           # Per-section 3D + HTML components
    Hero.tsx
    Features.tsx
    Showcase.tsx
  effects/            # Reusable 3D effects
    ParticleField.tsx
    GlassMaterial.tsx
    FloatingModel.tsx
lib/
  animations.ts       # Scroll interpolation helpers
public/
  models/             # .glb/.gltf 3D models
  textures/           # HDR environments, textures
  fonts/              # 3D font JSON files
```

**Critical:** All R3F components must be client components (`"use client"`). The `<Canvas>` component cannot render server-side.

## Core Pattern: Scroll-Driven 3D Scene

This is the foundational pattern for every immersive 3D website.

### 1. Scene Wrapper (components/Scene.tsx)

```tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { ScrollControls } from "@react-three/drei";
import { Suspense } from "react";
import { Experience } from "./Experience";

export function Scene() {
  return (
    <div className="fixed inset-0 h-screen w-screen">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ScrollControls pages={4} damping={0.15}>
            <Experience />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
```

### 2. Experience with Scroll Animations (components/Experience.tsx)

```tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  useScroll,
  Scroll,
  Float,
  Environment,
  MeshTransmissionMaterial,
  Stars,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

function AnimatedSphere() {
  const ref = useRef<THREE.Mesh>(null!);
  const scroll = useScroll();

  useFrame((state) => {
    // scroll.offset: 0-1 representing total scroll progress
    // scroll.range(from, distance): 0-1 within a scroll segment
    // scroll.curve(from, distance): 0-1-0 bell curve
    const offset = scroll.offset;

    // Rotate based on scroll
    ref.current.rotation.y = offset * Math.PI * 2;

    // Move along a path
    ref.current.position.x = Math.sin(offset * Math.PI) * 3;
    ref.current.position.y = Math.cos(offset * Math.PI * 2) * 1.5;

    // Scale up in the middle section
    const scale = 1 + scroll.curve(0.25, 0.5) * 0.5;
    ref.current.scale.setScalar(scale);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref}>
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
        />
      </mesh>
    </Float>
  );
}

export function Experience() {
  return (
    <>
      {/* Lighting & Environment */}
      <Environment preset="city" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      <ContactShadows position={[0, -1.5, 0]} opacity={0.4} blur={2} frames={1} />
      <Stars radius={100} depth={50} count={3000} fade speed={1} />

      {/* 3D Content */}
      <AnimatedSphere />

      {/* HTML Overlay Content (scrolls with the page) */}
      <Scroll html>
        <section className="h-screen flex items-center justify-center">
          <h1 className="text-7xl font-bold text-white">Your Vision</h1>
        </section>
        <section className="h-screen flex items-center justify-center">
          <h2 className="text-5xl text-white/80">Comes to Life</h2>
        </section>
        <section className="h-screen flex items-center justify-center">
          <p className="text-2xl text-white/60 max-w-lg text-center">
            Scroll-driven 3D experiences that captivate and convert.
          </p>
        </section>
        <section className="h-screen flex items-center justify-center">
          <button className="px-8 py-4 bg-white text-black rounded-full text-xl font-medium hover:scale-105 transition-transform">
            Get Started
          </button>
        </section>
      </Scroll>
    </>
  );
}
```

### 3. Page Integration (app/page.tsx)

```tsx
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

## Scroll Animation API Reference

The `useScroll()` hook provides these methods inside `<ScrollControls>`:

| Method | Returns | Use For |
|--------|---------|---------|
| `scroll.offset` | `0-1` | Total scroll progress |
| `scroll.range(from, distance)` | `0-1` | Progress within a scroll segment |
| `scroll.curve(from, distance)` | `0-1-0` | Bell curve (appear then disappear) |
| `scroll.visible(from, distance)` | `boolean` | Toggle visibility within a range |

**Scroll math:** With `pages={4}`, each page is `1/4 = 0.25` of the total offset. So `scroll.range(0.25, 0.25)` animates from 0 to 1 during the second page.

## Key Visual Recipes

Refer to `references/visual-recipes.md` for complete code patterns including:
- Glass/crystal materials (MeshTransmissionMaterial)
- Particle fields and floating elements
- GLTF model loading and animation
- Post-processing effects (Bloom, DOF, Vignette)
- Environment and lighting setups (presets: `apartment`, `city`, `dawn`, `forest`, `lobby`, `night`, `park`, `studio`, `sunset`, `warehouse`)
- Text3D with custom fonts
- GSAP ScrollTrigger integration (alternative to Drei ScrollControls for complex timelines)
- Scroll-linked color transitions
- Responsive 3D layouts
- Next.js dynamic import pattern for SSR safety

## Design Principles for Immersive 3D Sites

1. **Hook immediately** -- the first viewport must contain a striking 3D element
2. **Scroll = narrative** -- each scroll page reveals a new chapter of the story
3. **3D + 2D harmony** -- overlay HTML text that complements, not competes with, 3D visuals
4. **Depth through layers** -- use parallax: background stars, midground 3D, foreground HTML
5. **Material drama** -- glass, metallic, and emissive materials create visual interest
6. **Subtle motion** -- Float, gentle rotation, and particle drift keep the scene alive between scrolls
7. **Performance budget** -- target 60fps; use `dpr={[1, 2]}`, limit draw calls, compress textures

## Performance Checklist

- Set `dpr={[1, 2]}` on Canvas (caps pixel ratio on high-DPI screens)
- Use `<Suspense>` around heavy 3D content
- Compress GLTF models with `gltf-transform` or Draco compression
- Set `frames={1}` on ContactShadows for static scenes
- Use `<Bvh>` from drei to accelerate raycasting
- Limit post-processing passes (1-2 max)
- Use `useFrame` with refs (never setState in the render loop)
- Lazy-load sections below the fold
- Use `dynamic(() => import(...), { ssr: false })` for Canvas in Next.js
