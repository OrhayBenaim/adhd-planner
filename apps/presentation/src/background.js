import * as THREE from 'three'

// Zone color palettes — each zone has top, mid, bottom gradient colors
const ZONE_PALETTES = [
  // Zone 0 — Title: deep warm black → subtle amber glow
  { top: new THREE.Color(0x0a0604), mid: new THREE.Color(0x1a0f0a), bottom: new THREE.Color(0x2a1508), accent: new THREE.Color(0xC67A4A) },
  // Zone 1 — Problem: dark red/brown → tension
  { top: new THREE.Color(0x0d0503), mid: new THREE.Color(0x1f0a06), bottom: new THREE.Color(0x330d08), accent: new THREE.Color(0xFF6B35) },
  // Zone 2 — Solution: warm beige wash
  { top: new THREE.Color(0x1a120c), mid: new THREE.Color(0x2a1d14), bottom: new THREE.Color(0x3d2b1e), accent: new THREE.Color(0xD4A574) },
  // Zone 3 — Ideation: deep purple/violet → creative
  { top: new THREE.Color(0x0a0510), mid: new THREE.Color(0x150a20), bottom: new THREE.Color(0x1f0f30), accent: new THREE.Color(0x9B6DFF) },
  // Zone 4 — Marketing: teal/cyan accents
  { top: new THREE.Color(0x040a0d), mid: new THREE.Color(0x081520), bottom: new THREE.Color(0x0c2030), accent: new THREE.Color(0x4ECDC4) },
  // Zone 5 — Building: cool dark blue → focused
  { top: new THREE.Color(0x03050d), mid: new THREE.Color(0x060a1a), bottom: new THREE.Color(0x0a1028), accent: new THREE.Color(0x6B9BFF) },
  // Zone 6 — Shipping: bright amber/gold → triumphant
  { top: new THREE.Color(0x120a02), mid: new THREE.Color(0x251508), bottom: new THREE.Color(0x3d2410), accent: new THREE.Color(0xFFB347) },
  // Zone 7 — Impact: warm white/cream → confident
  { top: new THREE.Color(0x15100a), mid: new THREE.Color(0x2a2018), bottom: new THREE.Color(0x3d3025), accent: new THREE.Color(0xF5E6D3) },
]

// --- Skydome with animated gradient shader ---
function createSkydome(scene) {
  const geo = new THREE.SphereGeometry(400, 64, 64)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: ZONE_PALETTES[0].top.clone() },
      uMidColor: { value: ZONE_PALETTES[0].mid.clone() },
      uBottomColor: { value: ZONE_PALETTES[0].bottom.clone() },
      uTime: { value: 0 },
      uOffset: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uBottomColor;
      uniform float uTime;
      uniform float uOffset;
      varying vec3 vWorldPosition;

      // Simplex-like noise for subtle variation
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float y = dir.y * 0.5 + 0.5; // 0 at bottom, 1 at top

        // Three-stop gradient
        vec3 color;
        if (y < 0.4) {
          color = mix(uBottomColor, uMidColor, y / 0.4);
        } else {
          color = mix(uMidColor, uTopColor, (y - 0.4) / 0.6);
        }

        // Subtle animated noise for organic feel
        float n = noise(dir.xz * 3.0 + uTime * 0.05) * 0.08;
        color += n;

        // Radial glow from below (like ground reflection)
        float groundGlow = smoothstep(0.5, 0.0, y) * 0.15;
        color += uBottomColor * groundGlow;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const dome = new THREE.Mesh(geo, mat)
  scene.add(dome)
  return { mesh: dome, material: mat }
}

// --- Star field — 5000 distant twinkling stars ---
function createStarField(scene) {
  const count = 5000
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const twinkleOffsets = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Distribute on a large sphere
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 250 + Math.random() * 100
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    sizes[i] = Math.random() * 2 + 0.5
    twinkleOffsets[i] = Math.random() * Math.PI * 2
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkleOffsets, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.6 },
      uColor: { value: new THREE.Color(0xFAF7F2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aTwinkle;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        vTwinkle = aTwinkle;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (200.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vTwinkle;
      void main() {
        // Soft circular point
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d);

        // Twinkle
        float twinkle = sin(uTime * 1.5 + vTwinkle * 6.28) * 0.4 + 0.6;
        alpha *= twinkle * uOpacity;

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  })

  const stars = new THREE.Points(geo, mat)
  scene.add(stars)
  return { points: stars, material: mat }
}

// --- Volumetric fog planes at different depths ---
function createFogLayers(scene) {
  const layers = []
  const layerConfigs = [
    { y: -2, z: 0, scale: 80, opacity: 0.04 },
    { y: 3, z: -60, scale: 100, opacity: 0.03 },
    { y: 8, z: -140, scale: 120, opacity: 0.035 },
    { y: 1, z: -220, scale: 90, opacity: 0.04 },
  ]

  layerConfigs.forEach((cfg) => {
    const geo = new THREE.PlaneGeometry(cfg.scale, cfg.scale)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: cfg.opacity },
        uColor: { value: new THREE.Color(0xD4A574) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          float n = fbm(uv * 3.0 + uTime * 0.02);
          float n2 = fbm(uv * 5.0 - uTime * 0.015);

          float fog = n * n2;

          // Soft edge falloff
          float edge = smoothstep(0.0, 0.3, uv.x) * smoothstep(1.0, 0.7, uv.x)
                     * smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);

          float alpha = fog * edge * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    })

    const plane = new THREE.Mesh(geo, mat)
    plane.position.set(0, cfg.y, cfg.z)
    plane.rotation.x = -Math.PI * 0.15
    plane.renderOrder = -1
    scene.add(plane)
    layers.push({ mesh: plane, material: mat })
  })

  return layers
}

