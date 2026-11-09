# Run 0 report

## 00-idle.png

- Tool: `image_gen.imagegen` (built-in; exposed as `tools.image_gen__imagegen`).
- Operation: one edit generation, using `../ref/canvas-template.png` as edit target and `../ref/borin-still.png` as identity reference.
- Tool arguments: `transparent_background: true`; `referenced_image_paths` supplied in edit-target, identity-reference order.
- Output pixel size: **1254 × 1254**.
- Output mode: **RGBA**, 8 bits per channel (PNG IHDR color type 6).
- Saved exactly as returned by copying the generated PNG. No resizing, background removal, matting, alpha repair, or pixel processing was performed.
- SHA-256 of both returned source and saved file: `8296108C4DD4939AE61F9FF091A68E7431A1575BD39D8294B03B8C5AB8F580CF`.
- Review: one dwarf in the idle guard pose, facing viewer-left, hammer head viewer-left, both hands on haft, cape viewer-right, with large empty margins.
- Deviation: the tool returned 1254 × 1254 rather than the requested 1536 × 1536. Consequently the required absolute pixel scale and ground coordinates are not satisfied. The output was preserved unchanged under the one-generation and no-pixel-processing rules. No later runs were performed.

## Exact prompt

```text
Use case: identity-preserve
Asset type: single transparent game animation frame, Run 0 idle master, 00-idle.png.
Input images: Image 1 (canvas-template.png) is the EDIT TARGET and authoritative 1536 x 1536 square canvas, composition, character scale and pose. Image 2 (borin-still.png) is an IDENTITY REFERENCE only, not a framing reference.
Primary request: Edit the template into the approved idle master while preserving its painting, pose, placement and details as exactly as possible. Exactly one Borin and one pose. Retain the large empty transparent area above and to the left; do not crop or enlarge the character. Output a 1536 x 1536 square with genuinely transparent background and native alpha.
Composition: Match the template exactly. Standing head-to-boot height about 590 pixels on the 1536 pixel canvas, head near y=640, weight-bearing boot soles on y=1240 and feet midpoint near x=950. All parts, including hammer and cape, at least 80 pixels inside every canvas edge. Keep the same slightly elevated camera, body and head three-quarter facing VIEWER-LEFT. Never mirror.
Pose: Heavy, low, planted, wide braced guard stance, feet wide apart. Huge heavy two-handed warhammer held across the body at belt height in BOTH gauntleted fists, steel hammer head with blue and gold painted face on VIEWER-LEFT held low above the ground, gold pommel to viewer-right. Long blue cape with gold border behind him on VIEWER-RIGHT.
Identity: Short, very broad powerful dwarf almost as wide as tall; big barrel chest, thick arms, short thick legs. Never taller or slimmer. Big bushy orange-red beard with a long braid down the front, heavy brow, bare head with short orange hair tuft. White-cream fur mantle over BOTH shoulders with small animal heads at the shoulders. Blue steel pauldrons edged in gold, blue and gold plate armour, gold-trimmed blue tabard panel in front of brown leather belt, thick plated gauntlets and bracers, heavy brown leather boots with gold trim. Preserve beard, braid, fur, armour, cape and hammer exactly as in the template and identity reference. Hammer has steel head, blue/gold painted face with gold bands and gold diamond emblem, dark steel haft and gold pommel. No shield, no helmet.
Style: Same painted soft-shaded style, dark outline, top lighting and palette as template. Preserve existing appearance, not a redesign.
Avoid: any opaque backdrop, white or coloured background, chroma-key backdrop, ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, extra characters, extra poses or sprite sheet. Keep background truly transparent.
```

