# My Claude Code Workflow — A Human Guide

This is a plain-english overview of how I work with Claude Code. It covers my thinking process (Superpowers brainstorming), how I build websites, how I plan TikTok content, how I generate images and videos, and what each of my custom skills does.

Nothing here is specific to the ADHD planner project — this is about how I use Claude Code as a creative and development tool across any project.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Brainstorming with Superpowers](#brainstorming-with-superpowers)
3. [Building Websites — The Immersive Web Creator](#building-websites--the-immersive-web-creator)
4. [TikTok Strategy — The TikTok Agent](#tiktok-strategy--the-tiktok-agent)
5. [Generating Images and Videos — Nano Banana](#generating-images-and-videos--nano-banana)
6. [My Skills at a Glance](#my-skills-at-a-glance)
7. [My Agents at a Glance](#my-agents-at-a-glance)
8. [Setup & Installation](#setup--installation)

---

## The Big Picture

I use Claude Code as my creative partner. Instead of just writing code, I've set it up with **skills** (specialized knowledge it can tap into) and **agents** (specialized personas it can become). When I say "build me a landing page" or "plan a TikTok campaign," Claude already knows the tools, the process, and the quality bar I expect.

The general flow looks like this:

1. **I have an idea** — could be a website, a video, a feature, whatever.
2. **Brainstorming kicks in** — Claude asks me questions one at a time to understand what I actually want before writing a single line of code.
3. **The right agent or skill takes over** — depending on what we're building, Claude switches into the right mode (web builder, TikTok strategist, image generator, etc.).
4. **We iterate** — I review, give feedback, and Claude adjusts.

That's it. No complicated setup for each project. The skills and agents handle the context.

---

## Brainstorming with Superpowers

### What is it?

Superpowers is a plugin I have installed in Claude Code. The brainstorming skill is the starting point for almost everything I build. It forces Claude to **stop and think before coding**. No jumping straight into implementation.

### How it works

When I say something like "build me a portfolio site" or "I want a new feature for X," brainstorming automatically kicks in. Here's what happens:

1. **Claude looks at the project context** — checks existing files, docs, recent commits.
2. **Asks me questions, one at a time** — not a wall of 10 questions. Just one. Then the next. This keeps it conversational and not overwhelming.
3. **Proposes 2-3 approaches** — with trade-offs and a recommendation. I pick one (or mix and match).
4. **Presents the design** — section by section, getting my approval as we go.
5. **Saves the design doc** — to `docs/plans/` so we have a record.
6. **Hands off to planning** — once the design is approved, it creates an implementation plan.

### Why I like it

It catches bad assumptions early. I've had plenty of moments where Claude's questions made me realize I hadn't thought something through. Way cheaper to figure that out before any code is written.

### The other Superpowers skills

Brainstorming is just one of many. Here's the full list:

| Skill | What it does |
|-------|-------------|
| **brainstorming** | Explores ideas before implementation (described above) |
| **writing-plans** | Turns a design into a step-by-step implementation plan |
| **executing-plans** | Follows an existing plan in a new session with review checkpoints |
| **test-driven-development** | Writes tests before code. Strict. No exceptions. |
| **systematic-debugging** | Investigates bugs methodically instead of guessing |
| **dispatching-parallel-agents** | Runs multiple independent tasks at the same time |
| **subagent-driven-development** | Executes plan tasks using parallel sub-agents |
| **using-git-worktrees** | Creates isolated workspaces for feature branches |
| **requesting-code-review** | Reviews completed work against the plan |
| **receiving-code-review** | Handles code review feedback with technical rigor |
| **verification-before-completion** | Runs actual verification before claiming "done" |
| **finishing-a-development-branch** | Guides merge/PR/cleanup when a branch is done |
| **writing-skills** | Helps create new skills for Claude Code |

These kick in automatically when relevant. I don't have to remember to invoke them — Claude checks for applicable skills before every response.

### How to set up Superpowers

Superpowers is a Claude Code plugin. To install it:

1. Open Claude Code
2. Run: `/install-plugin superpowers`
3. That's it. The skills are now available and will trigger automatically.

The plugin lives at `~/.claude/plugins/cache/claude-plugins-official/superpowers/` and updates itself.

---

## Building Websites — The Immersive Web Creator

### What is it?

This is a custom **agent** I built. When I need a website — a landing page, a brand site, a product showcase — I launch this agent and it handles everything from concept to deployment-ready code.

It's not just a code generator. It thinks like a creative director: brand identity, visual storytelling, user journeys, conversion. Then it builds it.

### What it can do

- Full websites with HTML, CSS, and JavaScript
- 3D immersive experiences using Three.js, React Three Fiber, WebGL
- Scroll-driven animations and parallax effects
- Responsive designs that work on all devices
- Generates actual images for the site (not placeholders) using Nano Banana
- SEO-optimized, accessible, performant

### How I use it

I just describe what I want:

> "Build me a landing page for my SaaS product. Dark theme, minimal, with a 3D hero section."

Claude launches the immersive-web-creator agent, which:

1. **Asks about the brand** — audience, goals, aesthetic.
2. **Proposes a visual direction** — colors, typography, interaction patterns.
3. **Generates images** — using the Image Prompt Engineer agent + Nano Banana skill (no stock photos).
4. **Builds the site** — clean, semantic code with animations and 3D elements.
5. **Polishes** — performance, responsiveness, accessibility.

### The 3D website skill

When the agent needs to build 3D experiences, it uses the **immersive-3d-website** skill, which knows:

- How to set up React Three Fiber with Next.js
- Scroll-driven animation patterns (using Drei's `ScrollControls`)
- Glass/crystal materials, particle fields, post-processing effects
- Performance optimization (60fps target, lazy loading, compressed models)
- How to overlay HTML content on top of 3D scenes

The tech stack for 3D sites:
- `three` — core 3D engine
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — helpers (scroll, lights, materials, text)
- `@react-three/postprocessing` — bloom, vignette, depth of field
- `next` — framework
- `tailwindcss` — styling
- `gsap` — optional, for complex scroll timelines

### How to set it up

The agent definition lives at `~/.claude/agents/immersive-web-creator.md`. The 3D skill lives at `~/.claude/skills/immersive-3d-website/SKILL.md`.

To create a project from scratch:

```bash
npx create-next-app@latest my-site --typescript --tailwind --app
cd my-site
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm install --save-dev @types/three
# Optional: for complex scroll timelines
npm install gsap @gsap/react
```

---

## TikTok Strategy — The TikTok Agent

### What is it?

A custom agent that acts as a TikTok marketing specialist. It doesn't just suggest "post more videos." It builds full strategies — content calendars, trend analysis, creator partnership plans, ad campaigns, performance targets.

### What it covers

- **Content strategy** — 40% educational, 30% entertainment, 20% inspirational, 10% promotional
- **Viral mechanics** — hook formulas, trending audio strategy, completion rate optimization
- **Creator partnerships** — nano to macro influencer tiers, collaboration models, ROI tracking
- **TikTok ads** — in-feed ads, Spark Ads, TopView, branded effects
- **Cross-platform** — adapting TikTok content for Instagram Reels and YouTube Shorts
- **Performance targets** — 8%+ engagement rate, 70%+ completion rate, 15% monthly growth

### How I use it

I describe what I need:

> "Plan a TikTok launch campaign for my productivity app targeting Gen Z."

The agent works through four phases:

1. **Trend analysis** — what's working right now on TikTok, what sounds are trending, what competitors are doing.
2. **Content creation plan** — specific video concepts, hook scripts, hashtag strategies (5-8 per post).
3. **Creator collaboration** — which influencer tiers to target, partnership models, UGC campaigns.
4. **Ads & optimization** — campaign structure, audience targeting, creative testing plan.

### Video generation

The TikTok agent can actually generate videos using the **Nano Banana** skill:

- Text-to-video (8-second clips with native audio via Veo 3.1)
- Image-to-video (generate a keyframe, then animate it)
- Vertical format (`9:16`) for TikTok/Reels
- Chain clips together for longer content

This means I can go from strategy to actual draft content in one session.

### How to set it up

The agent definition lives at `~/.claude/agents/marketing-tiktok-strategist.md`. No additional installation needed — it works through Claude Code's agent system and uses the Nano Banana skill for media generation.

---

## Generating Images and Videos — Nano Banana

### What is it?

Nano Banana is a skill that wraps Google's Gemini 3.1 Flash (for images) and Veo 3.1 (for videos). Instead of using stock photos or placeholders, I generate exactly what I need.

### Image generation

```bash
python .claude/skills/nanobanana/nanobanan.py image \
  --prompt "A photorealistic sunset over mountains" \
  --output sunset.png \
  --aspect-ratio 16:9 \
  --resolution 2K
```

Options:
- **Aspect ratios**: `1:1`, `9:16`, `16:9`, `21:9`, and 10 more
- **Resolutions**: `512`, `1K`, `2K`, `4K`
- **Image editing**: pass an `--input` image + edit prompt to modify existing images
- **Text in images**: put desired text in quotes in the prompt

### Video generation

```bash
python .claude/skills/nanobanana/nanobanan.py video \
  --prompt "A cinematic slow-motion shot of a dog running through a meadow" \
  --output dog.mp4 \
  --resolution 1080p
```

Options:
- **Aspect ratios**: `16:9` (landscape) or `9:16` (portrait/TikTok)
- **Resolutions**: `720p`, `1080p`, `4k`
- **Image-to-video**: pass `--input keyframe.png` to animate a still image
- Videos are 8 seconds long with native audio (dialogue, SFX, ambient)
- Takes ~1-2 minutes to generate (the script polls automatically)

### Multi-step pipelines

Generate a keyframe image, then animate it:

```bash
# Step 1: Generate keyframe
python .claude/skills/nanobanana/nanobanan.py image \
  --prompt "A serene Japanese garden with cherry blossoms" \
  --output keyframe.png --text-only --resolution 2K

# Step 2: Animate it
python .claude/skills/nanobanana/nanobanan.py video \
  --prompt "Camera pans across the garden, petals gently falling" \
  --input keyframe.png --output garden.mp4
```

### Setup

1. You need a `GEMINI_API_KEY` — either in your environment or in a `.env` file at the repo root.
2. The Python script is at `.claude/skills/nanobanana/nanobanan.py`.
3. Requires the `google-genai` Python package.

---

## My Skills at a Glance

Skills are specialized knowledge files that Claude loads when relevant. They live in `~/.claude/skills/`.

| Skill | What it does | When it triggers |
|-------|-------------|------------------|
| **nanobanana** | Image & video generation via Gemini/Veo | "generate an image," "create a video," "make a thumbnail" |
| **immersive-3d-website** | 3D website building patterns (R3F, Drei, Three.js) | "build a 3D site," "scroll animations," "WebGL" |
| **google-slides** | Automates Google Slides via Playwright browser control | "create a presentation," "make slides," "build a deck" |
| **prompt-engineering** | Patterns for writing effective prompts for LLMs | Writing skills, hooks, agent prompts, or any LLM interaction |
| **skill-creator** | Guide for building new skills | "create a new skill," "update a skill" |

### How skills work

1. Claude sees my message.
2. It checks: "does any skill match what the user is asking?"
3. If yes, it loads the skill's instructions and follows them.
4. If the skill has bundled scripts or references, Claude uses those too.

I don't have to say "use the nanobanana skill." I just say "generate an image of a sunset" and Claude figures it out.

---

## My Agents at a Glance

Agents are specialized personas that Claude can become. They live in `~/.claude/agents/`.

| Agent | What it does |
|-------|-------------|
| **immersive-web-creator** | Full website design & development with 3D, images, and brand thinking |
| **marketing-tiktok-strategist** | TikTok content strategy, viral mechanics, creator partnerships, ads |
| **image-prompt-engineer** | Crafts detailed photography prompts for AI image generation |
| **marketing-app-store-optimizer** | App Store Optimization — keywords, screenshots, descriptions, A/B testing |

### How agents work

Agents are launched automatically by Claude when the task matches their description. They run as sub-processes with their own context and can use skills and tools independently. When they're done, they report back.

I can also launch them manually by asking Claude to use a specific agent.

---

## Setup & Installation

### Prerequisites

- **Claude Code CLI** installed and authenticated
- **Node.js** (for web projects)
- **Python 3.10+** (for Nano Banana image/video generation)
- **Google Gemini API key** (for Nano Banana — set as `GEMINI_API_KEY`)

### Installing the Superpowers plugin

```bash
# Inside Claude Code
/install-plugin superpowers
```

This gives you brainstorming, TDD, debugging, planning, code review, and all the other workflow skills.

### Setting up skills

Skills go in `~/.claude/skills/<skill-name>/SKILL.md`. Each skill is a markdown file with YAML frontmatter (name + description) and instructions. Claude picks them up automatically.

To create a new skill, use the skill-creator skill:

> "Create a new skill for [whatever you need]"

### Setting up agents

Agents go in `~/.claude/agents/<agent-name>.md`. Each agent is a markdown file with YAML frontmatter (name, description, model, color) and a personality/instructions section.

### File structure overview

```
~/.claude/
├── agents/                          # Custom agent definitions
│   ├── immersive-web-creator.md
│   ├── marketing-tiktok-strategist.md
│   ├── image-prompt-engineer.md
│   └── marketing-app-store-optimizer.md
├── skills/                          # Custom skills
│   ├── nanobanana/
│   │   ├── SKILL.md
│   │   ├── nanobanan.py             # The actual generation script
│   │   └── references/
│   ├── immersive-3d-website/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── google-slides/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── prompt-engineering/
│   │   └── SKILL.md
│   └── skill-creator/
│       └── SKILL.md
└── plugins/                         # Installed plugins (managed automatically)
    └── cache/
        └── claude-plugins-official/
            └── superpowers/         # Brainstorming, TDD, debugging, etc.
```

### Quick-start checklist

- [ ] Claude Code installed and working
- [ ] Superpowers plugin installed (`/install-plugin superpowers`)
- [ ] Agent files in `~/.claude/agents/`
- [ ] Skill files in `~/.claude/skills/`
- [ ] `GEMINI_API_KEY` set for image/video generation
- [ ] Python + `google-genai` package installed for Nano Banana

---

That's the whole workflow. The idea is simple: I describe what I want in plain English, and Claude — equipped with the right skills and agents — handles the rest. I stay in the driver's seat for decisions, but I don't have to micromanage the process.
