# Run B report

Generated once per image using built-in `image_gen.imagegen` (`tools.image_gen__imagegen`), edit mode, `transparent_background: true`. No refusals or retries. Each call used these inputs in order:

1. `../ref/idle-template.png` — edit target.
2. `00-idle.png` — identity reference.
3. `../ref/roland-still.png` — identity reference.

Outputs were copied byte-for-byte from the returned PNG files; no resizing, pixel edits, background removal, matting or alpha repair was performed. No other project files were edited.

## Output verification and limitations

All four returned images are **1254×1254**, **RGBA** (System.Drawing reports `Format32bppArgb`), despite the prompts requesting 1536×1536. Thus the requested absolute pixel coordinates and exact canvas size were not achieved. The returned images were retained unchanged as instructed. Visual review also shows pose deviations: 07 has an open free hand; 08 carries the blade below the face rather than in front of it; 09 places the sword hand on viewer-left and the cape trails behind rather than forward. The images should not be considered fully compliant production frames. No extra generation was made because the task specifies one per image.

## 07-attack1.png

Tool: `image_gen.imagegen` (built-in), edit mode.
Output: 1254×1254 pixels, RGBA PNG.
Parameters: `transparent_background: true`; `referenced_image_paths` = the three inputs listed above.

Exact prompt:

```text
Use case: identity-preserve. Asset: one painted game animation frame. Edit input 1 (../ref/idle-template.png), the approved 1536x1536 master canvas. Input 2 (00-idle.png) and input 3 (../ref/roland-still.png) are identity references only. Change only the pose as specified. Output one square 1536x1536 image with genuinely transparent background and original alpha; retain large empty margins and exact game scale. Standing hair-to-boot height about 740 pixels, never enlarge to fill canvas. Ground contact y=1240; feet midpoint near x=950. All parts including sword and cape at least 80 pixels inside every canvas edge.
Preserve identical Roland: short swept-back brown hair, short brown beard, stern face, steel plate pauldrons with gold trim (viewer-right shoulder large and rounded), steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed steel bracers and gauntlets, brown belt with round gold buckle, plated greaves with gold knee guards and steel boots. Long blue cape with gold border and gold emblem on viewer-right. Steel longsword, gold cross-guard, brown grip. No shield or helmet. Match painted soft shading, dark outline, top lighting, palette, proportions and slightly elevated camera exactly.
Never mirror: face and three-quarter body toward viewer-left, sword in hand on VIEWER-RIGHT, free gauntleted hand on VIEWER-LEFT, cape viewer-right. Balanced agile disciplined knight with medium-wide stance and weight on balls of feet. No ground shadow, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text, border, scenery or other subjects. Exactly one character and one pose, never a sheet.
Pose: Diagonal sword slash, wind-up: weight on rear foot, torso twisted back toward viewer-right while still facing viewer-left, sword raised high behind viewer-right shoulder, blade pointing up and back, free arm thrown out for balance, cape flaring. This is the high viewer-right preparation for a fluid diagonal cut across the body to low viewer-left.
```

## 08-attack2.png

Tool: `image_gen.imagegen` (built-in), edit mode.
Output: 1254×1254 pixels, RGBA PNG.
Parameters: `transparent_background: true`; `referenced_image_paths` = the three inputs listed above.

Exact prompt:

```text
Use case: identity-preserve. Asset: one painted game animation frame. Edit input 1 (../ref/idle-template.png), the approved 1536x1536 master canvas. Input 2 (00-idle.png) and input 3 (../ref/roland-still.png) are identity references only. Change only the pose as specified. Output one square 1536x1536 image with genuinely transparent background and original alpha; retain large empty margins and exact game scale. Standing hair-to-boot height about 740 pixels, never enlarge to fill canvas. Ground contact y=1240; feet midpoint near x=950. All parts including sword and cape at least 80 pixels inside every canvas edge.
Preserve identical Roland: short swept-back brown hair, short brown beard, stern face, steel plate pauldrons with gold trim (viewer-right shoulder large and rounded), steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed steel bracers and gauntlets, brown belt with round gold buckle, plated greaves with gold knee guards and steel boots. Long blue cape with gold border and gold emblem on viewer-right. Steel longsword, gold cross-guard, brown grip. No shield or helmet. Match painted soft shading, dark outline, top lighting, palette, proportions and slightly elevated camera exactly.
Never mirror: face and three-quarter body toward viewer-left, sword in hand on VIEWER-RIGHT, free gauntleted hand on VIEWER-LEFT, cape viewer-right. Balanced agile disciplined knight with medium-wide stance and weight on balls of feet. No ground shadow, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text, border, scenery or other subjects. Exactly one character and one pose, never a sheet.
Pose: Diagonal sword slash, drive: sword sweeping diagonally down and forward from above his head toward viewer-left, blade at about 45 degrees in front of his face, front foot stepping forward, torso turning into the cut. Blade is in front of him, NOT behind his shoulder. Clearly athletic, quick whole-body diagonal cut, distinct from the raised-behind wind-up.
```

## 09-attack3.png

Tool: `image_gen.imagegen` (built-in), edit mode.
Output: 1254×1254 pixels, RGBA PNG.
Parameters: `transparent_background: true`; `referenced_image_paths` = the three inputs listed above.

Exact prompt:

```text
Use case: identity-preserve. Asset: one painted game animation frame. Edit input 1 (../ref/idle-template.png), the approved 1536x1536 master canvas. Input 2 (00-idle.png) and input 3 (../ref/roland-still.png) are identity references only. Change only the pose as specified. Output one square 1536x1536 image with genuinely transparent background and original alpha; retain large empty margins and exact game scale. Standing hair-to-boot height about 740 pixels, never enlarge to fill canvas. Ground contact y=1240; feet midpoint near x=950. All parts including sword and cape at least 80 pixels inside every canvas edge.
Preserve identical Roland: short swept-back brown hair, short brown beard, stern face, steel plate pauldrons with gold trim (viewer-right shoulder large and rounded), steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed steel bracers and gauntlets, brown belt with round gold buckle, plated greaves with gold knee guards and steel boots. Long blue cape with gold border and gold emblem on viewer-right. Steel longsword, gold cross-guard, brown grip. No shield or helmet. Match painted soft shading, dark outline, top lighting, palette, proportions and slightly elevated camera exactly.
Never mirror: face and three-quarter body toward viewer-left, sword in hand on VIEWER-RIGHT, free gauntleted hand on VIEWER-LEFT, cape viewer-right. Balanced agile disciplined knight with medium-wide stance and weight on balls of feet. No ground shadow, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text, border, scenery or other subjects. Exactly one character and one pose, never a sheet.
Pose: Diagonal sword slash, contact/end of cut: deep lunge toward viewer-left, front knee bent deep over front foot, torso bowed forward, sword arm fully extended. Sword low and forward, blade pointing down toward viewer-left about 20 degrees below horizontal; tip at most 560 pixels from feet midpoint. Cape thrown forward. Athletic disciplined whole-body follow-through, same body size as master.
```

## 10-hurt.png

Tool: `image_gen.imagegen` (built-in), edit mode.
Output: 1254×1254 pixels, RGBA PNG.
Parameters: `transparent_background: true`; `referenced_image_paths` = the three inputs listed above.

Exact prompt:

```text
Use case: identity-preserve. Asset: one painted game animation frame. Edit input 1 (../ref/idle-template.png), the approved 1536x1536 master canvas. Input 2 (00-idle.png) and input 3 (../ref/roland-still.png) are identity references only. Change only the pose as specified. Output one square 1536x1536 image with genuinely transparent background and original alpha; retain large empty margins and exact game scale. Standing hair-to-boot height about 740 pixels, never enlarge to fill canvas. Ground contact y=1240; feet midpoint near x=950. All parts including sword and cape at least 80 pixels inside every canvas edge.
Preserve identical Roland: short swept-back brown hair, short brown beard, stern face, steel plate pauldrons with gold trim (viewer-right shoulder large and rounded), steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed steel bracers and gauntlets, brown belt with round gold buckle, plated greaves with gold knee guards and steel boots. Long blue cape with gold border and gold emblem on viewer-right. Steel longsword, gold cross-guard, brown grip. No shield or helmet. Match painted soft shading, dark outline, top lighting, palette, proportions and slightly elevated camera exactly.
Never mirror: face and three-quarter body toward viewer-left, sword in hand on VIEWER-RIGHT, free gauntleted hand on VIEWER-LEFT, cape viewer-right. Balanced agile disciplined knight with medium-wide stance and weight on balls of feet. No ground shadow, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text, border, scenery or other subjects. Exactly one character and one pose, never a sheet.
Pose: Hurt flinch: head turned and ducked, shoulders hunched, body recoiling a little backward toward viewer-right; sword lowered in viewer-right hand, free viewer-left hand raised toward face. Feet in the same placement as idle master. No injury marks or blood.
```



## 08-attack2.png regeneration — 2026-11-08

Overwritten using built-in `image_gen.imagegen`, editing `../ref/idle-template.png` with `00-idle.png` and `../ref/roland-still.png` as identity references; `transparent_background: true`. One generation, no refusal or retry. Returned PNG copied byte-for-byte, with original alpha and no pixel processing. Output: 1254×1254, RGBA. Blade now nearly horizontal at face height ahead toward viewer-left, free fist swept back, forward weight shift and trailing cape. Limitations: requested 1536 canvas/absolute placement was not achieved, and sword hand is drawn on viewer-left rather than maintaining the brief's viewer-right handedness.

Exact prompt:

```text
Use case: identity-preserve. Edit image 1, ../ref/idle-template.png, as one animation frame; images 2 (00-idle.png) and 3 (../ref/roland-still.png) are identity references only.
Change only the pose to the HIGH drive phase of a diagonal sword cut. The sword is at the HIGH point of the downswing, carried OUT IN FRONT OF HIS FACE at HEAD HEIGHT, blade nearly HORIZONTAL toward viewer-left, with its tip slightly higher than the hilt and well ABOVE the shoulder line, far ahead of his face. The entire blade is high, clearly above chest and hip. Sword arm raised and driving forward, hand on the viewer-right side gripping the sword at about face height. Blade extends leftward across the space ahead of his face, never behind his head. Torso rotates and leans into the cut toward viewer-left, weight shifting onto the bent front foot, rear foot pushing off. Free gauntleted fist and arm thrown BACK toward viewer-right for balance, cape lagging behind toward viewer-right. Athletic disciplined whole-body motion. This is between a blade-behind-head wind-up and a low forward follow-through; freeze the blade high before it descends. Do not reproduce the low idle guard.
Preserve the exact Roland identity, body size, proportions, painted soft shading, dark outline, top lighting, palette and slightly elevated three-quarter camera of the edit target: swept-back short brown hair, short brown beard, stern face, gold-trimmed steel plate, large rounded viewer-right pauldron, blue surcoat and knee-length tabard over black cloth, gold-trimmed steel bracers and gauntlets, brown belt and round gold buckle, gold knee guards, plated greaves and steel boots, blue cape with gold border and emblem, steel longsword with gold crossguard and brown grip. No helmet or shield. Always face viewer-left, never mirror; sword stays in the same sword hand as the template despite the raised pose.
Canvas 1536x1536, genuinely transparent background with original alpha. Retain template game scale: standing hair-to-sole height about 740 px, ground contact y=1240, feet midpoint near x=950. Keep generous empty space above and left, never enlarge character to fill canvas. Every part, sword and cape included, at least 80 px inside edges. Exactly one character, one pose. No ground shadow, background, motion blur, slash arc, speed lines, glow, sparks, dust, blood, text, border or extra objects. Save output unchanged.
```

