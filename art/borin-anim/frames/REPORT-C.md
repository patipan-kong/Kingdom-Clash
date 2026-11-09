# Run C report

Generated exactly once per frame with the built-in image generation tool. All three calls completed without refusals; no retries were made.

Each call edited `../ref/idle-template.png`, with `00-idle.png` and `../ref/borin-still.png` as identity references, in that order. Each used `transparent_background: true` and the absolute local reference paths. No other generated frame was used as an input.

All outputs were copied unchanged from the returned generated files. SHA-256 hashes of each saved file match its source. No resizing, compositing, background removal, alpha repair, or pixel processing was performed.

## Output verification and limitations

The tool returned **1254 × 1254** for every frame, despite the exact prompts requesting 1536 × 1536. PNG headers report 8-bit RGBA (colour type 6). The square shape and native alpha are retained, but these outputs do not meet the requested 1536-based pixel scale and ground coordinates. Visual inspection shows the requested sequence of kneeling, collapsing and side-lying poses. Exact anatomy, ground placement, and pose-height limits are not certified; in particular the final lying pose appears taller than the requested half-standing-height limit. Per the one-generation and unchanged-output requirements, no regeneration or correction was performed.

## 11-death1.png

- Tool: `image_gen.imagegen` (callable as `image_gen__imagegen`).
- Output pixel size: 1254 × 1254.
- Output mode: RGBA, 8 bits per channel, PNG with native alpha.
- Generation mode: edit; built-in tool; `transparent_background: true`.
- Generations: 1.
- SHA-256: `B6653C1BB45797282891E8028EC864550C80F8E24362FA73B3A1E9B6940482D7`.

Exact prompt:

```text
Use case: precise-object-edit. Asset type: one transparent game animation frame.
Input 1, ../ref/idle-template.png, is the EDIT TARGET: edit this approved 1536x1536 composition. Input 2, 00-idle.png, and input 3, ../ref/borin-still.png, are IDENTITY REFERENCES ONLY; do not use their canvas size or placement.
Change only Borin's pose to the requested animation pose. Preserve the exact character identity, anatomy, equipment, painted soft-shaded style, dark outlines, top lighting, colours and material details from the edit target. Borin is a short, extremely broad, powerful dwarf, almost as wide as tall, with barrel chest, thick arms and short thick legs. Bushy orange-red beard with a long front braid, heavy brow, bare head with a short orange hair tuft, cream-white fur mantle over both shoulders with small animal heads, blue steel pauldrons edged in gold, blue and gold plate armour, gold-trimmed blue front tabard, brown leather belt, thick gauntlets and bracers, heavy brown boots with gold trim. Long blue cape with a gold border on VIEWER-RIGHT. One enormous heavy two-handed warhammer with a steel head, blue and gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. NO shield and NO helmet.
Output exactly one character in one pose, never a sheet. Genuinely transparent background with native alpha; no painted backdrop or checkerboard. Keep the square 1536x1536 canvas. Preserve the target's game scale: his unbent standing head-to-soles height is approximately 590 pixels; posing reduces projected height, never rescale him to fill the image. Ground contact is y=1240, with feet anchored around x=950; leave the large transparent upper and left areas as in the template. All parts, including cape and hammer, must be at least 80 pixels inside every canvas edge. Same slightly elevated three-quarter camera, facing VIEWER-LEFT; never mirrored. Hammer head on VIEWER-LEFT, cape on VIEWER-RIGHT. Preserve short wide heavy dwarf proportions. No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects. The pose-specific hand placement overrides the normal two-fist idle grip.

POSE:
Death animation frame 1, stagger: Borin has dropped heavily to ONE KNEE, his projected body height about three quarters of standing height (about 440 px), not a standing squat. Head bowed low into his shoulders. The enormous hammer head is planted on the ground ahead toward viewer-left, lower edge on y=1240, haft upright, one gauntleted fist gripping it to prop his weight. His OTHER gauntleted fist is planted on the ground, also on y=1240. Keep the knee and weight-bearing foot on the same ground line and feet region around x=950. Heavy low sagging torso, wide thick limbs, cape draped behind toward viewer-right. Non-graphic, no wounds.
```

## 12-death2.png

- Tool: `image_gen.imagegen` (callable as `image_gen__imagegen`).
- Output pixel size: 1254 × 1254.
- Output mode: RGBA, 8 bits per channel, PNG with native alpha.
- Generation mode: edit; built-in tool; `transparent_background: true`.
- Generations: 1.
- SHA-256: `758DF35300F87C266C59D98CDBB6765BF0E1F65956B6F0902967DC8DD3FB530E`.

Exact prompt:

```text
Use case: precise-object-edit. Asset type: one transparent game animation frame.
Input 1, ../ref/idle-template.png, is the EDIT TARGET: edit this approved 1536x1536 composition. Input 2, 00-idle.png, and input 3, ../ref/borin-still.png, are IDENTITY REFERENCES ONLY; do not use their canvas size or placement.
Change only Borin's pose to the requested animation pose. Preserve the exact character identity, anatomy, equipment, painted soft-shaded style, dark outlines, top lighting, colours and material details from the edit target. Borin is a short, extremely broad, powerful dwarf, almost as wide as tall, with barrel chest, thick arms and short thick legs. Bushy orange-red beard with a long front braid, heavy brow, bare head with a short orange hair tuft, cream-white fur mantle over both shoulders with small animal heads, blue steel pauldrons edged in gold, blue and gold plate armour, gold-trimmed blue front tabard, brown leather belt, thick gauntlets and bracers, heavy brown boots with gold trim. Long blue cape with a gold border on VIEWER-RIGHT. One enormous heavy two-handed warhammer with a steel head, blue and gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. NO shield and NO helmet.
Output exactly one character in one pose, never a sheet. Genuinely transparent background with native alpha; no painted backdrop or checkerboard. Keep the square 1536x1536 canvas. Preserve the target's game scale: his unbent standing head-to-soles height is approximately 590 pixels; posing reduces projected height, never rescale him to fill the image. Ground contact is y=1240, with feet anchored around x=950; leave the large transparent upper and left areas as in the template. All parts, including cape and hammer, must be at least 80 pixels inside every canvas edge. Same slightly elevated three-quarter camera, facing VIEWER-LEFT; never mirrored. Hammer head on VIEWER-LEFT, cape on VIEWER-RIGHT. Preserve short wide heavy dwarf proportions. No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects. The pose-specific hand placement overrides the normal two-fist idle grip.

POSE:
Death animation frame 2, collapse: Borin is toppling FORWARD AND SIDEWAYS toward VIEWER-LEFT, between kneeling and lying, torso strongly diagonal and head falling left toward the ground. His body must visibly be falling, not standing or kneeling upright. Preserve exactly the same anatomical size and limb thickness as the idle target; do not miniaturize. His bent legs and boot region remain near x=950, lowest body contact at y=1240. The huge hammer is slipping free from his releasing hands and dropping toward the ground on viewer-left; its head stays left of the body and within 600 px of the feet midpoint. Hands released as required by this pose. Cape billows on viewer-right behind the falling body, still entirely inside safe margins. Non-graphic, no wounds.
```

## 13-death3.png

- Tool: `image_gen.imagegen` (callable as `image_gen__imagegen`).
- Output pixel size: 1254 × 1254.
- Output mode: RGBA, 8 bits per channel, PNG with native alpha.
- Generation mode: edit; built-in tool; `transparent_background: true`.
- Generations: 1.
- SHA-256: `20C21A49F0E31C22EF4AD1E72EB2CF4E9953517229977337F93D22712A8036CB`.

Exact prompt:

```text
Use case: precise-object-edit. Asset type: one transparent game animation frame.
Input 1, ../ref/idle-template.png, is the EDIT TARGET: edit this approved 1536x1536 composition. Input 2, 00-idle.png, and input 3, ../ref/borin-still.png, are IDENTITY REFERENCES ONLY; do not use their canvas size or placement.
Change only Borin's pose to the requested animation pose. Preserve the exact character identity, anatomy, equipment, painted soft-shaded style, dark outlines, top lighting, colours and material details from the edit target. Borin is a short, extremely broad, powerful dwarf, almost as wide as tall, with barrel chest, thick arms and short thick legs. Bushy orange-red beard with a long front braid, heavy brow, bare head with a short orange hair tuft, cream-white fur mantle over both shoulders with small animal heads, blue steel pauldrons edged in gold, blue and gold plate armour, gold-trimmed blue front tabard, brown leather belt, thick gauntlets and bracers, heavy brown boots with gold trim. Long blue cape with a gold border on VIEWER-RIGHT. One enormous heavy two-handed warhammer with a steel head, blue and gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. NO shield and NO helmet.
Output exactly one character in one pose, never a sheet. Genuinely transparent background with native alpha; no painted backdrop or checkerboard. Keep the square 1536x1536 canvas. Preserve the target's game scale: his unbent standing head-to-soles height is approximately 590 pixels; posing reduces projected height, never rescale him to fill the image. Ground contact is y=1240, with feet anchored around x=950; leave the large transparent upper and left areas as in the template. All parts, including cape and hammer, must be at least 80 pixels inside every canvas edge. Same slightly elevated three-quarter camera, facing VIEWER-LEFT; never mirrored. Hammer head on VIEWER-LEFT, cape on VIEWER-RIGHT. Preserve short wide heavy dwarf proportions. No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects. The pose-specific hand placement overrides the normal two-fist idle grip.

POSE:
Death animation frame 3, down: Borin lies motionless on his SIDE on the ground, head toward VIEWER-LEFT, boots toward viewer-right with feet region near x=950, his body oriented horizontally with bent short thick legs. The body is in full ground contact on y=1240 and its projected vertical height is AT MOST HALF the standing body height (at most 295 px). Achieve this by lying down, not shrinking the character: preserve the target's exact head size, heavy torso breadth, limb thickness, armour and equipment scale. The enormous hammer lies flat beside him on the ground, released from both hands, head toward VIEWER-LEFT and at most 600 px from the feet midpoint, haft horizontal. His gold-bordered blue cape spreads over his fallen body and toward viewer-right. Retain visible identifying beard, fur, armour and boots; slightly elevated same camera. Non-graphic, no wounds.
```




