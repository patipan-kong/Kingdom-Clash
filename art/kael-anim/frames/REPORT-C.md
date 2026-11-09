# Run C report

Generated Run C only, exactly one built-in generation per frame. Each call used `image_gen.imagegen` (`tools.image_gen__imagegen`) with `transparent_background: true` and the same ordered references:

1. `G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png` — edit target, approved idle master.
2. `G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png` — identity reference only.

All files were copied byte-for-byte from the returned PNGs. No resizing, cropping, pixel processing, background removal, matting, alpha repair, or regeneration was performed. Metadata inspection read PNG headers only.

## Output verification and limitations

All three outputs are **1254 × 1254**, PNG **RGBA**, 8 bits per channel (PNG color type 6), with the tool's original alpha preserved. The prompts requested 1536 × 1536, but the tool returned 1254 × 1254. Consequently these files do **not** meet the template's exact pixel canvas, physical character size, y=1240 ground registration, or x=950 feet registration requirements. They are preserved exactly as returned, following the one-generation and no-pixel-edit constraints. No claim of exact scale/registration compliance is made.

Visual review: 11 shows the bowed one-knee stagger with an axe used as support; 12 shows a forward-left lean with released axes but remains close to a kneel rather than a pronounced sideways topple; 13 shows the side-lying pose and two grounded axes. Identity, proportions and equipment are generative approximations, not pixel-identical reproductions. These are raw outputs requiring review, not certified animation-ready registered frames.

## 11-death1.png

- Tool: `image_gen.imagegen` (built-in image generation, edit).
- Output: 1254 × 1254 px, RGBA, 8-bit PNG.
- Generation count: 1.
- Source: `C:\Users\patip\.codex\generated_images\01a1bf11-64fe-7523-b59a-eb75bdecac9a\exec-96f7fe85-735e-47cc-9466-72ed485422ab.png`.
- Parameters: `transparent_background: true`; `referenced_image_paths` as listed above; no `num_last_images_to_include`.

Exact prompt:

```text
Use case: identity-preserve.
Asset type: a single transparent game animation sprite, Run C death frame.
Input images: Image 1 (idle-template.png) is the EDIT TARGET, the approved idle master on a 1536x1536 canvas. Image 2 (kael-still.png) is identity reference ONLY. Edit Image 1, do not substitute Image 2's framing.
Preserve the exact same Kael, same slim runner's build, long limbs, narrow waist, same head size, limb lengths and widths, clothing and weapon dimensions as the idle master. Short spiky SILVER-WHITE hair, fierce face and dark brow, bare athletic arms, leather and steel bracers and gauntlets, dark steel-grey and brown leather sleeveless vest with gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown leather boots with steel toe caps. Long BLUE SCARF over shoulders, trailing to viewer-right. TWO identical short-haft one-handed axes, wide double-crescent steel blades with gold studs, dark wooden hafts. No shield or helmet. Match the painted soft shading, dark outlines, palette and top lighting exactly.
Canvas and scale are critical: keep a square 1536x1536 transparent canvas and the SAME physical character size as the master (about 590 px hair-to-sole standing equivalent). Do not enlarge the figure to fill the image or to compensate for crouching/lying down. The reduction in vertical height must come from bending or lying down only, never shorter limbs or a scaled figure. Retain extensive empty transparent space above and to viewer-left. Ground contact line y=1240; feet remain anchored around the master's foot region, feet midpoint near x=950. Pose changes may articulate the legs but must retain this registration. Every part including scarf and axes at least 80 px inside all canvas edges.
Same camera slightly above, three-quarter toward viewer-left, never mirrored; viewer-left arm is the front arm. Face viewer-left even with bowed or fallen head.
Exactly one character, one pose, two axes, no sprite sheet. Genuinely transparent background, preserve alpha. No ground shadow, backdrop, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra props or extra limbs.

Frame: 11-death1.png. Death, stagger: Kael has dropped to one knee, his kneeling silhouette about three quarters of idle's standing body height (about 440 px, from roughly y=800 to ground y=1240). Head bowed toward viewer-left, shoulders slumped. One axe planted blade-down on the ground at y=1240 to prop him up, his hand still gripping its short haft; the other axe hanging limply low from his other hand. One knee touches the ground, other boot planted, same foot anchor region as idle. Scarf falls and trails toward viewer-right. Preserve the master's exact physical anatomy and equipment scale.
```

## 12-death2.png

- Tool: `image_gen.imagegen` (built-in image generation, edit).
- Output: 1254 × 1254 px, RGBA, 8-bit PNG.
- Generation count: 1.
- Source: `C:\Users\patip\.codex\generated_images\01a1bf11-64fe-7523-b59a-eb75bdecac9a\exec-2a23f512-f444-42b4-a2d2-634229046d75.png`.
- Parameters: `transparent_background: true`; `referenced_image_paths` as listed above; no `num_last_images_to_include`.

Exact prompt:

```text
Use case: identity-preserve.
Asset type: a single transparent game animation sprite, Run C death frame.
Input images: Image 1 (idle-template.png) is the EDIT TARGET, the approved idle master on a 1536x1536 canvas. Image 2 (kael-still.png) is identity reference ONLY. Edit Image 1, do not substitute Image 2's framing.
Preserve the exact same Kael, same slim runner's build, long limbs, narrow waist, same head size, limb lengths and widths, clothing and weapon dimensions as the idle master. Short spiky SILVER-WHITE hair, fierce face and dark brow, bare athletic arms, leather and steel bracers and gauntlets, dark steel-grey and brown leather sleeveless vest with gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown leather boots with steel toe caps. Long BLUE SCARF over shoulders, trailing to viewer-right. TWO identical short-haft one-handed axes, wide double-crescent steel blades with gold studs, dark wooden hafts. No shield or helmet. Match the painted soft shading, dark outlines, palette and top lighting exactly.
Canvas and scale are critical: keep a square 1536x1536 transparent canvas and the SAME physical character size as the master (about 590 px hair-to-sole standing equivalent). Do not enlarge the figure to fill the image or to compensate for crouching/lying down. The reduction in vertical height must come from bending or lying down only, never shorter limbs or a scaled figure. Retain extensive empty transparent space above and to viewer-left. Ground contact line y=1240; feet remain anchored around the master's foot region, feet midpoint near x=950. Pose changes may articulate the legs but must retain this registration. Every part including scarf and axes at least 80 px inside all canvas edges.
Same camera slightly above, three-quarter toward viewer-left, never mirrored; viewer-left arm is the front arm. Face viewer-left even with bowed or fallen head.
Exactly one character, one pose, two axes, no sprite sheet. Genuinely transparent background, preserve alpha. No ground shadow, backdrop, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra props or extra limbs.

Frame: 12-death2.png. Death, collapse: Kael topples forward and sideways toward viewer-left from a kneeling stagger. Torso and bowed head tilt strongly down and left, one arm reaching weakly toward the ground. Both short-haft axes are slipping from his opening hands, falling low beside him. The blue scarf billows behind toward viewer-right. Legs fold naturally underneath and behind him with boots still in the idle foot anchor region near x=950; the lowest body/boot contact stays on ground y=1240. Preserve the exact physical body and equipment size from idle, same head, limb lengths, narrow torso and slim build; no enlargement to fill the empty canvas. A clear transitional collapse, lower than the kneeling frame and not yet fully lying flat. Face stays viewer-left, same camera. Return a 1536x1536 PNG with real alpha transparency.
```

## 13-death3.png

- Tool: `image_gen.imagegen` (built-in image generation, edit).
- Output: 1254 × 1254 px, RGBA, 8-bit PNG.
- Generation count: 1.
- Source: `C:\Users\patip\.codex\generated_images\01a1bf11-64fe-7523-b59a-eb75bdecac9a\exec-f7cb0438-6cf8-4011-9b5f-49113f5d84b4.png`.
- Parameters: `transparent_background: true`; `referenced_image_paths` as listed above; no `num_last_images_to_include`.

Exact prompt:

```text
Use case: identity-preserve.
Asset type: a single transparent game animation sprite, Run C death frame.
Input images: Image 1 (idle-template.png) is the EDIT TARGET, the approved idle master on a 1536x1536 canvas. Image 2 (kael-still.png) is identity reference ONLY. Edit Image 1, do not substitute Image 2's framing.
Preserve the exact same Kael, same slim runner's build, long limbs, narrow waist, same head size, limb lengths and widths, clothing and weapon dimensions as the idle master. Short spiky SILVER-WHITE hair, fierce face and dark brow, bare athletic arms, leather and steel bracers and gauntlets, dark steel-grey and brown leather sleeveless vest with gold studs, brown belt, dark brown trousers, steel knee and shin guards, brown leather boots with steel toe caps. Long BLUE SCARF over shoulders, trailing to viewer-right. TWO identical short-haft one-handed axes, wide double-crescent steel blades with gold studs, dark wooden hafts. No shield or helmet. Match the painted soft shading, dark outlines, palette and top lighting exactly.
Canvas and scale are critical: keep a square 1536x1536 transparent canvas and the SAME physical character size as the master (about 590 px hair-to-sole standing equivalent). Do not enlarge the figure to fill the image or to compensate for crouching/lying down. The reduction in vertical height must come from bending or lying down only, never shorter limbs or a scaled figure. Retain extensive empty transparent space above and to viewer-left. Ground contact line y=1240; feet remain anchored around the master's foot region, feet midpoint near x=950. Pose changes may articulate the legs but must retain this registration. Every part including scarf and axes at least 80 px inside all canvas edges.
Same camera slightly above, three-quarter toward viewer-left, never mirrored; viewer-left arm is the front arm. Face viewer-left even with bowed or fallen head.
Exactly one character, one pose, two axes, no sprite sheet. Genuinely transparent background, preserve alpha. No ground shadow, backdrop, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra props or extra limbs.

Frame: 13-death3.png. Death, down: Kael lies lifeless on his side on the invisible ground, head at viewer-left and feet at viewer-right. Head faces viewer-left, body seen from the same slightly elevated three-quarter camera. Preserve the master's exact physical body size, head size, limb lengths, narrow waist and slim proportions; rotate/fold the body into a lying pose without enlarging or shrinking him. Lying silhouette at most half the idle standing height, no taller than 295 px on the requested 1536 canvas. Body contact on y=1240, feet remain near the idle foot region with foot midpoint near x=950; body extends horizontally toward viewer-left from those feet. Both matching double-crescent axes now released and lying flat beside him on the ground, each within 650 px of the feet midpoint, complete and clearly visible. The blue scarf is spread over his back and body, its loose end extending toward viewer-right. No shadow or drawn ground. Keep the large empty transparent area above. Return the template-size 1536x1536 PNG with real alpha transparency.
```

