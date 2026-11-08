# Run 0 report

- File: `00-idle.png`
- Tool: `image_gen.imagegen` (built-in), edit using `referenced_image_paths`.
- Inputs: `../ref/canvas-template.png` (edit target), `../ref/hero-still.png` (identity reference).
- Tool setting: `transparent_background: true`.
- Output pixel size: **1254 × 1254**.
- Output mode: **RGBA**, 8 bits per channel (PNG IHDR color type 6).
- Generation count: **1**. Run 0 only.
- Saved by copying the returned PNG byte-for-byte. No pixel processing, resizing, background removal, matting, or alpha repair was performed. Only PNG header metadata was read.
- Limitation: the tool returned 1254 × 1254 despite the prompt requesting 1536 × 1536. Therefore the exact 1536-canvas scale and y=1240 ground placement requirements are not satisfied. The returned image is preserved as instructed; no additional generation was made.
- Visual inspection: one guard pose facing viewer-left, axe on viewer-left, free fist on viewer-right, three horns, fur mantle, red cape, and no ground smudge.

## Exact prompt

```text
Use case: identity-preserve.
Asset type: Run 0 master idle animation sprite, 00-idle.png.
Edit target: canvas-template.png. Supporting identity reference: hero-still.png. Edit the template, retaining its square 1536 x 1536 canvas, character scale, placement, painting style, palette and every equipment detail.
Primary change: turn the template pose slightly so BOTH body and helmet face three-quarter toward VIEWER-LEFT, using the same camera slightly above. One huge, heavy, brutal armoured warlord in a braced wide planted guard stance. His anatomical RIGHT hand, on VIEWER-LEFT, holds the enormous double-bit axe low, blades resting just above the ground ahead of his front foot. His free anatomical LEFT fist is clenched on VIEWER-RIGHT. Never mirror him.
Character invariants: far bulkier than a soldier; dark steel great-helm with red face plate and exactly THREE curved horns, one each side and a central crest horn; big white-grey fur mantle over BOTH shoulders; dark gunmetal plate armour with red inlay, riveted pauldrons and bracers, black gauntlets, brown leather belt with large hexagonal buckle, knee-length red tabard panel, plated greaves and boots, long tattered dark-red cape. Preserve the template's huge axe with dark wooden haft, red cloth wrap near its head, two broad crescent steel blades and red rune marks. NO shield. Same broad heavy proportions, soft painted shading, dark outline, top lighting.
Composition is critical: keep the hero at EXACTLY the template's game scale, about 760 pixels from horn tips to boot soles within the 1536 pixel high canvas. Weight-bearing boot soles on invisible ground line y=1240, feet midpoint near x=900; horn tips approximately y=480. Retain generous empty transparent space above. Do not enlarge or center the character to fill the canvas. All axe blades, cape, horns and every other part must remain at least 80 pixels inside every canvas edge.
Background: genuinely transparent alpha, empty everywhere around the isolated character. Omit the template's dark ground smudge completely. No ground shadow, floor, background color, backdrop, checkerboard artwork, motion blur, speed lines, glow, sparks, dust, blood, text, border or watermark. Exactly ONE character, ONE pose, ONE image, never a sprite sheet. Preserve the generated alpha.
```

