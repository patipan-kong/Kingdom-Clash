# Run A report

Created only the six Run A march frames and this report. One built-in generation per frame; six calls total, no refusals or retries. Each call independently edited ../ref/idle-template.png with 00-idle.png and ../ref/borin-still.png as identity references.

Tool: `image_gen.imagegen` (callable name `image_gen__imagegen`).
Generation mode: image edit, `transparent_background: true`.
Input order: edit target, idle identity reference, native still identity reference.
All six outputs were copied unchanged from the built-in tool's generated_images directory. SHA-256 comparison confirmed every destination is byte-for-byte identical to its returned source. No resizing, cropping, background removal, matting, alpha repair or pixel editing was performed.

## Output metadata

Dimensions and image mode below were read from the PNG IHDR headers: bit depth 8, color type 6 (RGBA).

| File | Output pixel size | Image mode | Generation mode |
|---|---|---|---|
| 01-walk1.png | 1254 x 1254 | RGBA, 8 bits/channel | Edit; transparent_background: true |
| 02-walk2.png | 1254 x 1254 | RGBA, 8 bits/channel | Edit; transparent_background: true |
| 03-walk3.png | 1254 x 1254 | RGBA, 8 bits/channel | Edit; transparent_background: true |
| 04-walk4.png | 1254 x 1254 | RGBA, 8 bits/channel | Edit; transparent_background: true |
| 05-walk5.png | 1254 x 1254 | RGBA, 8 bits/channel | Edit; transparent_background: true |
| 06-walk6.png | 1254 x 1254 | RGBA, 8 bits/channel | Edit; transparent_background: true |

## Deviations and visual review

The tool returned 1254 x 1254 for every image despite the explicit 1536 x 1536 request. Consequently the brief's absolute ground line y=1240, feet midpoint x=950, and exact template scale/placement were not preserved. Subject placement also varies between frames. Outputs were retained exactly as returned, in accordance with the one-generation and no-pixel-processing requirements.

All previews show one left-facing dwarf, hammer head on viewer-left, both hands carrying the hammer, and cape on viewer-right. Contact/down/passing motions are present, but alternate-leg leading in frames 04-06 is not clearly distinguished from frames 01-03; the passing poses in 03 and 06 look especially similar. Therefore a smooth six-frame alternating walk cycle is not verified. These files should not be treated as fully conforming production frames.

## Exact prompts and per-file records

### 01-walk1.png

Tool: `image_gen.imagegen` (`image_gen__imagegen`).
Output: 1254 x 1254 pixels; RGBA (8 bits/channel).
Mode: image edit; `transparent_background: true`.
Reference paths, in order:
- `../ref/idle-template.png` — edit target.
- `00-idle.png` — identity reference.
- `../ref/borin-still.png` — identity reference.

Exact prompt:

```text
Use case: identity-preserve. Asset type: one painted game animation frame, Run A heavy rolling dwarf march toward viewer-left.
Input image 1 (idle-template.png) is the EDIT TARGET: edit this canvas and character. Input image 2 (00-idle.png) and image 3 (borin-still.png) are identity references only. Do not use their different canvas scale. Generate exactly ONE image with ONE character in ONE pose, not a sheet.
Keep the square 1536x1536 canvas and EXACT character scale and placement of image 1: standing head-to-boot height about 590 px, ground line y=1240, feet midpoint near x=950. Keep every part including hammer and cape at least 80 px inside all canvas edges. Preserve the large transparent space above and to the left. Never enlarge to fill the frame. Preserve native genuine alpha transparency: no opaque background, no checkerboard painted into image.
Identical Borin identity and painted soft-shaded style with dark outlines, top lighting and template palette. Short, very broad powerful dwarf nearly as wide as tall, barrel chest, thick arms, short thick legs, bushy orange-red beard with long front braid, heavy brow, bare head with short orange hair. White-cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons; blue and gold plate armour, gold-trimmed blue front tabard, brown belt, thick gauntlets and bracers, heavy brown gold-trimmed boots. Long blue cape with gold border behind on VIEWER-RIGHT.
Handedness and camera must never change: three-quarter facing VIEWER-LEFT, slightly elevated camera as template. Both gauntleted fists grip the enormous hammer haft across body at belt height; hammer head low on VIEWER-LEFT but clear of ground, steel head with blue/gold face, gold bands and diamond emblem, dark steel haft and gold pommel. No shield or helmet. Heavy low planted rolling walk with short weighty steps, slight side-to-side body roll, cape lagging and swaying behind. Change only the march pose and its natural beard, cloth and cape response, preserving equipment design, proportions, rendering and scale.
No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters or extra limbs.
FRAME POSE: 01-walk1.png — Contact: the viewer-left (front) foot just planted a short step ahead toward viewer-left, heel down on y=1240; the other foot behind toward viewer-right on its toes. Body slightly lower than idle. Cape gently trails toward viewer-right.
```

