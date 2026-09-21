# Lulli — approved mascot style

The user approved trial 04 (lighter gray strokes) on 2026-09-20. This approval applies to the style reference, not automatically to new pose candidates.

## Required reference

Attach [lulli-approved-style.png](mascot/reference/lulli-approved-style.png) to every generation. It is a saved copy of the approved trial, preserved in this repository. Original identity source: `apps/mobile/assets/mascot/dog-wave.png`. Do not use earlier rejected generations as references. Text alone cannot guarantee identity or style; visual comparison remains required.

## Fixed prompt

Use the attached APPROVED Lulli drawing as the exact character AND rendering master. Edit this same mascot into the specified pose. Preserve the same illustrator's hand; change only the necessary anatomy for the pose, with no redesign.

STYLE AND IDENTITY MUST REMAIN FIXED:
Delicate, thin medium-charcoal GRAY strokes, softly weighted and lower contrast than black. Interior lines are fine and gently tapering; the outer contour is only slightly stronger. Match the reference's grayness and thickness at equal display size. No bold black outlines.
Fur is described by sparse long smooth curves with large open gaps. Preserve the irregular pointed tufts and swept locks, but DO NOT add fur strands, hatching, stippling, pencil texture or shaded volume. Detailed SHAPES, sparse MARKS. The same flat lightly cartooned anatomy and adult proportions, never round baby-puppy proportions, never plush or realistic rendering.
Preserve the facial construction: large outlined circular eyes with unfilled interiors, small outlined nose with simple nostril curves, two rounded muzzle lobes and whisker curves. Same spacing, ratios, ear lengths, swept forehead and curled plume tail. Expression varies with the scene and is not part of the fixed identity. Default to a natural closed mouth represented by a small restrained curved seam beneath the muzzle; no tongue, teeth or open jaw. Eyes can close into simple delicate arcs for quiet happiness. No solid black eyes/nose, highlights, shading or added facial texture.
Keep the sparse pale pink and powder-blue flat organic graphic patches behind the dog. No new gradients or glow.
Keep transparent unfilled interior areas as in the reference: no opaque white fur fill. Actual alpha transparency, no drawn checkerboard, white/black background panel, cast shadow, words, UI or border.
Exactly ONE dog, with TWO forelegs and TWO hind legs total; paws holding a prop replace those paws' resting positions. Never add limbs or duplicate paws.
Landscape 3:2 PNG, complete intended silhouette with 6% safe margin. Preserve legible fine lines for mobile display.

POSE FOR THIS IMAGE:

Append one scene brief from [the pose prompt set](mascot/pose-candidates-v1/prompts.json). Keep the fixed prompt unchanged while varying the pose.

## What was approved

Expression correction: welcome is gently friendly; focus is relaxed and attentive; tidying is concentrated with gaze toward the sock; celebration has happy eyes and a small closed-mouth smile; home is calm and curious. Do not repeat an open grin across screens. New image results remain subject to visual review before Figma placement.

- Sparse long fur contours, irregular pointed silhouette, broad open areas.
- Thin medium-charcoal gray strokes with subtle weight variation; no hard black outline.
- Original face construction and flat cartoon proportions; outlined eyes and nose.
- Pale pink/blue graphic patches, transparent interior and exterior areas.

Trial 04 requested roughly 25% less thickness and 30% less darkness than trial 03. Those are historical edit instructions, not cumulative reductions to apply on every generation. Match the approved reference directly.

## Workflow and acceptance

Use the built-in image generation tool with the approved image attached. Create one image per scene, keeping UI text outside artwork. Compare each output at equal display size for face, fur-mark density, gray stroke weight, anatomy, transparency and framing. Reject boldening, extra texture, rounded puppy faces or duplicate limbs. Save candidates non-destructively. Show images directly in the conversation; the user does not want an HTML preview. Obtain approval for pose candidates before changing Figma. All later design work stays on In progress until approved for Production.
