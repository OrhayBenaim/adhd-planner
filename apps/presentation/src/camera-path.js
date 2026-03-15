import * as THREE from 'three'

const ZONE_COUNT = 8

const pathPoints = [
  new THREE.Vector3(0, 2, 10),
  new THREE.Vector3(-8, 4, -20),
  new THREE.Vector3(5, 2, -55),
  new THREE.Vector3(-3, 8, -90),
  new THREE.Vector3(10, 3, -130),
  new THREE.Vector3(-5, 1, -170),
  new THREE.Vector3(0, 12, -210),
  new THREE.Vector3(0, 5, -250),
]

const lookAtPoints = [
  new THREE.Vector3(0, 2, -10),
  new THREE.Vector3(-8, 3, -40),
  new THREE.Vector3(5, 2, -75),
  new THREE.Vector3(-3, 6, -110),
  new THREE.Vector3(10, 3, -150),
  new THREE.Vector3(-5, 1, -190),
  new THREE.Vector3(0, 8, -230),
  new THREE.Vector3(0, 5, -270),
]

export function createCameraPath() {
  const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.5)
  const lookAtCurve = new THREE.CatmullRomCurve3(lookAtPoints, false, 'catmullrom', 0.5)

  return {
    curve,
    lookAtCurve,
    zoneCount: ZONE_COUNT,

    getPosition(progress) {
      return curve.getPointAt(Math.min(Math.max(progress, 0), 1))
    },

    getLookAt(progress) {
      return lookAtCurve.getPointAt(Math.min(Math.max(progress, 0), 1))
    },

    getCurrentZone(progress) {
      return Math.min(Math.floor(progress * ZONE_COUNT), ZONE_COUNT - 1)
    },

    getZoneProgress(progress) {
      const zoneSize = 1 / ZONE_COUNT
      const zone = this.getCurrentZone(progress)
      return (progress - zone * zoneSize) / zoneSize
    },
  }
}
