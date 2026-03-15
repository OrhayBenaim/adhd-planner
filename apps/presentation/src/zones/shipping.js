import * as THREE from 'three'

export function createShippingZone(scene) {
  const group = new THREE.Group()
  group.position.set(0, 0, -215)

  const light = new THREE.PointLight(0xF5E6D3, 4, 60)
  light.position.set(0, 20, -210)
  group.add(light)

  const spotLight = new THREE.SpotLight(0xC67A4A, 5, 50, Math.PI / 6)
  spotLight.position.set(0, 0, -210)
  spotLight.target.position.set(0, 20, -215)
  group.add(spotLight)
  group.add(spotLight.target)

  // Rocket
  const rocketGroup = new THREE.Group()
  rocketGroup.position.set(0, 3, 0)

  const bodyGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 16)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xFAF7F2,
    metalness: 0.7,
    roughness: 0.2,
    emissive: 0xD4A574,
    emissiveIntensity: 0.2,
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  rocketGroup.add(body)

  const noseGeo = new THREE.ConeGeometry(0.5, 1.5, 16)
  const nose = new THREE.Mesh(noseGeo, bodyMat)
  nose.position.y = 2.75
  rocketGroup.add(nose)

  const glowGeo = new THREE.ConeGeometry(0.6, 3, 16)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xC67A4A,
    transparent: true,
    opacity: 0.6,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  glow.position.y = -3.5
  glow.rotation.x = Math.PI
  rocketGroup.add(glow)

  group.add(rocketGroup)

  // Portal ring
  const portalGeo = new THREE.TorusGeometry(5, 0.2, 32, 100)
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0xF5E6D3,
    transparent: true,
    opacity: 0.6,
  })
  const portal = new THREE.Mesh(portalGeo, portalMat)
  portal.position.set(0, 12, 0)
  portal.rotation.x = Math.PI / 2
  group.add(portal)

  // Speed lines
  const speedMat = new THREE.LineBasicMaterial({
    color: 0xD4A574,
    transparent: true,
    opacity: 0.3,
  })
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2 + Math.random() * 6
    const points = [
      new THREE.Vector3(Math.cos(angle) * radius, Math.random() * 15, Math.sin(angle) * radius),
      new THREE.Vector3(Math.cos(angle) * radius * 0.8, Math.random() * 15 + 5, Math.sin(angle) * radius * 0.8),
    ]
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(lineGeo, speedMat)
    group.add(line)
  }

  scene.add(group)

  let launched = false

  return {
    update(elapsed) {
      if (launched) {
        rocketGroup.position.y += 0.05
        glow.scale.y = 1 + Math.sin(elapsed * 10) * 0.3
      } else {
        rocketGroup.position.y = 3 + Math.sin(elapsed * 2) * 0.3
      }

      portal.rotation.z = elapsed * 0.5
      portal.material.opacity = 0.4 + Math.sin(elapsed * 3) * 0.2

      glow.material.opacity = 0.4 + Math.sin(elapsed * 8) * 0.2
    },

    onEnter() {
      launched = true
    },

    onLeave() {
      launched = false
      rocketGroup.position.y = 3
    },
  }
}
