# Run A report

Generated only Run A: six separate calls, one generation per frame, using the built-in `image_gen.imagegen` tool (`tools.image_gen__imagegen`). Each call independently edited `../ref/idle-template.png` and supplied `00-idle.png` as the supporting identity reference, with `transparent_background: true`.

All six original PNG files were copied byte-for-byte to the requested filenames. No scripts were run on pixels; no resizing, background removal, alpha repair, compositing, or other pixel processing was performed. Only PNG IHDR metadata was read to establish dimensions and mode.

## Output limitation and visual review

The tool returned **1254×1254**, rather than the requested 1536×1536, for all six frames. All have PNG color type 6, bit depth 8: **RGBA**. The original generated alpha is preserved. Therefore the requested literal 1536-canvas coordinates and pixel scale are not satisfied. No corrective resizing was performed because outputs must be saved exactly as returned.

Visual inspection of the tool previews shows one knight per frame, spear on viewer-left, shield on viewer-right, upright spear, matching palette, and clear canvas margins. Exact alternating anatomical leg roles, precise ground registration, identical equipment proportions, and seamless loop continuity are not reliably established by these independent generations; the down poses in particular appear similar across halves. These outputs should be reviewed as generated candidates rather than claimed to satisfy every animation constraint precisely. No additional generations were made, in accordance with one generation per frame.

## 01-walk1.png

- Tool: `image_gen.imagegen` (built-in; edit mode).
- Output: 1254×1254 pixels, 8-bit RGBA PNG.
- Parameters: `transparent_background: true`; `referenced_image_paths`: `G:/work/ark/arkhero-wall/art/elite-anim/ref/idle-template.png`, `G:/work/ark/arkhero-wall/art/elite-anim/frames/00-idle.png`.
- Exact prompt:

```text
Use case: identity-preserve. Edit the first reference, ../ref/idle-template.png, into ONE game animation frame of the SAME Crimson Elite Soldier. The second reference, 00-idle.png, is supporting identity reference only. Output a 1536x1536 square PNG with genuine transparent background. Preserve the exact template character size and placement: spear tip to soles about 760 pixels, helmet about 150 pixels wide, weight-bearing boot sole on y=1240, feet midpoint near x=900. Preserve generous transparent empty space above and to the left; do not enlarge or recenter the knight to fill the canvas. Keep every part at least 80 pixels from all canvas edges.
Keep identical heavy broad proportions, dark gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, dark red tabard and cape panels, brown leather belt/bracers/gauntlets. Identical LONG dark wood spear with red wrapping and broad steel leaf blade; identical very large dark steel kite shield with red heart-shaped field and black eagle crest. Match template painted soft shading, dark outline, top lighting and palette exactly.
Always face three-quarter toward VIEWER-LEFT, same slightly elevated camera. Never mirror: spear in anatomical RIGHT hand on VIEWER-LEFT; shield strapped to anatomical LEFT arm on VIEWER-RIGHT. Heavy slow march toward viewer-left, shield up and nearly fixed, spear upright with tip leaning slightly viewer-left by at most 15 degrees and butt swinging slightly. Feet closer than guard stance during contacts, short strides, very small body bob. Preserve body size even when knees bend. Exactly one character, one pose. No ground shadow, background, motion blur, speed lines, glow, sparks, dust, blood, text, border or sheet.

Frame pose: 01-walk1.png — Contact: viewer-left (front) foot just planted a short step toward viewer-left, heel down on y=1240; other foot behind on its toes. Body slightly lower. Clear short marching contact pose.
```

## 02-walk2.png

- Tool: `image_gen.imagegen` (built-in; edit mode).
- Output: 1254×1254 pixels, 8-bit RGBA PNG.
- Parameters: `transparent_background: true`; `referenced_image_paths`: `G:/work/ark/arkhero-wall/art/elite-anim/ref/idle-template.png`, `G:/work/ark/arkhero-wall/art/elite-anim/frames/00-idle.png`.
- Exact prompt:

```text
Use case: identity-preserve. Edit the first reference, ../ref/idle-template.png, into ONE game animation frame of the SAME Crimson Elite Soldier. The second reference, 00-idle.png, is supporting identity reference only. Output a 1536x1536 square PNG with genuine transparent background. Preserve the exact template character size and placement: spear tip to soles about 760 pixels, helmet about 150 pixels wide, weight-bearing boot sole on y=1240, feet midpoint near x=900. Preserve generous transparent empty space above and to the left; do not enlarge or recenter the knight to fill the canvas. Keep every part at least 80 pixels from all canvas edges.
Keep identical heavy broad proportions, dark gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, dark red tabard and cape panels, brown leather belt/bracers/gauntlets. Identical LONG dark wood spear with red wrapping and broad steel leaf blade; identical very large dark steel kite shield with red heart-shaped field and black eagle crest. Match template painted soft shading, dark outline, top lighting and palette exactly.
Always face three-quarter toward VIEWER-LEFT, same slightly elevated camera. Never mirror: spear in anatomical RIGHT hand on VIEWER-LEFT; shield strapped to anatomical LEFT arm on VIEWER-RIGHT. Heavy slow march toward viewer-left, shield up and nearly fixed, spear upright with tip leaning slightly viewer-left by at most 15 degrees and butt swinging slightly. Feet closer than guard stance during contacts, short strides, very small body bob. Preserve body size even when knees bend. Exactly one character, one pose. No ground shadow, background, motion blur, speed lines, glow, sparks, dust, blood, text, border or sheet.

Frame pose: 02-walk2.png — Down: weight settling onto the viewer-left front foot, knees bent, body at its lowest with only a small bob; rear viewer-right foot starting to lift. Front supporting boot stays on y=1240.
```

