# Frames 00–06 production report

Generated only 00-idle.png through 06-walk6.png in this run. Frames 07–13 were not generated or modified by this run.

Each frame used exactly one built-in image generation call, editing ../ref/canvas-template.png with ../ref/soldier-reference.png as identity reference. Tool: `image_gen.imagegen` (callable name `image_gen__imagegen`). `transparent_background: true` for every call. Every PNG was copied byte-for-byte from the tool output, with no resizing, pixel scripts, background removal, matting, or alpha repair.

## Validation and limitations

All seven outputs are **1360 × 1156**, PNG **RGBA, 8 bits per channel** (System.Drawing reports Format32bppArgb). The requested/template size is 1600 × 1360. The output has the same aspect ratio but is 85% of the requested dimensions, so exact template pixel scale and y=1180 ground registration were not achieved. No resizing was performed because the brief requires keeping each output exactly as returned. The idle is a generated rendition of the template rather than a pixel-identical copy. Visual inspection shows consistent character equipment, sword viewer-left, shield viewer-right, and single poses without a ground shadow. Exact pose timing and frame-to-frame scale/registration are not guaranteed. Outputs contain alpha; the top-left alpha is 0 for 00–05 and 1 for 06, whose faint residual alpha was preserved as returned.

## 00-idle.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: The template pose unchanged: guard stance, sword forward toward viewer-left, shield up at viewer-right. Preserve the template appearance and position exactly.
```

## 01-walk1.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: Walk, contact: marching toward viewer-left with sword and shield held as in guard stance (sword forward and a little lower, shield up). Viewer-left front foot just planted a short step ahead, heel down; other foot behind on toes. Body slightly lower, leaning a little forward. Feet closer together than wide guard stance.
```

## 02-walk2.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: Walk, down: marching viewer-left, weight settling onto viewer-left front foot, knees bent, body at its lowest; viewer-right rear foot starting to lift. Feet closer than idle. Sword forward and a little lower, shield up.
```

## 03-walk3.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: Walk, passing: marching viewer-left, viewer-right rear foot swinging forward under body, viewer-left supporting leg straight, body at its highest. Feet close together under body. Sword forward and a little lower, shield up.
```

## 04-walk4.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: Walk, contact with OTHER leg: viewer-right foot now planted ahead toward viewer-left, viewer-left foot behind on toes. Body slightly lower. Feet closer together than idle. Sword forward and a little lower, shield up.
```

## 05-walk5.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: Walk, down on other leg: viewer-right front foot bears weight, knees bent, body lowest, viewer-left rear foot starting to lift. Marching toward viewer-left. Feet closer than idle. Sword forward and a little lower, shield up.
```

## 06-walk6.png

- Tool: `image_gen.imagegen` (`image_gen__imagegen`), built-in edit mode.
- Output: 1360 × 1156 pixels, RGBA PNG (8 bits/channel).
- Parameters: `transparent_background: true`; referenced images: template first, identity reference second.
- Exact prompt:

```text
Use case: identity-preserve. Edit target: first input, canvas-template.png. Second input: soldier-reference.png, identity reference only. Produce one Azure Vanguard game animation frame, exactly one soldier and one pose on genuinely transparent background. Keep the template canvas 1600x1360 and its exact composition scale: standing plume top to sole about 688 pixels, helmet about 200 pixels wide, feet centered near x=866, weight-bearing sole at y=1180. Preserve ample empty transparent area above and around the soldier; never enlarge or crop. Keep helmet, shoulders, torso, shield and body proportions exactly template-sized. Same stocky chibi soldier, round silver great-helm, dark T visor, small gold brow spike, blue plume curling viewer-left, blue scarf/short cape, silver pauldrons/breastplate/kneeguards, chainmail elbows, brown leather gloves/bracers/belt/boots, square silver belt buckle, blue tabard, short broad silver sword with round gold crossguard, blue kite shield with silver rim and white shield-shaped crest. Sword always in his RIGHT hand on VIEWER-LEFT; shield on LEFT arm on VIEWER-RIGHT. Same three-quarter high camera about 35 degrees above, facing viewer-left/down-left, same painted soft shading, dark outline, palette and top lighting. No gold armour trim, winged crest or gems. No ground shadow, motion blur, speed lines, glow, sparks, dust, blood, text, border, backdrop or extra objects. Preserve transparency. Change only the pose requested below; maintain template identity, scale, camera and ground registration.
Pose: Walk, passing on other leg: viewer-left rear foot swinging forward under body, viewer-right supporting leg straight, body highest. Must lead smoothly into walk contact with viewer-left front foot planted. Marching toward viewer-left. Sword forward and a little lower, shield up.
```


