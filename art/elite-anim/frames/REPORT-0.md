# Run 0 report

- File: `00-idle.png`
- Tool: `image_gen.imagegen` (built-in; edit of template with identity reference)
- Tool arguments: `transparent_background: true`; referenced images: `../ref/canvas-template.png`, `../ref/elite-still.png`.
- Output pixel size: **1254 × 1254** (PNG IHDR metadata).
- Output mode: **RGBA, 8 bits per channel** (PNG color type 6).
- One generation only. Output copied byte-for-byte from the tool-returned PNG. No pixel scripts, resizing, background removal, matting, alpha repair, or other postprocessing.
- Limitation: the tool returned a square canvas smaller than the requested 1536 × 1536. Consequently the brief's absolute pixel coordinates and dimensions cannot be certified as met. The returned output is preserved as required. Visual inspection shows one left-facing guard pose with an upright spear on viewer-left and shield on viewer-right, with no ground shadow.

## Exact prompt

```text
Use case: identity-preserve.
Asset type: single game animation idle master, 00-idle.png, Run 0 only.
Edit target: canvas-template.png (first reference), the approved 1536x1536 transparent composition. Identity reference: elite-still.png (second reference). Edit the template rather than reframing the native-size reference.
Produce exactly one character in one pose on a genuinely transparent background with alpha. Keep the square 1536x1536 canvas and EXACT template character scale and placement: spear tip to boot soles about 760 pixels, helmet about 150 pixels wide; weight-bearing boot soles on y=1240, feet midpoint near x=900. Preserve the large empty space above and to the left. Do not enlarge or center the knight on the canvas. Every part, including spear and shield, must remain at least 80 pixels inside all canvas edges.
Requested change: turn the template body and head slightly so he faces three-quarter toward VIEWER-LEFT, same slightly elevated camera. Heavy braced guard stance, wide planted feet. Spear held upright VERTICAL, tip high, in his anatomical RIGHT hand on VIEWER-LEFT, butt near the front boot. Very large shield raised on his anatomical LEFT arm on VIEWER-RIGHT. Never mirror. Keep feet and shield approximately at their template positions.
Preserve the exact character identity, equipment, proportions, palette, and painted soft-shaded style with dark outlines and top lighting: tall heavy imposing broad-shouldered armoured knight; dark gunmetal plate with red trim; steel great-helm, dark visor slit, tall red horsehair plume; fur-trimmed collar and pauldrons; dark red tabard and cape panels; brown leather belt, bracers and gauntlets. LONG dark wooden spear shaft wrapped in red cloth and broad steel leaf blade. Very large dark steel kite shield with red heart-shaped field and black eagle crest. Keep armour, plume, spear and shield designs exactly as in the template.
Remove the template's ground shadow in the generation itself. No ground shadow or ground plane, motion blur, speed lines, glow, sparks, dust, blood, text, border, extra objects, duplicate characters, or sprite sheet. No white, colored, black or chroma-key backdrop: all background is transparent.
```

