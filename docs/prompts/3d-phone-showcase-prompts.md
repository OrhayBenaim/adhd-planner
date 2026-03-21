# 3D Spinning Phone Showcase -- AI Generation Prompts

## Context
These prompts are designed to generate a premium 3D phone mockup showcase animation/video for the Lullio landing page. The concept: a sleek smartphone spins into view from the side, revealing three app screens across three rotations, creating a cinematic product reveal.

**App visual identity**: Clean, calming UI with soft periwinkle/lavender accent colors, rounded card elements, light backgrounds with subtle gradients (blues, pinks, purples), minimal and uncluttered layout.

---

## Option A: Single Video Prompt (Veo 3.1 / Runway / Kling)

Use this as a single prompt for AI video generation tools that support longer-form output.

```
A premium product showcase video of a modern smartphone with ultra-thin bezels and a glossy dark titanium frame, floating and slowly spinning in a pristine white cyclorama studio environment. The phone rotates smoothly on its vertical axis like a turntable presentation.

The phone begins edge-on, showing only its impossibly thin profile silhouetted against the clean white backdrop. It rotates clockwise with elegant, steady momentum. As the screen faces the camera for the first time, it reveals a calming productivity app home screen: a soft lavender-tinted interface showing a mood check-in prompt reading "How are you feeling?", a circular progress badge, an energy slider, and a gentle gradient background transitioning from warm peach to cool periwinkle. The phone pauses briefly, tilted at a flattering 15-degree three-quarter angle.

The phone continues its smooth clockwise rotation, passing through its edge profile again. When the screen faces the viewer a second time, it now displays a focused task view: a single task card with the title "Reply to emails" featuring Complete and Later buttons in soft blue and lavender, a timer indicator, and the same calming gradient header. Another brief pause at the three-quarter presentation angle.

The phone completes one final rotation. On its third face-forward reveal, the screen shows a voice input interface: a floating "Add New Task" modal card with a text input field and colorful action buttons, overlaying the soft gradient background, suggesting effortless voice-to-task creation.

Studio lighting: one large overhead softbox creating a clean, even wash with a subtle gradient shadow on the white floor beneath the phone. A secondary rim light from camera-right edge-lights the titanium frame, producing a premium metallic gleam on each rotation. Faint, soft reflections on the studio floor beneath the phone add depth. The overall lighting is high-key, bright, airy, and luxurious -- evoking Apple keynote product photography.

Camera: locked on a tripod at eye level, perfectly centered on the phone, slight telephoto compression (equivalent to 85mm lens), shallow depth of field with the phone tack-sharp and the white background falling into a smooth, creamy softness. The camera remains static while the phone does all the moving.

Motion quality: smooth, fluid, professional -- like a high-end turntable product shot. Each full rotation takes approximately 2-3 seconds. The phone floats with no visible support, casting only a soft contact shadow on the white surface below.

Color grade: clean, bright, slightly cool whites with warm accent highlights on the phone frame. Premium commercial advertising aesthetic. 4K resolution, 60fps smoothness.
```

---

## Option B: Three-Stage Image Sequence (DALL-E / Midjourney / Flux)

Use these three prompts to generate keyframe images that can be interpolated into a video, or used as a static 3-panel showcase.

### Stage 1 -- Edge Profile Entry (The Reveal Begins)

```
A premium product photography shot of a modern smartphone seen perfectly edge-on, displaying only its ultra-thin titanium dark gray profile against a pristine white cyclorama studio background. The phone appears to float in space with a soft contact shadow on the white floor below. Studio lighting from a large overhead softbox creates clean, even illumination. A rim light from camera-right catches the metallic edge, producing a sleek specular highlight along the phone's frame. The phone is positioned center-frame, vertical orientation, with generous negative space on all sides. Shot on 85mm lens at f/2.8, eye level, shallow depth of field with the phone razor-sharp and the background falling to smooth white. High-key lighting, luxury commercial product photography, Apple-keynote aesthetic, 4K, photorealistic.
```

### Stage 2 -- First Screen Reveal (Home / Command Center)

```
A premium 3D product photography shot of a modern smartphone with ultra-thin bezels and dark titanium frame, presented at a flattering 15-degree three-quarter angle, screen facing the viewer. The phone floats against a pristine white cyclorama studio backdrop with a soft shadow beneath. The screen displays a calming productivity app interface: a soft gradient background transitioning from warm peach to cool periwinkle at the top, a friendly greeting "How are you feeling?" in dark text, a circular purple level badge, a horizontal energy/motivation slider with pastel pink and blue segments, and rounded UI cards below -- all rendered with clean, minimal design in soft lavender and blue tones. Large overhead softbox provides clean high-key illumination, rim light from camera-right creates a premium metallic gleam along the titanium frame edge. Shot at eye level on 85mm lens, f/2.8, shallow depth of field with creamy bokeh on the background, the phone and screen perfectly sharp. Luxury commercial product showcase, photorealistic, editorial quality, 4K resolution.
```

### Stage 3 -- Second Screen Reveal (Task View)

```
A premium 3D product photography shot of a modern smartphone with ultra-thin bezels and dark titanium frame, presented at a flattering 15-degree three-quarter angle from the opposite side compared to the previous frame, screen facing the viewer. The phone floats against a pristine white cyclorama studio backdrop with a soft contact shadow beneath. The screen displays a focused task management interface: the same calming peach-to-periwinkle gradient header, a prominent white rounded task card in the center showing a task title "Reply to emails" with a brief description, a small timer icon showing "15 mins", and two action buttons at the bottom -- a blue "Complete" button and a lavender "Later" button -- all in clean, minimal design with soft rounded corners. Large overhead softbox provides clean high-key illumination, secondary rim light on the frame edge. Shot at eye level on 85mm lens, f/2.8, shallow depth of field. Luxury product showcase aesthetic, photorealistic, commercial advertising quality, 4K.
```

