# Run C report

Three separate built-in image generation edits, one generation per frame. Edit target for every call: `../ref/idle-template.png`; supporting identity reference: `00-idle.png`. Every call used `transparent_background: true` and `referenced_image_paths` containing those two files. Outputs copied byte-for-byte from the tool's saved PNGs; no pixel scripts, resizing, background removal, matting, or alpha repair were performed. Only PNG header metadata was read.

Actual returned canvas is 1254 × 1254 for all three outputs, rather than the requested 1536 × 1536. The files retain the returned scale and placement unchanged; exact template pixel coordinates therefore are not guaranteed. Visual inspection shows the three requested stages (kneeling stagger, collapse, side-lying down); the collapse remains fairly upright and its spear blade approaches the left margin. The final spear also appears farther left than the requested 650-pixel distance from the feet anchor. These deviations were preserved under the one-generation and unchanged-output rules.

## 11-death1.png

Tool: `image_gen.imagegen` (built-in; callable as `tools.image_gen__imagegen`).

Output: 1254 × 1254 pixels; PNG, 8-bit RGBA (PNG color type 6), alpha preserved.

Exact prompt:

```text
Use case: identity-preserve. Asset: single game animation sprite, Run C of Crimson Elite Soldier. Edit target: ../ref/idle-template.png, the supplied 1536x1536 approved master. Supporting identity reference: 00-idle.png. Change only the pose specified below. Preserve the exact same heavy broad knight, anatomical size, armour details and proportions, gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, red tabard and cape, brown leather, long dark wood spear with red wrapping and broad steel leaf blade, very large dark steel kite shield with red heart-shaped field and black eagle crest. Match painted soft shading, dark outline, top lighting and palette. Keep camera slightly above and body/head oriented three-quarter toward viewer-left. Never mirror: anatomical RIGHT spear hand is on VIEWER-LEFT, anatomical LEFT shield arm on VIEWER-RIGHT. Square 1536x1536 canvas, genuinely transparent background. Preserve original game scale: standing tip-to-sole reference is about 760 pixels and helmet about 150 pixels wide; do not enlarge character to fill canvas. Ground contact y=1240, original feet anchor near x=900; all parts at least 80 pixels from canvas edges. Heavy weighty pose. Exactly one character in one pose, no sheet, no extra equipment. No ground shadow, background, floor depiction, motion blur, speed lines, glow, sparks, dust, blood, text or border. Preserve tool alpha. Frame 11-death1.png — Death, stagger: dropped to one knee, kneeling body about three quarters of standing body height excluding spear. Head bowed, shoulders slumped. Right hand on viewer-left still grips the long spear as a prop; the spear slopes down FORWARD toward viewer-left, its blade point touching the ground ahead at y=1240. Left-arm shield sags at viewer-right, retaining full large size. Planted boot and knee contact stay on y=1240 near original feet anchor x=900. Keep whole long spear inside margins.
```

## 12-death2.png

Tool: `image_gen.imagegen` (built-in; callable as `tools.image_gen__imagegen`).

Output: 1254 × 1254 pixels; PNG, 8-bit RGBA (PNG color type 6), alpha preserved.

Exact prompt:

```text
Use case: identity-preserve. Asset: single game animation sprite, Run C of Crimson Elite Soldier. Edit target: ../ref/idle-template.png, the supplied 1536x1536 approved master. Supporting identity reference: 00-idle.png. Change only the pose specified below. Preserve the exact same heavy broad knight, anatomical size, armour details and proportions, gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, red tabard and cape, brown leather, long dark wood spear with red wrapping and broad steel leaf blade, very large dark steel kite shield with red heart-shaped field and black eagle crest. Match painted soft shading, dark outline, top lighting and palette. Keep camera slightly above and body/head oriented three-quarter toward viewer-left. Never mirror: anatomical RIGHT spear hand is on VIEWER-LEFT, anatomical LEFT shield arm on VIEWER-RIGHT. Square 1536x1536 canvas, genuinely transparent background. Preserve original game scale: standing tip-to-sole reference is about 760 pixels and helmet about 150 pixels wide; do not enlarge character to fill canvas. Ground contact y=1240, original feet anchor near x=900; all parts at least 80 pixels from canvas edges. Heavy weighty pose. Exactly one character in one pose, no sheet, no extra equipment. No ground shadow, background, floor depiction, motion blur, speed lines, glow, sparks, dust, blood, text or border. Preserve tool alpha. Frame 12-death2.png — Death, collapse: falling sideways and forward toward viewer-left, helmet tilting down and left, heavy torso almost diagonal, knees giving way. Same anatomical body size as idle; do not shrink or enlarge. Right hand on viewer-left releases the long spear, which is slipping from that hand and angles down to the ground toward viewer-left. Left-arm shield on viewer-right is sliding off the arm, sagging toward the ground while retaining its full size and crest. This is a transitional FALL, distinct from kneeling or fully prone. Lowest body contact remains on y=1240 around original anchor x=900. Keep every part inside 80 pixel margins.
```

## 13-death3.png

Tool: `image_gen.imagegen` (built-in; callable as `tools.image_gen__imagegen`).

Output: 1254 × 1254 pixels; PNG, 8-bit RGBA (PNG color type 6), alpha preserved.

Exact prompt:

```text
Use case: identity-preserve. Asset: single game animation sprite, Run C of Crimson Elite Soldier. Edit target: ../ref/idle-template.png, the supplied 1536x1536 approved master. Supporting identity reference: 00-idle.png. Change only the pose specified below. Preserve the exact same heavy broad knight, anatomical size, armour details and proportions, gunmetal plate with red trim, great helm with dark visor and tall red horsehair plume, fur collar and pauldrons, red tabard and cape, brown leather, long dark wood spear with red wrapping and broad steel leaf blade, very large dark steel kite shield with red heart-shaped field and black eagle crest. Match painted soft shading, dark outline, top lighting and palette. Keep camera slightly above and body/head oriented three-quarter toward viewer-left. Never mirror: anatomical RIGHT spear hand is on VIEWER-LEFT, anatomical LEFT shield arm on VIEWER-RIGHT. Square 1536x1536 canvas, genuinely transparent background. Preserve original game scale: standing tip-to-sole reference is about 760 pixels and helmet about 150 pixels wide; do not enlarge character to fill canvas. Ground contact y=1240, original feet anchor near x=900; all parts at least 80 pixels from canvas edges. Heavy weighty pose. Exactly one character in one pose, no sheet, no extra equipment. No ground shadow, background, floor depiction, motion blur, speed lines, glow, sparks, dust, blood, text or border. Preserve tool alpha. Frame 13-death3.png — Death, down: knight lies fully on his side on the ground, head toward viewer-left, legs toward viewer-right, body still turned three-quarter toward viewer-left with same slightly elevated camera. Body is at most half standing body height, without changing anatomical size. Helmet sideways, plume down resting limply. Ground contact along y=1240. Keep feet near the original x=900 anchor; body extends left from the feet, compactly bent as necessary. The long spear is released from the anatomical right hand, lies flat horizontally on ground beside him, blade pointing viewer-left, blade no more than 650 px left of feet midpoint (so blade x at least 250). Spear entire length visible within margins. Very large shield lies on ground on viewer-right beside left arm, red field and black eagle crest visible, clearly no longer held up. Exactly one dead knight, one spear, one shield. No ground plane or shadow, only transparent empty canvas around the low prone silhouette.
```

