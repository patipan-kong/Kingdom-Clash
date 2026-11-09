# Run A report

Six built-in generations, one per image. Each call used image_gen.imagegen (tools.image_gen__imagegen), transparent_background: true, and the same ordered referenced_image_paths: ../ref/idle-template.png (edit target), 00-idle.png (identity reference), ../ref/roland-still.png (identity reference). No refusals or retries. Outputs copied byte-for-byte; no resizing, background removal, alpha repair or pixel modification.

## Validation and limitations

All six returned images are 1254 × 1254 PNG, RGBA (System.Drawing Format32bppArgb), with transparent corner alpha 0. The tool did not honor the requested 1536 × 1536 output; therefore exact y=1240 ground and x=950 feet registration and 740px character height are not satisfied. Images were preserved as returned instead of repairing this. Character faces viewer-left with sword held on viewer-right and cape behind on viewer-right. Visual review suggests leg alternation in 04 and 05 is not clearly distinguished from 01 and 02, and passing poses may not fully match the specified gait. No additional generations were made under the one-generation-per-image requirement.

## 01-walk1.png

Tool: image_gen.imagegen (built-in).

Output: 1254 × 1254 pixels; PNG RGBA; edit mode; transparent_background: true.

Exact prompt:

```text
Use case: identity-preserve. Asset: one game animation sprite, Run A march.
Input image 1 (../ref/idle-template.png) is the EDIT TARGET and controls exact canvas, character scale and placement. Image 2 (00-idle.png) and image 3 (../ref/roland-still.png) are identity references only; do not adopt their canvas scale.
Edit only Roland's pose into the specified phase of a brisk disciplined march toward viewer-left. Keep the identical human knight: short swept-back brown hair, short brown beard, stern face; blue and steel armour, gold trim, large rounded viewer-right pauldron, steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed bracers and gauntlets, brown belt with round gold buckle, plated greaves, gold knee guards and steel boots. Long blue cape with gold border and gold emblem trails on viewer-right. Steel longsword with gold cross-guard and brown grip. No shield or helmet. Preserve painted soft shading, dark outline, top lighting and exact palette and proportions.
Canvas must stay 1536x1536 square, genuinely transparent with alpha. Preserve the master game scale: standing hair-to-sole height about 740px, do not enlarge or fill the canvas. Weight-bearing boot contacts y=1240; feet midpoint near x=950. Keep everything including cape and sword at least 80px within all edges. Allow only small vertical bob for march phases, no change of body size.
Always face viewer-left, three-quarter view from slightly above, never mirror. Sword hand stays on VIEWER-RIGHT near belt, blade carried low angled forward toward viewer-left with tip clear of ground; free gauntleted fist on VIEWER-LEFT swings a little. Cape sways behind on viewer-right. Balanced agile disciplined medium-wide stride on balls of feet. Exactly one character, one pose. No ground shadow, background, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text or border.

Pose: 01-walk1.png — Contact: viewer-left (front) foot just planted a short step ahead toward viewer-left, heel down; the other foot behind on its toes. Body slightly lower.
```

## 02-walk2.png

Tool: image_gen.imagegen (built-in).

Output: 1254 × 1254 pixels; PNG RGBA; edit mode; transparent_background: true.

Exact prompt:

```text
Use case: identity-preserve. Asset: one game animation sprite, Run A march.
Input image 1 (../ref/idle-template.png) is the EDIT TARGET and controls exact canvas, character scale and placement. Image 2 (00-idle.png) and image 3 (../ref/roland-still.png) are identity references only; do not adopt their canvas scale.
Edit only Roland's pose into the specified phase of a brisk disciplined march toward viewer-left. Keep the identical human knight: short swept-back brown hair, short brown beard, stern face; blue and steel armour, gold trim, large rounded viewer-right pauldron, steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed bracers and gauntlets, brown belt with round gold buckle, plated greaves, gold knee guards and steel boots. Long blue cape with gold border and gold emblem trails on viewer-right. Steel longsword with gold cross-guard and brown grip. No shield or helmet. Preserve painted soft shading, dark outline, top lighting and exact palette and proportions.
Canvas must stay 1536x1536 square, genuinely transparent with alpha. Preserve the master game scale: standing hair-to-sole height about 740px, do not enlarge or fill the canvas. Weight-bearing boot contacts y=1240; feet midpoint near x=950. Keep everything including cape and sword at least 80px within all edges. Allow only small vertical bob for march phases, no change of body size.
Always face viewer-left, three-quarter view from slightly above, never mirror. Sword hand stays on VIEWER-RIGHT near belt, blade carried low angled forward toward viewer-left with tip clear of ground; free gauntleted fist on VIEWER-LEFT swings a little. Cape sways behind on viewer-right. Balanced agile disciplined medium-wide stride on balls of feet. Exactly one character, one pose. No ground shadow, background, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text or border.

Pose: 02-walk2.png — Down: weight settling onto the viewer-left front foot, front knee bent, body at its lowest; viewer-right rear foot starting to lift.
```

