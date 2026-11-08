# Report B2

- File: `08-attack2.png`
- Tool: `image_gen.imagegen` (built-in), single edit generation.
- Edit target: `../ref/idle-template.png`; supporting reference: `00-idle.png`.
- Requested: 1536 × 1536, transparent background (`transparent_background: true`).
- Output: 1254 × 1254 PNG, RGBA (8-bit channels, PNG colour type 6).
- Saved by byte-for-byte file copy, exactly as returned. No pixel scripts, resizing, background removal, or alpha repair.
- Limitation: the tool returned 1254 × 1254 rather than the requested 1536 × 1536; the image was preserved unchanged as required. The returned haft also slopes upward toward viewer-left rather than the requested downward angle.

## Exact prompt

```text
Use case: identity-preserve.
Asset type: single transparent game animation frame, 08-attack2.png.
Edit target: ../ref/idle-template.png, the approved 1536x1536 idle master. Edit this exact character into the pose below. The attached 00-idle is supporting identity reference; 07-attack1 is only a pose to DIFFER from.
Primary request: the drive phase of a heavy two-handed axe chop, MID-SWING DESCENDING, clearly between an overhead wind-up and a ground impact. Both gauntleted hands grip the same haft. Both arms extend forward and up. The haft angles about 45 degrees DOWN toward VIEWER-LEFT from the hands to the axe head. The enormous double-bit axe head is ahead of the warrior, in front of his face and to VIEWER-LEFT, its center a little higher than the helmet face. It is already descending in front, NOT above the crown or behind his head, NOT raised overhead, NOT near the ground. Torso pitches forward from the waist, front foot steps forward toward viewer-left, rear leg braces, cape thrown backward toward viewer-right behind him. Show the whole body committing slow massive weight into the descending stroke.
Composition: keep the exact square 1536x1536 template canvas and exact original game scale, NOT enlarged to fill the canvas. Standing reference horn tips to boot soles is about 760 pixels; preserve physical proportions and scale while pitching forward. Weight-bearing boot sole stays on y=1240; feet midpoint stays near x=950. Keep every part including axe and cape at least 80 pixels inside all edges. Large empty transparent space above, matching template placement. Same slightly elevated camera, three-quarter facing VIEWER-LEFT, never mirrored. Axe stays on VIEWER-LEFT, his anatomical RIGHT side, held with both hands.
Identity invariants: huge broad heavy brutal warlord, same dark steel great-helm with red face plate and exactly THREE curved horns (two side horns and central crest horn), big white-grey fur mantle on both shoulders, gunmetal plate with red inlay, same riveted pauldrons and bracers, black gauntlets, brown belt and large hexagonal buckle, knee-length red tabard, plated greaves and boots, long tattered dark-red cape. Same enormous double-bit battle axe, dark wooden haft, red cloth near head, two broad crescent steel blades and red runes. Same painting, proportions, colours, soft painted shading, dark outline, top lighting as the master.
Background: genuinely transparent alpha, preserve generated transparency.
Exactly ONE character, ONE axe, ONE pose. No shield, ground shadow or ground smudge, motion blur, speed lines, glow, sparks, dust, blood, text, border, or sprite sheet. Do not copy the overhead pose of 07-attack1 or ground slam of 09-attack3.
```

