# Run A report

Generated only Run A on 2026-11-06 using the built-in image generation tool. Exactly one generation per image; every call edited `../ref/tavern-template.png` directly with `transparent_background: true`. No Run B images were generated.

## Saved outputs and verification

| File | Returned canvas | Format | Original bytes preserved |
|---|---|---|---|
| 01-hire.png | 1254×1254 | PNG, 32-bit ARGB | Yes, SHA-256 matches tool file |
| 02-revive.png | 1254×1254 | PNG, 32-bit ARGB | Yes, SHA-256 matches tool file |
| 03-damaged.png | 1254×1254 | PNG, 32-bit ARGB | Yes, SHA-256 matches tool file |
| 04-badly-damaged.png | 1254×1254 | PNG, 32-bit ARGB | Yes, SHA-256 matches tool file |

All files were copied without decoding/re-encoding, resizing, cropping, background removal, matting, alpha repair or any pixel modification. Tool alpha was retained. Read-only image inspection was used.

## Compliance findings

**The outputs do not fully meet the brief.** Despite explicit 1024×1024 and coordinate constraints in every prompt, the tool returned 1254×1254 for all four images. Exact template scale, coordinates, silhouette bounds and lowest row y=940 are therefore not preserved. No corrective generation or processing was performed because the brief requires one generation per image and unmodified outputs.

The input alpha bounds are x=128–895, y=198–939 inclusive (the brief describes the bottom as row 940). The first two output alpha bounds are 01: x=0–1169, y=125–1213; 02: x=0–1229, y=19–1253. These include faint partial-alpha pixels; they are not the visible building bounds. Both contain fully transparent pixels and partial alpha. Background transparency is present, but exact clean silhouette compliance cannot be certified.

Visual review:

- **01-hire:** Open lit doorway and light on steps are present. Door leaves appear to project toward the viewer rather than clearly inward. Some fittings and interior details were redrawn; exact unchanged-template fidelity is not achieved.
- **02-revive:** Door closed, brass bell above doorway, brighter windows and both lanterns, and bright gold lion are present. Original fittings and placement are recognizably similar, but not pixel-identical.
- **03-damaged:** Four shingle gaps, scorch marks, cracked/dim pane, torn fringe, frayed banner, chipped sign, two wall arrows and one roof arrow, cracked chimney/steps are visible. Building remains recognizable with lit windows. Exact geometric preservation fails as above.
- **04-badly-damaged:** Large roof hole and broken rafters, missing shingles and chimney stones, crooked cracked sign with broken chain, broken wall boards, heavy scorch, torn/sagging awning, shredded banner, dark lanterns and one dark window, six arrows, split barrel and broken bench are visible. No smoke, fire or dust. Exact geometric preservation fails as above.

These are the requested single-pass raw results, not certified animation-aligned frames.

## Exact prompts

All four calls used the absolute original-template path as their sole `referenced_image_paths` entry and `transparent_background: true`.

### 01-hire.png

Use case: precise-object-edit. Edit target: the supplied original tavern-template.png, not another generated frame. Produce ONE 1024x1024 transparent PNG game frame. Preserve exact template building size, coordinates, camera and silhouette: left x128, right x896, top y198, bottom/plinth lowest row y940. Never resize, recenter or crop. Keep grass plinth, barrels, bench, stool, and steps at their exact original positions. Same painted soft-shaded pixel-art style, dark outline, warm wood and stone, blue/gold palette, top-left lighting. Same roof shape, chimney, beer-mug signboard position, striped awning, gold-lion blue banner and plinth. Genuine transparent background and original alpha edges; no backdrop, ground shadow, dust, smoke, fire, external glow, motion lines, sparks, particles, text or border. Stay inside template silhouette. Frame 01-hire.png: Change ONLY the arched front door and illumination immediately on doorway and its two steps. Swing the door leaves wide open INWARD, showing a bright warm orange-yellow lit interior. A warm pool of light spills onto the two stone steps only. Everything else, including roof, chimney, sign, awning, banner, lanterns, windows, barrels, bench and plinth remains identical.