## 03-walk3.png

Tool: image_gen.imagegen (built-in).

Output: 1254 × 1254 pixels; PNG RGBA; edit mode; transparent_background: true.

Exact prompt:

```text
Use case: identity-preserve. Asset: one game animation sprite, Run A march.
Input image 1 (../ref/idle-template.png) is the EDIT TARGET and controls exact canvas, character scale and placement. Image 2 (00-idle.png) and image 3 (../ref/roland-still.png) are identity references only; do not adopt their canvas scale.
Edit only Roland's pose into the specified phase of a brisk disciplined march toward viewer-left. Keep the identical human knight: short swept-back brown hair, short brown beard, stern face; blue and steel armour, gold trim, large rounded viewer-right pauldron, steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed bracers and gauntlets, brown belt with round gold buckle, plated greaves, gold knee guards and steel boots. Long blue cape with gold border and gold emblem trails on viewer-right. Steel longsword with gold cross-guard and brown grip. No shield or helmet. Preserve painted soft shading, dark outline, top lighting and exact palette and proportions.
Canvas must stay 1536x1536 square, genuinely transparent with alpha. Preserve the master game scale: standing hair-to-sole height about 740px, do not enlarge or fill the canvas. Weight-bearing boot contacts y=1240; feet midpoint near x=950. Keep everything including cape and sword at least 80px within all edges. Allow only small vertical bob for march phases, no change of body size.
Always face viewer-left, three-quarter view from slightly above, never mirror. Sword hand stays on VIEWER-RIGHT near belt, blade carried low angled forward toward viewer-left with tip clear of ground; free gauntleted fist on VIEWER-LEFT swings a little. Cape sways behind on viewer-right. Balanced agile disciplined medium-wide stride on balls of feet. Exactly one character, one pose. No ground shadow, background, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text or border.

Pose: 03-walk3.png — Passing: viewer-right rear foot swinging forward under the body, viewer-left supporting leg straight, body at its highest.
```

## 04-walk4.png

Tool: image_gen.imagegen (built-in).

Output: 1254 × 1254 pixels; PNG RGBA; edit mode; transparent_background: true.

Exact prompt:

```text
Use case: identity-preserve. Asset: one game animation sprite, Run A march.
Input image 1 (../ref/idle-template.png) is the EDIT TARGET and controls exact canvas, character scale and placement. Image 2 (00-idle.png) and image 3 (../ref/roland-still.png) are identity references only; do not adopt their canvas scale.
Edit only Roland's pose into the specified phase of a brisk disciplined march toward viewer-left. Keep the identical human knight: short swept-back brown hair, short brown beard, stern face; blue and steel armour, gold trim, large rounded viewer-right pauldron, steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed bracers and gauntlets, brown belt with round gold buckle, plated greaves, gold knee guards and steel boots. Long blue cape with gold border and gold emblem trails on viewer-right. Steel longsword with gold cross-guard and brown grip. No shield or helmet. Preserve painted soft shading, dark outline, top lighting and exact palette and proportions.
Canvas must stay 1536x1536 square, genuinely transparent with alpha. Preserve the master game scale: standing hair-to-sole height about 740px, do not enlarge or fill the canvas. Weight-bearing boot contacts y=1240; feet midpoint near x=950. Keep everything including cape and sword at least 80px within all edges. Allow only small vertical bob for march phases, no change of body size.
Always face viewer-left, three-quarter view from slightly above, never mirror. Sword hand stays on VIEWER-RIGHT near belt, blade carried low angled forward toward viewer-left with tip clear of ground; free gauntleted fist on VIEWER-LEFT swings a little. Cape sways behind on viewer-right. Balanced agile disciplined medium-wide stride on balls of feet. Exactly one character, one pose. No ground shadow, background, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text or border.

Pose: 04-walk4.png — Contact with the OTHER leg: viewer-right foot planted ahead toward viewer-left, viewer-left foot behind on its toes. Body slightly lower. Distinct from 01; legs exchange stride roles without mirroring the character.
```