### Stage 4 -- Third Screen Reveal (Voice Input)

```
A premium 3D product photography shot of a modern smartphone with ultra-thin bezels and dark titanium frame, returned to the original three-quarter angle, screen facing the viewer. The phone floats against a pristine white cyclorama studio backdrop. The screen shows a voice-to-task creation interface: the calming gradient background with a floating white modal card titled "Add New Task" featuring a text input field with placeholder text "Describe your task...", and colorful circular action buttons (a pink cancel and green confirm) at the bottom of the modal. A subtle frosted glass overlay effect behind the modal suggests the home screen underneath. Clean, minimal UI with soft lavender and blue design language. Large overhead softbox, rim light on titanium frame, soft contact shadow below. Shot at eye level on 85mm lens, f/2.8, shallow depth of field. Premium commercial product photography, Apple-style keynote presentation aesthetic, photorealistic, 4K resolution.
```

---

## Option C: Midjourney-Optimized Prompts

Condensed versions with Midjourney parameters for direct use.

### Stage 1 (Edge Profile)
```
modern smartphone edge-on profile view, ultra-thin dark titanium frame, floating in pristine white cyclorama studio, soft contact shadow, overhead softbox high-key lighting, rim light on metal edge, premium product photography, Apple keynote aesthetic, photorealistic --ar 16:9 --v 6.1 --style raw --s 200
```

### Stage 2 (Home Screen)
```
modern smartphone three-quarter angle, dark titanium frame ultra-thin bezels, screen showing calming ADHD planner app with peach-to-lavender gradient header, circular purple level badge, mood slider, rounded cards, soft pastel UI, floating in white cyclorama studio, overhead softbox, rim light on frame, premium product showcase photography --ar 16:9 --v 6.1 --style raw --s 200
```

### Stage 3 (Task View)
```
modern smartphone three-quarter angle opposite side, dark titanium frame, screen showing focused task card "Reply to emails" with Complete and Later buttons in blue and lavender, calming gradient header, minimal clean UI, floating in white cyclorama studio, overhead softbox, rim light, luxury commercial product photography --ar 16:9 --v 6.1 --style raw --s 200
```

### Stage 4 (Voice Input)
```
modern smartphone three-quarter angle, dark titanium frame, screen showing "Add New Task" floating modal card over frosted background, text input field, colorful action buttons, soft lavender UI design, floating in white cyclorama studio, overhead softbox, rim light on titanium edge, premium Apple-style product showcase --ar 16:9 --v 6.1 --style raw --s 200
```

---

## Option D: Image-to-Video Workflow (Recommended for Best Results)

The highest quality approach: generate or composite real screenshots onto a 3D phone mockup, then use image-to-video to animate.

### Step 1: Create Static Keyframes
Use a 3D mockup tool (Rotato, Figma + Angle plugin, or Blender) to place the three actual Lullio screenshots onto a realistic phone model at the three angles:
- Frame A: Phone edge-on (no screen visible)
- Frame B: Phone at 15-degree 3/4 angle showing Screenshot 1 (Home)
- Frame C: Phone at 15-degree 3/4 angle from opposite side showing Screenshot 2 (Task View)
- Frame D: Phone at 15-degree 3/4 angle showing Screenshot 3 (Voice Input)

### Step 2: Animate with AI Video
Feed each keyframe pair into an image-to-video tool (Runway Gen-3, Kling, Veo) with this motion prompt:

```
Smooth, continuous clockwise rotation of the smartphone on its vertical axis, floating in place with no camera movement. Premium product turntable presentation. Fluid, steady rotation speed. Clean white studio environment with consistent lighting. The phone spins naturally with realistic metallic reflections catching the studio lights as it turns. Professional commercial product video quality.
```

### Step 3: Stitch
Concatenate the three rotation clips into one seamless showcase video, adding subtle easing transitions between segments.

---

## Prompt Engineering Notes

### Key Photography Terms That Drive Quality
- **"cyclorama studio"** -- triggers clean, infinite white backdrop
- **"three-quarter angle"** -- the most flattering phone presentation angle
- **"rim light" + "titanium frame"** -- produces premium metallic edge highlights
- **"contact shadow"** -- grounds the floating phone without heavy shadows
- **"high-key lighting"** -- ensures bright, airy, luxury feel
- **"85mm lens, f/2.8"** -- telephoto compression + bokeh without losing the phone
- **"Apple keynote aesthetic"** -- strong style anchor for premium tech product visuals

### What to Avoid
- Do not say "blurry background" -- say "shallow depth of field with creamy bokeh"
- Do not say "nice lighting" -- specify softbox type, direction, and quality
- Do not say "modern phone" alone -- always add "ultra-thin bezels, dark titanium frame"
- Avoid "3D render" if you want photorealism -- use "product photography, photorealistic"
- Do not over-specify the on-screen UI text -- AI models struggle with exact text rendering; consider compositing real screenshots onto the generated phone mockup in post-production

### Platform Recommendations
| Platform | Best For | Notes |
|----------|----------|-------|
| Veo 3.1 | Full video generation | Best motion quality, use Option A |
| Runway Gen-3 Alpha | Image-to-video animation | Use Option D workflow with keyframes |
| Kling 1.6 | Image-to-video, good physics | Similar to Runway approach |
| Midjourney v6.1 | Static keyframe generation | Use Option C, then animate separately |
| DALL-E 3 | Static keyframes | Use Option B, natural language works well |
| Flux 1.1 Pro | Static keyframes with text | Better at rendering on-screen UI text |
