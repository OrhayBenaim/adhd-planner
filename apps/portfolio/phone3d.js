// The hero phone: a three.js iPhone that shows the app screens, dissolves between them
// with a glowing edge, swings as the deck advances, and floats among soap bubbles.
// index.html owns the deck state; this only renders it (window.deckState.target).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('phone3d');
const screens = [...stage.querySelectorAll('.screen')];
const N = screens.length;
const mod = (n) => ((n % N) + N) % N;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xffe4ef, 1.4);
key.position.set(2, 3, 4);
scene.add(key);

const loader = new THREE.TextureLoader();
const textures = await Promise.all(screens.map((img) => loader.loadAsync(img.currentSrc || img.src)));
textures.forEach((t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
});

// ---------- Phone ----------

const W = 1.02, H = 2.1, D = 0.11, R = 0.15;
const SW = 0.93, SH = SW * (1431 / 660);

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const metal = new THREE.MeshPhysicalMaterial({
  color: 0xf4c7d7, metalness: 0.8, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.18,
});
const black = new THREE.MeshPhysicalMaterial({ color: 0x08070a, roughness: 0.08, clearcoat: 1 });

const rig = new THREE.Group();
scene.add(rig);

const bevel = 0.022;
const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(W - bevel * 2, H - bevel * 2, R - bevel), {
  depth: D - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 24,
});
bodyGeo.center();
rig.add(new THREE.Mesh(bodyGeo, metal));

const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - 0.03, H - 0.03, R - 0.012), 24), black);
glass.position.z = D / 2 + 0.001;
rig.add(glass);

const screenMat = new THREE.ShaderMaterial({
  toneMapped: false,
  uniforms: {
    a: { value: textures[0] },
    b: { value: textures[1] },
    p: { value: 0 },
    time: { value: 0 },
    size: { value: new THREE.Vector2(SW, SH) },
    radius: { value: 0.1 },
    glow: { value: new THREE.Color(0xf17faf) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D a;
    uniform sampler2D b;
    uniform float p;
    uniform float time;
    uniform vec2 size;
    uniform float radius;
    uniform vec3 glow;
    varying vec2 vUv;

    float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 q) {
      vec2 i = floor(q), f = fract(q), u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 q) {
      float v = 0.0, amp = 0.5;
      for (int k = 0; k < 4; k++) { v += amp * noise(q); q *= 2.0; amp *= 0.5; }
      return v;
    }

    void main() {
      // Rounded screen corners.
      vec2 q = (vUv - 0.5) * size;
      vec2 hb = size * 0.5 - radius;
      if (length(max(abs(q) - hb, 0.0)) - radius > 0.0) discard;

      // The new screen melts in from the top along a noisy, glowing edge.
      float field = mix(1.0 - vUv.y, fbm(vUv * vec2(4.0, 8.0) + time * 0.05), 0.35);
      float edge = p * 1.3 - 0.15;
      float keepOld = smoothstep(edge - 0.03, edge + 0.03, field);
      vec3 col = mix(texture2D(b, vUv).rgb, texture2D(a, vUv).rgb, keepOld);
      float band = 1.0 - smoothstep(0.0, 0.06, abs(field - edge));
      float live = sin(3.14159 * clamp(p, 0.0, 1.0));
      col = mix(col, glow, band * live * 0.85);
      col += vec3(1.0, 0.85, 0.92) * pow(band, 6.0) * live * 0.6;

      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
});
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat);
screen.position.z = D / 2 + 0.002;
rig.add(screen);

const island = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(0.27, 0.08, 0.04), 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
island.position.set(0, SH / 2 - 0.055, D / 2 + 0.003);
rig.add(island);

// Side buttons: action + volume on the left, power on the right.
for (const [side, y, h] of [[-1, 0.62, 0.07], [-1, 0.45, 0.14], [-1, 0.27, 0.14], [1, 0.4, 0.22]]) {
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.016, h, 0.045), metal);
  btn.position.set(side * (W / 2 + 0.004), y, 0);
  rig.add(btn);
}

// Camera bump on the back (seen during the entrance spin).
const bump = new THREE.Mesh(
  new THREE.ExtrudeGeometry(roundedRect(0.4, 0.4, 0.1), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }),
  new THREE.MeshPhysicalMaterial({ color: 0xf0bccd, metalness: 0.5, roughness: 0.45 }),
);
bump.rotation.y = Math.PI;
bump.position.set(-W / 2 + 0.26, H / 2 - 0.26, -D / 2 - 0.005);
rig.add(bump);
for (const [x, y] of [[-0.08, 0.08], [0.08, -0.08]]) {
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 32), black);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(-W / 2 + 0.26 + x, H / 2 - 0.26 + y, -D / 2 - 0.04);
  rig.add(lens);
}

// Soft contact shadow under the phone.
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 128;
const sctx = shadowCanvas.getContext('2d');
const grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
grad.addColorStop(0, 'rgba(82,10,48,0.35)');
grad.addColorStop(1, 'rgba(82,10,48,0)');
sctx.fillStyle = grad;
sctx.fillRect(0, 0, 128, 128);
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1.3, 0.22),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
);
shadow.position.set(0, -H / 2 - 0.16, -0.3);
scene.add(shadow);

// ---------- Bubbles ----------

