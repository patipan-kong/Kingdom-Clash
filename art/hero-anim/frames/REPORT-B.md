# Run B report

Four separate built-in image generation edits, one generation per frame. Edit target: `../ref/idle-template.png`; supporting approved identity reference: `00-idle.png`. Every call used `transparent_background: true`. Original tool PNGs copied unchanged into this folder. No scripts run on pixels, resizing, compositing, background removal, alpha repair, or other image processing.

The tool returned 1254 × 1254 for all four images despite the prompts requesting 1536 × 1536. PNG IHDR metadata only was read: 8-bit RGBA (colour type 6). Thus these outputs do not meet the brief's absolute 1536-canvas coordinates, and exact template scale/placement is not satisfied. They are preserved exactly as returned, per instruction. Visual review: two-handed overhead wind-up and drive and lowered two-handed contact are present; hurt has the free hand raised. Contact pose is less deeply lunged/bowed than requested, and blade reach appears beyond the requested limit. Wind-up/drive appear enlarged relative to template. Exact geometry and alpha coverage were not measured because no pixel scripts were permitted. No claim of full geometric compliance is made.

## 07-attack1.png

- Tool: `image_gen.imagegen` (built-in; exposed as `image_gen__imagegen`).
- Mode: edit / identity-preserve; transparent background; PNG 8-bit RGBA.
- Output pixel size: 1254 × 1254.
- References: `../ref/idle-template.png` (edit target), `00-idle.png` (supporting identity).

Exact prompt:

```text
Use case: identity-preserve. Edit target: first reference ../ref/idle-template.png. Second reference 00-idle.png is supporting approved identity only. Create ONE animation frame, one character, one pose. Output square 1536x1536 PNG with genuinely transparent background, preserve tool alpha. Match the first template EXACTLY in game scale, proportions, colours, painted soft shading, dark outline, top lighting and slightly elevated three-quarter camera. The standing warlord is about 760 px from horn tips to soles; do not enlarge to fill canvas. Weight-bearing boot soles on y=1240, feet midpoint x=950. All axe, cape and body parts at least 80 px inside every edge. Huge bulky brutal warlord: dark steel great-helm with red face plate and exactly THREE curved horns (two side horns and central crest horn), big white-grey fur mantle on both shoulders, gunmetal plate armour with red inlay, riveted pauldrons/bracers, black gauntlets, brown leather belt with large hexagonal buckle, red knee-length tabard, plated greaves/boots, long tattered dark-red cape. Exact same enormous double-bit axe with dark wooden haft, red cloth near head, two broad crescent steel blades with red runes. No shield. Always face viewer-left, three-quarter body turned toward viewer-left, never mirror. Right hand belongs on viewer-left and holds axe; free left arm belongs on viewer-right. Attack uses BOTH hands gripping one haft; axe stays viewer-left. Heavy wide planted stance, enormous heavy weapon, whole body commits, cape lags and sweeps. No ground shadow or ground smudge, no backdrop, no motion blur, speed lines, glow, sparks, dust, blood, text, border, extra weapons or characters. Change pose only. Chop, WIND-UP for a heavy two-handed OVERHEAD axe chop: weight on rear foot, torso leaning back and twisted, BOTH hands firmly gripping the haft, axe raised high above and behind his head, blades at the TOP, cape flaring. Axe must be high overhead, not a sideways swing, every part well inside canvas. Keep axe on viewer-left side.
```

## 08-attack2.png

- Tool: `image_gen.imagegen` (built-in; exposed as `image_gen__imagegen`).
- Mode: edit / identity-preserve; transparent background; PNG 8-bit RGBA.
- Output pixel size: 1254 × 1254.
- References: `../ref/idle-template.png` (edit target), `00-idle.png` (supporting identity).

Exact prompt:

```text
Use case: identity-preserve. Edit target: first reference ../ref/idle-template.png. Second reference 00-idle.png is supporting approved identity only. Create ONE animation frame, one character, one pose. Output square 1536x1536 PNG with genuinely transparent background, preserve tool alpha. Match the first template EXACTLY in game scale, proportions, colours, painted soft shading, dark outline, top lighting and slightly elevated three-quarter camera. The standing warlord is about 760 px from horn tips to soles; do not enlarge to fill canvas. Weight-bearing boot soles on y=1240, feet midpoint x=950. All axe, cape and body parts at least 80 px inside every edge. Huge bulky brutal warlord: dark steel great-helm with red face plate and exactly THREE curved horns (two side horns and central crest horn), big white-grey fur mantle on both shoulders, gunmetal plate armour with red inlay, riveted pauldrons/bracers, black gauntlets, brown leather belt with large hexagonal buckle, red knee-length tabard, plated greaves/boots, long tattered dark-red cape. Exact same enormous double-bit axe with dark wooden haft, red cloth near head, two broad crescent steel blades with red runes. No shield. Always face viewer-left, three-quarter body turned toward viewer-left, never mirror. Right hand belongs on viewer-left and holds axe; free left arm belongs on viewer-right. Attack uses BOTH hands gripping one haft; axe stays viewer-left. Heavy wide planted stance, enormous heavy weapon, whole body commits, cape lags and sweeps. No ground shadow or ground smudge, no backdrop, no motion blur, speed lines, glow, sparks, dust, blood, text, border, extra weapons or characters. Change pose only. Chop, DRIVE for a heavy two-handed OVERHEAD axe chop: axe at the TOP of its arc, sweeping forward and down OVER his head toward viewer-left, BOTH hands firmly on the haft and both arms driving, torso pitching forward, front foot stepping forward. It must clearly read as the middle of a massive overhead chop, not a horizontal sword swing.
```

