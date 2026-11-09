# Run B report

Generated only the four Run B frames, with exactly one built-in generation per frame. Each call edited `../ref/idle-template.png` and supplied `../ref/kael-still.png` as identity reference. All calls used `transparent_background: true`. Returned PNGs were copied byte-for-byte into this folder. No resizing, pixel scripts, background removal, matting, alpha repair, or regeneration was performed.

## Output metadata

| File | Tool | Pixel size | Mode |
| --- | --- | --- | --- |
| 07-attack1.png | image_gen.imagegen (built-in; edit) | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) |
| 08-attack2.png | image_gen.imagegen (built-in; edit) | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) |
| 09-attack3.png | image_gen.imagegen (built-in; edit) | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) |
| 10-hurt.png | image_gen.imagegen (built-in; edit) | 1254 × 1254 | RGBA, 8 bits/channel (PNG color type 6) |

## Validation and limitations

The tool returned square 1254 × 1254 images, despite each prompt explicitly requesting the 1536 × 1536 template canvas, unchanged character scale, y=1240 ground line and x=950 feet midpoint. Therefore these raw outputs do **not** satisfy the brief's exact pixel scale and registration requirements. They were preserved as returned to honor the one-generation and no-processing constraints. PNG header inspection confirmed RGBA format; no pixel processing was used.

Visual review: 07 has wide separated arms/axes; 08 brings both axes forward and inward; 09 has overlapping axes with crossed hafts and a deep lunge; 10 has a ducked flinch and lowered axes. Exact anatomy, boot placement and dimensions are not certified as identical to idle. In 09 the scarf still trails viewer-right rather than visibly throwing forward. In 10 the recoil/turned-away head and exact idle boot placement are not fully matched. These are raw generated results, not a claim of full brief compliance.

## Exact prompts and tool parameters

### 07-attack1.png

Tool: `image_gen.imagegen` (callable name `image_gen__imagegen`).
Parameters: `transparent_background: true`; `referenced_image_paths: ["G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png", "G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png"]`.
Output: 1254 × 1254, RGBA, 8 bits/channel.
Exact prompt:

```text
Use case: identity-preserve. Asset type: single transparent game animation frame for Kael, Azure Berserker.
Input image 1 is the EDIT TARGET: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png, the approved 1536x1536 idle master. Input image 2 is IDENTITY REFERENCE ONLY: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png. Edit the first image, preserving its canvas, character scale, design and rendering; change only the pose requested below.
CRITICAL SCALE AND REGISTRATION: square 1536x1536 canvas, retaining the huge transparent empty area above and on the left exactly as in the target. Kael remains in the lower-right portion, NOT centered or enlarged. Same anatomical dimensions as idle: standing hair top to boot soles about 590px, hair near y=650, boot soles ground line y=1240, feet midpoint x=950. Preserve the same head size, limb lengths, narrow waist and slim runner's build. Pose flexion may lower the head but must NEVER scale up or thicken the character. Feet remain registered near the idle boot positions, approximately x=790 and x=1130, with ground contact y=1240; only pose-specific stepping/lunging adjustments may occur while keeping the feet midpoint near x=950. Every part of axes/scarf/body at least 80px from all canvas edges. No cropping, no reframing, no zoom.
IDENTITY: identical lean athletic slim young warrior, not broad/short/bulky; short spiky silver-white hair, fierce focused face and dark brow; bare arms, leather and steel bracers/gauntlets; dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown boots with steel toe caps. Exactly TWO matching light one-handed battle axes, one in each fist, wide double-crescent steel blades with gold studs, short dark wooden hafts. Same blue shoulder scarf/cloak. Same soft painted shading, dark outlines, top lighting and palette. No shield or helmet.
HANDEDNESS/CAMERA: three-quarter facing viewer-left, viewer-left arm is front arm, never mirror. Scarf trails toward viewer-right (it may whip forward during the specified contact pose). Same slightly elevated camera.
ATTACK MECHANICS: fast agile CROSSING DOUBLE-AXE SCISSOR SLASH, both axes used simultaneously in a lateral horizontal sweep from wide apart to crossed X in front of the chest. No overhead smash or single diagonal cut.
BACKGROUND: genuinely transparent alpha, preserving tool transparency, no backdrop. Exactly one character, one pose, no sheet. No ground shadow, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text, watermark or border.

FRAME 07-attack1.png — Slash WIND-UP: torso twisted back, BOTH arms flung wide apart and outstretched, viewer-left front axe pulled back far out to viewer-left, other axe far out to viewer-right, both blades open and separated. Weight on rear foot, low wide agile stance, scarf flaring toward viewer-right. This is preparation for the horizontal scissor slash; axes are not raised overhead. Keep the same body scale and foot registration as the edit target.
```

### 08-attack2.png

