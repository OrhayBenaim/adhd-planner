import * as THREE from 'three'

export function createIdeationZone(scene) {
  const group = new THREE.Group()
  group.position.set(-3, 0, -100)

  const light = new THREE.PointLight(0xD4A574, 3, 50)
  light.position.set(-3, 10, -95)
  group.add(light)

  // Neural network nodes
  const nodes = []
  const nodeCount = 25
  const nodeGeo = new THREE.SphereGeometry(0.4, 16, 16)

  for (let i = 0; i < nodeCount; i++) {
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xF5E6D3,
      emissive: 0xC67A4A,
      emissiveIntensity: 0.8 + Math.random() * 0.5,
      metalness: 0.2,
      roughness: 0.5,
    })
    const node = new THREE.Mesh(nodeGeo, nodeMat)
    node.position.set(
      (Math.random() - 0.5) * 18,
      Math.random() * 12 + 2,
      (Math.random() - 0.5) * 18
    )
    node.userData.pulseOffset = Math.random() * Math.PI * 2
    node.userData.pulseSpeed = 1 + Math.random() * 2
    nodes.push(node)
    group.add(node)
  }

  // Connections
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xC67A4A,
    transparent: true,
    opacity: 0.4,
  })

  for (let i = 0; i < nodeCount; i++) {
    const connections = Math.floor(Math.random() * 2) + 2
    for (let c = 0; c < connections; c++) {
      const j = Math.floor(Math.random() * nodeCount)
      if (j === i) continue
      const points = [nodes[i].position.clone(), nodes[j].position.clone()]
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(points)
      const edge = new THREE.Line(edgeGeo, edgeMat.clone())
      group.add(edge)
    }
  }

  // Sparks
  const sparkCount = 100
  const sparkGeo = new THREE.BufferGeometry()
  const sparkPositions = new Float32Array(sparkCount * 3)
  for (let i = 0; i < sparkCount; i++) {
    const nodeIdx = Math.floor(Math.random() * nodeCount)
    sparkPositions[i * 3] = nodes[nodeIdx].position.x + (Math.random() - 0.5) * 2
    sparkPositions[i * 3 + 1] = nodes[nodeIdx].position.y + (Math.random() - 0.5) * 2
    sparkPositions[i * 3 + 2] = nodes[nodeIdx].position.z + (Math.random() - 0.5) * 2
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3))
  const sparkMat = new THREE.PointsMaterial({
    color: 0xFAF7F2,
    size: 0.1,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const sparks = new THREE.Points(sparkGeo, sparkMat)
  group.add(sparks)

  scene.add(group)

  return {
    update(elapsed) {
      nodes.forEach((node) => {
        const pulse = Math.sin(elapsed * node.userData.pulseSpeed + node.userData.pulseOffset)
        node.material.emissiveIntensity = 0.5 + pulse * 0.5
        node.scale.setScalar(1 + pulse * 0.15)
      })

      const sparkPos = sparks.geometry.attributes.position.array
      for (let i = 0; i < sparkCount; i++) {
        sparkPos[i * 3] += (Math.random() - 0.5) * 0.05
        sparkPos[i * 3 + 1] += (Math.random() - 0.5) * 0.05
        sparkPos[i * 3 + 2] += (Math.random() - 0.5) * 0.05
      }
      sparks.geometry.attributes.position.needsUpdate = true
    },
  }
}
