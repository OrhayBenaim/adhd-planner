import * as THREE from 'three'
import { createWorld } from './world.js'
import { createCameraPath } from './camera-path.js'
import { createTimeline } from './timeline.js'
import { createOverlay } from './overlay.js'
import { createPostFX } from './postfx.js'
import { createBackground } from './background.js'

// Scene
const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x0a0604, 0.005)

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 2, 10)

// Renderer
const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.outputColorSpace = THREE.SRGBColorSpace

// Background system (skydome, stars, fog, aurora, dust)
const background = createBackground(scene)

// Build world
const world = createWorld(scene)

// Camera path
const cameraPath = createCameraPath()

// Post-processing
const postfx = createPostFX(renderer, scene, camera)

// Overlay
const overlay = createOverlay()

// Timeline
const timeline = createTimeline(camera, cameraPath, overlay, world)

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  postfx.setSize(window.innerWidth, window.innerHeight)
})

// Animation loop
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  timeline.update(delta)
  background.update(elapsed, delta, timeline.progress)
  world.update(elapsed, delta, timeline.progress)
  postfx.render()
}

animate()
