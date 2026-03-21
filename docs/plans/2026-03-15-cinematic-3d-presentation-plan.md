# Cinematic 3D Investor Presentation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a breathtaking, cinematic 3D web presentation at `apps/presentation/` where the camera flies through a spatial journey of 8 zones, each representing a stage of the Claude-powered workflow.

**Architecture:** Single-page Vite app. The entire viewport is a Three.js canvas. A CatmullRom spline defines the camera path through 3D space. A hybrid timeline controller drives progress via scroll or auto-play. HTML overlays fade in/out per zone. Post-processing adds cinematic bloom, vignette, and DOF.

**Tech Stack:** Vite, Three.js (vanilla), Lenis (smooth scroll), Google Fonts (Inter)

**Design Doc:** `docs/plans/2026-03-15-cinematic-3d-presentation-design.md`

---

### Task 1: Scaffold the Vite Project

**Files:**
- Create: `apps/presentation/package.json`
- Create: `apps/presentation/vite.config.js`
- Create: `apps/presentation/index.html`

**Step 1: Create package.json**

```json
{
  "name": "presentation",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.172.0",
    "lenis": "^1.2.3"
  },
  "devDependencies": {
    "vite": "^6.3.5"
  }
}
```

**Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 4200,
  },
})
```

**Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>From Idea to Ship — Claude</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="overlay"></div>
  <div id="scroll-hint">
    <span>Scroll to explore</span>
    <div class="scroll-arrow"></div>
  </div>
  <div id="progress-bar"><div id="progress-fill"></div></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 4: Create styles.css** at `apps/presentation/src/styles.css` — full CSS for canvas, overlays, progress bar, scroll hint, typography. Claude-branded palette: `#F5E6D3`, `#D4A574`, `#C67A4A`, `#2C1810`, `#FAF7F2`. Background: `#1a0f0a`. Font: Inter. All position fixed, overflow hidden.

**Step 5: Install dependencies**

Run: `cd apps/presentation && npm install`

**Step 6: Verify dev server starts**

Run: `cd apps/presentation && npm run dev`
Expected: Vite dev server on port 4200, blank dark page with canvas

**Step 7: Commit**

```bash
git add apps/presentation/package.json apps/presentation/vite.config.js apps/presentation/index.html apps/presentation/src/styles.css
git commit -m "feat(presentation): scaffold Vite project with Three.js"
```

---

### Task 2: Set Up Three.js Scene + Camera + Renderer

**Files:**
- Create: `apps/presentation/src/main.js`

**Step 1: Create main.js with scene, camera, renderer, and render loop**

Set up:
- `THREE.Scene` with `FogExp2(0x1a0f0a, 0.008)`
- `THREE.PerspectiveCamera(60, aspect, 0.1, 1000)` at `(0, 2, 10)`
- `THREE.WebGLRenderer` with antialias, ACES filmic tone mapping, exposure 1.2, SRGB color space, pixel ratio capped at 2
- Import and initialize: `createWorld(scene)`, `createCameraPath()`, `createPostFX(renderer, scene, camera)`, `createOverlay()`, `createTimeline(camera, cameraPath, overlay, world)`
- Resize handler updating camera aspect, renderer size, postfx size
- Animation loop with `requestAnimationFrame`: get delta/elapsed from `THREE.Clock`, call `timeline.update(delta)`, `world.update(elapsed, delta, timeline.progress)`, `postfx.render()`

**Step 2: Commit**

```bash
git add apps/presentation/src/main.js
git commit -m "feat(presentation): add main entry with Three.js scene setup"
```

---

### Task 3: Build the Camera Path System

**Files:**
- Create: `apps/presentation/src/camera-path.js`

The camera follows a CatmullRom3 spline that winds through 3D space. Each zone has a center point and a lookAt target.

**Step 1: Create camera-path.js**

