# Run A report

Generated Run A only using the built-in image generation tool, with exactly one call per image. Each call edited the original ../ref/barracks-template.png directly and set transparent_background: true. No retries, resizing, cropping, background removal, matting, alpha repair, or pixel modifications were performed. Outputs were copied byte-for-byte from the tool's saved PNGs into this folder. The template was not changed.

## Results and verification

**Run A is not fully compliant with the brief.** Despite explicit 1024x1024 and position instructions, all three tool outputs are 1254x1254. They therefore fail the exact canvas, scale/position, silhouette and lowest-row requirements. Files are retained unmodified as required.

Read-only inspection with System.Drawing confirmed alpha ranges of 0–255 in each output (genuine transparent pixels and opaque pixels). Inclusive bounds below count every pixel with alpha greater than zero, including faint pixels.

| File | Canvas | Nonzero alpha bounds (left, top, right, bottom) |
|---|---|---|
| Template | 1024x1024 | 128, 196, 895, 939 |
| 01-recruiting.png | 1254x1254 | 41, 48, 1209, 1233 |
| 02-damaged.png | 1254x1254 | 0, 15, 1239, 1253 |
| 03-badly-damaged.png | 1254x1254 | 0, 23, 1225, 1253 |

The brief describes the lowest row as y=940; the source's actual last nonzero-alpha row is y=939 using zero-based indexing.

Visual review:
- Recruiting: open inward door leaves and warm interior illumination are visible. Other fittings are broadly preserved, but the image was repainted and exact unchanged pixels/positions are not preserved.
- Damaged: torn flag, frayed right banner, roof patches, three arrows and chipped/cracked masonry are visible. There appear to be five roof patches rather than the requested three or four; scorching is subtle.
- Badly damaged: large roof hole with broken rafters, torn flag/banners, broken wall boards, heavy scorching, torn awning, cracked shield and damaged masonry/steps are visible. Five arrows are readily visible. One arrow projects to the right of the base; exact silhouette compliance fails.
- No ground patch, backdrop, text, dust cloud or smoke is apparent. Existing torch and brazier flames remain.

No Run B images were generated.

## SHA-256

- 01-recruiting.png: AB0B917DF4D01C4572C9C52FF14617A793F99B1ADF0F2F43775AB44532CE38CF
- 02-damaged.png: CC8F500C1C1C286354FA74204E6CD538CF8BB6CEAD9D95033B4EF28F347CE9A0
- 03-badly-damaged.png: 5602775556DC2BF8192A32AB1F2FB5DDB463BF17EEB89C231EA5C3AFCCC3D722

## Exact prompts

Each call used the original template as its sole referenced_image_paths input and transparent_background: true.

### 01-recruiting.png

Use case: precise-object-edit. Edit the supplied approved Azure Barracks template directly into a 1024x1024 transparent PNG game animation frame. Preserve EXACT building scale, pixel position, camera, painted soft shading, dark outlines, warm wood, grey stone, blue/gold palette and top-left lighting. No rescale, recenter or crop. Silhouette bounds left x128, right x896, top y196, lowest occupied row y940. Base, steps, dummy and brazier at EXACT original positions. Genuinely transparent empty background; preserve alpha. No ground patch/shadow, dust, smoke, new fire, external glow, motion lines, sparks, text, border or backdrop. Existing torch/brazier flames remain as in template. No extra objects or debris beyond original silhouette. Frame 01-recruiting.png, Recruiting: Change ONLY the doorway at the top of the front steps to open, door leaves swung inward. Warm orange-yellow interior light spills onto the nearest top steps and door frame, confined to the doorway and those steps. Everything else must remain identical to the source: roof, flag, all banners, torches, awning, shields, base, steps, dummy and brazier. Do not add soldiers.

### 02-damaged.png

Use case: precise-object-edit. Edit the supplied approved Azure Barracks template directly into a 1024x1024 transparent PNG game animation frame. Preserve EXACT building scale, pixel position, camera, painted soft shading, dark outlines, warm wood, grey stone, blue/gold palette and top-left lighting. No rescale, recenter or crop. Silhouette bounds left x128, right x896, top y196, lowest occupied row y940. Base, steps, dummy and brazier at EXACT original positions. Genuinely transparent empty background; preserve alpha. No ground patch/shadow, dust, smoke, new fire, external glow, motion lines, sparks, text, border or backdrop. Existing torch/brazier flames remain as in template. No extra objects or debris beyond original silhouette. Frame 02-damaged.png: Same building, same outline and positions; add LIGHT battle damage only on surfaces: three or four patches of missing blue roof shingles exposing dark timber boards; a few scorch marks near eaves and door frame; big flag tip torn ragged, one hanging banner frayed along bottom; exactly two arrows in front wall and one in roof, shafts angled toward viewer and inside original silhouette; a few cracked/chipped base stones. Keep silhouette almost identical, no collapse. All other objects stay unchanged in their original positions. Doorway retains original dark state.

### 03-badly-damaged.png

Use case: precise-object-edit. Edit the supplied approved Azure Barracks template directly into a 1024x1024 transparent PNG game animation frame. Preserve EXACT building scale, pixel position, camera, painted soft shading, dark outlines, warm wood, grey stone, blue/gold palette and top-left lighting. No rescale, recenter or crop. Silhouette bounds left x128, right x896, top y196, lowest occupied row y940. Base, steps, dummy and brazier at EXACT original positions. Genuinely transparent empty background; preserve alpha. No ground patch/shadow, dust, smoke, new fire, external glow, motion lines, sparks, text, border or backdrop. Existing torch/brazier flames remain as in template. No extra objects or debris beyond original silhouette. Frame 03-badly-damaged.png: Same building still standing, same size, position and base, with HEAVY battle damage. Large roof hole near ridge exposing broken rafters, many missing shingles. Big flag reduced to a short ragged strip; hanging banners shredded. Several wall boards broken exposing timber frame. Heavy black scorching on front wall and roof. Awning torn and sagging, one of two shields cracked. Exactly six arrows stuck in building, within original silhouette. Large cracks and missing stones in base; chipped steps. Outline changes only at roof hole and flag; do not collapse or lower structure. Base, steps, dummy and brazier remain in exact original positions. Original dark doorway. No new flames, smoke, sparks or debris outside outline. OUTPUT CANVAS MUST BE EXACTLY 1024 BY 1024, not 1254 or 1536; original lowest row y940.