Tool: `image_gen.imagegen` (callable name `image_gen__imagegen`).
Parameters: `transparent_background: true`; `referenced_image_paths: ["G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png", "G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png"]`.
Output: 1254 × 1254, RGBA, 8 bits/channel.
Exact prompt:

```text
Use case: identity-preserve. Asset type: single transparent game animation frame for Kael, Azure Berserker.
Input image 1 is the EDIT TARGET: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png, the approved 1536x1536 idle master. Input image 2 is IDENTITY REFERENCE ONLY: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png. Edit the first image, preserving its canvas, character scale, design and rendering; change only the pose requested below.
CRITICAL SCALE AND REGISTRATION: square 1536x1536 canvas, retaining the huge transparent empty area above and on the left exactly as in the target. Kael remains in the lower-right portion, NOT centered or enlarged. Same anatomical dimensions as idle: standing hair top to boot soles about 590px, hair near y=650, boot soles ground line y=1240, feet midpoint x=950. Preserve the same head size, limb lengths, narrow waist and slim runner's build. Pose flexion may lower the head but must NEVER scale up or thicken the character. Feet remain registered near the idle boot positions, approximately x=790 and x=1130, with ground contact y=1240; only pose-specific stepping/lunging adjustments may occur while keeping the feet midpoint near x=950. Every part of axes/scarf/body at least 80px from all canvas edges. No cropping, no reframing, no zoom.
IDENTITY: identical lean athletic slim young warrior, not broad/short/bulky; short spiky silver-white hair, fierce focused face and dark brow; bare arms, leather and steel bracers/gauntlets; dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown boots with steel toe caps. Exactly TWO matching light one-handed battle axes, one in each fist, wide double-crescent steel blades with gold studs, short dark wooden hafts. Same blue shoulder scarf/cloak. Same soft painted shading, dark outlines, top lighting and palette. No shield or helmet.
HANDEDNESS/CAMERA: three-quarter facing viewer-left, viewer-left arm is front arm, never mirror. Scarf trails toward viewer-right (it may whip forward during the specified contact pose). Same slightly elevated camera.
ATTACK MECHANICS: fast agile CROSSING DOUBLE-AXE SCISSOR SLASH, both axes used simultaneously in a lateral horizontal sweep from wide apart to crossed X in front of the chest. No overhead smash or single diagonal cut.
BACKGROUND: genuinely transparent alpha, preserving tool transparency, no backdrop. Exactly one character, one pose, no sheet. No ground shadow, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text, watermark or border.

FRAME 08-attack2.png — Slash DRIVE: BOTH arms sweep inward simultaneously in front of the chest in a lateral horizontal scissor sweep. The two axes are mid-arc and ABOUT TO MEET directly in front of him, separated by a small gap, not yet crossed. Arms are close together and reaching forward toward viewer-left, clearly NO LONGER spread wide as in wind-up. Front foot stepping forward, torso turning into the cut, rear leg braced, scarf whipping toward viewer-right. Both fists visible holding their own axe, same two axe designs. Keep same anatomical size, slim proportions, ground line and feet midpoint as idle.
```

### 09-attack3.png

Tool: `image_gen.imagegen` (callable name `image_gen__imagegen`).
Parameters: `transparent_background: true`; `referenced_image_paths: ["G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png", "G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png"]`.
Output: 1254 × 1254, RGBA, 8 bits/channel.
Exact prompt:

