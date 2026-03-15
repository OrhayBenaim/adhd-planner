import * as THREE from 'three'

export function createProblemZone(scene) {
  const group = new THREE.Group()
  group.position.set(-8, 0, -30)

  const light = new THREE.PointLight(0xFF6B35, 2, 40)
  light.position.set(-8, 6, -25)
  group.add(light)

  // Fragmented cubes
  const fragments = []
  const fragMat = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    metalness: 0.6,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
  })

  for (let i = 0; i < 30; i++) {
    const size = Math.random() * 1.5 + 0.3
    const geo = new THREE.BoxGeometry(size, size, size)
    const frag = new THREE.Mesh(geo, fragMat.clone())
    frag.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 12 + 4,
      (Math.random() - 0.5) * 20
    )
    frag.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
    frag.userData.speed = Math.random() * 0.5 + 0.2
    fragments.push(frag)
    group.add(frag)
  }

  // Tangled lines
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xFF6B35,
    transparent: true,
    opacity: 0.3,
  })
  for (let i = 0; i < 15; i++) {
    const points = []
    let pos = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 10 + 4,
      (Math.random() - 0.5) * 15
    )
    for (let j = 0; j < 8; j++) {
      points.push(pos.clone())
      pos = pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 5
      ))
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(lineGeo, lineMat)
    group.add(line)
  }

  scene.add(group)

  return {
    update(elapsed) {
      fragments.forEach((frag) => {
        frag.rotation.x += frag.userData.speed * 0.01
        frag.rotation.y += frag.userData.speed * 0.008
        frag.position.y += Math.sin(elapsed * frag.userData.speed) * 0.003
      })
    },
  }
}
