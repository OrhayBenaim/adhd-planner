# Nano Banana 2 Prompting Guide

## Prompt Structure

Effective prompts for Nano Banana 2 follow this pattern:

```
[Subject] + [Style/Medium] + [Composition] + [Lighting] + [Details] + [Text elements]
```

### Example Prompts

**Photorealistic:**
```
A photorealistic street-level view of a golden retriever walking along a sidewalk
in a New York City neighborhood, with blurred pedestrians and yellow cabs in the
background, shot with a 35mm lens, shallow depth of field
```

**Illustration:**
```
A whimsical watercolor illustration of a cozy bookshop interior with warm lighting,
stacked books on wooden shelves, and a cat sleeping on the counter
```

**Product/Marketing:**
```
A sleek product mockup of a smartphone displaying the text 'NEW' on screen,
placed on a marble surface next to a coffee cup, soft studio lighting, minimalist
```

**UI/Mockup:**
```
A clean mobile app screen showing a task list with 3 items, modern flat design,
white background, blue accent color, the header reads 'My Tasks'
```

## Text Rendering Tips

Nano Banana 2 excels at rendering text in images. To maximize accuracy:

1. **Quote the text** -- always wrap desired text in quotes
   - Good: `a sign reading 'OPEN 24 HOURS'`
   - Bad: `a sign that says open 24 hours`

2. **Specify placement** -- tell the model where text should appear
   - `centered at the top`, `in the bottom-right corner`, `on the storefront sign`

3. **Keep it short** -- 3-5 text elements per image maximum

4. **Use common fonts/styles** -- the model handles standard typography best
   - `bold sans-serif`, `elegant serif font`, `handwritten style`

5. **Separate text from scene description** -- describe the scene first, then the text elements

## Aspect Ratio Selection Guide

| Use Case | Ratio | Notes |
|----------|-------|-------|
| Instagram feed | 1:1 | Square, classic social |
| Instagram/TikTok stories | 9:16 | Vertical, full screen mobile |
| YouTube thumbnails | 16:9 | Standard widescreen |
| Website hero banners | 21:9 | Ultra-wide, cinematic |
| Blog post images | 16:9 or 3:2 | Standard landscape |
| Mobile app screens | 9:16 | Portrait orientation |
| Email headers | 16:9 | Wide format |
| Product photos | 1:1 or 4:5 | Square or slight portrait |
| Panoramic scenes | 21:9 or 8:1 | Ultra-wide landscape |
| Book covers | 2:3 | Standard book proportion |

## Resolution Guide

| Resolution | Best For |
|-----------|---------|
| 512 | Quick previews, thumbnails, iteration |
| 1K | Social media, web use |
| 2K | High-quality web, presentations |
| 4K | Print, large displays, professional use |

Start with 1K for iteration, then regenerate the best result at 2K or 4K.

## Style Keywords

### Photography Styles
`photorealistic`, `cinematic`, `portrait photography`, `street photography`,
`macro photography`, `aerial view`, `drone shot`, `long exposure`,
`golden hour`, `blue hour`, `studio lighting`, `natural light`

### Art Styles
`watercolor`, `oil painting`, `digital art`, `vector illustration`,
`pixel art`, `3D render`, `isometric`, `flat design`, `minimalist`,
`retro`, `vintage`, `art deco`, `pop art`, `anime style`

### Lighting
`soft lighting`, `dramatic lighting`, `backlit`, `rim light`,
`neon glow`, `candlelight`, `overcast`, `harsh sunlight`,
`studio softbox`, `volumetric light`

### Composition
`rule of thirds`, `centered`, `symmetrical`, `bird's eye view`,
`worm's eye view`, `close-up`, `wide angle`, `shallow depth of field`,
`bokeh background`, `negative space`

## Common Pitfalls

- Avoid overly long prompts (>200 words) -- they dilute the model's focus
- Do not ask for copyrighted characters or real people
- Avoid contradictory instructions (e.g., "dark and bright")
- Do not rely on the model for precise pixel-level layouts
- When generating multiple variations, keep the core prompt consistent and vary only the detail you want changed
