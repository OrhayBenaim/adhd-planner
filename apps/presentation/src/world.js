import * as THREE from 'three'
import { createTitleZone } from './zones/title.js'
import { createProblemZone } from './zones/problem.js'
import { createSolutionZone } from './zones/solution.js'
import { createIdeationZone } from './zones/ideation.js'
import { createMarketingZone } from './zones/marketing.js'
import { createBuildingZone } from './zones/building.js'
import { createShippingZone } from './zones/shipping.js'
import { createImpactZone } from './zones/impact.js'

export function createWorld(scene) {
  const ambient = new THREE.AmbientLight(0xF5E6D3, 0.3)
  scene.add(ambient)

  const zones = [
    createTitleZone(scene),
    createProblemZone(scene),
    createSolutionZone(scene),
    createIdeationZone(scene),
    createMarketingZone(scene),
    createBuildingZone(scene),
    createShippingZone(scene),
    createImpactZone(scene),
  ]

  return {
    update(elapsed, delta, progress) {
      zones.forEach((zone) => zone.update(elapsed, delta, progress))
    },

    onZoneEnter(index) {
      zones.forEach((zone, i) => {
        if (zone.onEnter && i === index) zone.onEnter()
        if (zone.onLeave && i !== index) zone.onLeave()
      })
    },
  }
}
