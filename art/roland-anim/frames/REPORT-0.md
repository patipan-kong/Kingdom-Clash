# Run 0 report

- File: `00-idle.png`
- Tool: `image_gen.imagegen` (built-in), edit mode.
- Edit target: `../ref/canvas-template.png`
- Identity reference: `../ref/roland-still.png`
- Tool parameter: `transparent_background: true`
- Output pixel size: **1254 × 1254**
- Output mode: **RGBA**, 8 bits per channel (PNG color type 6).
- Exactly one generation. Output copied byte-for-byte, with no resizing, background removal, alpha repair, or other pixel changes.
- SHA-256 of both returned source and saved copy: `7D5D8B7EDA9E1921595563908A93F0F755DCE51B3C98163836E6148BD04256A6`.
- Limitation: the tool returned 1254 × 1254 rather than the requested 1536 × 1536. Thus the required absolute pixel scale and y=1240 ground placement are not satisfied. The returned image preserves the general template composition and idle pose, but is not an exact reproduction of the original painting. Saved unchanged as required; no second generation was attempted.

## Exact prompt

```text
Use case: identity-preserve.
Asset type: single transparent game animation sprite, Run 0 master, 00-idle.png.
Input image 1 (canvas-template.png) is the EDIT TARGET. Input image 2 (roland-still.png) is an IDENTITY REFERENCE only. Edit the first image, preserving its square 1536x1536 canvas, character placement, scale, pose, proportions, painting and palette exactly. Do not use the tightly cropped identity reference as the composition.
Create the approved idle master in the template pose: Roland standing in a ready guard, body and head three-quarter toward viewer-left, camera a little above. Longsword held low in front in the hand on the VIEWER-RIGHT side, grip near belt, blade angled down toward viewer-left with tip just above ground. Free gauntleted fist at his side on VIEWER-LEFT. Cape behind on viewer-right. Never mirror.
Keep EXACTLY the template size and placement: standing hair top to boot soles about 740 pixels on the 1536-pixel square canvas, hair near y=500, weight-bearing boot soles on y=1240, feet midpoint near x=950. Preserve the large empty space above and to the left. Never scale up to fill the canvas or center the figure in the canvas. Every part, including sword and cape, at least 80 pixels inside all canvas edges.
Identical human knight: short swept-back brown hair, short brown beard, stern face; steel plate pauldrons with gold trim, large rounded viewer-right pauldron; steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth; steel bracers with gold trim, steel gauntlets; brown leather belt with round gold buckle; plated greaves, gold knee guards, steel boots. Long blue cape with gold border and gold emblem on viewer-right. Steel longsword, gold cross-guard, brown grip. Preserve the hair, face, armour, tabard, cape and sword exactly as in template. Balanced agile disciplined knight, medium-wide stance, weight on balls of feet. Painted soft-shaded style, dark outline, top lighting, same palette and detail as template.
Genuinely transparent background with alpha. Exactly one character and one pose. No shield, helmet, ground shadow, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text, border, scenery, backdrop, white background, coloured background, or chroma key. Output only this single square idle sprite.
```