```text
Use case: identity-preserve. Asset type: single transparent game animation frame for Kael, Azure Berserker.
Input image 1 is the EDIT TARGET: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png, the approved 1536x1536 idle master. Input image 2 is IDENTITY REFERENCE ONLY: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png. Edit the first image, preserving its canvas, character scale, design and rendering; change only the pose requested below.
CRITICAL SCALE AND REGISTRATION: square 1536x1536 canvas, retaining the huge transparent empty area above and on the left exactly as in the target. Kael remains in the lower-right portion, NOT centered or enlarged. Same anatomical dimensions as idle: standing hair top to boot soles about 590px, hair near y=650, boot soles ground line y=1240, feet midpoint x=950. Preserve the same head size, limb lengths, narrow waist and slim runner's build. Pose flexion may lower the head but must NEVER scale up or thicken the character. Feet remain registered near the idle boot positions, approximately x=790 and x=1130, with ground contact y=1240; only pose-specific stepping/lunging adjustments may occur while keeping the feet midpoint near x=950. Every part of axes/scarf/body at least 80px from all canvas edges. No cropping, no reframing, no zoom.
IDENTITY: identical lean athletic slim young warrior, not broad/short/bulky; short spiky silver-white hair, fierce focused face and dark brow; bare arms, leather and steel bracers/gauntlets; dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown boots with steel toe caps. Exactly TWO matching light one-handed battle axes, one in each fist, wide double-crescent steel blades with gold studs, short dark wooden hafts. Same blue shoulder scarf/cloak. Same soft painted shading, dark outlines, top lighting and palette. No shield or helmet.
HANDEDNESS/CAMERA: three-quarter facing viewer-left, viewer-left arm is front arm, never mirror. Scarf trails toward viewer-right (it may whip forward during the specified contact pose). Same slightly elevated camera.
ATTACK MECHANICS: fast agile CROSSING DOUBLE-AXE SCISSOR SLASH, both axes used simultaneously in a lateral horizontal sweep from wide apart to crossed X in front of the chest. No overhead smash or single diagonal cut.
BACKGROUND: genuinely transparent alpha, preserving tool transparency, no backdrop. Exactly one character, one pose, no sheet. No ground shadow, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text, watermark or border.

FRAME 09-attack3.png — Slash CONTACT: deep agile lunge toward viewer-left, front knee bent deeply and rear leg extended, same limb lengths and narrow body as idle. BOTH arms extended forward toward viewer-left AT CHEST HEIGHT and CROSSED in front of the chest; both hands each hold their own axe. The TWO matching axes are clearly CROSSED IN A VISIBLE X directly in front of him at chest height, with their blades overlapping at the center of the X. Show two diagonal hafts intersecting and overlapping blade silhouettes so the crossing reads unmistakably, resulting from a horizontal lateral scissor slash. No axe raised above the head. Scarf whipped/thrown forward during contact while attached over shoulders, keeping handedness and viewer-left facing. Same idle anatomical size, same y=1240 ground contact and feet midpoint near x=950.
```

### 10-hurt.png

Tool: `image_gen.imagegen` (callable name `image_gen__imagegen`).
Parameters: `transparent_background: true`; `referenced_image_paths: ["G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png", "G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png"]`.
Output: 1254 × 1254, RGBA, 8 bits/channel.
Exact prompt:

```text
Use case: identity-preserve. Asset type: single transparent game animation frame for Kael, Azure Berserker.
Input image 1 is the EDIT TARGET: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png, the approved 1536x1536 idle master. Input image 2 is IDENTITY REFERENCE ONLY: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png. Edit the first image, preserving its canvas, character scale, design and rendering; change only the pose requested below.
CRITICAL SCALE AND REGISTRATION: square 1536x1536 canvas, retaining the huge transparent empty area above and on the left exactly as in the target. Kael remains in the lower-right portion, NOT centered or enlarged. Same anatomical dimensions as idle: standing hair top to boot soles about 590px, hair near y=650, boot soles ground line y=1240, feet midpoint x=950. Preserve the same head size, limb lengths, narrow waist and slim runner's build. Pose flexion may lower the head but must NEVER scale up or thicken the character. Feet remain registered near the idle boot positions, approximately x=790 and x=1130, with ground contact y=1240; only pose-specific stepping/lunging adjustments may occur while keeping the feet midpoint near x=950. Every part of axes/scarf/body at least 80px from all canvas edges. No cropping, no reframing, no zoom.
IDENTITY: identical lean athletic slim young warrior, not broad/short/bulky; short spiky silver-white hair, fierce focused face and dark brow; bare arms, leather and steel bracers/gauntlets; dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown boots with steel toe caps. Exactly TWO matching light one-handed battle axes, one in each fist, wide double-crescent steel blades with gold studs, short dark wooden hafts. Same blue shoulder scarf/cloak. Same soft painted shading, dark outlines, top lighting and palette. No shield or helmet.
HANDEDNESS/CAMERA: three-quarter facing viewer-left, viewer-left arm is front arm, never mirror. Scarf trails toward viewer-right (it may whip forward during the specified contact pose). Same slightly elevated camera.
ATTACK MECHANICS: fast agile CROSSING DOUBLE-AXE SCISSOR SLASH, both axes used simultaneously in a lateral horizontal sweep from wide apart to crossed X in front of the chest. No overhead smash or single diagonal cut.
BACKGROUND: genuinely transparent alpha, preserving tool transparency, no backdrop. Exactly one character, one pose, no sheet. No ground shadow, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text, watermark or border.

FRAME 10-hurt.png — HURT FLINCH, not an attack: shoulders hunched, head ducked and turned slightly away from the hit while the overall character still faces viewer-left, torso recoils a little backward toward viewer-right. One forearm raised across the body defensively, but both axes dropped low toward his sides, each still gripped in its own fist. Scarf streams viewer-right. FEET EXACTLY AS IN IDLE: identical boot positions and planted wide stance, same feet midpoint x=950, ground line y=1240. Same head size, long limbs, slim proportions and body scale as the approved template; only hunch/duck/recoil changes. No wound, blood, hit effects or additional objects.
```


