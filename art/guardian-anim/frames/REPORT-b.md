# Guardian frames 15–28 — report B

Created only the 14 requested frames, one built-in generation per frame. Every call edited `../ref/canvas-template.png` with `transparent_background: true`; no frame was used as a subsequent edit target. Reference and accepted pilot images were inspected for identity and pose guidance. No background removal, matting, alpha repair, resizing, compositing, or other pixel modification was performed. Files were copied verbatim from the tool outputs. SHA-256 comparisons confirm all 14 saved PNGs are byte-identical to their generated sources.

## Validation and limitations

All outputs are 1360 × 1156, 8-bit RGBA PNG (PNG color type 6; System.Drawing reports Format32bppArgb), with generated alpha. This has the template's aspect ratio but is 85% of its requested 1600 × 1360 dimensions. The prompts requested the exact template dimensions, character scale, and ground line; the tool returned smaller canvases. They were preserved exactly per the no-processing rule. Exact absolute scale and ground-line compliance therefore were not achieved.

Visual review: each output contains one Guardian pose with no cropping or added scene. Pose and identity fidelity remain imperfect: the dash pair does not clearly swap the leading legs, several poses turn more frontally than requested, shield/sword placement in charge is not consistently a left-facing ram with trailing sword, and the down pose is taller than the requested half-height maximum. Small bright edge artifacts are visible beside the planted sword in death1 and rise; they were left untouched. The first corner of protect1 has alpha 1/255 rather than zero; generated alpha was preserved. These are delivered generation results, not a claim of exact production acceptance.

## Per-file generation record

### 15-charge1.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Charge, brace: a low sprinter's crouch, the shield raised in front like a ram, the rear foot pushing off; sword trailing low behind.
```

### 16-charge2.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Charge, dash A: running hard toward viewer-left, torso pitched about 20 degrees forward behind the raised shield, the front knee high, the rear leg extended behind; cape and plume streaming back.
```

### 17-charge3.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Charge, dash B: running hard toward viewer-left, torso pitched about 20 degrees forward behind raised shield; opposite legs to dash A: viewer-right knee high forward, viewer-left leg extended behind. Cape and plume streaming back. Alternates with dash A.
```

### 18-taunt1.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Taunt, call: standing tall, chest out, the sword raised upright in front of him, the shield swung out to the side.
```

### 19-taunt2.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Taunt, clash: he beats the flat of the sword against the face of the shield, head forward, shouting a challenge (the visor hides the face).
```

### 20-taunt3.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Taunt, defiance: feet wide, the shield held out wide, the sword pointed at the foe toward viewer-left, head up.
```

### 21-protect1.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Sanctuary, plant: dropping to one knee, the shield planted upright on the ground in front of him.
```

### 22-protect2.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Sanctuary, invoke: rising from the knee, the sword lifting toward the sky, the shield still planted.
```

### 23-protect3.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Sanctuary, hold: standing tall, the sword held straight up above the helmet, the shield braced upright on the ground at his side.
```

### 24-hurt.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Hurt: a flinch, head ducked, shoulders hunched, body recoiling a little backward (toward viewer-right); shield lifted slightly, sword dropping. Feet as in idle.
```

### 25-death1.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Death, stagger: dropped to one knee, the sword point driven into the ground to hold himself up, the shield sagging.
```

### 26-death2.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Death, collapse: falling sideways and forward, helmet tilting, the sword slipping from the hand, the shield sliding off the arm.
```

### 27-death3.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Death, down: lying on the ground on his side, at most half his standing height, the sword and shield on the ground beside him, plume down.
```

### 28-rise.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.
- Parameters: `referenced_image_paths` contains only that template; `transparent_background: true`.
- Output: **1360 × 1156, RGBA, 8 bits/channel**, PNG; copied unchanged.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: image 1, canvas-template.png. Produce exactly one Guardian animation pose on the SAME 1600x1360 transparent canvas. Preserve the template's exact character scale, stocky top-heavy proportions, armor part sizes, camera (three-quarter high angle about 35 degrees), facing viewer-left, painted soft shading, dark outline, palette and top lighting. Do not zoom, recenter or crop. Template standing silhouette is approximately x=411..1192, y=492..1180; preserve the same anatomical scale in the new pose. Ground contact stays at y=1180 near x=850: weight-bearing foot or downed body's ground contact. Generous transparent margins, all equipment inside canvas. Same silver plate with gold trim, huge pauldrons, short thick legs, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and brown belt. Short broad silver sword, gold crossguard, blue pommel gem in viewer-left hand; kite shield, gold rim, blue field and white shield-outline crest on viewer-right arm. Genuinely transparent background; preserve alpha. No ground shadow, motion blur, speed lines, glow, sparks, dust, effects, text or border. One character, one pose, never a sheet. Change only pose as specified: Rise (respawn): halfway up from one knee, pushing up with the sword arm, the shield arm bracing; about to stand.
```

