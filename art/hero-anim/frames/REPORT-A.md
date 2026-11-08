# Run A report

Generated only Run A: six separate built-in image edits, one generation per file. Edit target for every call: `../ref/idle-template.png`; supporting identity reference: `00-idle.png`. Tool: `image_gen.imagegen` (called through `functions.exec` as `tools.image_gen__imagegen`). Every call used `transparent_background: true` and the same two `referenced_image_paths`. Mode: edit, built-in tool; output PNG RGBA, 8 bits per channel (PNG IHDR colour type 6).

Each returned PNG was copied unchanged to its requested filename. No scripts were run on pixels; no resizing, alpha repair, background removal or other pixel processing was performed. Only the PNG header was read for dimensions and mode, and images were visually inspected. No Run B or C generation was performed.

## Limitations observed

The tool returned 1254×1254 for every frame despite the requested 1536×1536 canvas. Consequently these outputs do not satisfy the requested absolute ground line y=1240, feet midpoint x=950, or exact template scale. Visual inspection also shows pose/leg-order inconsistencies: contact and passing frames are not reliably distinct or anatomically consistent, and a smooth six-frame marching loop is not verified. Character identity and viewer-left axe placement are broadly retained, but exact template details and positioning are not guaranteed. Outputs were retained as returned in accordance with the one-generation-per-frame rule; no corrective generation or pixel edits were made.

## 01-walk1.png

- Tool: `image_gen.imagegen`.
- Output: 1254×1254 pixels; PNG, RGBA, 8 bits per channel.
- Generation mode: separate edit of approved idle template, transparent_background=true.

Exact prompt:

```text
Use case: identity-preserve. Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Supporting identity reference: 00-idle.png only. Create exactly one painted game animation character, one pose, on genuinely transparent background. Keep the master character's exact scale, proportions, colours, rendering, top lighting and camera slightly above, three-quarter facing viewer-left. Keep the large empty upper and left canvas space; never enlarge to fill the canvas. Square 1536x1536 canvas; original standing horn-to-ground extent about 760px; ground line y=1240 and feet midpoint x=950. Weight-bearing boot sole on y=1240. Every part including axe and cape at least 80px inside all edges. Preserve huge bulky warlord, dark steel great helm with red faceplate and THREE curved horns (two side horns plus central crest), large white-grey fur mantle, gunmetal plate with red inlay, riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, red knee-length tabard, plated greaves and boots, tattered dark-red cape, enormous double-bit crescent steel battle axe with red runes, dark wooden haft and red cloth by head. No shield. Never mirror: axe in anatomical RIGHT hand on viewer-LEFT; free anatomical LEFT arm viewer-RIGHT. Heavy slow march toward viewer-left, feet closer together than idle guard at contacts; very small body bob. Axe carried low, blades just above ground, trailing a little behind front foot; free arm swings slightly; cape sways and lags behind. Preserve all identity details; change only walking pose. No ground shadow or ground smudge, no background, no blur, speed lines, glow, sparks, dust, blood, text, border, or sheet. Output alpha transparency, no matte or chroma key.
Pose: Contact: viewer-left front foot just planted a short step ahead toward viewer-left, heel down; other foot behind on its toes. Body slightly lower. This is frame 1 of a six-frame looping march.
```

## 02-walk2.png

- Tool: `image_gen.imagegen`.
- Output: 1254×1254 pixels; PNG, RGBA, 8 bits per channel.
- Generation mode: separate edit of approved idle template, transparent_background=true.

Exact prompt:

```text
Use case: identity-preserve. Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Supporting identity reference: 00-idle.png only. Create exactly one painted game animation character, one pose, on genuinely transparent background. Keep the master character's exact scale, proportions, colours, rendering, top lighting and camera slightly above, three-quarter facing viewer-left. Keep the large empty upper and left canvas space; never enlarge to fill the canvas. Square 1536x1536 canvas; original standing horn-to-ground extent about 760px; ground line y=1240 and feet midpoint x=950. Weight-bearing boot sole on y=1240. Every part including axe and cape at least 80px inside all edges. Preserve huge bulky warlord, dark steel great helm with red faceplate and THREE curved horns (two side horns plus central crest), large white-grey fur mantle, gunmetal plate with red inlay, riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, red knee-length tabard, plated greaves and boots, tattered dark-red cape, enormous double-bit crescent steel battle axe with red runes, dark wooden haft and red cloth by head. No shield. Never mirror: axe in anatomical RIGHT hand on viewer-LEFT; free anatomical LEFT arm viewer-RIGHT. Heavy slow march toward viewer-left, feet closer together than idle guard at contacts; very small body bob. Axe carried low, blades just above ground, trailing a little behind front foot; free arm swings slightly; cape sways and lags behind. Preserve all identity details; change only walking pose. No ground shadow or ground smudge, no background, no blur, speed lines, glow, sparks, dust, blood, text, border, or sheet. Output alpha transparency, no matte or chroma key.
Pose: Down: weight settling onto viewer-left front foot, knees bent, body at lowest; viewer-right rear foot starting to lift. This follows frame 1 contact in a six-frame looping march.
```

## 03-walk3.png

- Tool: `image_gen.imagegen`.
- Output: 1254×1254 pixels; PNG, RGBA, 8 bits per channel.
- Generation mode: separate edit of approved idle template, transparent_background=true.

Exact prompt:

```text
Use case: identity-preserve. Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Supporting identity reference: 00-idle.png only. Create exactly one painted game animation character, one pose, on genuinely transparent background. Keep the master character's exact scale, proportions, colours, rendering, top lighting and camera slightly above, three-quarter facing viewer-left. Keep the large empty upper and left canvas space; never enlarge to fill the canvas. Square 1536x1536 canvas; original standing horn-to-ground extent about 760px; ground line y=1240 and feet midpoint x=950. Weight-bearing boot sole on y=1240. Every part including axe and cape at least 80px inside all edges. Preserve huge bulky warlord, dark steel great helm with red faceplate and THREE curved horns (two side horns plus central crest), large white-grey fur mantle, gunmetal plate with red inlay, riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, red knee-length tabard, plated greaves and boots, tattered dark-red cape, enormous double-bit crescent steel battle axe with red runes, dark wooden haft and red cloth by head. No shield. Never mirror: axe in anatomical RIGHT hand on viewer-LEFT; free anatomical LEFT arm viewer-RIGHT. Heavy slow march toward viewer-left, feet closer together than idle guard at contacts; very small body bob. Axe carried low, blades just above ground, trailing a little behind front foot; free arm swings slightly; cape sways and lags behind. Preserve all identity details; change only walking pose. No ground shadow or ground smudge, no background, no blur, speed lines, glow, sparks, dust, blood, text, border, or sheet. Output alpha transparency, no matte or chroma key.
Pose: Passing: viewer-right rear foot swings forward under the body; viewer-left supporting leg straight, body at highest with only subtle rise. This is frame 3 of the six-frame march.
```

## 04-walk4.png

- Tool: `image_gen.imagegen`.
- Output: 1254×1254 pixels; PNG, RGBA, 8 bits per channel.
- Generation mode: separate edit of approved idle template, transparent_background=true.

Exact prompt:

```text
Use case: identity-preserve. Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Supporting identity reference: 00-idle.png only. Create exactly one painted game animation character, one pose, on genuinely transparent background. Keep the master character's exact scale, proportions, colours, rendering, top lighting and camera slightly above, three-quarter facing viewer-left. Keep the large empty upper and left canvas space; never enlarge to fill the canvas. Square 1536x1536 canvas; original standing horn-to-ground extent about 760px; ground line y=1240 and feet midpoint x=950. Weight-bearing boot sole on y=1240. Every part including axe and cape at least 80px inside all edges. Preserve huge bulky warlord, dark steel great helm with red faceplate and THREE curved horns (two side horns plus central crest), large white-grey fur mantle, gunmetal plate with red inlay, riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, red knee-length tabard, plated greaves and boots, tattered dark-red cape, enormous double-bit crescent steel battle axe with red runes, dark wooden haft and red cloth by head. No shield. Never mirror: axe in anatomical RIGHT hand on viewer-LEFT; free anatomical LEFT arm viewer-RIGHT. Heavy slow march toward viewer-left, feet closer together than idle guard at contacts; very small body bob. Axe carried low, blades just above ground, trailing a little behind front foot; free arm swings slightly; cape sways and lags behind. Preserve all identity details; change only walking pose. No ground shadow or ground smudge, no background, no blur, speed lines, glow, sparks, dust, blood, text, border, or sheet. Output alpha transparency, no matte or chroma key.
Pose: Contact with the OTHER leg: viewer-right foot planted ahead toward viewer-left; viewer-left foot behind on toes. Body slightly lower. This is frame 4, opposite-leg contact in the six-frame march; do not mirror character or axe.
```