// --- Aurora bands — undulating ribbon meshes ---
function createAuroraBands(scene) {
  const bands = []
  const bandConfigs = [
    { y: 30, z: -80, width: 60, color: new THREE.Color(0xC67A4A), opacity: 0.06 },
    { y: 35, z: -160, width: 80, color: new THREE.Color(0x9B6DFF), opacity: 0.04 },
    { y: 25, z: -240, width: 70, color: new THREE.Color(0x4ECDC4), opacity: 0.05 },
  ]

  bandConfigs.forEach((cfg) => {
    const segments = 128
    const geo = new THREE.PlaneGeometry(cfg.width, 8, segments, 1)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: cfg.opacity },
        uColor: { value: cfg.color },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDisplacement;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Sine wave displacement
          float wave = sin(pos.x * 0.1 + uTime * 0.3) * 3.0
                     + sin(pos.x * 0.05 + uTime * 0.2) * 5.0;
          pos.y += wave;
          vDisplacement = wave * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vDisplacement;
        void main() {
          // Vertical falloff — bright center, fading edges
          float yFade = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          // Horizontal soft edges
          float xFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

          float alpha = yFade * xFade * uOpacity;
          // Color shift based on displacement
          vec3 col = uColor + vDisplacement * 0.3;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    })

    const band = new THREE.Mesh(geo, mat)
    band.position.set(0, cfg.y, cfg.z)
    band.rotation.x = -Math.PI * 0.3
    scene.add(band)
    bands.push({ mesh: band, material: mat })
  })

  return bands
}

// --- Global dust particles across the entire path ---
function createGlobalDust(scene) {
  const count = 1500
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const driftOffsets = new Float32Array(count * 3)

  // Spread across the entire camera path
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50
    positions[i * 3 + 1] = Math.random() * 25
    positions[i * 3 + 2] = 20 - Math.random() * 290 // z from 20 to -270
    driftOffsets[i * 3] = Math.random() * Math.PI * 2
    driftOffsets[i * 3 + 1] = Math.random() * Math.PI * 2
    driftOffsets[i * 3 + 2] = Math.random() * Math.PI * 2
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aDrift', new THREE.BufferAttribute(driftOffsets, 3))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xD4A574) },
    },
    vertexShader: `
      attribute vec3 aDrift;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        // Brownian drift
        pos.x += sin(uTime * 0.3 + aDrift.x) * 0.8;
        pos.y += sin(uTime * 0.2 + aDrift.y) * 0.5;
        pos.z += cos(uTime * 0.25 + aDrift.z) * 0.6;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 2.0 * (100.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;

        // Fade by distance
        vAlpha = smoothstep(300.0, 50.0, -mvPos.z) * 0.4;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  })

  const dust = new THREE.Points(geo, mat)
  scene.add(dust)
  return { points: dust, material: mat }
}

// --- Main background system ---
export function createBackground(scene) {
  const skydome = createSkydome(scene)
  const starField = createStarField(scene)
  const fogLayers = createFogLayers(scene)
  const auroraBands = createAuroraBands(scene)
  const globalDust = createGlobalDust(scene)

  // Current interpolated palette
  const currentPalette = {
    top: ZONE_PALETTES[0].top.clone(),
    mid: ZONE_PALETTES[0].mid.clone(),
    bottom: ZONE_PALETTES[0].bottom.clone(),
    accent: ZONE_PALETTES[0].accent.clone(),
  }

  return {
    update(elapsed, delta, progress) {
      // Determine zone blend
      const zoneCount = ZONE_PALETTES.length
      const rawZone = progress * (zoneCount - 1)
      const zoneA = Math.min(Math.floor(rawZone), zoneCount - 2)
      const zoneB = zoneA + 1
      const blend = rawZone - zoneA

      const palA = ZONE_PALETTES[zoneA]
      const palB = ZONE_PALETTES[zoneB]

      // Smooth lerp palette colors
      currentPalette.top.lerpColors(palA.top, palB.top, blend)
      currentPalette.mid.lerpColors(palA.mid, palB.mid, blend)
      currentPalette.bottom.lerpColors(palA.bottom, palB.bottom, blend)
      currentPalette.accent.lerpColors(palA.accent, palB.accent, blend)

      // Update skydome
      skydome.material.uniforms.uTopColor.value.copy(currentPalette.top)
      skydome.material.uniforms.uMidColor.value.copy(currentPalette.mid)
      skydome.material.uniforms.uBottomColor.value.copy(currentPalette.bottom)
      skydome.material.uniforms.uTime.value = elapsed

      // Stars twinkle
      starField.material.uniforms.uTime.value = elapsed
      // Stars dim in brighter zones (2, 7)
      const starDim = (zoneA === 2 || zoneA === 7) ? 0.3 : 0.6
      starField.material.uniforms.uOpacity.value += (starDim - starField.material.uniforms.uOpacity.value) * delta * 2

      // Fog layers
      fogLayers.forEach((layer) => {
        layer.material.uniforms.uTime.value = elapsed
        layer.material.uniforms.uColor.value.copy(currentPalette.accent)
      })

      // Aurora bands
      auroraBands.forEach((band) => {
        band.material.uniforms.uTime.value = elapsed
      })

      // Dust
      globalDust.material.uniforms.uTime.value = elapsed
      globalDust.material.uniforms.uColor.value.copy(currentPalette.accent)
    },
  }
}
