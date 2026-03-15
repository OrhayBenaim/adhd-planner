import * as THREE from 'three'

export function createImpactZone(scene) {
  const group = new THREE.Group()
  group.position.set(0, 0, -255)

  const light = new THREE.PointLight(0xF5E6D3, 3, 60)
  light.position.set(0, 8, -250)
  group.add(light)

  const light2 = new THREE.PointLight(0xC67A4A, 2, 40)
  light2.position.set(-5, 3, -250)
  group.add(light2)

  // Celebration shapes
  const celebrationShapes = []
  const shapeMat = new THREE.MeshStandardMaterial({
    color: 0xD4A574,
    emissive: 0xC67A4A,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.4,
  })

  for (let i = 0; i < 15; i++) {
    const geoTypes = [
      new THREE.OctahedronGeometry(0.5 + Math.random() * 0.5, 0),
      new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.4, 0),
      new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.3, 0),
    ]
    const geo = geoTypes[i % 3]
    const shape = new THREE.Mesh(geo, shapeMat.clone())
    shape.position.set(
      (Math.random() - 0.5) * 20,
      Math.random() * 10 + 2,
      (Math.random() - 0.5) * 15
    )
    shape.userData.floatSpeed = 0.5 + Math.random()
    shape.userData.floatOffset = Math.random() * Math.PI * 2
    shape.userData.baseY = shape.position.y
    celebrationShapes.push(shape)
    group.add(shape)
  }

  // Central glow sphere
  const glowGeo = new THREE.SphereGeometry(3, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xC67A4A,
    transparent: true,
    opacity: 0.08,
  })
  const glowSphere = new THREE.Mesh(glowGeo, glowMat)
  glowSphere.position.set(0, 5, 0)
  group.add(glowSphere)

  // Orbiting ring particles
  const ringParticleCount = 500
  const ringGeo = new THREE.BufferGeometry()
  const ringPositions = new Float32Array(ringParticleCount * 3)
  for (let i = 0; i < ringParticleCount; i++) {
    const angle = (i / ringParticleCount) * Math.PI * 2
    const radius = 8 + Math.random() * 2
    ringPositions[i * 3] = Math.cos(angle) * radius
    ringPositions[i * 3 + 1] = 5 + (Math.random() - 0.5) * 2
    ringPositions[i * 3 + 2] = Math.sin(angle) * radius
  }
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3))
  const ringMat = new THREE.PointsMaterial({
    color: 0xF5E6D3,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ringParticles = new THREE.Points(ringGeo, ringMat)
  group.add(ringParticles)

  scene.add(group)

  return {
    update(elapsed) {
      celebrationShapes.forEach((shape) => {
        shape.position.y = shape.userData.baseY + Math.sin(elapsed * shape.userData.floatSpeed + shape.userData.floatOffset) * 0.5
        shape.rotation.y = elapsed * 0.3
        shape.rotation.x = elapsed * 0.2
      })

      ringParticles.rotation.y = elapsed * 0.1

      glowSphere.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.1)
      glowSphere.material.opacity = 0.06 + Math.sin(elapsed * 2) * 0.03
    },
  }
}