## 05-walk5.png

- Tool: `image_gen.imagegen`.
- Output: 1254×1254 pixels; PNG, RGBA, 8 bits per channel.
- Generation mode: separate edit of approved idle template, transparent_background=true.

Exact prompt:

```text
Use case: identity-preserve. Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Supporting identity reference: 00-idle.png only. Create exactly one painted game animation character, one pose, on genuinely transparent background. Keep the master character's exact scale, proportions, colours, rendering, top lighting and camera slightly above, three-quarter facing viewer-left. Keep the large empty upper and left canvas space; never enlarge to fill the canvas. Square 1536x1536 canvas; original standing horn-to-ground extent about 760px; ground line y=1240 and feet midpoint x=950. Weight-bearing boot sole on y=1240. Every part including axe and cape at least 80px inside all edges. Preserve huge bulky warlord, dark steel great helm with red faceplate and THREE curved horns (two side horns plus central crest), large white-grey fur mantle, gunmetal plate with red inlay, riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, red knee-length tabard, plated greaves and boots, tattered dark-red cape, enormous double-bit crescent steel battle axe with red runes, dark wooden haft and red cloth by head. No shield. Never mirror: axe in anatomical RIGHT hand on viewer-LEFT; free anatomical LEFT arm viewer-RIGHT. Heavy slow march toward viewer-left, feet closer together than idle guard at contacts; very small body bob. Axe carried low, blades just above ground, trailing a little behind front foot; free arm swings slightly; cape sways and lags behind. Preserve all identity details; change only walking pose. No ground shadow or ground smudge, no background, no blur, speed lines, glow, sparks, dust, blood, text, border, or sheet. Output alpha transparency, no matte or chroma key.
Pose: Down on the other leg: weight settling onto viewer-right foot ahead toward viewer-left; knees bent, body lowest; viewer-left rear foot starting to lift. This is frame 5 in the six-frame march; do not mirror character or axe.
```

## 06-walk6.png

- Tool: `image_gen.imagegen`.
- Output: 1254×1254 pixels; PNG, RGBA, 8 bits per channel.
- Generation mode: separate edit of approved idle template, transparent_background=true.

Exact prompt:

```text
Use case: identity-preserve. Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Supporting identity reference: 00-idle.png only. Create exactly one painted game animation character, one pose, on genuinely transparent background. Keep the master character's exact scale, proportions, colours, rendering, top lighting and camera slightly above, three-quarter facing viewer-left. Keep the large empty upper and left canvas space; never enlarge to fill the canvas. Square 1536x1536 canvas; original standing horn-to-ground extent about 760px; ground line y=1240 and feet midpoint x=950. Weight-bearing boot sole on y=1240. Every part including axe and cape at least 80px inside all edges. Preserve huge bulky warlord, dark steel great helm with red faceplate and THREE curved horns (two side horns plus central crest), large white-grey fur mantle, gunmetal plate with red inlay, riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, red knee-length tabard, plated greaves and boots, tattered dark-red cape, enormous double-bit crescent steel battle axe with red runes, dark wooden haft and red cloth by head. No shield. Never mirror: axe in anatomical RIGHT hand on viewer-LEFT; free anatomical LEFT arm viewer-RIGHT. Heavy slow march toward viewer-left, feet closer together than idle guard at contacts; very small body bob. Axe carried low, blades just above ground, trailing a little behind front foot; free arm swings slightly; cape sways and lags behind. Preserve all identity details; change only walking pose. No ground shadow or ground smudge, no background, no blur, speed lines, glow, sparks, dust, blood, text, border, or sheet. Output alpha transparency, no matte or chroma key.
Pose: Passing on the other leg: viewer-left rear foot swings forward under body, viewer-right supporting leg straight, body highest with only subtle rise. This is frame 6 and must loop smoothly into frame 1 where viewer-left foot plants ahead; do not mirror character or axe.
```