## 03-walk3.png

- Tool: `image_gen.imagegen` (built-in; edit mode).
- Output: 1254×1254 pixels, 8-bit RGBA PNG.
- Parameters: `transparent_background: true`; `referenced_image_paths`: `G:/work/ark/arkhero-wall/art/elite-anim/ref/idle-template.png`, `G:/work/ark/arkhero-wall/art/elite-anim/frames/00-idle.png`.
- Exact prompt:

```text
Use case: identity-preserve. Edit the first reference, ../ref/idle-template.png, into ONE game animation frame of the SAME Crimson Elite Soldier. The second reference, 00-idle.png, is supporting identity reference only. Output a 1536x1536 square PNG with genuine transparent background. Preserve the exact template character size and placement: spear tip to soles about 760 pixels, helmet about 150 pixels wide, weight-bearing boot sole on y=1240, feet midpoint near x=900. Preserve generous transparent empty space above and to the left; do not enlarge or recenter the knight to fill the canvas. Keep every part at least 80 pixels from all canvas edges.
Keep identical heavy broad proportions, dark gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, dark red tabard and cape panels, brown leather belt/bracers/gauntlets. Identical LONG dark wood spear with red wrapping and broad steel leaf blade; identical very large dark steel kite shield with red heart-shaped field and black eagle crest. Match template painted soft shading, dark outline, top lighting and palette exactly.
Always face three-quarter toward VIEWER-LEFT, same slightly elevated camera. Never mirror: spear in anatomical RIGHT hand on VIEWER-LEFT; shield strapped to anatomical LEFT arm on VIEWER-RIGHT. Heavy slow march toward viewer-left, shield up and nearly fixed, spear upright with tip leaning slightly viewer-left by at most 15 degrees and butt swinging slightly. Feet closer than guard stance during contacts, short strides, very small body bob. Preserve body size even when knees bend. Exactly one character, one pose. No ground shadow, background, motion blur, speed lines, glow, sparks, dust, blood, text, border or sheet.

Frame pose: 03-walk3.png — Passing: rear viewer-right foot swings forward under the body, passing the supporting viewer-left leg; supporting leg straight, supporting sole on y=1240, body at its highest with only a small bob. Clearly distinct passing pose.
```

## 04-walk4.png

- Tool: `image_gen.imagegen` (built-in; edit mode).
- Output: 1254×1254 pixels, 8-bit RGBA PNG.
- Parameters: `transparent_background: true`; `referenced_image_paths`: `G:/work/ark/arkhero-wall/art/elite-anim/ref/idle-template.png`, `G:/work/ark/arkhero-wall/art/elite-anim/frames/00-idle.png`.
- Exact prompt:

```text
Use case: identity-preserve. Edit the first reference, ../ref/idle-template.png, into ONE game animation frame of the SAME Crimson Elite Soldier. The second reference, 00-idle.png, is supporting identity reference only. Output a 1536x1536 square PNG with genuine transparent background. Preserve the exact template character size and placement: spear tip to soles about 760 pixels, helmet about 150 pixels wide, weight-bearing boot sole on y=1240, feet midpoint near x=900. Preserve generous transparent empty space above and to the left; do not enlarge or recenter the knight to fill the canvas. Keep every part at least 80 pixels from all canvas edges.
Keep identical heavy broad proportions, dark gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, dark red tabard and cape panels, brown leather belt/bracers/gauntlets. Identical LONG dark wood spear with red wrapping and broad steel leaf blade; identical very large dark steel kite shield with red heart-shaped field and black eagle crest. Match template painted soft shading, dark outline, top lighting and palette exactly.
Always face three-quarter toward VIEWER-LEFT, same slightly elevated camera. Never mirror: spear in anatomical RIGHT hand on VIEWER-LEFT; shield strapped to anatomical LEFT arm on VIEWER-RIGHT. Heavy slow march toward viewer-left, shield up and nearly fixed, spear upright with tip leaning slightly viewer-left by at most 15 degrees and butt swinging slightly. Feet closer than guard stance during contacts, short strides, very small body bob. Preserve body size even when knees bend. Exactly one character, one pose. No ground shadow, background, motion blur, speed lines, glow, sparks, dust, blood, text, border or sheet.

Frame pose: 04-walk4.png — Contact with the OTHER leg: viewer-right foot steps across toward viewer-left and plants a short step ahead, heel down on y=1240; viewer-left foot now behind on its toes. Body slightly lower. Switch the leg roles from walk1 without mirroring body, weapons or camera.
```