// Soap film: clear in the middle, a rainbow rim that shifts with the view angle, one bright highlight.
const bubbleMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  uniforms: { time: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vSeed;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      vSeed = modelMatrix[3].x * 3.7 + modelMatrix[3].z * 5.1;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vSeed;
    void main() {
      vec3 n = normalize(vNormal);
      float f = 1.0 - max(dot(n, normalize(vView)), 0.0);
      float rim = pow(f, 2.2);
      vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + f * 1.6 + time * 0.08 + vSeed));
      vec3 col = mix(vec3(1.0), film, 0.7) * rim;
      float spot = pow(max(dot(n, normalize(vec3(-0.45, 0.6, 0.66))), 0.0), 60.0);
      col += vec3(spot);
      gl_FragColor = vec4(col, clamp(rim * 0.8 + spot + 0.03, 0.0, 1.0));
      #include <colorspace_fragment>
    }
  `,
});
const bubbleGeo = new THREE.SphereGeometry(1, 32, 16);
const bubbles = Array.from({ length: 12 }, () => {
  const m = new THREE.Mesh(bubbleGeo, bubbleMat);
  const side = Math.random() < 0.5 ? -1 : 1;
  m.userData = {
    x: side * (0.6 + Math.random() * 0.65),
    y: -1.4 + Math.random() * 2.8,
    z: -0.8 + Math.random() * 1.1,
    speed: 0.05 + Math.random() * 0.1,
    phase: Math.random() * Math.PI * 2,
  };
  m.scale.setScalar(0.04 + Math.random() * 0.1);
  scene.add(m);
  return m;
});

// ---------- Confetti (when "You did more than you think." lands) ----------

const confettiColors = [0xf17faf, 0xd6f1fe, 0xa99ad8, 0x75ab9d, 0xffd36e, 0x771344];
const confettiGeo = new THREE.PlaneGeometry(0.04, 0.02);
const confetti = Array.from({ length: 70 }, (_, k) => {
  const m = new THREE.Mesh(confettiGeo, new THREE.MeshBasicMaterial({
    color: confettiColors[k % confettiColors.length], side: THREE.DoubleSide, transparent: true, opacity: 0,
  }));
  m.userData = { life: 99, v: new THREE.Vector3(), spin: new THREE.Vector3() };
  scene.add(m);
  return m;
});
function burst() {
  for (const m of confetti) {
    m.position.set((Math.random() - 0.5) * 0.6, H / 2 - 0.2, 0.2);
    m.userData.life = 0;
    m.userData.v.set((Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 1.4, (Math.random() - 0.3) * 1);
    m.userData.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
  }
}

// ---------- Layout ----------

const FOV = THREE.MathUtils.degToRad(22);
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // The phone's height fills the stage slot; the canvas is larger so it can swing and bubbles can drift.
  const visibleH = H * (h / stage.clientHeight);
  camera.position.z = visibleH / 2 / Math.tan(FOV / 2);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

const pointer = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
});

// ---------- Loop ----------

const state = window.deckState;
let current = state.target;
let lastShown = -1;
let last = performance.now();
const start = last;
let time = 0;

// Too late: the page already fell back to the flat phone.
if (!document.documentElement.classList.contains('will-3d')) {
  renderer.dispose();
  throw new Error('3D phone loaded after fallback');
}
stage.classList.add('is-3d');

renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!visible) return;
  time += dt;

  current += (state.target - current) * (1 - Math.exp(-dt * 5));
  if (Math.abs(state.target - current) < 0.0005) current = state.target;

  const base = Math.floor(current + 1e-6);
  const t = current - base;
  const eased = t * t * (3 - 2 * t);
  screenMat.uniforms.a.value = textures[mod(base)];
  screenMat.uniforms.b.value = textures[mod(base + 1)];
  screenMat.uniforms.p.value = eased;
  screenMat.uniforms.time.value = time;
  bubbleMat.uniforms.time.value = time;

  const shown = mod(Math.round(current));
  if (shown === N - 1 && lastShown !== N - 1 && lastShown !== -1) burst();
  lastShown = shown;

  // Entrance: a full turn up into place. Between screens: swing out and back, alternating sides.
  const intro = Math.min(1, (now - start) / 1700);
  const enter = 1 - Math.pow(1 - intro, 3);
  const swing = Math.sin(Math.PI * eased);
  const dir = mod(base) % 2 === 0 ? 1 : -1;
  tilt.x += (pointer.x - tilt.x) * (1 - Math.exp(-dt * 4));
  tilt.y += (pointer.y - tilt.y) * (1 - Math.exp(-dt * 4));

  rig.rotation.y = -0.3 + dir * swing * 0.5 + tilt.x * 0.22 - (1 - enter) * Math.PI * 2;
  rig.rotation.x = 0.05 + Math.sin(time * 0.8) * 0.025 + tilt.y * 0.12;
  rig.rotation.z = 0.02 - dir * swing * 0.05;
  rig.position.y = Math.sin(time * 1.1) * 0.035 - (1 - enter) * 0.9;
  rig.position.z = swing * 0.2;
  rig.scale.setScalar(0.85 + 0.15 * enter);
  shadow.material.opacity = (0.75 - Math.sin(time * 1.1) * 0.15) * enter;

  for (const m of bubbles) {
    const u = m.userData;
    u.y += u.speed * dt;
    if (u.y > 1.5) u.y = -1.5;
    m.position.set(u.x + Math.sin(time * 0.6 + u.phase) * 0.06, u.y - current * 0.15 * (u.z + 1), u.z);
  }

  for (const m of confetti) {
    const u = m.userData;
    if (u.life > 2.4) continue;
    u.life += dt;
    u.v.y -= 3.2 * dt;
    m.position.addScaledVector(u.v, dt);
    m.rotation.x += u.spin.x * dt;
    m.rotation.y += u.spin.y * dt;
    m.rotation.z += u.spin.z * dt;
    m.material.opacity = u.life > 2.4 ? 0 : Math.min(1, (2.4 - u.life) / 0.6);
  }

  renderer.render(scene, camera);
});