### 02-revive.png

Use case: precise-object-edit. Edit target: the supplied original tavern-template.png, not another generated frame. Produce ONE 1024x1024 transparent PNG game frame. Preserve exact template building size, coordinates, camera and silhouette: left x128, right x896, top y198, bottom/plinth lowest row y940. Never resize, recenter or crop. Keep grass plinth, barrels, bench, stool, and steps at their exact original positions. Same painted soft-shaded pixel-art style, dark outline, warm wood and stone, blue/gold palette, top-left lighting. Same roof shape, chimney, beer-mug signboard position, striped awning, gold-lion blue banner and plinth. Genuine transparent background and original alpha edges; no backdrop, ground shadow, dust, smoke, fire, external glow, motion lines, sparks, particles, text or border. Stay inside template silhouette. Frame 02-revive.png: Keep the arched door CLOSED exactly as template. Add a small brass bell hanging from the wooden beam above the door. Every window, BOTH lanterns and the gold lion on the blue banner glow brighter golden-white; soft golden halos hug only window frames and banner on the building's own surfaces. No glow beyond building. Celebratory warm illumination. Nothing else changes.

### 03-damaged.png

Use case: precise-object-edit. Edit target: the supplied original tavern-template.png, not another generated frame. Produce ONE 1024x1024 transparent PNG game frame. Preserve exact template building size, coordinates, camera and silhouette: left x128, right x896, top y198, bottom/plinth lowest row y940. Never resize, recenter or crop. Keep grass plinth, barrels, bench, stool, and steps at their exact original positions. Same painted soft-shaded pixel-art style, dark outline, warm wood and stone, blue/gold palette, top-left lighting. Same roof shape, chimney, beer-mug signboard position, striped awning, gold-lion blue banner and plinth. Genuine transparent background and original alpha edges; no backdrop, ground shadow, dust, smoke, fire, external glow, motion lines, sparks, particles, text or border. Stay inside template silhouette. Frame 03-damaged.png: Add LIGHT battle damage only on surfaces. Three or four patches of missing blue roof shingles expose dark timber boards. A few scorch marks near eaves and chimney. One window pane cracked and dim, while windows remain lit. Awning torn only at fringe; banner frayed at bottom. Beer-mug signboard slightly chipped. Exactly two arrows stuck in front wall and one in roof, all within original outline. A few cracked stones in chimney and steps. Outline remains almost identical. Preserve everything else.

### 04-badly-damaged.png

Use case: precise-object-edit. Edit target: the supplied original tavern-template.png, not another generated frame. Produce ONE 1024x1024 transparent PNG game frame. Preserve exact template building size, coordinates, camera and silhouette: left x128, right x896, top y198, bottom/plinth lowest row y940. Never resize, recenter or crop. Keep grass plinth, barrels, bench, stool, and steps at their exact original positions. Same painted soft-shaded pixel-art style, dark outline, warm wood and stone, blue/gold palette, top-left lighting. Same roof shape, chimney, beer-mug signboard position, striped awning, gold-lion blue banner and plinth. Genuine transparent background and original alpha edges; no backdrop, ground shadow, dust, smoke, fire, external glow, motion lines, sparks, particles, text or border. Stay inside template silhouette. Frame 04-badly-damaged.png: Same inn with HEAVY battle damage. Large roof hole near ridge reveals broken rafters, many more shingles missing. Chimney cracked with missing stones. Beer-mug signboard cracked and crooked, hanging from one remaining chain with other chain broken, staying within original outline bounds. Several wall boards broken expose timber frame. Heavy black scorching on front wall and roof. Striped awning torn and sagging; blue lion banner shredded. BOTH lanterns dark, one window dark. Exactly six arrows stuck in building within its original bounds. One barrel split at its original position. Bench broken in its original position. Plinth, steps, barrels, bench and stool remain at exact template positions. Outline changes only at roof hole, chimney and sign, never extends outside template envelope. No collapse; preserve recognizable original building geometry.