Camera path points (winding through 3D space):
- Zone 0 (Title): `(0, 2, 10)` → lookAt `(0, 2, -10)`
- Zone 1 (Problem): `(-8, 4, -20)` → lookAt `(-8, 3, -40)`
- Zone 2 (Solution): `(5, 2, -55)` → lookAt `(5, 2, -75)`
- Zone 3 (Ideation): `(-3, 8, -90)` → lookAt `(-3, 6, -110)`
- Zone 4 (Marketing): `(10, 3, -130)` → lookAt `(10, 3, -150)`
- Zone 5 (Building): `(-5, 1, -170)` → lookAt `(-5, 1, -190)`
- Zone 6 (Shipping): `(0, 12, -210)` → lookAt `(0, 8, -230)`
- Zone 7 (Impact): `(0, 5, -250)` → lookAt `(0, 5, -270)`

Create two `CatmullRomCurve3` splines (position + lookAt) with tension 0.5. Export `createCameraPath()` returning:
- `getPosition(progress)` — point on position curve
- `getLookAt(progress)` — point on lookAt curve
- `getCurrentZone(progress)` — `floor(progress * 8)` clamped to 0-7
- `getZoneProgress(progress)` — normalized progress within current zone

**Step 2: Commit**

```bash
git add apps/presentation/src/camera-path.js
git commit -m "feat(presentation): add CatmullRom camera path system"
```

---

### Task 4: Build the Hybrid Timeline Controller

**Files:**
- Create: `apps/presentation/src/timeline.js`

**Step 1: Create timeline.js**

Constants: `AUTO_PLAY_SPEED = 0.03`, `IDLE_TIMEOUT = 5000ms`, `SCROLL_SENSITIVITY = 0.0004`

State: `progress`, `targetProgress`, `isAutoPlaying = true`, `lastInteraction`, `currentZone = -1`

Input handlers:
- `wheel` event (passive: false, preventDefault): add `deltaY * SCROLL_SENSITIVITY` to targetProgress, pause auto-play, record interaction time, hide scroll hint
- `touchstart`/`touchmove`: track touch delta, same logic
- `keydown` (ArrowDown/Space = advance 1 zone, ArrowUp = go back 1 zone)

Update loop:
1. If `!isAutoPlaying` and idle > 5s → resume auto-play
2. If auto-playing and progress < 1 → advance targetProgress by `AUTO_PLAY_SPEED * delta`
3. Lerp progress toward targetProgress: `progress += (target - progress) * min(delta * 3, 1)`
4. Update camera position/lookAt from `cameraPath`
5. Update progress bar width
6. Detect zone changes → call `overlay.setActiveZone()` and `world.onZoneEnter()`
7. Call `lenis.raf()`

Initialize Lenis with `infinite: true, smoothWheel: true`.

**Step 2: Commit**

```bash
git add apps/presentation/src/timeline.js
git commit -m "feat(presentation): add hybrid scroll/auto-play timeline controller"
```

---

### Task 5: Build the HTML Overlay System

**Files:**
- Create: `apps/presentation/src/overlay.js`

**Step 1: Create overlay.js**

Zone text content:
| Zone | Title | Subtitle |
|------|-------|----------|
| 0 | From Idea to Ship | How Claude Mainstreams Your Work |
| 1 | The Old Way | Fragmented tools. Slow iteration. Expensive teams. |
| 2 | One AI Partner | Claude handles the entire workflow. |
| 3 | Start with an Idea | Brainstorm, research, and plan — in minutes. |
| 4 | Create the Message | Copy, campaigns, landing pages — all generated. |
| 5 | Build the Product | Production code, reviews, and tests — handled. |
| 6 | Ship It | Deploy with confidence. Claude handles the last mile. |
| 7 | 10x Faster. 90% Less Cost. | The future of building is here. |

For each zone, create a `div.zone-text` with `h1` title and `p` subtitle using safe DOM methods (`document.createElement`, `textContent`). Append to `#overlay`.

Use `textContent` for setting text — do NOT use innerHTML. Set the title via `h1.textContent = zone.title` and subtitle via `p.textContent = zone.subtitle`.

Show zone 0 initially (add `.active` class). `setActiveZone(index)` toggles `.active` class.

