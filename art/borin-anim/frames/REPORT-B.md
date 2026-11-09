# Run B report

Four built-in image generations, one per image; no refusals and no retries. Each call used `tools.image_gen__imagegen` (built-in `image_gen.imagegen`), with `transparent_background: true` and the same ordered `referenced_image_paths`:

1. `G:/work/ark/arkhero-wall/art/borin-anim/ref/idle-template.png` — edit target and canvas/scale master.
2. `G:/work/ark/arkhero-wall/art/borin-anim/frames/00-idle.png` — identity reference.
3. `G:/work/ark/arkhero-wall/art/borin-anim/ref/borin-still.png` — identity reference.

All four PNGs were copied byte-for-byte from the tool outputs into the requested filenames. SHA-256 comparisons confirmed each saved file matches its original. No resizing, background removal, matting, alpha repair, or pixel processing was performed. PNG IHDR headers were read without decoding or modifying pixels.

## Returned output properties and limitations

| File | Output pixel size | Mode | Tool |
|---|---|---|---|
| 07-attack1.png | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) | image_gen.imagegen |
| 08-attack2.png | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) | image_gen.imagegen |
| 09-attack3.png | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) | image_gen.imagegen |
| 10-hurt.png | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) | image_gen.imagegen |

The tool returned square 1254 × 1254 images despite the prompts requesting the template's 1536 × 1536 canvas. Therefore the outputs do not meet the exact canvas, y=1240 ground-line, or x=950 feet-midpoint requirements. They are retained exactly as returned under the one-generation/no-pixel-edit rule.

Visual review: all four show one broad orange-bearded dwarf, blue/gold armour, viewer-left hammer and viewer-right cape, with no added scene or impact effects. The raised-arm wind-up and drive are distinct, but 07 places the hammer more overhead than clearly behind the head. In 09 the cape extends viewer-right rather than clearly being thrown forward. Exact anatomical scale, foot registration, and every detailed pose invariant are not certified. No corrective generation or postprocessing was performed.

## Exact prompts

### 07-attack1.png

Tool: `image_gen.imagegen`; output: 1254 × 1254; mode: RGBA, 8 bits/channel.

```text
Use case: identity-preserve. Asset type: one transparent game animation sprite, Borin Run B.
Input images: image 1, G:/work/ark/arkhero-wall/art/borin-anim/ref/idle-template.png, is the EDIT TARGET and exact canvas/scale master. Image 2, G:/work/ark/arkhero-wall/art/borin-anim/frames/00-idle.png, is identity reference only, not a scale reference. Image 3, G:/work/ark/arkhero-wall/art/borin-anim/ref/borin-still.png, is identity reference only.
Edit only the pose of the character in image 1. Keep its square 1536x1536 transparent canvas, large empty upper and left space, game scale and placement. Do not enlarge, crop, or center the sprite on the canvas. His standing head-to-sole anatomical height is approximately 590 px, as in image 1; raised hammer does not count toward body height. Ground line y=1240; weight-bearing boot soles on y=1240; feet midpoint near x=950. Every part, including hammer and cape, at least 80 px inside every canvas edge.
Identity invariants: same short, extremely broad, heavy dwarf, barrel chest, thick arms and short thick legs, heavy brow, bare head with short orange hair, huge bushy orange-red beard and long front braid. Same white-cream fur mantle with small animal heads at both shoulders, blue steel pauldrons edged gold, blue and gold plate armour, gold-edged blue front tabard, brown leather belt, plated gauntlets/bracers, heavy brown boots with gold trim. Long blue cape with gold border behind him on VIEWER-RIGHT. Exactly the same huge two-handed warhammer, steel head with blue-and-gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. No shield or helmet. Same painted soft shading, dark outline, top lighting and palette.
Handedness/camera invariants: never mirror; always three-quarter facing VIEWER-LEFT, camera slightly above. Hammer head stays on the VIEWER-LEFT side of the composition; cape on viewer-right. Heavy, low, wide braced stance, enormous heavy hammer and lagging/sweeping cape.
Genuinely transparent alpha background, no backdrop, no ground shadow. Exactly one character and one pose. No motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects.
POSE: Heavy two-handed overhead hammer smash WIND-UP. Weight on rear (viewer-right) foot, torso arched back, both gauntleted fists gripping the haft, hammer lifted high above and behind his head with its head at the top, cape flaring to viewer-right. Keep the hammer head on the viewer-left side of the raised assembly, above the head, with the haft slanting back toward his hands. The whole short broad body loads a very heavy slow overhead movement; not a sword slash. Keep every part of the raised hammer well inside the canvas, at least 80 px.
```

