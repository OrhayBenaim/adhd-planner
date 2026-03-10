# Lullio Landing Page Design

## Overview

A static GitHub Pages landing page for the Lullio app (formerly ADHD Planner). Required for Google Play Store registration. Single-page, visually stunning, warm and relaxing aesthetic matching the app's design language.

## App Name

**Lullio** — "Get things done, one task at a time"

## Page Structure

### 1. Hero Section
- "Lullio" wordmark + tagline "Get things done, one task at a time"
- Subtitle: "Smart scheduling that adapts to your mood"
- Official Google Play badge (linked, placeholder URL) + Apple App Store badge (greyed out, "Coming Soon" overlay)
- Hero image: Main screen mockup from Figma (mood slider + sparkle button)
- Background: soft gradient #a2d2ff -> #cdb4db

### 2. Features Section (3 cards, rounded-24)
- **Mood-Based Scheduling** — "Tell us how you're feeling. We'll match the perfect task to your energy level." + mood slider screenshot
- **Voice-to-Task** — "Just speak. Smart speech-to-text breaks your words into actionable tasks." + mic/add task screenshot
- **One Task at a Time** — "No overwhelming lists. Just what matters right now." + task card screenshot

### 3. How It Works (3 steps)
1. Set your mood
2. Get a matched task
3. Complete & level up

### 4. Footer
- "Lullio" + copyright 2026
- Placeholder privacy policy link
- Google Play + App Store badges repeated

## Visual Spec

| Property | Value |
|----------|-------|
| Blue | #a2d2ff |
| Purple | #cdb4db |
| Pink | #ffc8dd |
| Light Pink | #ffafcc |
| Background | #f5f7fa |
| Text Dark | #1e2939 |
| Text Secondary | #364153 |
| White | #ffffff |
| Border Radius | 24px (all cards/buttons) |
| Font | Inter (Google Fonts) |
| Max Width | 1100px |
| Animations | GSAP + ScrollTrigger (fade-up on scroll) |

## Tech Stack

- Single `docs/index.html` with inline CSS
- GSAP + ScrollTrigger loaded from CDN
- Inter font from Google Fonts
- Figma screenshots exported to `docs/images/`
- GitHub Pages served from `/docs` on `main` branch
- Official store badge SVGs (Google Play + Apple App Store)

## Store Buttons

- Google Play: Official "Get it on Google Play" badge, linked to placeholder URL
- Apple App Store: Official "Download on the App Store" badge, greyed out with "Coming Soon" overlay

## Responsive

- Desktop: 2-3 column grid for features, centered hero
- Mobile: single column, stacked layout