## 09-attack3.png

- Tool: `image_gen.imagegen` (built-in; exposed as `image_gen__imagegen`).
- Mode: edit / identity-preserve; transparent background; PNG 8-bit RGBA.
- Output pixel size: 1254 × 1254.
- References: `../ref/idle-template.png` (edit target), `00-idle.png` (supporting identity).

Exact prompt:

```text
Use case: identity-preserve. Edit target: first reference ../ref/idle-template.png. Second reference 00-idle.png is supporting approved identity only. Create ONE animation frame, one character, one pose. Output square 1536x1536 PNG with genuinely transparent background, preserve tool alpha. Match the first template EXACTLY in game scale, proportions, colours, painted soft shading, dark outline, top lighting and slightly elevated three-quarter camera. The standing warlord is about 760 px from horn tips to soles; do not enlarge to fill canvas. Weight-bearing boot soles on y=1240, feet midpoint x=950. All axe, cape and body parts at least 80 px inside every edge. Huge bulky brutal warlord: dark steel great-helm with red face plate and exactly THREE curved horns (two side horns and central crest horn), big white-grey fur mantle on both shoulders, gunmetal plate armour with red inlay, riveted pauldrons/bracers, black gauntlets, brown leather belt with large hexagonal buckle, red knee-length tabard, plated greaves/boots, long tattered dark-red cape. Exact same enormous double-bit axe with dark wooden haft, red cloth near head, two broad crescent steel blades with red runes. No shield. Always face viewer-left, three-quarter body turned toward viewer-left, never mirror. Right hand belongs on viewer-left and holds axe; free left arm belongs on viewer-right. Attack uses BOTH hands gripping one haft; axe stays viewer-left. Heavy wide planted stance, enormous heavy weapon, whole body commits, cape lags and sweeps. No ground shadow or ground smudge, no backdrop, no motion blur, speed lines, glow, sparks, dust, blood, text, border, extra weapons or characters. Change pose only. Chop, CONTACT of a heavy two-handed OVERHEAD axe chop: deep committed lunge toward viewer-left, front knee bent DEEP over front foot, torso BOWED forward, BOTH arms FULLY EXTENDED with both hands gripping the haft, enormous axe slammed down and forward on viewer-left with its lower blade near y=1240 ahead of front foot. Blade at most 560 px from feet midpoint x=950. Cape thrown forward. Whole body commits to downward impact. No impact effects.
```

## 10-hurt.png

- Tool: `image_gen.imagegen` (built-in; exposed as `image_gen__imagegen`).
- Mode: edit / identity-preserve; transparent background; PNG 8-bit RGBA.
- Output pixel size: 1254 × 1254.
- References: `../ref/idle-template.png` (edit target), `00-idle.png` (supporting identity).

Exact prompt:

```text
Use case: identity-preserve. Edit target: first reference ../ref/idle-template.png. Second reference 00-idle.png is supporting approved identity only. Create ONE animation frame, one character, one pose. Output square 1536x1536 PNG with genuinely transparent background, preserve tool alpha. Match the first template EXACTLY in game scale, proportions, colours, painted soft shading, dark outline, top lighting and slightly elevated three-quarter camera. The standing warlord is about 760 px from horn tips to soles; do not enlarge to fill canvas. Weight-bearing boot soles on y=1240, feet midpoint x=950. All axe, cape and body parts at least 80 px inside every edge. Huge bulky brutal warlord: dark steel great-helm with red face plate and exactly THREE curved horns (two side horns and central crest horn), big white-grey fur mantle on both shoulders, gunmetal plate armour with red inlay, riveted pauldrons/bracers, black gauntlets, brown leather belt with large hexagonal buckle, red knee-length tabard, plated greaves/boots, long tattered dark-red cape. Exact same enormous double-bit axe with dark wooden haft, red cloth near head, two broad crescent steel blades with red runes. No shield. Always face viewer-left, three-quarter body turned toward viewer-left, never mirror. Right hand belongs on viewer-left and holds axe; free left arm belongs on viewer-right. Attack uses BOTH hands gripping one haft; axe stays viewer-left. Heavy wide planted stance, enormous heavy weapon, whole body commits, cape lags and sweeps. No ground shadow or ground smudge, no backdrop, no motion blur, speed lines, glow, sparks, dust, blood, text, border, extra weapons or characters. Change pose only. HURT: a flinch, head ducked, shoulders hunched, body recoiling a little backward toward viewer-right; axe lowered and retained in his RIGHT hand on viewer-left, his free LEFT hand on viewer-right raised toward his face. Feet exactly as idle, boot soles y=1240, midpoint x=950. Preserve body mass and scale.
```


