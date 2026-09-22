const toc = document.querySelector('.toc');
const bar = document.querySelector('.reading-progress span');
const links = [...toc.querySelectorAll('a')];
const sections = links.map((a) => document.querySelector(a.hash));
const mobile = matchMedia('(max-width: 899px)');

// Desktop keeps the list open; on mobile it starts collapsed and closes after a jump.
toc.open = !mobile.matches;
mobile.addEventListener('change', () => { toc.open = !mobile.matches; });
links.forEach((a) => a.addEventListener('click', () => { if (mobile.matches) toc.open = false; }));

function update() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

  let active = 0;
  sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.25) active = i; });
  links.forEach((a, i) => a.classList.toggle('is-active', i === active));
}

addEventListener('scroll', update, { passive: true });
addEventListener('resize', update);
update();
