# Lulli mascot: reference and generation prompt

**Superseded draft:** the first prompt overemphasized fur density. Use `mascot-approved-style.md` for the approved sparse, light-gray contour style and saved image reference. New pose candidates require review before Figma placement.

The primary identity and style reference is `apps/mobile/assets/mascot/dog-wave.png`. Always attach it when generating a new pose. A verbal prompt alone cannot lock the character's identity. `dog-celebrate.png` can clarify the closed-eye smile, but should not override the primary reference.

This is a reverse-engineered visual specification, not the unknown original generation prompt.

## Visual analysis

- Fine, slightly irregular charcoal ink contours with subtly varying weight.
- Long, tapered internal fur strands; short pointed tufts on the silhouette; asymmetric swept forehead, long hanging ears, shaggy cheeks and chest, curled plume tail.
- Broad flat muzzle made from two rounded lobes, small outlined nose, large outlined circular eyes, and a broad open smile. Avoid adding realistic pupils, highlights, stippling or nose texture.
- Expressive flat cartoon anatomy with detailed fur. Preserve the original head/body proportions; do not turn the dog into a round baby puppy or a rendered plush toy.
- Mostly unfilled interiors. Pale pink and powder-blue patches act as sparse graphic accents behind the line drawing, not as dyed fur or shaded volume.

## Reusable core prompt

Use case: illustration-story / identity-preserve.
SOURCE OF TRUTH: Attached dog-wave.png is the exact character and drawing-style master. This is a new drawing by the SAME illustrator of the SAME individual dog. Preserve the reference's facial construction and level of cartoon stylization, not merely the Pekingese breed.

IDENTITY LOCK:
Broad, short, flat muzzle with two rounded muzzle lobes; small OUTLINED triangular/heart-shaped nose with simple nostril marks; large circular OUTLINED eyes with the same sparse interior treatment as the reference (no new black glassy pupils or glossy highlights); broad curved open-mouth smile with outlined tongue. Keep eye spacing, nose-to-eye distance, face width, muzzle width and forehead proportions. Long hanging ears integrated into long shaggy cheek fur. Asymmetric swept forehead part; high wispy crown; irregular pointed cheek and chest tufts. Compact adult body with short legs, shaggy feet and long curled plume tail. Keep reference head-to-body ratio. Do not redesign into a baby puppy.

STYLE LOCK:
Fine black/charcoal pen contours, delicately variable line weight. Many long flowing tapered strands within the fur, with dense small angular tufts at outer edges. SAME fur-detail density as the master at equal display size. Flat 2D expressive cartoon line illustration with detailed natural fur structure. Mostly unfilled interiors and open negative space. No crosshatching, stippling, gray shading, watercolor, airbrush, rendered volume, shiny eyes, realistic textured nose, plush 3D or simplified vector blobs. Neither more realistic nor more simplified than the reference.
Sparse flat pale blush pink and powder blue organic accent patches BEHIND portions of the dog, as in the reference. They are graphic backdrop shapes, not dyed fur. Preserve the linework over the accents.

OUTPUT:
One standalone complete illustration, actual transparent alpha background. No painted checkerboard, white rectangle, black background, glow, shadow, lettering, UI or border. Keep all limbs and tail within a 6% safe margin. Exactly one dog with anatomically coherent four limbs total: two forelegs and two hind legs; a foreleg doing an action replaces its resting position, never adds a second copy. Count limbs before finishing. Reference should remain recognizable when the pose changes.

POSE:

Append one pose brief. Keep the identity and style instructions fixed across all generations.

## Required screen corrections

- Welcome (`196:2`): new gentle play-bow, distinct from the frequently reused wave.
- Focus (`197:70`): reassuring chin-on-paws pose, preserving the adult face and dense angular fur detail.
- Tiny action (`198:31`): keep the sock-and-basket action; one front paw handles the sock, the other rests on the ground.
- Celebration (`199:32`): two forepaws hold the star, two hind paws support the seated body. No extra waving paws.

## Acceptance checks

Compare each candidate directly with the primary reference at the same rendered size. Check eye/nose/muzzle shapes, head/body proportions, ear length, fur-strand density, line weight, flatness, accent treatment, four-limb anatomy, and real transparency. Reject stylistic drift even if the breed and colors are correct. Check again in the actual Figma layout before replacing the draft illustration. Keep UI text editable outside the artwork.
