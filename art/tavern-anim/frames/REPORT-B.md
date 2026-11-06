# Run B report

Generated only the three Run B frames using the built-in image generation tool, one generation per image, each independently editing `../ref/tavern-template.png` with `transparent_background: true`.

## Delivered files

- `05-collapse-1.png`
- `06-collapse-2.png`
- `07-rubble.png`

All outputs were copied byte-for-byte from the tool's generated PNG files. No pixel modifications, resizing, cropping, background removal, matting, alpha repair or other postprocessing were performed. The input and Run A files were left unchanged.

## Verification and deviations

The outputs are NOT fully compliant with the brief. Despite explicit 1024x1024 prompts, all three returned files are 1254x1254. They have actual alpha transparency, but nonzero faint alpha exists outside the principal artwork. No alpha cleanup was applied.

Read-only inspection of the principal artwork (alpha >=128, inclusive pixel bounds):

| File | Canvas | Artwork bounds (left, top, right, bottom) |
|---|---|---|
| 05-collapse-1.png | 1254x1254 | 145, 334, 1100, 1151 |
| 06-collapse-2.png | 1254x1254 | 153, 612, 1099, 1188 |
| 07-rubble.png | 1254x1254 | 153, 758, 1100, 1205 |

The exact template registration, x=128..896 limits, y=940 baseline, fixed furnishing positions and collapse height targets are therefore not satisfied. Visual review also shows furnishing/plinth drift; the rubble frame moves a barrel onto its side and changes the bench. Frame 05 conveys a buckled roof and leaning chimney; frame 06 shows broken roof slabs over a mostly collapsed structure with standing rear chimney/posts; frame 07 shows a low rubble heap with three posts, beer sign, banner and striped cloth. The original palette, camera and general tavern identity remain recognizable. No dust, smoke, fire, text, borders or added backdrop are visible.

No retries were made, respecting the one-generation-per-image rule. The supplied files preserve the original tool results rather than correcting the failed constraints.

## Exact prompts

### 05-collapse-1.png

Use case: precise-object-edit. Edit target: the original tavern-template.png only. Produce ONE 1024x1024 game animation frame, genuine transparent background, preserve tool alpha. Match exactly the template's painted soft-shaded pixel-art style, dark outlines, warm wood and stone, blue-and-gold palette, top-left lighting, three-quarter high camera. Keep original canvas registration and asset scale; do not recenter, zoom, crop or resize. Original outline bounds x=128..896, top y=198, bottom y=940. All remaining structures and debris must stay within original silhouette, never outside bounds. Keep grass plinth at exact original coordinates with bottom corner y=940. No backdrop, ground shadow, dust, smoke, fire, outside glow, motion lines, sparks, particles, text or border. Preserve identity from original roof shapes, chimney, beer-mug sign, awning, lion banner, materials and plinth while applying the specified collapse stage. Frame 05-collapse-1.png — Collapse 1, roof buckles: inn at moment it begins to fall on same plinth. Roof ridge sags in middle, both blue roof planes drop inward, building about 12% lower (top approximately y=287, anchored at bottom y=940). Walls bulge outward with snapping timbers but remain inside original outline. Chimney leans inward, signboard falls askew at its original left position, banner and blue-white awning torn. Still recognizably same inn. Plinth, both barrels, bench, stool and front stone steps remain EXACTLY as original at identical positions and size. Do not shrink the whole asset to achieve lowered building height; collapse structural upper parts only.

### 06-collapse-2.png

Use case: precise-object-edit. Edit target: the original tavern-template.png only. Produce ONE 1024x1024 game animation frame, genuine transparent background, preserve tool alpha. Match exactly the template's painted soft-shaded pixel-art style, dark outlines, warm wood and stone, blue-and-gold palette, top-left lighting, three-quarter high camera. Keep original canvas registration and asset scale; do not recenter, zoom, crop or resize. Original outline bounds x=128..896, top y=198, bottom y=940. All remaining structures and debris must stay within original silhouette, never outside bounds. Keep grass plinth at exact original coordinates with bottom corner y=940. No backdrop, ground shadow, dust, smoke, fire, outside glow, motion lines, sparks, particles, text or border. Preserve identity from original roof shapes, chimney, beer-mug sign, awning, lion banner, materials and plinth while applying the specified collapse stage. Frame 06-collapse-2.png — Collapse 2, walls falling. Mostly fallen inn: walls burst outward (contained within original silhouette); roof planes lie broken across top of heap of recognizable original blue shingle slabs, snapped timbers and stone blocks. Total collapsed structure about 45% of original template height: from base y=940 to top approximately y=606, keep upper canvas empty transparent. Few timber uprights and part of original stone chimney still stand at back within this height. Original beer-mug signboard lies on heap. Original plinth, both barrels, bench, stool and front stone steps remain exactly at original coordinates, sizes and perspective. Blue lion banner and striped awning remnants visible among heap. Do not enlarge or recenter heap; keep original footprint and camera. No dust. Output exactly 1024x1024.

### 07-rubble.png

Use case: precise-object-edit. Edit target: the original tavern-template.png only. Produce ONE 1024x1024 game animation frame, genuine transparent background, preserve tool alpha. Match exactly the template's painted soft-shaded pixel-art style, dark outlines, warm wood and stone, blue-and-gold palette, top-left lighting, three-quarter high camera. Keep original canvas registration and asset scale; do not recenter, zoom, crop or resize. Original outline bounds x=128..896, top y=198, bottom y=940. All remaining structures and debris must stay within original silhouette, never outside bounds. Keep grass plinth at exact original coordinates with bottom corner y=940. No backdrop, ground shadow, dust, smoke, fire, outside glow, motion lines, sparks, particles, text or border. Preserve identity from original roof shapes, chimney, beer-mug sign, awning, lion banner, materials and plinth while applying the specified collapse stage. Frame 07-rubble.png — Rubble. The same inn completely fallen: LOW heap of original stone blocks, broken warm wooden timbers and blue shingle fragments, some blue gold-lion banner cloth and blue-white striped awning lying on it. Two or three SHORT broken posts stand in heap and original beer-mug signboard lies FACE-UP on it. Heap NO TALLER than one quarter of original template height (742/4 = about 186 pixels), top no higher than y=754 and lowest row y=940. Original template footprint x=128..896 maximum; retain original exact plinth position and camera with large empty transparent space above. Do not recenter or magnify the heap. Keep original plinth and furnishings at original positions where visible; no tall intact chimney, walls or standing roof. Every fragment contained inside original outline. No dust, no fire. Required canvas 1024x1024.

