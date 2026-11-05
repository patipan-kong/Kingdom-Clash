# Frames 07–13 production report

Created only 07-attack1.png through 13-death3.png in this run. Other frames belong to the separate run and were not modified.

Each frame used exactly one built-in image generation call, editing ../ref/canvas-template.png with ../ref/soldier-reference.png as identity reference. transparent_background: true. Files were copied byte-for-byte from the tool outputs; no resizing, pixel scripts, background removal, matting, alpha repair, or other image processing was performed.

## Validation and limitations

All seven outputs are PNG, 1360 × 1156 pixels, RGBA (System.Drawing Format32bppArgb), with transparent corner alpha 0. The tool returned this resolution despite the exact 1600 × 1360 request. The aspect ratio matches the template, but literal pixel-scale and y=1180 ground-line requirements therefore are not met. No repair was attempted because the brief requires outputs exactly as returned and one generation per frame. Visual pose/position fidelity is generative rather than pixel-exact; 08 has the sword already forward of the helmet, 12 reads as a low collapse rather than fully sideways, and 13 retains the sword near/in the hand. Small dark contact marks appear under equipment in the death poses. These are tool-output limitations, not postprocessing changes.

## 07-attack1.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Sword attack, wind-up: weight back on rear foot, shoulders turned away, sword raised high and drawn back above and behind helmet; shield pulled in to chest.
```

## 08-attack2.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Sword attack, swing: blade at top of its arc, sweeping forward over helmet toward viewer-left, body turning forward; shield guarding chest; both feet planted.
```

## 09-attack3.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Sword attack, contact: forward lunge toward viewer-left, front foot stepped forward, torso leaning forward, sword arm fully extended with blade slashing down and forward at waist height toward viewer-left; shield tucked in at viewer-right.
```

## 10-hurt.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Hurt: flinch, head ducked, shoulders hunched, body recoiling a little backward toward viewer-right; shield lifted slightly, sword dropping. Feet as in idle.
```

## 11-death1.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Death, stagger: dropped to one knee, about three quarters of standing height (about 516 px tall), sword point dropping to ground, shield sagging, head bowed. Ground contact y=1180. Do not enlarge body parts.
```

## 12-death2.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Death, collapse: falling sideways and forward toward viewer-left, helmet tilting, sword slipping from right hand on viewer-left, shield sliding off left arm on viewer-right. Same body part sizes as idle, reduced overall height due to collapse. Ground contact y=1180.
```

## 13-death3.png

- Tool: image_gen.imagegen (built-in; callable image_gen__imagegen)
- Output: 1360 × 1156 PNG, RGBA
- transparent_background: true
- Edit target: ../ref/canvas-template.png
- Identity reference: ../ref/soldier-reference.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single animation frame for Azure Vanguard. Edit input image 1 (canvas-template.png); image 2 is identity reference only. Return a 1600x1360 PNG with genuine transparent background. Keep template canvas, framing and EXACT body scale: standing plume-to-sole 688 px, helmet 200 px wide. Ground contact y=1180, feet centred near x=866. Keep large empty space above and around the small soldier. Change only pose as specified below. Same stocky chibi infantryman, round silver great-helm with dark T visor and small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons and breastplate, dark chainmail elbows, brown bracers/gloves, brown belt square silver buckle, blue tabard panels, silver knees, brown boots. Short broad silver sword with round gold guard ALWAYS in RIGHT hand on VIEWER-LEFT; silver-rimmed blue kite shield with white shield-shaped crest ALWAYS on LEFT arm on VIEWER-RIGHT. Never mirror. Same 35-degree high-angle three-quarter camera, facing viewer-left/down-left; painted soft shading, dark outline, palette, top lighting. Helmet, torso, shoulders and shield stay exactly template size even in lowered poses; do not enlarge crouching or fallen body. One character, one pose. No gold armour trim, wings, gems, ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Nothing touches or leaves canvas.
Pose: Death, down: lying on ground on his side, at most half standing height (344 px high maximum), sword on ground beside right hand on viewer-left and shield on ground beside left arm on viewer-right, plume down. Same body part sizes as idle, never enlarged. Body ground contact y=1180, near original feet position.
```


