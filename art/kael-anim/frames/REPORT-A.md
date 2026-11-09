# Run A report

Generated only 01-walk1.png through 06-walk6.png. Exactly six built-in image generation calls: one per frame, with no retries. Every call edited ../ref/idle-template.png as the target and used ../ref/kael-still.png as identity reference, with transparent_background: true.

All six saved files are unchanged copies of their returned PNGs; SHA-256 comparisons against the tool originals matched. No resizing, cropping, background removal, matting, alpha repair, or pixel processing was performed. Only PNG IHDR metadata and file hashes were read for verification.

## Compliance limitations

The tool returned **1254 x 1254**, rather than the explicitly requested 1536 x 1536, for every frame. Therefore these files do not satisfy the brief's literal pixel-size, y=1240 ground-line, x=950 feet midpoint, or exact idle pixel-scale requirements. They retain approximately the template's relative composition, but exact scale and registration are not certified. The originals were preserved as requested rather than corrected.

Visual review: left-facing character, blue scarf to viewer-right, two low axes, one pose per file and substantial empty canvas are retained. Frames 04 and 05 do not clearly exchange the leg phase relative to 01 and 02. Frame 03's lifted foot reads behind the body rather than clearly passing underneath. Frame 06 visibly exchanges the support leg, but a smooth six-frame loop is not established. Frame 01's rear foot appears lifted rather than clearly on its toes. Exact costume/proportion identity and foot placement cannot be claimed. No additional generations were made because the task explicitly allowed one per frame.

## 01-walk1.png

- Tool: image_gen.imagegen (built-in; functions tool name image_gen__imagegen).
- Intent/mode: edit (identity-preserve); PNG RGBA, 8 bits per channel (PNG color type 6).
- Output pixel size: 1254 x 1254.
- transparent_background: true.
- Edit target: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png
- Identity reference: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png
- Unmodified source: C:\Users\patip\.codex\generated_images\01a1bf11-64dd-75a0-9f91-a9e1b9f4da20\exec-a4379034-fd1a-47fa-bf5e-f4fd5c549c1d.png

Exact prompt:

```text
Use case: identity-preserve.
Asset: one transparent game animation frame of Kael, march cycle.
Input image 1 (idle-template.png) is the EDIT TARGET, approved idle master at game scale. Input image 2 (kael-still.png) is identity reference only. Edit image 1, never enlarge/reframe to image 2.
Canvas and registration LOCK: output 1536x1536 square, genuine transparent background. Preserve the master's exact small character scale, anatomy dimensions, head size, limb lengths, slim waist, narrow shoulders and weapon sizes. Standing hair-to-boot height approximately 590 px on this 1536 canvas; hair around y=650 and weight-bearing sole on y=1240, feet midpoint x=950. Preserve the large empty space above and left. Pose bobbing is slight joint bending, NEVER a scale change. Every element including both axes and scarf stays at least 80 px inside canvas edges.
Identity LOCK: same lean athletic slim young warrior, long limbs and runner's build; short spiky silver-white hair, fierce focused face, dark brow; bare arms with identical leather/steel bracers and gauntlets; identical dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee/shin guards, brown boots with steel toe caps. Exactly two matching one-handed battle axes, one per fist, wide double-crescent steel blades, gold studs, short dark wooden hafts. No shield or helmet. Match every costume detail, face, hair, proportions, palette, soft painted shading, dark outlines and top lighting from the master.
Camera/handedness LOCK: same slightly elevated three-quarter view toward viewer-left, always facing left; viewer-left arm is front arm, never mirrored. Long BLUE scarf draped over shoulders streams to viewer-right.
Movement: fast light springy loping run toward viewer-left, slight forward torso lean, both axes low and out to sides, gentle arm swing, agile aggressive energy. Only change the pose specified below.
No shadow, background, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text or border. Exactly one character, one pose, no sheet.
Frame 01 CONTACT: viewer-left (front/near) foot just planted ahead toward viewer-left, heel down on y=1240; other foot behind toward viewer-right supported on toes. Body slightly lower from modest knee flexion. Feet midpoint remains x=950.
```

## 02-walk2.png

- Tool: image_gen.imagegen (built-in; functions tool name image_gen__imagegen).
- Intent/mode: edit (identity-preserve); PNG RGBA, 8 bits per channel (PNG color type 6).
- Output pixel size: 1254 x 1254.
- transparent_background: true.
- Edit target: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png
- Identity reference: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png
- Unmodified source: C:\Users\patip\.codex\generated_images\01a1bf11-64dd-75a0-9f91-a9e1b9f4da20\exec-d8e9bd03-d982-4e76-9fb3-8f02538fb01d.png

