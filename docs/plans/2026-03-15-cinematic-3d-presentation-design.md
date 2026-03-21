# Cinematic 3D Investor Presentation — Design Doc

**Date**: 2026-03-15
**Status**: Approved
**Location**: `apps/presentation/`

## Overview

A cinematic, scroll-driven 3D web presentation about "How to utilize Claude to mainstream your work" — built for investors. The entire viewport is a Three.js canvas where the camera flies through a spatial journey of connected zones, each representing a stage of the Claude-powered workflow.

## Requirements

- **Topic**: How to utilize Claude to mainstream your work
- **Audience**: Investors
- **Style**: Professional, breathtaking, Claude-branded (warm beige tones)
- **Interaction**: Hybrid — auto-plays by default, scroll takes control, inactivity resumes auto-play
- **No normal scroll** — only 3D camera movement through a spatial world

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite |
| 3D Engine | Three.js (vanilla) |
| Smooth Scroll | Lenis |
| Post-processing | Three.js EffectComposer (Bloom, Vignette, DOF) |
| Fonts | Inter (Google Fonts) |

## File Structure

```
apps/presentation/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js          # Entry — init scene, camera, renderer, timeline
│   ├── world.js         # Build the 3D world (all zones)
│   ├── camera-path.js   # Camera spline path + lookAt targets
│   ├── timeline.js      # Hybrid scroll/auto-play controller
│   ├── zones/
│   │   ├── title.js     # Zone 0: Title — floating Claude logo, particle field
│   │   ├── problem.js   # Zone 1: The Problem — fragmented, chaotic shapes
│   │   ├── solution.js  # Zone 2: The Solution — shapes coalesce into order
│   │   ├── ideation.js  # Zone 3: Idea — glowing neural network room
│   │   ├── marketing.js # Zone 4: Marketing — content cards flying into place
│   │   ├── building.js  # Zone 5: Code — matrix-style code rain tunnel
│   │   ├── shipping.js  # Zone 6: Ship — rocket launch / portal
│   │   └── impact.js    # Zone 7: Impact/CTA — stats + call to action
│   ├── overlay.js       # HTML text overlays per zone
│   ├── postfx.js        # Post-processing (bloom, vignette, DOF)
│   ├── audio.js         # Optional ambient soundtrack
│   └── styles.css       # Overlay styling, fonts
└── public/
    └── fonts/
```

## The Spatial Journey

The camera follows a CatmullRom spline through a continuous 3D world. Each zone is a distinct environment:

| Zone | Scene | Mood | 3D Elements |
|------|-------|------|-------------|
| 0 — Title | Open void | Grand, anticipation | Claude logo (glowing), warm particle field, subtle fog |
| 1 — Problem | Narrow, cluttered | Tension, chaos | Fragmented floating cubes, tangled lines, red/orange accent lighting |
| 2 — Solution | Space opens up | Relief, clarity | Fragments reassemble into clean forms, warm beige light floods in |
| 3 — Ideation | Neural network room | Creative, electric | Glowing nodes connected by pulsing edges, sparks firing between them |
| 4 — Marketing | Content gallery | Energetic, dynamic | 3D cards/screens flying into a grid formation, text appearing on them |
| 5 — Building | Code tunnel | Focused, powerful | Matrix-style code rain on translucent walls, wireframe structures assembling |
| 6 — Shipping | Launch pad | Climactic, triumphant | Assembled product lifts off, portal of light, speed lines |
| 7 — Impact | Open sky | Confident, inviting | Floating stat numbers animate in, CTA text, warm glow |

## Hybrid Timeline Controller

- Lenis for smooth scroll hijacking (no native scroll — pure 3D camera movement)
- A normalized progress value `0.0 → 1.0` drives everything
- **Scroll mode**: user scroll maps to progress
- **Auto-play mode**: progress increments on a timer (~4s per zone)
- **Hybrid**: auto-plays by default, any scroll input pauses auto-play and hands control to user. 5s of inactivity resumes auto-play
- Each zone has enter/exit thresholds that trigger text overlays and zone-specific animations

## Visual Style (Claude-branded)

- **Palette**:
  - Deep warm beige: `#F5E6D3`
  - Soft clay: `#D4A574`
  - Muted terracotta: `#C67A4A`
  - Dark espresso: `#2C1810`
  - Cream white: `#FAF7F2`
- **Lighting**: Warm directional + ambient, per-zone colored accent lights
- **Post-processing**: Bloom on emissive elements, subtle vignette, depth-of-field on distant objects
- **Typography**: Inter, large titles, minimal body text
- **Transitions**: Camera moves are smooth (eased via spline), elements fade/morph between zones

## Text Overlays (HTML over canvas)

Each zone has a title + 1-2 bullet points that fade in when the camera enters the zone:

| Zone | Title | Subtitle |
|------|-------|----------|
| 0 | From Idea to Ship | How Claude Mainstreams Your Work |
| 1 | The Old Way | Fragmented tools. Slow iteration. Expensive teams. |
| 2 | One AI Partner | Claude handles the entire workflow. |
| 3 | Start with an Idea | Brainstorm, research, and plan — in minutes. |
| 4 | Create the Message | Copy, campaigns, landing pages — all generated. |
| 5 | Build the Product | Production code, reviews, and tests — handled. |
| 6 | Ship It | Deploy with confidence. Claude handles the last mile. |
| 7 | 10x Faster. 90% Less Cost. | The future of building is here. |

## Monorepo Integration

- Lives in `apps/presentation/` as a Vite project
- Added to Turborepo workspace
- `npm run dev` for local development
- `npm run build` for static export (deployable anywhere)