## Requested regeneration — 2026-11-09

### 13-death3.png

One successful built-in generation, no refusal or retry. Tool: `image_gen.imagegen` (`image_gen__imagegen`); image edit; `transparent_background: true`. Inputs in order: `../ref/idle-template.png` (edit target), `00-idle.png` and `../ref/borin-still.png` (identity references). Output: **1254 x 1254, PNG, 8-bit RGBA**. Saved unchanged and hash-identical to returned source. No pixel processing; `13-death3-first.png` unchanged.

Review: Borin lies flat on his side with cheek and body down, cape draped over him, hammer flat with its head on viewer-left. The returned silhouette appears wider than about 900 px and taller than 250 px, with ground contact below the requested line; exact size and placement requirements are not met by visual review. Preserved the single generated output per instruction.

Exact prompt:

```text
Use case: identity-preserve. Asset: one transparent painted game animation frame, 13-death3.png.
Input 1 ../ref/idle-template.png is the EDIT TARGET, edit that character and composition. Input 2 00-idle.png and input 3 ../ref/borin-still.png are identity references. Preserve exact Borin identity and equipment. Output one character in one pose on a square 1254 x 1254 transparent canvas with native alpha.
POSE: final down pose, Borin lying FLAT on his SIDE, motionless and fully settled low against the ground. Head toward VIEWER-LEFT, boots toward viewer-right. Head, cheek, beard, fur mantle, shoulders, torso, hips and short legs all lie horizontally along the ground; head is resting at ground level, arms relaxed down, no elbow props. Cape spreads flat over him toward viewer-right. This is the final prone side-lying frame of the death sequence, non-graphic, without injuries.
CRITICAL SILHOUETTE: the WHOLE figure including fur mantle, beard, head, armour and cape must fit in a shallow strip AT MOST 250 px TALL and approximately 900 px WIDE on the 1254 canvas. Bottom contact y=1012, top of all fur and body no higher than y=762. Stretch the pose horizontally by lying flat, preserving the same short dwarf anatomy and individual head/arm/equipment sizes as 00-idle.png. No upright, raised or sitting torso, no raised head, no high mound of fur. Keep large empty transparent upper canvas. Horizontal silhouette approximately x=160 to1060, no part within 65 px of edges. Feet remain near the original feet region x=776 with cape spreading farther right. Ground y=1012 and feet x=776 correspond to y=1240 and x=950 on the 1536 template.
The ONE warhammer lies FLAT on the ground beside him, released from both hands. Hammer head toward VIEWER-LEFT, haft horizontal pointing viewer-right, head within 490 px of feet midpoint (600 px in 1536 coordinates). Lay the hammer's broad face flat in the ground plane so its projected height fits the same low 250 px strip; keep enormous hammer's physical size matching 00-idle.png. Steel head, blue/gold face, gold bands and diamond emblem, dark steel haft, gold pommel.
Preserve short broad powerful dwarf with barrel torso and very short thick legs, heavy brow, short orange bare-head hair, bushy orange-red beard with front braid; cream-white fur mantle with small animal heads at shoulders; blue steel pauldrons edged in gold, blue/gold armour and front tabard, brown leather belt, plated gauntlets and bracers, heavy brown gold-trimmed boots; long blue cape with gold border. Same softly shaded painted style, dark outlines, top lighting, colours and materials. Same slightly elevated three-quarter camera as template; face toward viewer-left, never mirror.
No shield, helmet, ground shadow, visible floor, background, painted checkerboard, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters, limbs or objects. Preserve tool's genuine transparent alpha.
```

