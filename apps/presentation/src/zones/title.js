import * as THREE from 'three'

export function createTitleZone(scene) {
  const group = new THREE.Group()
  group.position.set(0, 0, 0)

  // Warm point light
  const light = new THREE.PointLight(0xC67A4A, 3, 50)
  light.position.set(0, 5, 5)
  group.add(light)

  // Particle field
  const particleCount = 2000
  const particleGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  const palette = [
    new THREE.Color(0xF5E6D3),
    new THREE.Color(0xD4A574),
    new THREE.Color(0xC67A4A),
    new THREE.Color(0xFAF7F2),
  ]

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20 + 2
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40
    const color = palette[Math.floor(Math.random() * palette.length)]
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const particleMat = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const particles = new THREE.Points(particleGeo, particleMat)
  group.add(particles)

  // Glowing central orb
  const orbGeo = new THREE.IcosahedronGeometry(1.5, 4)
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xD4A574,
    emissive: 0xC67A4A,
    emissiveIntensity: 1.5,
    metalness: 0.3,
    roughness: 0.4,
  })
  const orb = new THREE.Mesh(orbGeo, orbMat)
  orb.position.set(0, 2, -5)
  group.add(orb)

  // Outer glow ring
  const ringGeo = new THREE.TorusGeometry(2.5, 0.05, 16, 100)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xF5E6D3,
    transparent: true,
    opacity: 0.4,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.copy(orb.position)
  group.add(ring)

  scene.add(group)

  return {
    update(elapsed) {
      const posArray = particles.geometry.attributes.position.array
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3 + 1] += Math.sin(elapsed + i) * 0.001
      }
      particles.geometry.attributes.position.needsUpdate = true

      orb.rotation.y = elapsed * 0.3
      orb.rotation.x = Math.sin(elapsed * 0.5) * 0.1
      orb.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.05)

      ring.rotation.x = elapsed * 0.2
      ring.rotation.z = elapsed * 0.15
    },
  }
}