### 02-walk2.png

Tool: `image_gen.imagegen` (`image_gen__imagegen`).
Output: 1254 x 1254 pixels; RGBA (8 bits/channel).
Mode: image edit; `transparent_background: true`.
Reference paths, in order:
- `../ref/idle-template.png` — edit target.
- `00-idle.png` — identity reference.
- `../ref/borin-still.png` — identity reference.

Exact prompt:

```text
Use case: identity-preserve. Asset type: one painted game animation frame, Run A heavy rolling dwarf march toward viewer-left.
Input image 1 (idle-template.png) is the EDIT TARGET: edit this canvas and character. Input image 2 (00-idle.png) and image 3 (borin-still.png) are identity references only. Do not use their different canvas scale. Generate exactly ONE image with ONE character in ONE pose, not a sheet.
Keep the square 1536x1536 canvas and EXACT character scale and placement of image 1: standing head-to-boot height about 590 px, ground line y=1240, feet midpoint near x=950. Keep every part including hammer and cape at least 80 px inside all canvas edges. Preserve the large transparent space above and to the left. Never enlarge to fill the frame. Preserve native genuine alpha transparency: no opaque background, no checkerboard painted into image.
Identical Borin identity and painted soft-shaded style with dark outlines, top lighting and template palette. Short, very broad powerful dwarf nearly as wide as tall, barrel chest, thick arms, short thick legs, bushy orange-red beard with long front braid, heavy brow, bare head with short orange hair. White-cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons; blue and gold plate armour, gold-trimmed blue front tabard, brown belt, thick gauntlets and bracers, heavy brown gold-trimmed boots. Long blue cape with gold border behind on VIEWER-RIGHT.
Handedness and camera must never change: three-quarter facing VIEWER-LEFT, slightly elevated camera as template. Both gauntleted fists grip the enormous hammer haft across body at belt height; hammer head low on VIEWER-LEFT but clear of ground, steel head with blue/gold face, gold bands and diamond emblem, dark steel haft and gold pommel. No shield or helmet. Heavy low planted rolling walk with short weighty steps, slight side-to-side body roll, cape lagging and swaying behind. Change only the march pose and its natural beard, cloth and cape response, preserving equipment design, proportions, rendering and scale.
No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters or extra limbs.
FRAME POSE: 02-walk2.png — Down: weight settling onto the viewer-left front foot, front knee bent, body at its lowest point of the walk; rear viewer-right foot starting to lift. Supporting boot remains grounded at y=1240. The torso sinks slightly with heavy weight; the cape lags behind.
```

### 03-walk3.png

Tool: `image_gen.imagegen` (`image_gen__imagegen`).
Output: 1254 x 1254 pixels; RGBA (8 bits/channel).
Mode: image edit; `transparent_background: true`.
Reference paths, in order:
- `../ref/idle-template.png` — edit target.
- `00-idle.png` — identity reference.
- `../ref/borin-still.png` — identity reference.

Exact prompt:

```text
Use case: identity-preserve. Asset type: one painted game animation frame, Run A heavy rolling dwarf march toward viewer-left.
Input image 1 (idle-template.png) is the EDIT TARGET: edit this canvas and character. Input image 2 (00-idle.png) and image 3 (borin-still.png) are identity references only. Do not use their different canvas scale. Generate exactly ONE image with ONE character in ONE pose, not a sheet.
Keep the square 1536x1536 canvas and EXACT character scale and placement of image 1: standing head-to-boot height about 590 px, ground line y=1240, feet midpoint near x=950. Keep every part including hammer and cape at least 80 px inside all canvas edges. Preserve the large transparent space above and to the left. Never enlarge to fill the frame. Preserve native genuine alpha transparency: no opaque background, no checkerboard painted into image.
Identical Borin identity and painted soft-shaded style with dark outlines, top lighting and template palette. Short, very broad powerful dwarf nearly as wide as tall, barrel chest, thick arms, short thick legs, bushy orange-red beard with long front braid, heavy brow, bare head with short orange hair. White-cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons; blue and gold plate armour, gold-trimmed blue front tabard, brown belt, thick gauntlets and bracers, heavy brown gold-trimmed boots. Long blue cape with gold border behind on VIEWER-RIGHT.
Handedness and camera must never change: three-quarter facing VIEWER-LEFT, slightly elevated camera as template. Both gauntleted fists grip the enormous hammer haft across body at belt height; hammer head low on VIEWER-LEFT but clear of ground, steel head with blue/gold face, gold bands and diamond emblem, dark steel haft and gold pommel. No shield or helmet. Heavy low planted rolling walk with short weighty steps, slight side-to-side body roll, cape lagging and swaying behind. Change only the march pose and its natural beard, cloth and cape response, preserving equipment design, proportions, rendering and scale.
No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters or extra limbs.
FRAME POSE: 03-walk3.png — Passing: rear viewer-right foot swinging forward under the body, supporting viewer-left leg straight, body at its highest point of this short heavy march. Supporting sole on y=1240; moving boot lifted clear. Keep short dwarf legs, no elongated proportions. Cape sways naturally behind.
```

