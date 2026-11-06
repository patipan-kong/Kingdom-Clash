# Run B report

Generated only Run B using the built-in image generation tool, with exactly one edit call per output. Every call used the original `../ref/barracks-template.png` as its edit target and `transparent_background: true`.

## Saved outputs

- `04-collapse-1.png`: buckled roof, snapped timbers, leaning torn flag; standing dummy and brazier.
- `05-collapse-2.png`: collapsed roof and walls, remaining back uprights, flag across heap; standing dummy and brazier.
- `06-rubble.png`: low rubble heap, three broken posts, banner cloth and toppled dummy.

All files were copied from the tool's generated files without modification. SHA-256 comparisons confirm all three destination files are byte-identical to their tool outputs. The input template was not edited. No background removal, alpha repair, resizing, cropping, compositing or pixel-writing scripts were used. Inspection only read pixels.

## Validation and deviations

**These outputs do not fully comply with the brief.** The tool returned all three images at **1254×1254**, despite each prompt requesting 1024×1024. Exact template scale, registration, silhouette containment and bottom row y=940 therefore fail or cannot be certified. No regeneration or repair was performed, respecting the one-generation and unmodified-output requirements.

All outputs have real alpha values ranging from 0 to 255. Read-only inspection found the following inclusive bounds for all nonzero alpha (including faint pixels):

| File | Dimensions | Nonzero-alpha bounds (left, top, right, bottom) |
|---|---|---|
| Template | 1024×1024 | 128, 196, 895, 939 |
| 04-collapse-1.png | 1254×1254 | 0, 3, 1223, 1253 |
| 05-collapse-2.png | 1254×1254 | 0, 19, 1239, 1253 |
| 06-rubble.png | 1254×1254 | 0, 0, 1225, 1223 |

The original template's last nonzero-alpha row is 939, although the brief describes it as y=940.

Visual inspection: collapse progression, palette and camera are recognizable; rubble includes a toppled target dummy and three short posts. No visible dust, ground patch, smoke, motion lines, sparks, text or backdrop. No active flames were requested, following the brief's global no-fire rule. Frame 04 changes the torch fittings to lantern-like fittings, and exact unchanged positions/details of the base, steps, dummy and brazier are not assured. Rubble height and collapse percentage targets are approximate visual results, not validated exact geometry. Nonzero-alpha bounds also show that strict silhouette containment is not met.

## Exact prompts

Each call used the original template path and transparent_background=true.

### 04-collapse-1.png

Use case: precise-object-edit. Edit target: the original attached Azure Barracks template, not any previously generated frame. Produce one 1024x1024 transparent PNG game animation frame. Preserve the original three-quarter high camera, painted soft-shaded style, dark outlines, warm wood, grey stone, blue-and-gold palette, top-left lighting. Keep the original canvas, exact object scale and placement; do not rescale, recenter or crop. All remaining architecture and debris must stay inside the original silhouette, within x=128..896, y>=196 and y<=940. Bottommost opaque row y=940. No ground patch, ground shadow, dust cloud, smoke, fire, external glow, motion lines, sparks, text, border or backdrop. Genuine alpha transparency, not a rendered checkerboard. Only original building, fittings and debris. Frame 04-collapse-1.png — Collapse 1 (roof buckles): the building begins to fall on exactly the same base. Ridge sags in the middle and both blue shingle roof planes drop inward; building is about 12% lower than template (overall top about y=285). Walls bulge outward with snapping timbers but remain inside original outline. Tall flag pole leans, torn blue-and-gold banners are falling. Still recognisably the same barracks. Stone base, entrance steps, iron brazier and standing target training dummy MUST stay exactly at their original template positions and sizes. Preserve fittings consistent with collapse; no active flames, per no-fire rule.

### 05-collapse-2.png

Use case: precise-object-edit. Edit target: the original attached Azure Barracks template, not any previously generated frame. Produce one 1024x1024 transparent PNG game animation frame. Preserve the original three-quarter high camera, painted soft-shaded style, dark outlines, warm wood, grey stone, blue-and-gold palette, top-left lighting. Keep the original canvas, exact object scale and placement; do not rescale, recenter or crop. All remaining architecture and debris must stay inside the original silhouette, within x=128..896, y>=196 and y<=940. Bottommost opaque row y=940. No ground patch, ground shadow, dust cloud, smoke, fire, external glow, motion lines, sparks, text, border or backdrop. Genuine alpha transparency, not a rendered checkerboard. Only original building, fittings and debris. Frame 05-collapse-2.png — Collapse 2 (walls falling): Mostly fallen. Walls burst outward within original silhouette, roof planes lie broken across a heap of blue shingle slabs, snapped warm wooden timbers and grey stones, about 45% of template height (744px original height; heap and remaining back uprights occupy y=605..940). Leave ample transparent empty space above, never enlarge the heap to fill canvas. A few timber uprights still stand at the back. The torn blue-and-gold eagle flag lies across the heap. Original front base stones, entrance steps, iron brazier and standing target training dummy remain at exact original template coordinates and sizes. No dust, no fire, no flames. Preserve same footprint and exact registration with template.

### 06-rubble.png

Use case: precise-object-edit. Edit target: the original attached Azure Barracks template, not any previously generated frame. Produce one 1024x1024 transparent PNG game animation frame. Preserve the original three-quarter high camera, painted soft-shaded style, dark outlines, warm wood, grey stone, blue-and-gold palette, top-left lighting. Keep the original canvas, exact object scale and placement; do not rescale, recenter or crop. All remaining architecture and debris must stay inside the original silhouette, within x=128..896, y>=196 and y<=940. Bottommost opaque row y=940. No ground patch, ground shadow, dust cloud, smoke, fire, external glow, motion lines, sparks, text, border or backdrop. Genuine alpha transparency, not a rendered checkerboard. Only original building, fittings and debris. Frame 06-rubble.png — Rubble: building fully fallen into a LOW heap of grey stone blocks, broken warm wooden timbers and blue shingle fragments. Some blue-and-gold banner cloth lies on it. No taller than one quarter of the original template's 744px height: ALL visible rubble including 2 or 3 short broken posts fits into y=754..940 on the 1024x1024 canvas. Width no greater than original footprint x=128..896 and inside original silhouette. Leave very large transparent empty space above; DO NOT zoom, enlarge or recenter the low heap. The training dummy lies toppled horizontally in front of the heap, inside these bounds. Bottommost heap row exactly y=940. Preserve template scale and camera, recognizable materials and fragments of its fittings; no standing walls or intact roof. NO fire, NO dust, NO ground patch, NO shadow. Output MUST be 1024x1024.