### 08-attack2.png

Tool: `image_gen.imagegen`; output: 1254 × 1254; mode: RGBA, 8 bits/channel.

```text
Use case: identity-preserve. Asset type: one transparent game animation sprite, Borin Run B.
Input images: image 1, G:/work/ark/arkhero-wall/art/borin-anim/ref/idle-template.png, is the EDIT TARGET and exact canvas/scale master. Image 2, G:/work/ark/arkhero-wall/art/borin-anim/frames/00-idle.png, is identity reference only, not a scale reference. Image 3, G:/work/ark/arkhero-wall/art/borin-anim/ref/borin-still.png, is identity reference only.
Edit only the pose of the character in image 1. Keep its square 1536x1536 transparent canvas, large empty upper and left space, game scale and placement. Do not enlarge, crop, or center the sprite on the canvas. His standing head-to-sole anatomical height is approximately 590 px, as in image 1; raised hammer does not count toward body height. Ground line y=1240; weight-bearing boot soles on y=1240; feet midpoint near x=950. Every part, including hammer and cape, at least 80 px inside every canvas edge.
Identity invariants: same short, extremely broad, heavy dwarf, barrel chest, thick arms and short thick legs, heavy brow, bare head with short orange hair, huge bushy orange-red beard and long front braid. Same white-cream fur mantle with small animal heads at both shoulders, blue steel pauldrons edged gold, blue and gold plate armour, gold-edged blue front tabard, brown leather belt, plated gauntlets/bracers, heavy brown boots with gold trim. Long blue cape with gold border behind him on VIEWER-RIGHT. Exactly the same huge two-handed warhammer, steel head with blue-and-gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. No shield or helmet. Same painted soft shading, dark outline, top lighting and palette.
Handedness/camera invariants: never mirror; always three-quarter facing VIEWER-LEFT, camera slightly above. Hammer head stays on the VIEWER-LEFT side of the composition; cape on viewer-right. Heavy, low, wide braced stance, enormous heavy hammer and lagging/sweeping cape.
Genuinely transparent alpha background, no backdrop, no ground shadow. Exactly one character and one pose. No motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects.
POSE: Heavy two-handed overhead hammer smash DRIVE. Hammer at the top of its arc DIRECTLY OVER his head, tilting forward and starting down toward viewer-left. Both arms straight overhead and driving, torso beginning to pitch forward, front (viewer-left) foot stepping forward. The hammer is no longer behind him: this must read clearly as the forward-driving second pose, distinct from the backward-arched wind-up. Both fists firmly on the haft; enormous hammer head above and toward viewer-left. Preserve short broad proportions and the heavy slow commitment of the whole body.
```

### 09-attack3.png

Tool: `image_gen.imagegen`; output: 1254 × 1254; mode: RGBA, 8 bits/channel.