**Step 2: Commit**

```bash
git add apps/presentation/src/overlay.js
git commit -m "feat(presentation): add HTML text overlay system"
```

---

### Task 6: Build the 3D World — Zone 0 (Title) + Zone 1 (Problem) + Zone 2 (Solution)

**Files:**
- Create: `apps/presentation/src/world.js`
- Create: `apps/presentation/src/zones/title.js`
- Create: `apps/presentation/src/zones/problem.js`
- Create: `apps/presentation/src/zones/solution.js`

**Step 1: Create world.js coordinator**

Import all 8 zone creators. Add global `AmbientLight(0xF5E6D3, 0.3)`. Create all zones in array. Export:
- `update(elapsed, delta, progress)` — calls each zone's update
- `onZoneEnter(index)` — calls `onEnter()` on matching zone, `onLeave()` on others

**Step 2: Create zones/title.js — Zone 0**

Position group at `(0, 0, 0)`. Elements:
- Point light `0xC67A4A` intensity 3
- 2000 warm particles in 40x20x40 volume, palette colors `[#F5E6D3, #D4A574, #C67A4A, #FAF7F2]`, additive blending, size 0.15
- Central orb: `IcosahedronGeometry(1.5, 4)` at `(0, 2, -5)`, emissive clay material
- Outer ring: `TorusGeometry(2.5, 0.05)` around orb

Update: gentle particle drift (sin-based Y offset), orb rotation + pulse, ring rotation.

**Step 3: Create zones/problem.js — Zone 1**

Position group at `(-8, 0, -30)`. Elements:
- Red/orange point light `0xFF6B35`
- 30 fragmented cubes, random sizes/positions/rotations, dark brown material
- 15 tangled lines (8-point random paths), orange, low opacity

Update: cubes slowly tumble and bob.

**Step 4: Create zones/solution.js — Zone 2**

Position group at `(5, 0, -60)`. Elements:
- Warm beige point light + spot light
- 5 clean assembled shapes (box, cylinder, sphere, octahedron, torus) in clay material
- 5 light rays (thin translucent planes)

Update: shapes gently rotate and float.

**Step 5: Commit**

```bash
git add apps/presentation/src/world.js apps/presentation/src/zones/title.js apps/presentation/src/zones/problem.js apps/presentation/src/zones/solution.js
git commit -m "feat(presentation): add world coordinator + title/problem/solution zones"
```

---

### Task 7: Build Zones 3-5 (Ideation, Marketing, Building)

**Files:**
- Create: `apps/presentation/src/zones/ideation.js`
- Create: `apps/presentation/src/zones/marketing.js`
- Create: `apps/presentation/src/zones/building.js`

**Step 1: Create zones/ideation.js — Zone 3: Neural network room**

Position group at `(-3, 0, -100)`. Elements:
- 25 sphere nodes (radius 0.4) scattered in 18x12x18 volume, emissive clay with random pulse offsets
- Random connections between nodes (2-3 edges each), `LineBasicMaterial` orange
- 100 spark particles near nodes, additive blending, tiny (0.1), random drift

Update: nodes pulse emissive intensity + scale, sparks drift randomly.

**Step 2: Create zones/marketing.js — Zone 4: Flying content cards**

Position group at `(10, 0, -140)`. Elements:
- 12 content cards (`BoxGeometry(2.5, 1.5, 0.05)`) with dark espresso + clay emissive material
- Each card has edge glow (`EdgesGeometry` + `LineSegments`)
- Cards start scattered (random positions/rotations), have target grid positions (4 cols x 3 rows)

On `onEnter()`: record enter time, set `entered = true`. Update: lerp cards from start to target positions with ease-out cubic. Before entering: gentle float.

**Step 3: Create zones/building.js — Zone 5: Code rain tunnel**

Position group at `(-5, 0, -175)`. Elements:
- 8 translucent tunnel wall panels arranged in a circle (radius 8), dark material
- 3000 code rain particles in cylindrical arrangement, falling downward, reset to top when below -2
- 3 wireframe shapes (icosahedron, octahedron, tetrahedron) assembling in center

