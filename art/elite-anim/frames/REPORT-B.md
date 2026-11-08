# Run B report

Four separate edits, one built-in generation per frame. Edit target: `../ref/idle-template.png`; supporting identity reference: `00-idle.png`. Tool: `image_gen.imagegen` (built-in), edit mode, `transparent_background: true`. Outputs copied byte-for-byte; no pixel scripts, resizing, background removal, or alpha repair.

## Output metadata and review

| File | Output pixel size and pixel mode |
|---|---|
| `07-attack1.png` | 1254 × 1254, 8-bit RGBA (PNG color type 6) |
| `08-attack2.png` | 1254 × 1254, 8-bit RGBA (PNG color type 6) |
| `09-attack3.png` | 1254 × 1254, 8-bit RGBA (PNG color type 6) |
| `10-hurt.png` | 1254 × 1254, 8-bit RGBA (PNG color type 6) |

The tool did not honor the requested 1536×1536 resolution. Absolute template coordinates and exact character scale therefore are not certified. All three attacks depict horizontal spear stabs toward viewer-left, with shield on viewer-right. Visual review: 08 and 09 put the blade closer to the left edge than the requested 80 px margin; 09 also exceeds the requested maximum blade reach. Pose and equipment proportions drift somewhat from the master. These outputs are preserved unchanged under the one-generation-per-frame rule.

## Exact prompts

### `07-attack1.png`

Tool: `image_gen.imagegen`; mode: edit with transparent background.

```text
Use case: identity-preserve. Asset type: single game animation frame. Edit target: ../ref/idle-template.png; supporting identity reference: attached 00-idle.png. Make a separate pose edit of the approved idle-template, never a sheet. Preserve exactly the same heavy broad knight, proportions, helmet and dark visor, red horsehair plume, dark gunmetal plate with red trim, fur collar/pauldrons, brown leather belt/bracers/gauntlets, dark red tabard and cape, LONG dark wood spear with red cloth wrapping and broad steel leaf blade, huge dark steel kite shield with red heart-shaped field and black eagle crest. Same soft painted shading, dark outline, top lighting, palette and slightly elevated three-quarter camera, always facing viewer-left. Handedness fixed: spear in anatomical RIGHT hand on viewer-LEFT; shield strapped to anatomical LEFT arm on viewer-RIGHT. Genuine transparent background, preserve tool alpha. Square 1536x1536 canvas requested, same game scale and placement as edit target: idle spear-tip-to-soles about 760 px, helmet about 150 px wide; do not enlarge to fill canvas. Weight-bearing soles on y=1240, feet midpoint near x=900. Keep all parts including spear blade, butt and shield at least 80 px inside every edge. Heavy planted wide braced stance, shield stays large and close to original place. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop, extra characters or extra weapons. Change only the pose as follows.
Thrust wind-up: weight on rear foot, shoulders turned, spear pulled back at HIP HEIGHT and levelled exactly HORIZONTAL, leaf blade pointing toward viewer-left over his front hand, long butt behind him toward viewer-right. Shield pulled in to chest. This is preparation for a straight axial spear stab, never a sword swing. Entire long spear well inside canvas.
```

### `08-attack2.png`

Tool: `image_gen.imagegen`; mode: edit with transparent background.

```text
Use case: identity-preserve. Asset type: single game animation frame. Edit target: ../ref/idle-template.png; supporting identity reference: attached 00-idle.png. Make a separate pose edit of the approved idle-template, never a sheet. Preserve exactly the same heavy broad knight, proportions, helmet and dark visor, red horsehair plume, dark gunmetal plate with red trim, fur collar/pauldrons, brown leather belt/bracers/gauntlets, dark red tabard and cape, LONG dark wood spear with red cloth wrapping and broad steel leaf blade, huge dark steel kite shield with red heart-shaped field and black eagle crest. Same soft painted shading, dark outline, top lighting, palette and slightly elevated three-quarter camera, always facing viewer-left. Handedness fixed: spear in anatomical RIGHT hand on viewer-LEFT; shield strapped to anatomical LEFT arm on viewer-RIGHT. Genuine transparent background, preserve tool alpha. Square 1536x1536 canvas requested, same game scale and placement as edit target: idle spear-tip-to-soles about 760 px, helmet about 150 px wide; do not enlarge to fill canvas. Weight-bearing soles on y=1240, feet midpoint near x=900. Keep all parts including spear blade, butt and shield at least 80 px inside every edge. Heavy planted wide braced stance, shield stays large and close to original place. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop, extra characters or extra weapons. Change only the pose as follows.
Thrust drive: spear shooting forward exactly HORIZONTAL at CHEST HEIGHT toward viewer-left along its own axis, right arm half extended, front foot stepping forward, body turning into the thrust; shield guarding chest on viewer-right. Straight spear stab, never a sword swing. Entire long spear well inside canvas.
```

### `09-attack3.png`

Tool: `image_gen.imagegen`; mode: edit with transparent background.

```text
Use case: identity-preserve. Asset type: single game animation frame. Edit target: ../ref/idle-template.png; supporting identity reference: attached 00-idle.png. Make a separate pose edit of the approved idle-template, never a sheet. Preserve exactly the same heavy broad knight, proportions, helmet and dark visor, red horsehair plume, dark gunmetal plate with red trim, fur collar/pauldrons, brown leather belt/bracers/gauntlets, dark red tabard and cape, LONG dark wood spear with red cloth wrapping and broad steel leaf blade, huge dark steel kite shield with red heart-shaped field and black eagle crest. Same soft painted shading, dark outline, top lighting, palette and slightly elevated three-quarter camera, always facing viewer-left. Handedness fixed: spear in anatomical RIGHT hand on viewer-LEFT; shield strapped to anatomical LEFT arm on viewer-RIGHT. Genuine transparent background, preserve tool alpha. Square 1536x1536 canvas requested, same game scale and placement as edit target: idle spear-tip-to-soles about 760 px, helmet about 150 px wide; do not enlarge to fill canvas. Weight-bearing soles on y=1240, feet midpoint near x=900. Keep all parts including spear blade, butt and shield at least 80 px inside every edge. Heavy planted wide braced stance, shield stays large and close to original place. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop, extra characters or extra weapons. Change only the pose as follows.
Thrust contact: deep lunge toward viewer-left, front knee bent over front foot, torso leaning forward, right spear arm fully extended. LONG spear exactly HORIZONTAL at chest height with broad leaf blade pointing viewer-left at farthest reach, blade at most 650 px from feet midpoint (thus tip no farther left than x=250 for midpoint x=900). Shield tucked in at viewer-right, rear foot braced. Straight axial spear stab, never a sword swing. Keep full spear and butt inside canvas.
```

### `10-hurt.png`

Tool: `image_gen.imagegen`; mode: edit with transparent background.

```text
undefined
```

Metadata was read from PNG IHDR headers only; pixel data was not decoded or processed. Hurt visually retains the ducked head and raised shield, but exact idle foot positions are not certified.

