const ZONES = [
  { title: 'From Idea to Ship', subtitle: 'How Claude Mainstreams Your Work' },
  { title: 'The Old Way', subtitle: 'Fragmented tools. Slow iteration. Expensive teams.' },
  { title: 'One AI Partner', subtitle: 'Claude handles the entire workflow.' },
  { title: 'Start with an Idea', subtitle: 'Brainstorm, research, and plan — in minutes.' },
  { title: 'Create the Message', subtitle: 'Copy, campaigns, landing pages — all generated.' },
  { title: 'Build the Product', subtitle: 'Production code, reviews, and tests — handled.' },
  { title: 'Ship It', subtitle: 'Deploy with confidence. Claude handles the last mile.' },
  { title: '10x Faster. 90% Less Cost.', subtitle: 'The future of building is here.' },
]

export function createOverlay() {
  const container = document.getElementById('overlay')
  const elements = []

  ZONES.forEach((zone, i) => {
    const div = document.createElement('div')
    div.className = 'zone-text'

    const h1 = document.createElement('h1')
    h1.textContent = zone.title

    const p = document.createElement('p')
    p.textContent = zone.subtitle

    div.appendChild(h1)
    div.appendChild(p)
    container.appendChild(div)
    elements.push(div)
  })

  if (elements[0]) elements[0].classList.add('active')

  return {
    setActiveZone(index) {
      elements.forEach((el, i) => {
        if (i === index) {
          el.classList.add('active')
        } else {
          el.classList.remove('active')
        }
      })
    },
  }
}
