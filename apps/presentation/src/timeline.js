import Lenis from 'lenis'

const ZONE_COUNT = 8
const AUTO_PLAY_SPEED = 0.03
const IDLE_TIMEOUT = 5000
const SCROLL_SENSITIVITY = 0.0004

export function createTimeline(camera, cameraPath, overlay, world) {
  let progress = 0
  let targetProgress = 0
  let isAutoPlaying = true
  let lastInteraction = 0
  let currentZone = -1

  const scrollHint = document.getElementById('scroll-hint')
  const progressFill = document.getElementById('progress-fill')

  // Lenis for smooth scroll capture
  const lenis = new Lenis({
    wrapper: window,
    content: document.body,
    infinite: true,
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
  })

  lenis.on('scroll', (e) => {
    const delta = e.velocity * SCROLL_SENSITIVITY
    targetProgress = Math.min(Math.max(targetProgress + delta * 0.016, 0), 1)
    isAutoPlaying = false
    lastInteraction = performance.now()
    if (scrollHint) scrollHint.style.opacity = '0'
  })

  // Direct wheel capture for reliability
  window.addEventListener('wheel', (e) => {
    e.preventDefault()
    targetProgress = Math.min(Math.max(targetProgress + e.deltaY * SCROLL_SENSITIVITY, 0), 1)
    isAutoPlaying = false
    lastInteraction = performance.now()
    if (scrollHint) scrollHint.style.opacity = '0'
  }, { passive: false })

  // Touch support
  let touchStartY = 0
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY
    isAutoPlaying = false
    lastInteraction = performance.now()
  }, { passive: true })

  window.addEventListener('touchmove', (e) => {
    const delta = (touchStartY - e.touches[0].clientY) * SCROLL_SENSITIVITY * 0.5
    targetProgress = Math.min(Math.max(targetProgress + delta, 0), 1)
    touchStartY = e.touches[0].clientY
    lastInteraction = performance.now()
  }, { passive: true })

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault()
      targetProgress = Math.min(targetProgress + 1 / ZONE_COUNT, 1)
      isAutoPlaying = false
      lastInteraction = performance.now()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      targetProgress = Math.max(targetProgress - 1 / ZONE_COUNT, 0)
      isAutoPlaying = false
      lastInteraction = performance.now()
    }
  })

  return {
    get progress() { return progress },

    update(delta) {
      if (!isAutoPlaying && performance.now() - lastInteraction > IDLE_TIMEOUT) {
        isAutoPlaying = true
      }

      if (isAutoPlaying && progress < 1) {
        targetProgress = Math.min(targetProgress + AUTO_PLAY_SPEED * delta, 1)
      }

      progress += (targetProgress - progress) * Math.min(delta * 3, 1)
      progress = Math.min(Math.max(progress, 0), 1)

      const pos = cameraPath.getPosition(progress)
      const lookAt = cameraPath.getLookAt(progress)
      camera.position.copy(pos)
      camera.lookAt(lookAt)

      if (progressFill) {
        progressFill.style.width = `${progress * 100}%`
      }

      const newZone = cameraPath.getCurrentZone(progress)
      if (newZone !== currentZone) {
        currentZone = newZone
        overlay.setActiveZone(currentZone)
        world.onZoneEnter(currentZone)
      }

      lenis.raf(performance.now())
    },
  }
}
