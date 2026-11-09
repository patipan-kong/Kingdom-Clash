# Run 0 report

## 00-idle.png

- Tool: `image_gen.imagegen` (built-in; callable name `image_gen__imagegen`).
- Operation: one edit generation, using `../ref/canvas-template.png` as edit target and `../ref/kael-still.png` as identity reference.
- Parameters: `transparent_background: true`; `referenced_image_paths` supplied in the above order.
- Actual output: **1254 × 1254 pixels**, PNG, **RGBA** (8 bits per channel; PNG color type 6, with alpha).
- Saved as `00-idle.png` by byte-for-byte copy of the tool output. SHA-256 of both source and saved file: `40D3A2691D1C9CC743E0F536B8721E5D714CEEC497CD72153346676256809D97`.
- No resizing, background removal, chroma key, matting, alpha repair, or pixel manipulation was performed. No subsequent runs were generated.
- Validation: the returned image visually shows one idle warrior facing viewer-left, two axes held low and outward, and blue scarf extending viewer-right, with ample empty space above and left.
- **Deviation:** the tool returned 1254 × 1254 instead of the requested 1536 × 1536. Consequently the required absolute pixel scale and ground/feet coordinates are not satisfied. The unmodified output is retained as required; this is not a fully compliant master. No second generation was attempted, in accordance with the one-generation rule.

### Exact prompt

```text
Use case: identity-preserve.
Asset: 00-idle.png, Run 0 idle master for a game animation.
Input image 1 (canvas-template.png) is the EDIT TARGET: edit this exact template, preserving its square 1536x1536 canvas, character size, placement, pose, painting and empty transparent space. Input image 2 (kael-still.png) is IDENTITY REFERENCE ONLY, not a composition or crop reference.
Create exactly one character in exactly one pose: the template idle pose, wide braced fighting stance, one matching battle axe in each fist held low out to either side, blades angled outward. Body three-quarter toward viewer-left, head facing viewer-left, viewer-left arm is the front arm. Never mirror. Blue scarf streams toward viewer-right.
Preserve the character exactly: lean athletic SLIM young warrior with runner's build, long limbs and narrow waist, never broad, bulky, shorter or stocky; short spiky silver-white hair, fierce focused face and dark brow; bare muscular arms, leather and steel bracers and gauntlets; dark steel-grey and brown leather sleeveless vest with gold studs and brown belt; dark brown trousers; steel knee and shin guards; brown leather boots with steel toe caps. TWO matching light one-handed axes, each wide double-crescent steel blade with gold studs and short dark wooden haft. Preserve hair, face, scarf, vest, bracers, boots and both axes exactly as painted in the edit target. Same soft-shaded painted style, dark outline, top lighting, palette, and slightly elevated camera.
Critical layout: output square 1536x1536. Keep EXACTLY the template game scale: standing hair top to boot soles about 590 pixels of the 1536 height. Weight-bearing boot soles on y=1240; feet midpoint near x=950. Preserve template placement in the lower right area, with extensive empty space above and left. Do not enlarge the character to fill the canvas, do not center the character in the canvas, do not crop or reframe. Axes spread wider than the body. All parts including axes and scarf at least 80 pixels inside every canvas edge.
Background genuinely transparent, with tool-generated alpha preserved. No white, colored, black or chroma-key backdrop. No ground shadow, motion blur, impact lines, speed lines, glow, sparks, dust, cracks, blood, text, border, shield, helmet, extra props or extra characters. One image only, no sheet. This is a faithful idle master edit, not a redesign.
```

