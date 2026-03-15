import * as THREE from 'three'

export function createBuildingZone(scene) {
  const group = new THREE.Group()
  group.position.set(-5, 0, -175)

  const light = new THREE.PointLight(0xD4A574, 2, 50)
  light.position.set(-5, 5, -170)
  group.add(light)

  // Tunnel walls
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2C1810,
    transparent: true,
    opacity: 0.15,
    metalness: 0.9,
    roughness: 0.1,
    side: THREE.DoubleSide,
  })

  const wallCount = 8
  for (let i = 0; i < wallCount; i++) {
    const angle = (i / wallCount) * Math.PI * 2
    const wallGeo = new THREE.PlaneGeometry(3, 20)
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.set(Math.cos(angle) * 8, 5, Math.sin(angle) * 8)
    wall.lookAt(new THREE.Vector3(0, 5, 0).add(group.position))
    group.add(wall)
  }

  // Code rain particles
  const codeCount = 3000
  const codeGeo = new THREE.BufferGeometry()
  const codePositions = new Float32Array(codeCount * 3)
  const codeSpeeds = new Float32Array(codeCount)

  for (let i = 0; i < codeCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2 + Math.random() * 6
    codePositions[i * 3] = Math.cos(angle) * radius
    codePositions[i * 3 + 1] = Math.random() * 20
    codePositions[i * 3 + 2] = Math.sin(angle) * radius
    codeSpeeds[i] = 1 + Math.random() * 3
  }

  codeGeo.setAttribute('position', new THREE.BufferAttribute(codePositions, 3))
  const codeMat = new THREE.PointsMaterial({
    color: 0xC67A4A,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const codeParticles = new THREE.Points(codeGeo, codeMat)
  group.add(codeParticles)

  // Wireframe structures
  const wireframes = []
  const wireGeos = [
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.OctahedronGeometry(1, 1),
    new THREE.TetrahedronGeometry(1.2, 1),
  ]

  wireGeos.forEach((geo, i) => {
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xF5E6D3,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    })
    const wire = new THREE.Mesh(geo, wireMat)
    wire.position.set((i - 1) * 3, 4, 0)
    wireframes.push(wire)
    group.add(wire)
  })

  scene.add(group)

  return {
    update(elapsed, delta) {
      const pos = codeParticles.geometry.attributes.position.array
      for (let i = 0; i < codeCount; i++) {
        pos[i * 3 + 1] -= codeSpeeds[i] * delta
        if (pos[i * 3 + 1] < -2) {
          pos[i * 3 + 1] = 20
        }
      }
      codeParticles.geometry.attributes.position.needsUpdate = true

      wireframes.forEach((wire, i) => {
        wire.rotation.x = elapsed * 0.3 + i * 2
        wire.rotation.y = elapsed * 0.4 + i * 1.5
        wire.scale.setScalar(0.8 + Math.sin(elapsed * 0.5 + i) * 0.2)
      })
    },
  }
}
