import * as THREE from 'three'

export function createMarketingZone(scene) {
  const group = new THREE.Group()
  group.position.set(10, 0, -140)

  const light = new THREE.PointLight(0xD4A574, 3, 50)
  light.position.set(10, 6, -135)
  group.add(light)

  const cards = []
  const cardLabels = [
    'Landing Page', 'Email Campaign', 'Social Post',
    'Blog Article', 'Ad Copy', 'Press Release',
    'Brand Story', 'Video Script', 'Product Brief',
    'SEO Content', 'Newsletter', 'Case Study',
  ]

  cardLabels.forEach((label, i) => {
    const cardGeo = new THREE.BoxGeometry(2.5, 1.5, 0.05)
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x2C1810,
      emissive: 0xD4A574,
      emissiveIntensity: 0.2,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    })
    const card = new THREE.Mesh(cardGeo, cardMat)

    const col = i % 4
    const row = Math.floor(i / 4)
    card.userData.targetPos = new THREE.Vector3(
      (col - 1.5) * 3.5,
      (row - 1) * 2.5 + 3,
      0
    )

    card.position.set(
      (Math.random() - 0.5) * 30,
      Math.random() * 15 + 2,
      (Math.random() - 0.5) * 30
    )
    card.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
    card.userData.startPos = card.position.clone()
    card.userData.startRot = card.rotation.clone()

    const edgeGeo = new THREE.EdgesGeometry(cardGeo)
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xC67A4A,
      transparent: true,
      opacity: 0.6,
    })
    const edges = new THREE.LineSegments(edgeGeo, edgeMat)
    card.add(edges)

    cards.push(card)
    group.add(card)
  })

  scene.add(group)

  let entered = false
  let enterTime = 0

  return {
    update(elapsed) {
      if (entered) {
        const t = Math.min((elapsed - enterTime) * 0.5, 1)
        const ease = 1 - Math.pow(1 - t, 3)

        cards.forEach((card) => {
          card.position.lerpVectors(card.userData.startPos, card.userData.targetPos, ease)
          card.rotation.x += (0 - card.rotation.x) * ease * 0.05
          card.rotation.y += (0 - card.rotation.y) * ease * 0.05
          card.rotation.z += (0 - card.rotation.z) * ease * 0.05
        })
      } else {
        cards.forEach((card, i) => {
          card.position.y += Math.sin(elapsed * 0.5 + i) * 0.002
          card.rotation.y += 0.002
        })
      }
    },

    onEnter() {
      if (!entered) {
        entered = true
        enterTime = performance.now() / 1000
      }
    },
  }
}