Exact prompt:

```text
Use case: identity-preserve.
Asset: one transparent game animation frame of Kael, march cycle.
Input image 1 (idle-template.png) is the EDIT TARGET, approved idle master at game scale. Input image 2 (kael-still.png) is identity reference only. Edit image 1, never enlarge/reframe to image 2.
Canvas and registration LOCK: output 1536x1536 square, genuine transparent background. Preserve the master's exact small character scale, anatomy dimensions, head size, limb lengths, slim waist, narrow shoulders and weapon sizes. Standing hair-to-boot height approximately 590 px on this 1536 canvas; hair around y=650 and weight-bearing sole on y=1240, feet midpoint x=950. Preserve the large empty space above and left. Pose bobbing is slight joint bending, NEVER a scale change. Every element including both axes and scarf stays at least 80 px inside canvas edges.
Identity LOCK: same lean athletic slim young warrior, long limbs and runner's build; short spiky silver-white hair, fierce focused face, dark brow; bare arms with identical leather/steel bracers and gauntlets; identical dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee/shin guards, brown boots with steel toe caps. Exactly two matching one-handed battle axes, one per fist, wide double-crescent steel blades, gold studs, short dark wooden hafts. No shield or helmet. Match every costume detail, face, hair, proportions, palette, soft painted shading, dark outlines and top lighting from the master.
Camera/handedness LOCK: same slightly elevated three-quarter view toward viewer-left, always facing left; viewer-left arm is front arm, never mirrored. Long BLUE scarf draped over shoulders streams to viewer-right.
Movement: fast light springy loping run toward viewer-left, slight forward torso lean, both axes low and out to sides, gentle arm swing, agile aggressive energy. Only change the pose specified below.
No shadow, background, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text or border. Exactly one character, one pose, no sheet.
Frame 02 DOWN: weight settling onto the viewer-left front/near foot, front knee bent, body at its lowest with a small natural bob; rear viewer-right foot starting to lift off its toes. Weight-bearing sole on y=1240; feet midpoint x=950. Keep the same limb lengths and scale.
```

## 03-walk3.png

- Tool: image_gen.imagegen (built-in; functions tool name image_gen__imagegen).
- Intent/mode: edit (identity-preserve); PNG RGBA, 8 bits per channel (PNG color type 6).
- Output pixel size: 1254 x 1254.
- transparent_background: true.
- Edit target: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png
- Identity reference: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png
- Unmodified source: C:\Users\patip\.codex\generated_images\01a1bf11-64dd-75a0-9f91-a9e1b9f4da20\exec-2126c155-de75-4128-81bd-674ac476c88e.png

Exact prompt:

```text
Use case: identity-preserve.
Asset: one transparent game animation frame of Kael, march cycle.
Input image 1 (idle-template.png) is the EDIT TARGET, approved idle master at game scale. Input image 2 (kael-still.png) is identity reference only. Edit image 1, never enlarge/reframe to image 2.
Canvas and registration LOCK: output 1536x1536 square, genuine transparent background. Preserve the master's exact small character scale, anatomy dimensions, head size, limb lengths, slim waist, narrow shoulders and weapon sizes. Standing hair-to-boot height approximately 590 px on this 1536 canvas; hair around y=650 and weight-bearing sole on y=1240, feet midpoint x=950. Preserve the large empty space above and left. Pose bobbing is slight joint bending, NEVER a scale change. Every element including both axes and scarf stays at least 80 px inside canvas edges.
Identity LOCK: same lean athletic slim young warrior, long limbs and runner's build; short spiky silver-white hair, fierce focused face, dark brow; bare arms with identical leather/steel bracers and gauntlets; identical dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee/shin guards, brown boots with steel toe caps. Exactly two matching one-handed battle axes, one per fist, wide double-crescent steel blades, gold studs, short dark wooden hafts. No shield or helmet. Match every costume detail, face, hair, proportions, palette, soft painted shading, dark outlines and top lighting from the master.
Camera/handedness LOCK: same slightly elevated three-quarter view toward viewer-left, always facing left; viewer-left arm is front arm, never mirrored. Long BLUE scarf draped over shoulders streams to viewer-right.
Movement: fast light springy loping run toward viewer-left, slight forward torso lean, both axes low and out to sides, gentle arm swing, agile aggressive energy. Only change the pose specified below.
No shadow, background, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text or border. Exactly one character, one pose, no sheet.
Frame 03 PASSING: viewer-left front/near leg is supporting and straight with sole on y=1240; rear viewer-right foot swinging forward under the body, airborne, knee flexed. Body at its highest in the subtle cycle bob. Feet midpoint x=950, same anatomy dimensions and scale.
```