### 04-walk4.png

Tool: `image_gen.imagegen` (`image_gen__imagegen`).
Output: 1254 x 1254 pixels; RGBA (8 bits/channel).
Mode: image edit; `transparent_background: true`.
Reference paths, in order:
- `../ref/idle-template.png` — edit target.
- `00-idle.png` — identity reference.
- `../ref/borin-still.png` — identity reference.

Exact prompt:

```text
Use case: identity-preserve. Asset type: one painted game animation frame, Run A heavy rolling dwarf march toward viewer-left.
Input image 1 (idle-template.png) is the EDIT TARGET: edit this canvas and character. Input image 2 (00-idle.png) and image 3 (borin-still.png) are identity references only. Do not use their different canvas scale. Generate exactly ONE image with ONE character in ONE pose, not a sheet.
Keep the square 1536x1536 canvas and EXACT character scale and placement of image 1: standing head-to-boot height about 590 px, ground line y=1240, feet midpoint near x=950. Keep every part including hammer and cape at least 80 px inside all canvas edges. Preserve the large transparent space above and to the left. Never enlarge to fill the frame. Preserve native genuine alpha transparency: no opaque background, no checkerboard painted into image.
Identical Borin identity and painted soft-shaded style with dark outlines, top lighting and template palette. Short, very broad powerful dwarf nearly as wide as tall, barrel chest, thick arms, short thick legs, bushy orange-red beard with long front braid, heavy brow, bare head with short orange hair. White-cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons; blue and gold plate armour, gold-trimmed blue front tabard, brown belt, thick gauntlets and bracers, heavy brown gold-trimmed boots. Long blue cape with gold border behind on VIEWER-RIGHT.
Handedness and camera must never change: three-quarter facing VIEWER-LEFT, slightly elevated camera as template. Both gauntleted fists grip the enormous hammer haft across body at belt height; hammer head low on VIEWER-LEFT but clear of ground, steel head with blue/gold face, gold bands and diamond emblem, dark steel haft and gold pommel. No shield or helmet. Heavy low planted rolling walk with short weighty steps, slight side-to-side body roll, cape lagging and swaying behind. Change only the march pose and its natural beard, cloth and cape response, preserving equipment design, proportions, rendering and scale.
No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters or extra limbs.
FRAME POSE: 04-walk4.png — Contact with the OTHER leg: the viewer-right foot is now planted a short step ahead toward viewer-left, heel down on y=1240, crossing in depth naturally; the viewer-left foot is behind on its toes. Body slightly lower. This reverses the leading leg from frame 01 without mirroring character, hammer, face or cape. Cape sways to the opposite phase.
```

### 05-walk5.png

Tool: `image_gen.imagegen` (`image_gen__imagegen`).
Output: 1254 x 1254 pixels; RGBA (8 bits/channel).
Mode: image edit; `transparent_background: true`.
Reference paths, in order:
- `../ref/idle-template.png` — edit target.
- `00-idle.png` — identity reference.
- `../ref/borin-still.png` — identity reference.

Exact prompt:

```text
Use case: identity-preserve. Asset type: one painted game animation frame, Run A heavy rolling dwarf march toward viewer-left.
Input image 1 (idle-template.png) is the EDIT TARGET: edit this canvas and character. Input image 2 (00-idle.png) and image 3 (borin-still.png) are identity references only. Do not use their different canvas scale. Generate exactly ONE image with ONE character in ONE pose, not a sheet.
Keep the square 1536x1536 canvas and EXACT character scale and placement of image 1: standing head-to-boot height about 590 px, ground line y=1240, feet midpoint near x=950. Keep every part including hammer and cape at least 80 px inside all canvas edges. Preserve the large transparent space above and to the left. Never enlarge to fill the frame. Preserve native genuine alpha transparency: no opaque background, no checkerboard painted into image.
Identical Borin identity and painted soft-shaded style with dark outlines, top lighting and template palette. Short, very broad powerful dwarf nearly as wide as tall, barrel chest, thick arms, short thick legs, bushy orange-red beard with long front braid, heavy brow, bare head with short orange hair. White-cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons; blue and gold plate armour, gold-trimmed blue front tabard, brown belt, thick gauntlets and bracers, heavy brown gold-trimmed boots. Long blue cape with gold border behind on VIEWER-RIGHT.
Handedness and camera must never change: three-quarter facing VIEWER-LEFT, slightly elevated camera as template. Both gauntleted fists grip the enormous hammer haft across body at belt height; hammer head low on VIEWER-LEFT but clear of ground, steel head with blue/gold face, gold bands and diamond emblem, dark steel haft and gold pommel. No shield or helmet. Heavy low planted rolling walk with short weighty steps, slight side-to-side body roll, cape lagging and swaying behind. Change only the march pose and its natural beard, cloth and cape response, preserving equipment design, proportions, rendering and scale.
No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters or extra limbs.
FRAME POSE: 05-walk5.png — Down on the other leg: weight settling onto the now-leading viewer-right foot, its knee bent, body lowest; the rear viewer-left foot starting to lift. Supporting boot remains grounded at y=1240. Heavy torso dips, with cape lagging in the opposite phase from frame 02. Do not mirror the character.
```

### 06-walk6.png

Tool: `image_gen.imagegen` (`image_gen__imagegen`).
Output: 1254 x 1254 pixels; RGBA (8 bits/channel).
Mode: image edit; `transparent_background: true`.
Reference paths, in order:
- `../ref/idle-template.png` — edit target.
- `00-idle.png` — identity reference.
- `../ref/borin-still.png` — identity reference.

Exact prompt:

```text
Use case: identity-preserve. Asset type: one painted game animation frame, Run A heavy rolling dwarf march toward viewer-left.
Input image 1 (idle-template.png) is the EDIT TARGET: edit this canvas and character. Input image 2 (00-idle.png) and image 3 (borin-still.png) are identity references only. Do not use their different canvas scale. Generate exactly ONE image with ONE character in ONE pose, not a sheet.
Keep the square 1536x1536 canvas and EXACT character scale and placement of image 1: standing head-to-boot height about 590 px, ground line y=1240, feet midpoint near x=950. Keep every part including hammer and cape at least 80 px inside all canvas edges. Preserve the large transparent space above and to the left. Never enlarge to fill the frame. Preserve native genuine alpha transparency: no opaque background, no checkerboard painted into image.
Identical Borin identity and painted soft-shaded style with dark outlines, top lighting and template palette. Short, very broad powerful dwarf nearly as wide as tall, barrel chest, thick arms, short thick legs, bushy orange-red beard with long front braid, heavy brow, bare head with short orange hair. White-cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons; blue and gold plate armour, gold-trimmed blue front tabard, brown belt, thick gauntlets and bracers, heavy brown gold-trimmed boots. Long blue cape with gold border behind on VIEWER-RIGHT.
Handedness and camera must never change: three-quarter facing VIEWER-LEFT, slightly elevated camera as template. Both gauntleted fists grip the enormous hammer haft across body at belt height; hammer head low on VIEWER-LEFT but clear of ground, steel head with blue/gold face, gold bands and diamond emblem, dark steel haft and gold pommel. No shield or helmet. Heavy low planted rolling walk with short weighty steps, slight side-to-side body roll, cape lagging and swaying behind. Change only the march pose and its natural beard, cloth and cape response, preserving equipment design, proportions, rendering and scale.
No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters or extra limbs.
FRAME POSE: 06-walk6.png — Passing on the other leg: rear viewer-left foot swings forward under the body, viewer-right supporting leg straight, body at its highest. Supporting sole on y=1240; moving boot lifted. This is the final phase before viewer-left foot plants in frame 01, and must lead smoothly into that contact pose. Cape returns smoothly toward its initial sway. Do not mirror the character.
```




## Requested regeneration — 2026-11-09

Overwrote only 01-walk1.png, 02-walk2.png, 04-walk4.png and 05-walk5.png. One successful built-in generation per file, no refusals or retries. Tool: `image_gen.imagegen` (`image_gen__imagegen`); edit mode; `transparent_background: true`. Inputs in order: `../ref/idle-template.png` (edit target), `00-idle.png` (identity/scale reference), `../ref/borin-still.png` (identity reference). Every output: **1254 x 1254, PNG, 8-bit RGBA**. All saved files hash-identical to returned originals; no pixel processing. `*-first.png` files unchanged.