## 05-walk5.png

- Tool: `image_gen.imagegen` (built-in; edit mode).
- Output: 1254×1254 pixels, 8-bit RGBA PNG.
- Parameters: `transparent_background: true`; `referenced_image_paths`: `G:/work/ark/arkhero-wall/art/elite-anim/ref/idle-template.png`, `G:/work/ark/arkhero-wall/art/elite-anim/frames/00-idle.png`.
- Exact prompt:

```text
Use case: identity-preserve. Edit the first reference, ../ref/idle-template.png, into ONE game animation frame of the SAME Crimson Elite Soldier. The second reference, 00-idle.png, is supporting identity reference only. Output a 1536x1536 square PNG with genuine transparent background. Preserve the exact template character size and placement: spear tip to soles about 760 pixels, helmet about 150 pixels wide, weight-bearing boot sole on y=1240, feet midpoint near x=900. Preserve generous transparent empty space above and to the left; do not enlarge or recenter the knight to fill the canvas. Keep every part at least 80 pixels from all canvas edges.
Keep identical heavy broad proportions, dark gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, dark red tabard and cape panels, brown leather belt/bracers/gauntlets. Identical LONG dark wood spear with red wrapping and broad steel leaf blade; identical very large dark steel kite shield with red heart-shaped field and black eagle crest. Match template painted soft shading, dark outline, top lighting and palette exactly.
Always face three-quarter toward VIEWER-LEFT, same slightly elevated camera. Never mirror: spear in anatomical RIGHT hand on VIEWER-LEFT; shield strapped to anatomical LEFT arm on VIEWER-RIGHT. Heavy slow march toward viewer-left, shield up and nearly fixed, spear upright with tip leaning slightly viewer-left by at most 15 degrees and butt swinging slightly. Feet closer than guard stance during contacts, short strides, very small body bob. Preserve body size even when knees bend. Exactly one character, one pose. No ground shadow, background, motion blur, speed lines, glow, sparks, dust, blood, text, border or sheet.

Frame pose: 05-walk5.png — Down on the other leg: weight settling onto the viewer-right foot planted ahead toward viewer-left, knees bent, body lowest with a small bob, rear viewer-left foot starting to lift. Supporting sole on y=1240. Switch the leg roles from walk2 without mirroring body or weapons.
```

## 06-walk6.png

- Tool: `image_gen.imagegen` (built-in; edit mode).
- Output: 1254×1254 pixels, 8-bit RGBA PNG.
- Parameters: `transparent_background: true`; `referenced_image_paths`: `G:/work/ark/arkhero-wall/art/elite-anim/ref/idle-template.png`, `G:/work/ark/arkhero-wall/art/elite-anim/frames/00-idle.png`.
- Exact prompt:

```text
Use case: identity-preserve. Edit the first reference, ../ref/idle-template.png, into ONE game animation frame of the SAME Crimson Elite Soldier. The second reference, 00-idle.png, is supporting identity reference only. Output a 1536x1536 square PNG with genuine transparent background. Preserve the exact template character size and placement: spear tip to soles about 760 pixels, helmet about 150 pixels wide, weight-bearing boot sole on y=1240, feet midpoint near x=900. Preserve generous transparent empty space above and to the left; do not enlarge or recenter the knight to fill the canvas. Keep every part at least 80 pixels from all canvas edges.
Keep identical heavy broad proportions, dark gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, dark red tabard and cape panels, brown leather belt/bracers/gauntlets. Identical LONG dark wood spear with red wrapping and broad steel leaf blade; identical very large dark steel kite shield with red heart-shaped field and black eagle crest. Match template painted soft shading, dark outline, top lighting and palette exactly.
Always face three-quarter toward VIEWER-LEFT, same slightly elevated camera. Never mirror: spear in anatomical RIGHT hand on VIEWER-LEFT; shield strapped to anatomical LEFT arm on VIEWER-RIGHT. Heavy slow march toward viewer-left, shield up and nearly fixed, spear upright with tip leaning slightly viewer-left by at most 15 degrees and butt swinging slightly. Feet closer than guard stance during contacts, short strides, very small body bob. Preserve body size even when knees bend. Exactly one character, one pose. No ground shadow, background, motion blur, speed lines, glow, sparks, dust, blood, text, border or sheet.

Frame pose: 06-walk6.png — Passing on the other leg: rear viewer-left foot swinging forward under the body past the supporting viewer-right leg, supporting sole on y=1240; body highest with only a small bob. This pose must lead smoothly back into walk1, where viewer-left foot lands ahead. Do not mirror body or weapons.
```