## 04-walk4.png

- Tool: image_gen.imagegen (built-in; functions tool name image_gen__imagegen).
- Intent/mode: edit (identity-preserve); PNG RGBA, 8 bits per channel (PNG color type 6).
- Output pixel size: 1254 x 1254.
- transparent_background: true.
- Edit target: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png
- Identity reference: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png
- Unmodified source: C:\Users\patip\.codex\generated_images\01a1bf11-64dd-75a0-9f91-a9e1b9f4da20\exec-0d4fc484-3b94-48df-8fe3-7a7997e9eff9.png

Exact prompt:

```text
Use case: identity-preserve.
Asset: one transparent game animation frame of Kael, march cycle.
Input image 1 (idle-template.png) is the EDIT TARGET, approved idle master at game scale. Input image 2 (kael-still.png) is identity reference only. Edit image 1, never enlarge/reframe to image 2.
Canvas and registration LOCK: output 1536x1536 square, genuine transparent background. Preserve the master's exact small character scale, anatomy dimensions, head size, limb lengths, slim waist, narrow shoulders and weapon sizes. Standing hair-to-boot height approximately 590 px on this 1536 canvas; hair around y=650 and weight-bearing sole on y=1240, feet midpoint x=950. Preserve the large empty space above and left. Pose bobbing is slight joint bending, NEVER a scale change. Every element including both axes and scarf stays at least 80 px inside canvas edges.
Identity LOCK: same lean athletic slim young warrior, long limbs and runner's build; short spiky silver-white hair, fierce focused face, dark brow; bare arms with identical leather/steel bracers and gauntlets; identical dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee/shin guards, brown boots with steel toe caps. Exactly two matching one-handed battle axes, one per fist, wide double-crescent steel blades, gold studs, short dark wooden hafts. No shield or helmet. Match every costume detail, face, hair, proportions, palette, soft painted shading, dark outlines and top lighting from the master.
Camera/handedness LOCK: same slightly elevated three-quarter view toward viewer-left, always facing left; viewer-left arm is front arm, never mirrored. Long BLUE scarf draped over shoulders streams to viewer-right.
Movement: fast light springy loping run toward viewer-left, slight forward torso lean, both axes low and out to sides, gentle arm swing, agile aggressive energy. Only change the pose specified below.
No shadow, background, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text or border. Exactly one character, one pose, no sheet.
Frame 04 OPPOSITE CONTACT: viewer-right far leg now steps ahead toward viewer-left, heel planted on y=1240; viewer-left near leg extends behind toward viewer-right on its toes. Body slightly lower with modest knee flexion. Clearly exchange leg phase from frame 01 without mirroring the character. Feet midpoint x=950.
```

## 05-walk5.png

- Tool: image_gen.imagegen (built-in; functions tool name image_gen__imagegen).
- Intent/mode: edit (identity-preserve); PNG RGBA, 8 bits per channel (PNG color type 6).
- Output pixel size: 1254 x 1254.
- transparent_background: true.
- Edit target: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png
- Identity reference: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png
- Unmodified source: C:\Users\patip\.codex\generated_images\01a1bf11-64dd-75a0-9f91-a9e1b9f4da20\exec-99ae8046-e98b-4be2-b081-d2f61cefd096.png

Exact prompt:

```text
Use case: identity-preserve.
Asset: one transparent game animation frame of Kael, march cycle.
Input image 1 (idle-template.png) is the EDIT TARGET, approved idle master at game scale. Input image 2 (kael-still.png) is identity reference only. Edit image 1, never enlarge/reframe to image 2.
Canvas and registration LOCK: output 1536x1536 square, genuine transparent background. Preserve the master's exact small character scale, anatomy dimensions, head size, limb lengths, slim waist, narrow shoulders and weapon sizes. Standing hair-to-boot height approximately 590 px on this 1536 canvas; hair around y=650 and weight-bearing sole on y=1240, feet midpoint x=950. Preserve the large empty space above and left. Pose bobbing is slight joint bending, NEVER a scale change. Every element including both axes and scarf stays at least 80 px inside canvas edges.
Identity LOCK: same lean athletic slim young warrior, long limbs and runner's build; short spiky silver-white hair, fierce focused face, dark brow; bare arms with identical leather/steel bracers and gauntlets; identical dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee/shin guards, brown boots with steel toe caps. Exactly two matching one-handed battle axes, one per fist, wide double-crescent steel blades, gold studs, short dark wooden hafts. No shield or helmet. Match every costume detail, face, hair, proportions, palette, soft painted shading, dark outlines and top lighting from the master.
Camera/handedness LOCK: same slightly elevated three-quarter view toward viewer-left, always facing left; viewer-left arm is front arm, never mirrored. Long BLUE scarf draped over shoulders streams to viewer-right.
Movement: fast light springy loping run toward viewer-left, slight forward torso lean, both axes low and out to sides, gentle arm swing, agile aggressive energy. Only change the pose specified below.
No shadow, background, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text or border. Exactly one character, one pose, no sheet.
Frame 05 OPPOSITE DOWN: weight settling onto the viewer-right far leg planted ahead toward viewer-left, its knee bent, body at its lowest with a small natural bob. Rear viewer-left near foot starting to lift off its toes behind toward viewer-right. Supporting sole on y=1240, feet midpoint x=950. Keep same anatomy dimensions and scale.
```

## 06-walk6.png

- Tool: image_gen.imagegen (built-in; functions tool name image_gen__imagegen).
- Intent/mode: edit (identity-preserve); PNG RGBA, 8 bits per channel (PNG color type 6).
- Output pixel size: 1254 x 1254.
- transparent_background: true.
- Edit target: G:/work/ark/arkhero-wall/art/kael-anim/ref/idle-template.png
- Identity reference: G:/work/ark/arkhero-wall/art/kael-anim/ref/kael-still.png
- Unmodified source: C:\Users\patip\.codex\generated_images\01a1bf11-64dd-75a0-9f91-a9e1b9f4da20\exec-32b3ce60-4bc5-4abc-b7e4-e3802f0aabe0.png

Exact prompt:

```text
Use case: identity-preserve.
Asset: one transparent game animation frame of Kael, march cycle.
Input image 1 (idle-template.png) is the EDIT TARGET, approved idle master at game scale. Input image 2 (kael-still.png) is identity reference only. Edit image 1, never enlarge/reframe to image 2.
Canvas and registration LOCK: output 1536x1536 square, genuine transparent background. Preserve the master's exact small character scale, anatomy dimensions, head size, limb lengths, slim waist, narrow shoulders and weapon sizes. Standing hair-to-boot height approximately 590 px on this 1536 canvas; hair around y=650 and weight-bearing sole on y=1240, feet midpoint x=950. Preserve the large empty space above and left. Pose bobbing is slight joint bending, NEVER a scale change. Every element including both axes and scarf stays at least 80 px inside canvas edges.
Identity LOCK: same lean athletic slim young warrior, long limbs and runner's build; short spiky silver-white hair, fierce focused face, dark brow; bare arms with identical leather/steel bracers and gauntlets; identical dark steel-grey and brown leather sleeveless vest, gold studs, brown belt, dark brown trousers, steel knee/shin guards, brown boots with steel toe caps. Exactly two matching one-handed battle axes, one per fist, wide double-crescent steel blades, gold studs, short dark wooden hafts. No shield or helmet. Match every costume detail, face, hair, proportions, palette, soft painted shading, dark outlines and top lighting from the master.
Camera/handedness LOCK: same slightly elevated three-quarter view toward viewer-left, always facing left; viewer-left arm is front arm, never mirrored. Long BLUE scarf draped over shoulders streams to viewer-right.
Movement: fast light springy loping run toward viewer-left, slight forward torso lean, both axes low and out to sides, gentle arm swing, agile aggressive energy. Only change the pose specified below.
No shadow, background, motion blur, impact/speed lines, glow, sparks, dust, cracks, blood, text or border. Exactly one character, one pose, no sheet.
Frame 06 OPPOSITE PASSING: viewer-right far leg supports the body, straight with sole on y=1240; rear viewer-left near foot swings forward under the body, airborne with knee flexed, preparing to plant ahead in frame 01. Body at its highest in the subtle cycle bob. Feet midpoint x=950. Pose must loop smoothly back into frame 01 contact. Keep same anatomy dimensions and scale.
```


