# Lullio Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static GitHub Pages landing page for the Lullio app, required for Google Play Store registration.

**Architecture:** Single `docs/index.html` with inline CSS. GSAP + ScrollTrigger from CDN for scroll animations. Figma screenshots exported as PNG images. Official store badge SVGs. GitHub Pages served from `/docs` on `main` branch.

**Tech Stack:** HTML, CSS (inline), GSAP 3 + ScrollTrigger (CDN), Inter font (Google Fonts), Figma MCP for image export.

**Design Doc:** `docs/plans/2026-03-10-lullio-landing-page-design.md`

---

### Task 1: Create directory structure and export Figma screenshots

**Files:**
- Create: `docs/images/` directory
- Create: `docs/images/hero-main.png` (Figma node `9:216` — Main screen with mood slider)
- Create: `docs/images/feature-create-task.png` (Figma node `1:2` — Create task with mic button)
- Create: `docs/images/feature-task-card.png` (Figma node `1:588` — Task card with complete/later)

**Step 1: Create the images directory**

```bash
mkdir -p docs/images
```

**Step 2: Export screenshots from Figma**

Use the Figma MCP `get_screenshot` tool to export PNGs for each node:
- `9:216` (Main screen) → save as `docs/images/hero-main.png`
- `1:2` (Create task with mic) → save as `docs/images/feature-create-task.png`
- `1:588` (Task card view) → save as `docs/images/feature-task-card.png`

The Figma file key is `uEKUhrvteSOfw9kRknd9I6`.

Note: The Figma MCP returns image URLs. Download each URL and save to the target path.

**Step 3: Verify images exist**

```bash
ls -la docs/images/
```

Expected: 3 PNG files present.

**Step 4: Commit**

```bash
git add docs/images/
git commit -m "feat: add Figma screenshot exports for landing page"
```

---

### Task 2: Build the HTML page — structure and hero section

**Files:**
- Create: `docs/index.html`

**Step 1: Create the full HTML file**

Create `docs/index.html` with:
- `<!DOCTYPE html>` with lang="en"
- `<head>`: charset, viewport meta, title "Lullio — Get things done, one task at a time", Inter font from Google Fonts, GSAP + ScrollTrigger from CDN, Open Graph meta tags
- Inline `<style>` block with:
  - CSS variables for all colors from design spec (`--blue: #a2d2ff`, `--purple: #cdb4db`, `--pink: #ffc8dd`, `--bg: #f5f7fa`, `--text-dark: #1e2939`, `--text-secondary: #364153`, `--white: #ffffff`, `--light-pink: #ffafcc`)
  - `border-radius: 24px` on cards/buttons
  - `max-width: 1100px` centered container
  - Font family: `'Inter', sans-serif`
  - Responsive breakpoints: single column below 768px
- Hero section:
  - Full-width gradient background (`#a2d2ff` → `#cdb4db`)
  - "Lullio" as large wordmark/heading
  - Tagline: "Get things done, one task at a time"
  - Subtitle: "Smart scheduling that adapts to your mood"
  - Two official store badges side by side:
    - Google Play badge: inline SVG of official "Get it on Google Play" badge, wrapped in `<a>` with placeholder `href="#"`
    - Apple App Store badge: inline SVG of official "Download on the App Store" badge, with CSS `filter: grayscale(100%) opacity(0.5)` and a "Coming Soon" text overlay
  - Hero image: `docs/images/hero-main.png` in a phone-frame-style container with rounded corners and shadow

**Step 2: Verify the page renders**

Open `docs/index.html` in a browser. Expected: Hero section visible with gradient background, wordmark, tagline, store badges, and hero image.

**Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add landing page with hero section"
```

---

### Task 3: Add features section

**Files:**
- Modify: `docs/index.html`

**Step 1: Add features section after hero**

Add a `<section id="features">` with a 3-column CSS grid (1 column on mobile):

**Card 1 — Mood-Based Scheduling:**
- Icon or small illustration (use a simple SVG sparkle/mood icon inline)
- Heading: "Mood-Based Scheduling"
- Description: "Tell us how you're feeling. We'll match the perfect task to your energy level."
- Screenshot: `images/hero-main.png` (shows mood slider)
- Card style: white background, 24px border-radius, soft shadow

**Card 2 — Voice-to-Task:**
- Icon (mic SVG inline)
- Heading: "Voice-to-Task"
- Description: "Just speak. Smart speech-to-text breaks your words into actionable tasks."
- Screenshot: `images/feature-create-task.png`
- Same card style

**Card 3 — One Task at a Time:**
- Icon (check SVG inline)
- Heading: "One Task at a Time"
- Description: "No overwhelming lists. Just what matters right now."
- Screenshot: `images/feature-task-card.png`
- Same card style

Section background: `#f5f7fa`

