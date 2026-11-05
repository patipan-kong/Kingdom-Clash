# Guardian frames 00–14 generation report

Scope: 00-idle.png through 14-bash4.png only. One built-in generation per frame, always editing ../ref/canvas-template.png with transparent_background=true. No generations for frames 15–28. No resizing, background removal, matting, alpha repair, compositing, or other pixel modifications. Each generated PNG was copied byte-for-byte into this folder.

## Validation and limitations

All 15 output PNG headers report 1360 × 1156 pixels, 8-bit RGBA (PNG color type 6). The tool returned this size despite the requested 1600 × 1360; its aspect ratio matches the template exactly, at 85% of the requested dimensions. The files remain untouched as required. Consequently exact template pixel scale and ground coordinates are not met. Relative framing is broadly preserved, with some pose-dependent drift.

Visual review: every output contains one fully visible Guardian and generous empty margins. Identity and painted style are broadly retained. 00 is a generated reproduction, not an unchanged pixel copy of the template. Walk-leg ordering in 01–03 appears inconsistent with the requested viewer-left support leg; the six-frame walk is not certified as a smooth alternating loop. In 07–08 the visor remains closer to the template direction than a clear viewer-left turn. In 11 the shield remains mainly on viewer-right rather than turning decisively left. In 12–14 the shield moves to viewer-left and the sword to viewer-right; the generator may have swapped anatomical weapon ownership instead of maintaining it through rotation. Frame 13 reverses the plume curl. Frame 14's shield face remains substantially visible to the camera rather than squarely facing the left foe. These are review items, not claims of exact brief compliance. No repeat generations were made, preserving the one-generation-per-frame rule.

The approved identity reference and accepted walk/windup/contact examples were visually inspected before generation; only the canvas template was passed as the edit target for each call. Mode below describes the PNG channel format; edit mode was used for every call.

## 00-idle.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: The template pose, unchanged. Reproduce the template unchanged, including pose, placement and scale.
```

## 01-walk1.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Walk, contact: the viewer-left foot just planted a short step ahead, the other foot behind on its toes. Body slightly lower, leaning a little forward. Sword low at his side, point down; shield carried in front on the viewer-right.
```

## 02-walk2.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Walk, down: weight settling onto the front foot, knees bent, body at its lowest; the rear foot starting to lift. Viewer-left foot supports weight ahead, viewer-right foot lifts behind. Sword low, shield in front.
```

## 03-walk3.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Walk, passing: the rear foot swinging forward under the body, body at its highest, sword and shield centred. Viewer-left leg supports him; viewer-right knee swings forward beneath hips with lifted boot. Small vertical bob only.
```

## 04-walk4.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Walk, contact with the OTHER leg: the viewer-right foot now planted ahead, the viewer-left foot behind on its toes. Body slightly lower. Sword low with point down, shield carried in front. Clear short walking stride.
```

## 05-walk5.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Walk, down on the other leg: knees bent, body lowest, the rear foot starting to lift. Viewer-right foot planted ahead supporting the weight; viewer-left rear heel lifts. Sword low point down, shield in front.
```

## 06-walk6.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Walk, passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. Viewer-right leg planted supporting him; viewer-left knee swinging forward beneath hips, boot off ground. Sword low and shield centred, small vertical bob.
```

## 07-attack1.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Sword attack, anticipation: weight back on the rear foot, shoulders turned away, the sword drawn back and up behind the head; shield pulled in.
```

## 08-attack2.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Sword attack, overhead: the blade raised high above the helmet, starting forward; shield guarding the chest; both feet planted. Sword hand held above helmet, blade nearly upright leaning toward viewer-left as the forward strike begins.
```

## 09-attack3.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Sword attack, mid-swing: the blade sweeping down and forward at shoulder height toward viewer-left; the front foot stepping forward. Sword extended diagonally toward viewer-left, blade descending at shoulder height, elbow still a little bent before full contact. Clearly face viewer-left.
```

## 10-attack4.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Sword attack, contact: a forward lunge, the front foot stepped forward, torso leaning forward, the sword arm fully extended toward viewer-left with the blade horizontal at chest height; shield tucked in at the right. Maximum horizontal sword reach to the LEFT, blade exactly horizontal, clear forward lunge. Keep original anatomy scale and ground line.
```

## 11-bash1.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Shield Bash, brace: a crouch, knees bent, the shield drawn in to the chest and turning toward viewer-left; sword low and back. The shield arm remains his viewer-right arm but draws the kite shield across his chest toward the foe at viewer-left. Readable braced crouch.
```

## 12-bash2.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Shield Bash, coil: weight loaded on the rear foot, the shield shoulder leading, the shield rim turned toward viewer-left. Rotate torso and helmet toward LEFT, shield arm crosses in front of chest so shield leads on the LEFT side of the body, leftward leading rim visible almost edge-on. Sword held low behind hips toward viewer-right. Rear viewer-right boot loaded, front viewer-left foot light. Do not simply repeat idle.
```

## 13-bash3.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Shield Bash, thrust: an explosive step forward toward viewer-left, the shield driven forward and slightly up, body forward. Rotate torso toward LEFT, shield arm reaches across body to drive shield well to LEFT of helmet, shield center about x550 on template canvas, shield face points toward left foe with foreshortening. Sword hand trails behind hips toward viewer-right. Front foot steps left, rear pushes. Keep anatomical hands unchanged despite torso rotation.
```

## 14-bash4.png

Tool: `image_gen.imagegen` (built-in; callable as `image_gen__imagegen`).

Output: **1360 × 1156, RGBA, 8 bits/channel**.

Edit target: `G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png`.

Parameters: `referenced_image_paths` containing the edit target; `transparent_background: true`.

Exact prompt:

```text
Use case: identity-preserve. Edit target: the supplied canvas-template.png, a 1600x1360 transparent canvas. Create exactly ONE Guardian animation pose, not a sheet. Preserve the canvas aspect and preferably exact 1600x1360 output. Preserve EXACT template character scale: standing plume-to-sole height about 688 pixels, helmet about 150px, torso centered around x850; ground-bearing sole at y1180 and around x850. Keep the large empty transparent margins, do not enlarge or auto-crop or center the character in the canvas. Change only the requested pose. Same stocky top-heavy Guardian, silver plate armour with gold trim, blue horsehair plume curling toward viewer-left, gold winged helmet crest, dark T-visor, blue cape, blue gold-bordered tabard with long front panel, blue diamond gems on chest and brown belt. Short broad silver sword with gold crossguard and blue pommel gem in viewer-left hand; gold-rimmed blue kite shield bearing white shield-outline crest on viewer-right arm. Same three-quarter high-angle camera about 35 degrees above, facing viewer-left, painted soft shading, near-black outline, palette and top lighting. Genuinely transparent background and original alpha. No ground shadow, blur, speed lines, glow, sparks, dust, text, border, background or extra subjects. All equipment and plume remain inside canvas. Pose: Shield Bash, impact: fully extended, the shield thrust at maximum reach toward viewer-left with its face toward the foe, body lowest and furthest forward; sword behind him. Maximum shield reach toward LEFT: shield center about x420 on template canvas, far left of helmet, arm fully stretched across front toward foe. Shield face directed toward left foe, foreshortened. Torso leans left in deep lunge, front knee very bent, rear leg extended, sword hand trailing behind toward right. Preserve plume curling viewer-left and anatomical weapon ownership through torso rotation.
```


