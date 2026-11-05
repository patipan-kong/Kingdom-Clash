# Archer frames 06–09 report

Created only `06-watch.png`, `07-release.png`, `08-nock.png`, and `09-draw.png` in this directory. Used the built-in image tool once per image (four generations total), always editing the original `archer-aim.png`, with `transparent_background: true`.

Each returned PNG was copied unchanged; no resizing, cropping, background removal, alpha repair, or pixel editing was performed. Inputs were left unchanged. All four files are 1536×1024, 32-bit RGBA; read-only checks found alpha 0 in sampled background areas. Visually reviewed all four outputs.

The poses retain the archer, viewer-right orientation, bow handedness, clothing and approximately aligned feet. Exact pixel-identical anatomy/placement cannot be guaranteed. Visible pose deviations: 08 has a visibly deflected string rather than a fully unpulled string; 09's pulling hand is farther toward viewer-left than the requested middle of the chest. Outputs were retained without regeneration to obey the one-generation-per-image rule.

## Prompts

Each prompt used this common prefix verbatim:

Use case: identity-preserve. Edit ONLY the original archer-aim.png supplied as edit target. Make one game animation frame, same 1536x1024 landscape canvas. Preserve EXACT original pixel scale and placement: feet around x550–670,y810–914, hood top near x595,y325. Do not enlarge, recenter, crop or move feet. Same archer identity, face, deep blue hood thin gold trim, blue tunic gold emblem, leather shoulder guards/bracers/gloves, belt gold buckle, brown trousers/boots, curved wooden short bow. Same painted soft shading, dark outline, palette, top lighting, three-quarter high camera. Upright body, only arms, bow and head change (slight shoulder recoil only for release). Faces viewer-right. Anatomical LEFT hand always holds bow on VIEWER-RIGHT; RIGHT hand is VIEWER-LEFT and handles string/arrow. Genuinely transparent background, keep only archer and his held equipment. No glow, ground shadow, backdrop, smoke, fire, debris, motion lines, text, border, extra objects. Nothing touches canvas edges. 

### 06-watch.png

Frame 06-watch.png: at rest, watching alert toward viewer-right. Bow lowered, held loosely in anatomical LEFT hand on VIEWER-RIGHT, pointing down at his side. No arrow anywhere. RIGHT hand rests at his belt.

### 07-release.png

Frame 07-release.png: instant after shot. LEFT bow arm still extended toward viewer-right. String snapped straight, bow relaxed, NO arrow anywhere. RIGHT hand opened and flown back past his ear on viewer-left, fingers spread. Shoulders lean back a little from recoil, feet remain fixed.

### 08-nock.png

Frame 08-nock.png: reloading. Bow held lower in front of chest, tilted, in LEFT hand viewer-right. RIGHT hand brings a new silver-headed arrow to the string and sets it on string. String is not pulled yet, straight between bow tips. He looks down at arrow.

### 09-draw.png

Frame 09-draw.png: drawing. Bow raised toward viewer-right, almost level, silver-headed arrow nocked. RIGHT hand pulls string ONLY HALFWAY back, to middle of his chest (not to face), bow half bent. LEFT hand holds bow viewer-right. Looks toward viewer-right.