## 05-walk5.png

Tool: image_gen.imagegen (built-in).

Output: 1254 × 1254 pixels; PNG RGBA; edit mode; transparent_background: true.

Exact prompt:

```text
Use case: identity-preserve. Asset: one game animation sprite, Run A march.
Input image 1 (../ref/idle-template.png) is the EDIT TARGET and controls exact canvas, character scale and placement. Image 2 (00-idle.png) and image 3 (../ref/roland-still.png) are identity references only; do not adopt their canvas scale.
Edit only Roland's pose into the specified phase of a brisk disciplined march toward viewer-left. Keep the identical human knight: short swept-back brown hair, short brown beard, stern face; blue and steel armour, gold trim, large rounded viewer-right pauldron, steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed bracers and gauntlets, brown belt with round gold buckle, plated greaves, gold knee guards and steel boots. Long blue cape with gold border and gold emblem trails on viewer-right. Steel longsword with gold cross-guard and brown grip. No shield or helmet. Preserve painted soft shading, dark outline, top lighting and exact palette and proportions.
Canvas must stay 1536x1536 square, genuinely transparent with alpha. Preserve the master game scale: standing hair-to-sole height about 740px, do not enlarge or fill the canvas. Weight-bearing boot contacts y=1240; feet midpoint near x=950. Keep everything including cape and sword at least 80px within all edges. Allow only small vertical bob for march phases, no change of body size.
Always face viewer-left, three-quarter view from slightly above, never mirror. Sword hand stays on VIEWER-RIGHT near belt, blade carried low angled forward toward viewer-left with tip clear of ground; free gauntleted fist on VIEWER-LEFT swings a little. Cape sways behind on viewer-right. Balanced agile disciplined medium-wide stride on balls of feet. Exactly one character, one pose. No ground shadow, background, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text or border.

Pose: 05-walk5.png — Down on the other leg: weight on viewer-right front foot, its knee bent, body lowest, viewer-left rear foot starting to lift.
```

## 06-walk6.png

Tool: image_gen.imagegen (built-in).

Output: 1254 × 1254 pixels; PNG RGBA; edit mode; transparent_background: true.

Exact prompt:

```text
Use case: identity-preserve. Asset: one game animation sprite, Run A march.
Input image 1 (../ref/idle-template.png) is the EDIT TARGET and controls exact canvas, character scale and placement. Image 2 (00-idle.png) and image 3 (../ref/roland-still.png) are identity references only; do not adopt their canvas scale.
Edit only Roland's pose into the specified phase of a brisk disciplined march toward viewer-left. Keep the identical human knight: short swept-back brown hair, short brown beard, stern face; blue and steel armour, gold trim, large rounded viewer-right pauldron, steel chest plate, gold-edged blue surcoat, knee-length blue tabard over black cloth, gold-trimmed bracers and gauntlets, brown belt with round gold buckle, plated greaves, gold knee guards and steel boots. Long blue cape with gold border and gold emblem trails on viewer-right. Steel longsword with gold cross-guard and brown grip. No shield or helmet. Preserve painted soft shading, dark outline, top lighting and exact palette and proportions.
Canvas must stay 1536x1536 square, genuinely transparent with alpha. Preserve the master game scale: standing hair-to-sole height about 740px, do not enlarge or fill the canvas. Weight-bearing boot contacts y=1240; feet midpoint near x=950. Keep everything including cape and sword at least 80px within all edges. Allow only small vertical bob for march phases, no change of body size.
Always face viewer-left, three-quarter view from slightly above, never mirror. Sword hand stays on VIEWER-RIGHT near belt, blade carried low angled forward toward viewer-left with tip clear of ground; free gauntleted fist on VIEWER-LEFT swings a little. Cape sways behind on viewer-right. Balanced agile disciplined medium-wide stride on balls of feet. Exactly one character, one pose. No ground shadow, background, motion blur, slash arcs, speed lines, glow, sparks, dust, blood, text or border.

Pose: 06-walk6.png — Passing on the other leg: viewer-left rear foot swinging forward under the body, viewer-right supporting leg straight, body highest. This phase leads smoothly back into 01 contact with viewer-left foot.
```