**Step 2: Verify in browser**

Expected: 3 feature cards in a row on desktop, stacked on mobile. Each with image, heading, and description.

**Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add features section with 3 cards"
```

---

### Task 4: Add "How It Works" section

**Files:**
- Modify: `docs/index.html`

**Step 1: Add how-it-works section after features**

Add a `<section id="how-it-works">` with:
- Heading: "How It Works"
- 3 steps in a horizontal row (stacked on mobile):
  - Step 1: Circled "1" + "Set your mood" + brief description
  - Step 2: Circled "2" + "Get a matched task" + brief description
  - Step 3: Circled "3" + "Complete & level up" + brief description
- Step numbers styled with gradient background (`#a2d2ff` → `#cdb4db`), white text, circular
- Section background: white

**Step 2: Verify in browser**

Expected: 3 numbered steps in a row with gradient circles.

**Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add how-it-works section"
```

---

### Task 5: Add footer

**Files:**
- Modify: `docs/index.html`

**Step 1: Add footer section**

Add a `<footer>` with:
- "Lullio" wordmark (smaller)
- Copyright: "© 2026 Lullio. All rights reserved."
- Privacy Policy link (placeholder `href="#"`)
- Google Play + App Store badges repeated (same style as hero)
- Background: `#1e2939` (dark), white text

**Step 2: Verify in browser**

Expected: Dark footer with logo, copyright, privacy link, and store badges.

**Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add footer section"
```

---

### Task 6: Add GSAP scroll animations

**Files:**
- Modify: `docs/index.html`

**Step 1: Add GSAP animation script at bottom of body**

Add a `<script>` block after the footer that:
- Registers ScrollTrigger plugin: `gsap.registerPlugin(ScrollTrigger)`
- Animates hero elements on page load (staggered fade-in from bottom):
  - Wordmark, tagline, subtitle, store badges, hero image — each with `opacity: 0, y: 30` → `opacity: 1, y: 0`, stagger 0.15s, ease `"power2.out"`
- Animates feature cards on scroll:
  - Each `.feature-card` animated with ScrollTrigger: `opacity: 0, y: 50` → `opacity: 1, y: 0`, trigger at `top 80%`, stagger 0.2s
- Animates how-it-works steps on scroll:
  - Each `.step` animated same pattern, stagger 0.15s
- Animates footer on scroll:
  - Fade in from bottom

All animated elements should start with `visibility: hidden` in CSS (set to visible by GSAP) to prevent flash of unstyled content.

**Step 2: Verify in browser**

Expected: Elements animate in smoothly as you scroll down. Hero elements appear on load with staggered timing.

**Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add GSAP scroll-triggered animations"
```

---

### Task 7: Final polish and responsive testing

**Files:**
- Modify: `docs/index.html`

**Step 1: Add meta tags for SEO and social sharing**

Ensure these are in `<head>`:
- `<meta name="description" content="Lullio — Smart task management that adapts to your mood. Get things done, one task at a time.">`
- Open Graph tags: `og:title`, `og:description`, `og:image` (use hero screenshot), `og:url`
- `<link rel="icon" href="images/hero-main.png">` (or a proper favicon if available)

**Step 2: Test responsive layout**

- Test at 375px width (mobile): all sections stack, images scale, text readable
- Test at 768px width (tablet): features may be 2-column
- Test at 1200px+ (desktop): full layout, max-width 1100px centered

**Step 3: Verify all links work**

- Google Play badge: links to `#` (placeholder)
- Apple badge: greyed out, shows "Coming Soon"
- Privacy Policy: links to `#`

**Step 4: Commit**

```bash
git add docs/
git commit -m "feat: add meta tags and final polish for landing page"
```

---

### Task 8: Enable GitHub Pages

**Not code — manual or via GitHub CLI:**

```bash
gh api repos/{owner}/{repo}/pages -X POST -f source.branch=main -f source.path=/docs
```

Or manually: Repository Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, Folder: `/docs` → Save.

**Verify:** The page should be live at `https://{username}.github.io/{repo}/`

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Directory + Figma exports | `docs/images/*.png` |
| 2 | HTML structure + hero | `docs/index.html` |
| 3 | Features section | `docs/index.html` |
| 4 | How It Works section | `docs/index.html` |
| 5 | Footer | `docs/index.html` |
| 6 | GSAP animations | `docs/index.html` |
| 7 | SEO meta + responsive polish | `docs/index.html` |
| 8 | Enable GitHub Pages | GitHub settings |