Update: code particles fall (per-particle speed), wireframes rotate and pulse.

**Step 4: Commit**

```bash
git add apps/presentation/src/zones/ideation.js apps/presentation/src/zones/marketing.js apps/presentation/src/zones/building.js
git commit -m "feat(presentation): add ideation/marketing/building zones"
```

---

### Task 8: Build Zones 6-7 (Shipping, Impact)

**Files:**
- Create: `apps/presentation/src/zones/shipping.js`
- Create: `apps/presentation/src/zones/impact.js`

**Step 1: Create zones/shipping.js — Zone 6: Rocket launch / portal**

Position group at `(0, 0, -215)`. Elements:
- Dramatic upward point light + spot light
- Rocket: cylinder body (0.5→0.8 radius, height 4) + cone nose + cone engine glow (orange, transparent)
- Portal: `TorusGeometry(5, 0.2)` at y=12, horizontal, pulsing opacity
- 30 speed lines (vertical line segments) around the rocket

On `onEnter()`: `launched = true` → rocket rises upward. Update: rocket hover/launch, portal rotation + opacity pulse, engine flicker.

**Step 2: Create zones/impact.js — Zone 7: Floating stats + CTA**

Position group at `(0, 0, -255)`. Elements:
- Two warm lights
- 15 celebration shapes (octahedron, icosahedron, tetrahedron mix), clay emissive, scattered
- Central glow sphere (radius 3, very transparent)
- 500 orbiting ring particles in a torus around center

Update: shapes float sinusoidally, ring orbits slowly, glow sphere pulses.

**Step 3: Commit**

```bash
git add apps/presentation/src/zones/shipping.js apps/presentation/src/zones/impact.js
git commit -m "feat(presentation): add shipping/impact zones"
```

---

### Task 9: Add Post-Processing Effects

**Files:**
- Create: `apps/presentation/src/postfx.js`

**Step 1: Create postfx.js**

Set up `EffectComposer` with:
1. `RenderPass(scene, camera)` — base render
2. `UnrealBloomPass(resolution, strength=0.8, radius=0.4, threshold=0.85)` — cinematic glow
3. Custom `ShaderPass` for vignette — vertex shader passes UVs, fragment shader darkens edges using `dot(uv, uv)` with `offset=1.0` and `darkness=1.3`

Export `render()` and `setSize(w, h)`.

Import from `three/addons/postprocessing/` (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass).

**Step 2: Commit**

```bash
git add apps/presentation/src/postfx.js
git commit -m "feat(presentation): add post-processing (bloom + vignette)"
```

---

### Task 10: Integration Testing + Polish

**Step 1: Run dev server**

Run: `cd apps/presentation && npm run dev`
Expected: Full 3D experience loads at `http://localhost:4200`

**Step 2: Verify in browser**

Open `http://localhost:4200`. Check:
- [ ] Dark background loads
- [ ] 3D scene renders with particles in Zone 0
- [ ] Scrolling moves camera through zones
- [ ] Auto-play resumes after 5s idle
- [ ] Text overlays fade in/out per zone
- [ ] Post-processing bloom visible on emissive elements
- [ ] Vignette darkens edges
- [ ] Progress bar at top tracks position
- [ ] Keyboard arrows navigate zones
- [ ] Touch/swipe works on mobile

**Step 3: Fix any rendering issues**

Common issues to check:
- If fog is too dense, reduce `FogExp2` density in `main.js`
- If bloom is too bright, reduce `strength` in `postfx.js`
- If camera transitions are jerky, adjust spline tension in `camera-path.js`
- If overlays are hard to read, add text-shadow or backdrop-filter in `styles.css`

**Step 4: Build for production**

Run: `cd apps/presentation && npm run build`
Expected: Static files in `apps/presentation/dist/`

**Step 5: Commit final state**

```bash
git add -A apps/presentation/
git commit -m "feat(presentation): cinematic 3D investor presentation complete"
```