Exact prompts are recorded below as a shared prefix and per-file suffix. Each complete prompt is the shared prefix followed by one newline and its exact suffix.

Shared prefix:

```text
Use case: identity-preserve. One painted game animation sprite, exactly one character and one pose.
Input 1 ../ref/idle-template.png is the EDIT TARGET. Edit that image. Input 2 00-idle.png is the approved identity AND exact scale reference; input 3 ../ref/borin-still.png is identity only.
Square canvas, genuinely transparent background with native alpha. Keep the large empty transparent space above and to the left. Composition is locked to the template, never zoom in. On the 1254 x 1254 output, Borin's standing head-to-boot height is 500 px, and the hammer head's height is 251 px. Match 00-idle.png EXACTLY: never taller, larger, bulkier, or a larger hammer. Preserve short, broad dwarf anatomy: barrel chest, thick arms, very short thick legs. Walk stance remains as narrow as idle: foot separation no greater than one hammer-head width, short steps. Ground contact y=1012, feet midpoint near x=776 on 1254 canvas (equivalent to y=1240, x=950 on 1536 template). All parts at least 65 px inside a 1254 canvas, equivalent to 80 px on template. Do not render measurement guides.
Preserve Borin's face, heavy brow, short orange bare-head hair, bushy orange-red beard and long braid; white cream fur mantle with small animal heads at shoulders; blue steel gold-edged pauldrons, blue and gold plate armour, gold-trimmed blue tabard, brown belt, plated gauntlets and bracers, heavy brown gold-trimmed boots. Long blue gold-bordered cape behind on VIEWER-RIGHT. Huge heavy warhammer with steel head, blue and gold face, gold bands and diamond emblem, dark steel haft, gold pommel. Identical soft painted shading, dark outlines, top lighting, palette, material details and equipment design.
Same slightly elevated three-quarter camera, facing VIEWER-LEFT, never mirrored. Hammer head on VIEWER-LEFT. For walks both fists grip haft across belt height, head low and clear of ground; heavy rolling weight, slight body roll, cape lags and sways. Change pose only and its natural cloth/beard response. No helmet, shield, extra limbs, extra objects, ground shadow, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text, border, background or painted checkerboard.
```

### 01-walk1.png

Contact pose returned with viewer-left foot forward and rear heel raised. Compact short-dwarf silhouette; exact 500 px body / 251 px hammer dimensions are not certified.

Exact suffix:

```text
FRAME 01-walk1.png: Contact: the viewer-left (front) foot just planted a SHORT step ahead toward viewer-left, heel down; the other foot behind on its toes. Body slightly lower than idle. Keep feet close as in idle; no long lunge or wide stride. Whole body no taller than 500 px and hammer head about 251 px tall.
```

### 02-walk2.png

Lower settling pose returned with bent front knee and rear foot lifting. Body projects shorter than idle as requested; exact equipment scale and stance width are not certified.

Exact suffix:

```text
FRAME 02-walk2.png: Down: weight settling onto the viewer-left front foot, knee bent, body at its LOWEST in the walk; the rear viewer-right foot starting to lift. Heavy low compact posture, modest knee bend with very short legs. Keep the idle stance width and short step. Head to soles slightly UNDER 500 px; hammer head about 251 px tall.
```

### 04-walk4.png

Contact pose returned with a tighter overlapping leg arrangement. Opposite-leg intent is present in the prompt; exact anatomical leg continuity through the cycle is not certified.

Exact suffix:

```text
FRAME 04-walk4.png: Contact with the OTHER leg: the leg whose foot was on viewer-RIGHT in idle is now planted a SHORT step ahead toward viewer-left, across/in front of the other leg in depth; the viewer-LEFT leg is behind on its toes. Body slightly lower. This is the opposite leg leading from walk1; do not mirror the upper body, weapon or cape. Keep feet close as in idle, no wide stride. Whole body no taller than 500 px; hammer head about 251 px tall.
```

### 05-walk5.png

Low bent-knee pose returned. The alternate support leg is visually ambiguous, so opposite-leg continuity is not certified.

Exact suffix:

```text
FRAME 05-walk5.png: Down on the OTHER leg: weight settling onto the foot of the leg that was on viewer-RIGHT in idle, now forward toward viewer-left, front knee bent, body at its LOWEST; the rear viewer-left foot starting to lift. Opposite support leg from walk2; do not mirror upper body, weapon or cape. Short step and idle stance width. Head to soles slightly UNDER 500 px, hammer head about 251 px tall.
```

Review limitation: visual inspection only for pose, anatomy and scale; no pixel edits or corrective rescaling. Fixed ground/feet coordinates and exact stance limits are not certified.