```text
Use case: identity-preserve. Asset type: one transparent game animation sprite, Borin Run B.
Input images: image 1, G:/work/ark/arkhero-wall/art/borin-anim/ref/idle-template.png, is the EDIT TARGET and exact canvas/scale master. Image 2, G:/work/ark/arkhero-wall/art/borin-anim/frames/00-idle.png, is identity reference only, not a scale reference. Image 3, G:/work/ark/arkhero-wall/art/borin-anim/ref/borin-still.png, is identity reference only.
Edit only the pose of the character in image 1. Keep its square 1536x1536 transparent canvas, large empty upper and left space, game scale and placement. Do not enlarge, crop, or center the sprite on the canvas. His standing head-to-sole anatomical height is approximately 590 px, as in image 1; raised hammer does not count toward body height. Ground line y=1240; weight-bearing boot soles on y=1240; feet midpoint near x=950. Every part, including hammer and cape, at least 80 px inside every canvas edge.
Identity invariants: same short, extremely broad, heavy dwarf, barrel chest, thick arms and short thick legs, heavy brow, bare head with short orange hair, huge bushy orange-red beard and long front braid. Same white-cream fur mantle with small animal heads at both shoulders, blue steel pauldrons edged gold, blue and gold plate armour, gold-edged blue front tabard, brown leather belt, plated gauntlets/bracers, heavy brown boots with gold trim. Long blue cape with gold border behind him on VIEWER-RIGHT. Exactly the same huge two-handed warhammer, steel head with blue-and-gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. No shield or helmet. Same painted soft shading, dark outline, top lighting and palette.
Handedness/camera invariants: never mirror; always three-quarter facing VIEWER-LEFT, camera slightly above. Hammer head stays on the VIEWER-LEFT side of the composition; cape on viewer-right. Heavy, low, wide braced stance, enormous heavy hammer and lagging/sweeping cape.
Genuinely transparent alpha background, no backdrop, no ground shadow. Exactly one character and one pose. No motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects.
POSE: Heavy two-handed overhead hammer smash CONTACT. Deep committed crouching lunge toward VIEWER-LEFT, front knee bent deeply, torso bowed far forward, both arms fully extended toward viewer-left with both fists on the haft. The enormous hammer is slammed down and forward, its head resting on the invisible ground at y=1240 ahead of the front foot, at most 600 px from feet midpoint x=950. Keep the hammer head fully within the canvas. Cape thrown forward while originating behind the viewer-right shoulder. Same anatomical size as the template, lowered through crouching and bending, never miniaturized. Depict only the physical pose and ground contact with no effects, no ground rendering, no dust, cracks or impact marks.
```

### 10-hurt.png

Tool: `image_gen.imagegen`; output: 1254 × 1254; mode: RGBA, 8 bits/channel.

```text
Use case: identity-preserve. Asset type: one transparent game animation sprite, Borin Run B.
Input images: image 1, G:/work/ark/arkhero-wall/art/borin-anim/ref/idle-template.png, is the EDIT TARGET and exact canvas/scale master. Image 2, G:/work/ark/arkhero-wall/art/borin-anim/frames/00-idle.png, is identity reference only, not a scale reference. Image 3, G:/work/ark/arkhero-wall/art/borin-anim/ref/borin-still.png, is identity reference only.
Edit only the pose of the character in image 1. Keep its square 1536x1536 transparent canvas, large empty upper and left space, game scale and placement. Do not enlarge, crop, or center the sprite on the canvas. His standing head-to-sole anatomical height is approximately 590 px, as in image 1; raised hammer does not count toward body height. Ground line y=1240; weight-bearing boot soles on y=1240; feet midpoint near x=950. Every part, including hammer and cape, at least 80 px inside every canvas edge.
Identity invariants: same short, extremely broad, heavy dwarf, barrel chest, thick arms and short thick legs, heavy brow, bare head with short orange hair, huge bushy orange-red beard and long front braid. Same white-cream fur mantle with small animal heads at both shoulders, blue steel pauldrons edged gold, blue and gold plate armour, gold-edged blue front tabard, brown leather belt, plated gauntlets/bracers, heavy brown boots with gold trim. Long blue cape with gold border behind him on VIEWER-RIGHT. Exactly the same huge two-handed warhammer, steel head with blue-and-gold face, gold bands and gold diamond emblem, dark steel haft and gold pommel. No shield or helmet. Same painted soft shading, dark outline, top lighting and palette.
Handedness/camera invariants: never mirror; always three-quarter facing VIEWER-LEFT, camera slightly above. Hammer head stays on the VIEWER-LEFT side of the composition; cape on viewer-right. Heavy, low, wide braced stance, enormous heavy hammer and lagging/sweeping cape.
Genuinely transparent alpha background, no backdrop, no ground shadow. Exactly one character and one pose. No motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border or extra objects.
POSE: HURT FLINCH: head ducked into the fur shoulders, shoulders hunched, body recoiling a little backward toward VIEWER-RIGHT. Hammer lowered across the body with its enormous head on viewer-left. For this hurt pose only, one gauntleted fist comes OFF the haft and is raised toward the face defensively; the other fist continues holding the haft. Feet stay exactly as in the idle template, same wide planted position, soles on y=1240 and feet midpoint x=950. Keep the same short broad anatomical size; show a compact flinch without wounds or effects.
```


