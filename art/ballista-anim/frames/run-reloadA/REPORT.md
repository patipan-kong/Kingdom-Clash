# Variant A report

- Created `mech-reload.png` with exactly one built-in image-tool edit, using mech-fired.png as the edit target and style-tower.png as the style reference. Requested a transparent background.
- Saved the returned PNG unchanged; no pixel processing or background removal.
- Visual review: V-shaped reload rope, further-bent arms, turned crank, empty stock, and no added effects. The V is fairly pronounced. Exact preservation of unchanged parts is not pixel-identical.
- Limitation: the tool returned a 1254 × 1254 RGBA PNG rather than the requested 1280 × 1280 canvas. Visually the object ends above y=840; that cutoff and alpha coverage were not measured, to avoid running scripts on pixels.

## Final prompt

Use case: precise-object-edit. Edit Image 1 (mech-fired.png); Image 2 (style-tower.png) is only a painted game-art style reference. Produce variant A reload pose of exactly the same wooden ballista mechanism. Keep the 1280x1280 canvas, exact placement, scale, perspective, painted style, outline and lighting. Change only: the rope is being wound back toward the middle of the stock by the winch, forming a shallow V from the two arm tips down to a single point above the stock's centre; bend the two wooden bow arms a little further than the input, about halfway to a fully drawn bow; rotate the existing winch crank one quarter turn. Preserve the stock, gold boss, iron bands, rope lashings, winch drum, pennant and its pole as in the original. VARIANT A: nothing lies on the stock, no arrow, bolt or dowel. Genuinely transparent background with clean alpha; preserve all empty canvas. Every visible pixel of the object must be above y=840; nothing at or below y=840. No ground, cast shadow, dust, smoke, glow, motion lines, text or backdrop. Return one image only.
