import * as THREE from 'three'

export function createSolutionZone(scene) {
  const group = new THREE.Group()
  group.position.set(5, 0, -60)

  const light = new THREE.PointLight(0xF5E6D3, 3, 50)
  light.position.set(5, 8, -55)
  group.add(light)

  const spotLight = new THREE.SpotLight(0xD4A574, 2, 40, Math.PI / 4)
  spotLight.position.set(5, 12, -60)
  spotLight.target.position.set(5, 2, -65)
  group.add(spotLight)
  group.add(spotLight.target)

  const shapes = []
  const shapeMat = new THREE.MeshStandardMaterial({
    color: 0xD4A574,
    emissive: 0xC67A4A,
    emissiveIntensity: 0.3,
    metalness: 0.4,
    roughness: 0.2,
  })

  const geometries = [
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.CylinderGeometry(0.8, 0.8, 3, 32),
    new THREE.SphereGeometry(1.2, 32, 32),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusGeometry(1, 0.3, 16, 32),
  ]

  const positions = [
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(3, 3, -2),
    new THREE.Vector3(-3, 4, 1),
    new THREE.Vector3(1, 5, 3),
    new THREE.Vector3(-1, 1, -3),
  ]

  geometries.forEach((geo, i) => {
    const mesh = new THREE.Mesh(geo, shapeMat.clone())
    mesh.position.copy(positions[i])
    mesh.userData.baseY = positions[i].y
    shapes.push(mesh)
    group.add(mesh)
  })

  // Light rays
  const rayMat = new THREE.MeshBasicMaterial({
    color: 0xF5E6D3,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
  })
  for (let i = 0; i < 5; i++) {
    const rayGeo = new THREE.PlaneGeometry(0.3, 20)
    const ray = new THREE.Mesh(rayGeo, rayMat)
    ray.position.set((i - 2) * 3, 6, -2)
    ray.rotation.z = (Math.random() - 0.5) * 0.3
    group.add(ray)
  }

  scene.add(group)

  return {
    update(elapsed) {
      shapes.forEach((shape, i) => {
        shape.rotation.y = elapsed * 0.2 + i
        shape.position.y = shape.userData.baseY + Math.sin(elapsed * 0.8 + i * 1.5) * 0.3
      })
    },
  }
}
